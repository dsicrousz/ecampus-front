import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OperationService } from '@/services/operation.service';
import { useSymbologyScanner } from '@use-symbology-scanner/react';
import { memo, useEffect, useState } from 'react';
import { FaArrowLeft, FaTicketAlt, FaMoneyBillWave, FaCheckCircle, FaClock } from 'react-icons/fa';
import { ServiceService } from '@/services/service.service';
import { TicketService } from '@/services/ticket.service';
import { CompteService } from '@/services/compte.service';
import {Howl} from 'howler';
import success from '../../../success.mp3';
import error from '../../../error.mp3';
import { message, Spin, Button, Card, Badge, Modal, Image, Typography, Avatar, Statistic, Divider} from 'antd';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { QUERY_KEYS } from '@/constants';
import type { Compte } from '@/types/compte';
import { useSession } from '@/auth/auth-client';
import type { Operation } from '@/types/operation';
import { env } from '@/env';
import { cn } from '@/lib/utils';
import type { AxiosError } from 'axios';
import { AnimatedList } from '@/components/ui/animated-list';


dayjs.extend(isBetween);

const { Title, Text } = Typography;

export const Route = createFileRoute(
  '/admin/controleurs/$serviceId/ticket/$ticketId/',
)({
  component: RouteComponent,
})

function RouteComponent() {
   const {serviceId, ticketId} = Route.useParams();
   const {data:session} = useSession();
    const navigate = useNavigate();
      const qc = useQueryClient();
     const playSuccess = new Howl({
      src: [success],
      autoplay:false
    });
      const playError = new Howl({
      src: [error],
      autoplay:false
    });
    const [scannedCode, setScannedCode] = useState<string | null>(null);
    const [studentData, setStudentData] = useState<Compte | null>(null);
    const [modalOpened, setModalOpened] = useState(false);
    const ticketService = new TicketService();
    const serviceService = new ServiceService();
    const compteService = new CompteService();
    
    const {data:ticket, isLoading: isLoadingTicket} = useQuery({ 
        queryKey: [QUERY_KEYS.TICKETS, ticketId], 
        queryFn: () => ticketService.getOne(ticketId) 
    });
    
    const {data:service, isLoading: isLoadingService} = useQuery({ 
        queryKey: [QUERY_KEYS.SERVICES], 
        queryFn: () => serviceService.getOne(serviceId),
        enabled: !!serviceId
    });
    
     const operationService = new OperationService();


     const {mutate:createUtilisation,isPending} = useMutation({
        mutationFn: (data:Partial<Operation>) => operationService.utilisation(data),
        onSuccess: () => {
         qc.invalidateQueries({queryKey: [QUERY_KEYS.OPERATIONS_BY_TICKET, ticketId]});
         playSuccess.play();
         message.success('Utilisation enregistrée avec succès!');
         setModalOpened(false);
         setStudentData(null);
         setScannedCode(null);
        },
          onError: (error:AxiosError) => {
            message.error(error?.message || "Erreur lors de l'utilisation du ticket");
            playError.play();
            setModalOpened(false);
            setStudentData(null);
            setScannedCode(null);
            },
     });

     const {mutate:fetchStudent, isPending: isFetchingStudent} = useMutation({
        mutationFn: (code:string) => compteService.byCode(code),
        onSuccess: (data:Compte) => {
           if(data && data.est_perdu){
                message.error("Carte perdue Signalement");
                playError.play();
            }
            setStudentData(data);
            setModalOpened(true);
        },
        onError: () => {
            message.error("Impossible de récupérer les informations de l'étudiant");
            playError.play();
        }
     });


      const {data:hasConsumedToday, isLoading: isLoadingHasConsumedToday} = useQuery({
        queryKey: ['hasConsumedToday', studentData?._id, ticketId],
        queryFn: () => operationService.hasConsumedToday(studentData?._id!, ticketId),
        enabled: !!studentData && !!ticketId
     });


     useEffect(() => {
        if(hasConsumedToday?.hasConsumed){
            message.error("service déja utilisé");
            playError.play();
        }
     // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [hasConsumedToday?.hasConsumed]);


     const {data:operations,isLoading:isLoadingR} = useQuery({
      queryKey: [QUERY_KEYS.OPERATIONS_BY_TICKET,ticketId],
      queryFn: () => operationService.byTicket(ticketId),
      enabled: !!ticketId
   });

    const handleSymbol = (symbol: string) => {
        if(!symbol || symbol.length < 8) return;
        if(ticket && service){
           setScannedCode(symbol);
           fetchStudent(symbol);
        }
    };

    useSymbologyScanner(handleSymbol,{symbologies:['EAN 8','EAN 13','QR Code']})

      const handleValidateOperation = () => {
        if(scannedCode && studentData && ticket && service) {
            const data:any = {
                compte: studentData._id,
                montant: ticket?.prix || 0,
                ticket: ticketId,
                service: serviceId,
                agentControle: session?.user?.id
            };
            createUtilisation(data);
        }
      };

   const Notification = memo(({operation}: { operation: Operation }) => {
  return (
    <figure
      className={cn(
        "relative mx-auto min-h-fit w-full max-w-[400px] cursor-pointer overflow-hidden rounded-xl p-4",
        "transition-all duration-300 ease-in-out hover:scale-[102%] hover:shadow-lg",
        "bg-linear-to-br from-white to-blue-50 border border-blue-100",
        "dark:from-gray-800 dark:to-gray-900 dark:border-gray-700"
      )}
    >
      <div className="flex flex-row items-center gap-4">
        <div className="relative">
          <Avatar 
            src={`${env.VITE_APP_BACKURL_ETUDIANT}/${operation.compte?.etudiant?.avatar}`} 
            size={56} 
            className="border-2 border-blue-400 shadow-md"
          />
          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
            <FaCheckCircle className="text-white text-xs" />
          </div>
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-base font-semibold text-gray-800 dark:text-white truncate">
              {operation.compte?.etudiant?.prenom} {operation.compte?.etudiant?.nom}
            </span>
            <Badge 
              count={operation.type} 
              style={{ backgroundColor: '#52c41a' }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
            <FaClock className="text-blue-500" />
            <span>{dayjs(operation.createdAt).format('DD/MM/YYYY HH:mm')}</span>
          </div>
          <div className="flex items-center gap-1">
            <FaMoneyBillWave className="text-green-600" />
            <span className="text-lg font-bold text-green-600">
              {operation.montant.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>
      </div>
    </figure>
  )
},(prevProps, nextProps) => prevProps.operation._id === nextProps.operation._id)

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-blue-50 p-6">
         <Spin
       spinning={isLoadingTicket || isLoadingService || isLoadingR || isPending || isLoadingHasConsumedToday}
       size="large"
       className="backdrop-blur-sm"
     >
     <div className="mb-6">
         <div className="mb-4">
             <Button 
                icon={<FaArrowLeft />} 
                type="default" 
                size="large"
                className="shadow-sm hover:shadow-md transition-shadow"
                onClick={() => navigate({to: `/admin/controleurs/$serviceId`, params: {serviceId}})}
             >
                 Retour aux tickets
             </Button>
         </div>
         
         <Card className="bg-linear-to-r from-blue-500 to-blue-600 border-0 shadow-xl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
                        <FaTicketAlt className="text-4xl text-white" />
                    </div>
                    <div>
                        <Title level={2} className="text-white mb-1">
                            {service?.nom}
                        </Title>
                        <Title level={4} className="text-blue-100 mb-0 font-normal">
                            {ticket?.nom}
                        </Title>
                        {ticket?.description && (
                            <Text className="text-blue-50 text-sm mt-2 block">
                                {ticket?.description}
                            </Text>
                        )}
                    </div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
                    <div className="text-center">
                        <div className="text-blue-900 text-sm mb-1">Prix du ticket</div>
                        <div className="flex items-center gap-2">
                            <FaMoneyBillWave className="text-2xl text-white" />
                            <span className="text-4xl font-bold text-blue-900">
                                {ticket?.prix?.toLocaleString('fr-FR')}
                            </span>
                            <span className="text-xl text-blue-900">FCFA</span>
                        </div>
                    </div>
                </div>
            </div>
         </Card>
     </div>
    
    <div className="flex gap-6 h-full">
    <div className="w-7/12">
      <Card className="h-full shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center h-full">
            <div className="mb-6 text-center">
                <Title level={3} className="text-blue-600 mb-2">
                    Scannez le QR Code étudiant
                </Title>
                <Text type="secondary" className="text-base">
                    Positionnez le code-barres ou QR code devant le scanner
                </Text>
            </div>
            <div className="relative">
                <div className="absolute inset-0 bg-blue-400 blur-3xl opacity-20 animate-pulse"></div>
                <Image 
                    src="/qrcode.gif" 
                    className="relative z-10 rounded-2xl shadow-2xl"
                    preview={false}
                />
            </div>
            <div className="mt-6 flex gap-4">
                <Badge status="processing" text="En attente de scan" className="text-base" />
            </div>
        </div>
      </Card>
    </div>

   <div className="w-5/12">
   <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      {/* <Table
      dataSource={operations || []}
      loading={isLoadingR}
      rowKey="_id"
      pagination={{ pageSize: 10 }}
      columns={[
        {
          title: 'Date',
          dataIndex: 'createdAt',
          key: 'date',
          align: 'center',
          render: (createdAt: string) => dayjs(createdAt).format('DD/MM/YYYY')
        },
        {
          title: 'Heure',
          dataIndex: 'createdAt',
          key: 'heure',
          align: 'center',
          render: (createdAt: string) => dayjs(createdAt).format('HH:mm:ss')
        },
        {
          title: 'Type',
          dataIndex: 'type',
          key: 'type',
          align: 'center',
          render: (type: string) => type === 'RECHARGE' ? 'Recharge' : 'Utilisation'
        },
        {
          title: 'Ticket',
          dataIndex: 'ticket',
          key: 'ticket',
          align: 'center',
          render: (ticket: any) => ticket?.nom || 'N/A'
        },
        {
          title: 'Compte',
          dataIndex: 'compte',
          key: 'compte',
          align: 'center',
          render: (compte: Compte) => `${compte?.etudiant?.prenom || ``} ${compte?.etudiant?.nom || ``} ${compte?.etudiant?.ncs || ``}`.trim() || `N/A`
        },
        {
          title: 'Prix',
          key: 'prix',
          align: 'center',
          render: () => `${ticket?.prix?.toLocaleString(`fr-FR`) || 0} FCFA`
        }
      ]}
    /> */}
    <div className="mb-4">
        <Title level={4} className="text-gray-700 mb-4">
            📊 Statistiques en temps réel
        </Title>
        <div className="grid grid-cols-2 gap-4 mb-4">
            <Card className="bg-linear-to-br from-blue-50 to-blue-100 border-blue-200">
                <Statistic 
                    title={<span className="text-blue-700 font-medium">Total opérations</span>}
                    value={operations?.length || 0}
                    valueStyle={{ color: '#1677ff', fontSize: '2rem', fontWeight: 'bold' }}
                    prefix={<FaCheckCircle className="text-blue-500" />}
                />
            </Card>
            <Card className="bg-linear-to-br from-green-50 to-green-100 border-green-200">
                <Statistic 
                    title={<span className="text-green-700 font-medium">Montant total</span>}
                    value={operations?.reduce((sum: number, op: Operation) => sum + (op.montant || 0), 0) || 0}
                    suffix="FCFA"
                    valueStyle={{ color: '#52c41a', fontSize: '1.5rem', fontWeight: 'bold' }}
                    prefix={<FaMoneyBillWave className="text-green-500" />}
                />
            </Card>
        </div>
    </div>
    
    <Divider className="text-gray-600 font-semibold">
        <span className="font-semibold text-gray-600">Dernières opérations</span>
    </Divider>
    
    <div
      className={cn(
        "relative flex h-[400px] w-full flex-col overflow-hidden rounded-lg bg-linear-to-b from-gray-50 to-white p-3",
      )}
    >
      {operations && operations.length > 0 ? (
        <>
          <AnimatedList>
            {operations?.map((item:Operation) => (
              <Notification operation={item} key={item._id} />
            ))}
          </AnimatedList>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-white to-transparent"></div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <FaTicketAlt className="text-6xl mb-4 opacity-30" />
          <Text type="secondary" className="text-lg">Aucune opération pour le moment</Text>
        </div>
      )}
    </div>

      </Card>
      </div>
     </div>

     {/* Modal de validation */}
     <Modal
        open={modalOpened}
        onCancel={() => {
            setModalOpened(false);
            setStudentData(null);
            setScannedCode(null);
        }}
        title={
            <div className="flex items-center gap-2">
                <FaCheckCircle className="text-blue-600 text-lg" />
                <span className="text-lg font-semibold text-gray-800">Validation de l'opération</span>
            </div>
        }
        width={700}
        centered
        footer={null}
        className="custom-modal"
     >
        <Spin spinning={isFetchingStudent || isPending}>
        
        {studentData && (
            <div className="space-y-3 mt-3">
                <div className="bg-linear-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                        <span>👤</span> Informations de l'étudiant
                    </div>
                    
                    {hasConsumedToday?.hasConsumed && (
                        <div className="mb-3 p-2 bg-linear-to-r from-orange-100 to-red-100 border-l-4 border-orange-500 rounded">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">⚠️</span>
                                <Text strong className="text-orange-800 text-sm">
                                    Déjà utilisé aujourd'hui
                                </Text>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex gap-3">
                        <div className="shrink-0">
                            <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden border-2 border-blue-400">
                                {studentData?.etudiant?.avatar ? (
                                    <Image
                                        src={env.VITE_APP_BACKURL_ETUDIANT + '/'+ studentData.etudiant.avatar}
                                        alt={`Photo de ${studentData.etudiant.prenom} ${studentData.etudiant.nom}`}
                                        width={80}
                                        height={80}
                                        fallback="/default-avatar.png"
                                        preview={false}
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-gray-200 to-gray-300">
                                        <Text type="secondary" className="text-sm">Pas de photo</Text>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex-1">
                            <div className="text-base font-semibold text-blue-700 mb-1">
                                {studentData?.etudiant?.prenom} {studentData?.etudiant?.nom}
                            </div>
                            <Text type="secondary" className="text-xs block mb-2">
                                📋 {studentData?.etudiant?.ncs || 'N/A'}
                            </Text>
                            <Badge 
                                color={studentData?.is_actif ? 'green' : 'red'} 
                                count={studentData?.is_actif ? 'Actif' : 'Inactif'}
                                className="text-xs"
                            />
                        </div>
                        <div className="text-right">
                            <Text type="secondary" className="text-xs block mb-1">💰 Solde</Text>
                            <div className={cn(
                                "text-xl font-bold",
                                (studentData?.solde || 0) >= (ticket?.prix || 0) ? "text-green-600" : "text-red-600"
                            )}>
                                {(studentData?.solde || 0).toLocaleString('fr-FR')}
                            </div>
                            <span className="text-xs text-gray-600">FCFA</span>
                        </div>
                    </div>
                    
                </div>
                
                <div className="bg-linear-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                    <div className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                        <span>📝</span> Détails de l'opération
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 bg-white rounded">
                            <Text type="secondary" className="text-sm">🏢 Service</Text>
                            <Text strong className="text-sm text-gray-800">{service?.nom}</Text>
                        </div>
                        
                        <div className="flex justify-between items-center p-2 bg-white rounded">
                            <Text type="secondary" className="text-sm">🎫 Ticket</Text>
                            <Text strong className="text-sm text-gray-800">{ticket?.nom}</Text>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 bg-linear-to-r from-green-100 to-green-200 rounded border border-green-300">
                            <Text strong className="text-sm text-green-800">💵 Prix</Text>
                            <div className="flex items-center gap-1">
                                <span className="text-lg font-bold text-green-700">
                                    {(ticket?.prix || 0).toLocaleString('fr-FR')}
                                </span>
                                <span className="text-sm font-semibold text-green-600">FCFA</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200">
                    <Button 
                        onClick={() => {
                            setModalOpened(false);
                            setStudentData(null);
                            setScannedCode(null);
                        }}
                        className="px-4"
                    >
                        ✕ Annuler
                    </Button>
                    <Button 
                        type="primary"
                        className="px-6"
                        style={{ 
                            backgroundColor: '#52c41a', 
                            borderColor: '#52c41a',
                            fontWeight: 600
                        }}
                        onClick={handleValidateOperation}
                        disabled={!studentData?.is_actif || (studentData?.solde || 0) < (ticket?.prix || 0) || hasConsumedToday?.hasConsumed}
                    >
                        ✓ Valider l'opération
                    </Button>
                </div>
            </div>
        )
        }
        </Spin>
     </Modal>
     </Spin>
    </div>
  )
}
