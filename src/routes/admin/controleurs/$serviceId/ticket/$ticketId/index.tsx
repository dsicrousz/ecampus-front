import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OperationService } from '@/services/operation.service';
import { useSymbologyScanner } from '@use-symbology-scanner/react';
import { memo, useEffect, useMemo, useState } from 'react';
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
import { queryKeys } from '@/constants';
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
     const playSuccess = useMemo(() => new Howl({
      src: [success],
      autoplay:false
    }), []);
      const playError = useMemo(() => new Howl({
      src: [error],
      autoplay:false
    }), []);
    const [scannedCode, setScannedCode] = useState<string | null>(null);
    const [studentData, setStudentData] = useState<Compte | null>(null);
    const [modalOpened, setModalOpened] = useState(false);
    const ticketService = useMemo(() => new TicketService(), []);
    const serviceService = useMemo(() => new ServiceService(), []);
    const compteService = useMemo(() => new CompteService(), []);

  // Responsive routing: redirect to mobile on tablet and smaller screens
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 992) {
        navigate({ to: '/admin/controleurs/$serviceId/ticket/$ticketId/mobile', params: { serviceId, ticketId } });
      }
    };

    // Check initial screen size
    checkScreenSize();

    // Add resize listener
    const handleResize = () => {
      checkScreenSize();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [navigate, serviceId, ticketId]);
    
    const {data:ticket, isLoading: isLoadingTicket} = useQuery({ 
        queryKey: queryKeys.ticketDetail(ticketId), 
        queryFn: () => ticketService.getOne(ticketId) 
    });
    
    const {data:service, isLoading: isLoadingService} = useQuery({ 
        queryKey: queryKeys.serviceDetail(serviceId), 
        queryFn: () => serviceService.getOne(serviceId),
        enabled: !!serviceId
    });
    
     const operationService = useMemo(() => new OperationService(), []);


     const {mutate:createUtilisation,isPending} = useMutation({
        mutationFn: (data:Partial<Operation>) => operationService.utilisation(data),
        onSuccess: () => {
         qc.invalidateQueries({queryKey: queryKeys.operationsByTicket(ticketId)});
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
        queryKey: queryKeys.hasConsumedToday(studentData?._id!, ticketId),
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
      queryKey: queryKeys.operationsByTicket(ticketId),
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
        "relative mx-auto min-h-fit w-full max-w-[400px] cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white p-4",
        "transition-all duration-300 ease-in-out hover:scale-[102%] hover:shadow-lg",
        "dark:border-gray-700 dark:bg-gray-900"
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
    <div className="controller-page">
         <Spin
       spinning={isLoadingTicket || isLoadingService || isLoadingR || isPending || isLoadingHasConsumedToday}
       size="large"
       className="backdrop-blur-sm"
     >
     <div className="mb-6">
         <div className="mb-5">
             <Button 
                icon={<FaArrowLeft />} 
                type="default" 
                size="large"
                className="controller-back-button"
                onClick={() => navigate({to: `/admin/controleurs/$serviceId`, params: {serviceId}})}
             >
                 Retour aux tickets
             </Button>
         </div>
         
         <Card className="controller-hero border-0 shadow-xl">
            <div className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-4">
                    <div className="controller-hero-icon">
                        <FaTicketAlt className="text-4xl" />
                    </div>
                    <div>
                        <Text className="controller-hero-eyebrow">
                            Contrôle ticket
                        </Text>
                        <Title level={2} className="controller-hero-title">
                            {service?.nom}
                        </Title>
                        <Title level={4} className="controller-hero-subtitle">
                            {ticket?.nom}
                        </Title>
                        {ticket?.description && (
                            <Text className="controller-hero-copy mt-2 block">
                                {ticket?.description}
                            </Text>
                        )}
                    </div>
                </div>
                <div className="controller-price-card">
                    <div className="text-center">
                        <div className="controller-price-label">Prix du ticket</div>
                        <div className="flex items-center gap-2">
                            <FaMoneyBillWave className="text-2xl text-emerald-300" />
                            <span className="controller-price-value">
                                {ticket?.prix?.toLocaleString('fr-FR')}
                            </span>
                            <span className="controller-price-currency">FCFA</span>
                        </div>
                    </div>
                </div>
            </div>
         </Card>
     </div>
    
    <div className="controller-desktop-grid">
    <div>
      <Card className="controller-panel h-full">
        <div className="flex flex-col items-center justify-center h-full min-h-[560px]">
            <div className="mb-6 text-center">
                <div className="controller-section-kicker">Scanner actif</div>
                <Title level={3} className="controller-section-title">
                    Scannez le QR Code étudiant
                </Title>
                <Text type="secondary" className="text-base">
                    Positionnez le code-barres ou QR code devant le scanner
                </Text>
            </div>
            <div className="controller-scan-frame">
                <Image 
                    src="/qrcode.gif" 
                    className="controller-scan-image"
                    preview={false}
                />
            </div>
            <div className="controller-scan-status">
                <Badge status="processing" text="En attente de scan" className="text-base" />
            </div>
        </div>
      </Card>
    </div>

   <div>
   <Card className="controller-panel">
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
    <div className="mb-5">
        <div className="flex items-center justify-between mb-4">
        <Title level={4} className="controller-section-title mb-0">
            📊 Statistiques en temps réel
        </Title>
        <Badge count={`${operations?.length || 0} opérations`} style={{ backgroundColor: '#0f172a' }} />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
            <Card className="controller-stat-card">
                <Statistic 
                    title={<span className="text-blue-700 font-medium">Total opérations</span>}
                    value={operations?.length || 0}
                    valueStyle={{ color: '#1677ff', fontSize: '2rem', fontWeight: 'bold' }}
                    prefix={<FaCheckCircle className="text-blue-500" />}
                />
            </Card>
            <Card className="controller-stat-card">
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
        "controller-activity relative flex h-[400px] w-full flex-col overflow-hidden rounded-lg p-3",
      )}
    >
      {operations && operations.length > 0 ? (
        <>
          <AnimatedList>
            {operations?.map((item:Operation) => (
              <Notification operation={item} key={item._id} />
            ))}
          </AnimatedList>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-white/80"></div>
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
                <div className="controller-modal-section">
                    <div className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                        <span>👤</span> Informations de l'étudiant
                    </div>
                    
                    {hasConsumedToday?.hasConsumed && (
                        <div className="mb-3 rounded border border-orange-200 bg-orange-50 p-2">
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
                                    <div className="flex h-full w-full items-center justify-center bg-slate-200">
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
                
                <div className="controller-modal-section">
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
                        
                        <div className="flex justify-between items-center rounded border border-green-200 bg-green-50 p-3">
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
