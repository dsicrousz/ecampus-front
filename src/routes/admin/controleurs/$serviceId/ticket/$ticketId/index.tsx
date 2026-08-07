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
import { message, Spin, Modal, Image, Avatar } from 'antd';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { queryKeys } from '@/constants';
import type { Compte } from '@/types/compte';
import { useSession } from '@/auth/auth-client';
import type { Operation } from '@/types/operation';
import { env } from '@/env';
import { requireRole } from '@/lib/route-protection';
import { USER_ROLE } from '@/types/user.roles';
import { cn } from '@/lib/utils';
import type { AxiosError } from 'axios';
import { AnimatedList } from '@/components/ui/animated-list';


dayjs.extend(isBetween);

export const Route = createFileRoute(
  '/admin/controleurs/$serviceId/ticket/$ticketId/',
)({
  beforeLoad: () => requireRole([USER_ROLE.CONTROLEUR, USER_ROLE.CHEF_DIV_RESTAURANT, USER_ROLE.SUPERADMIN]),
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
        queryKey: ['service', serviceId], 
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
        "group relative w-full overflow-hidden rounded-2xl border border-border bg-card p-4",
        "transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/5"
      )}
    >
      <span className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
      <div className="flex items-center gap-4 pl-2">
        <div className="relative shrink-0">
          <Avatar
            src={`${env.VITE_APP_BACKURL_ETUDIANT}/${operation.compte?.etudiant?.avatar}`}
            size={52}
            className="ring-2 ring-border"
          />
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card">
            <FaCheckCircle className="text-[10px] text-white" />
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-foreground">
              {operation.compte?.etudiant?.prenom} {operation.compte?.etudiant?.nom}
            </span>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
              {operation.type}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <FaClock className="text-muted-foreground/60" />
              {dayjs(operation.createdAt).format('DD/MM/YYYY HH:mm')}
            </span>
            <span className="flex items-baseline gap-1 font-bold text-emerald-600">
              <span className="text-base">{operation.montant.toLocaleString('fr-FR')}</span>
              <span className="text-[10px] font-semibold text-emerald-500">FCFA</span>
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
     >
     <div className="mb-6">
         <button
            type="button"
            onClick={() => navigate({to: '/admin/controleurs'})}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary active:scale-95"
         >
            <FaArrowLeft className="text-xs" />
            Retour aux services
         </button>

         <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 shadow-xl">

            <div className="relative flex flex-wrap items-center justify-between gap-8">
                <div className="flex items-center gap-5">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20 backdrop-blur">
                        <FaTicketAlt className="text-3xl" />
                    </div>
                    <div className="min-w-0">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-300 ring-1 ring-emerald-400/25">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                            Contrôle ticket
                        </span>
                        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                            {service?.nom || '—'}
                        </h1>
                        <p className="mt-0.5 text-base font-semibold text-white/70">
                            {ticket?.nom || '—'}
                        </p>
                        {ticket?.description && (
                            <p className="mt-2 max-w-lg text-sm text-white/50">
                                {ticket.description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl bg-white/10 px-6 py-5 text-center ring-1 ring-white/20 backdrop-blur">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50">
                        Prix du ticket
                    </p>
                    <div className="mt-1 flex items-baseline justify-center gap-2">
                        <FaMoneyBillWave className="self-center text-xl text-emerald-300" />
                        <span className="text-4xl font-black tracking-tight text-white">
                            {ticket?.prix?.toLocaleString('fr-FR') ?? '—'}
                        </span>
                        <span className="text-sm font-bold text-emerald-300">FCFA</span>
                    </div>
                </div>
            </div>
         </div>
     </div>

    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
    <div>
      <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-border bg-card p-8 shadow-sm">
            <div className="mb-6 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700 ring-1 ring-emerald-200">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    Scanner actif
                </span>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                    Scannez le QR Code étudiant
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Positionnez le code-barres ou QR code devant le scanner
                </p>
            </div>

            <div className="relative rounded-3xl bg-muted p-6 ring-1 ring-border">
                <span className="absolute left-4 top-4 h-6 w-6 rounded-tl-xl border-l-2 border-t-2 border-emerald-400" />
                <span className="absolute right-4 top-4 h-6 w-6 rounded-tr-xl border-r-2 border-t-2 border-emerald-400" />
                <span className="absolute bottom-4 left-4 h-6 w-6 rounded-bl-xl border-b-2 border-l-2 border-emerald-400" />
                <span className="absolute bottom-4 right-4 h-6 w-6 rounded-br-xl border-b-2 border-r-2 border-emerald-400" />
                <Image
                    src="/qrcode.gif"
                    className="max-w-[320px] rounded-2xl"
                    preview={false}
                />
            </div>

            <div className="mt-6 flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
                </span>
                <span className="text-sm font-semibold text-foreground">En attente de scan</span>
            </div>
      </div>
    </div>

   <div className="flex flex-col gap-6">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
            <span className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
            <div className="flex items-start justify-between gap-3 pl-2">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                        Total opérations
                    </p>
                    <p className="mt-2 text-4xl font-black tracking-tight text-foreground">
                        {operations?.length || 0}
                    </p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-200">
                    <FaCheckCircle />
                </span>
            </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
            <span className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
            <div className="flex items-start justify-between gap-3 pl-2">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                        Montant total
                    </p>
                    <p className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-3xl font-black tracking-tight text-emerald-600">
                            {(operations?.reduce((sum: number, op: Operation) => sum + (op.montant || 0), 0) || 0).toLocaleString('fr-FR')}
                        </span>
                        <span className="text-xs font-bold text-emerald-500">FCFA</span>
                    </p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                    <FaMoneyBillWave />
                </span>
            </div>
        </div>
    </div>

    <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    Temps réel
                </p>
                <h3 className="text-base font-bold text-foreground">Dernières opérations</h3>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                {operations?.length || 0}
            </span>
        </div>

        <div className="relative h-[460px] overflow-hidden p-4">
          {operations && operations.length > 0 ? (
            <>
              <AnimatedList>
                {operations?.map((item:Operation) => (
                  <Notification operation={item} key={item._id} />
                ))}
              </AnimatedList>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-card/80" />
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground/60">
              <FaTicketAlt className="mb-4 text-6xl opacity-25" />
              <p className="text-sm font-medium">Aucune opération pour le moment</p>
              <p className="mt-1 text-xs">Les scans apparaîtront ici en direct</p>
            </div>
          )}
        </div>
    </div>
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
            <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                    <FaCheckCircle />
                </span>
                <span className="text-base font-bold text-foreground">Validation de l'opération</span>
            </div>
        }
        width={720}
        centered
        footer={null}
        className="custom-modal"
     >
        <Spin spinning={isFetchingStudent || isPending}>

        {studentData && (
            <div className="mt-4 space-y-4">
                {hasConsumedToday?.hasConsumed && (
                    <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-lg">⚠️</span>
                        <div>
                            <p className="text-sm font-bold text-orange-900">Ticket déjà utilisé aujourd'hui</p>
                            <p className="text-xs text-orange-700">Cet étudiant a déjà consommé ce ticket</p>
                        </div>
                    </div>
                )}

                <section className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="border-b border-border bg-muted px-4 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                            Informations de l'étudiant
                        </p>
                    </div>

                    <div className="flex items-center gap-4 p-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-muted ring-2 ring-border">
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
                                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground/60">
                                    Pas de photo
                                </div>
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="truncate text-lg font-bold text-foreground">
                                {studentData?.etudiant?.prenom} {studentData?.etudiant?.nom}
                            </p>
                            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                {studentData?.etudiant?.ncs || 'N/A'}
                            </p>
                            <span className={cn(
                                "mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1",
                                studentData?.is_actif
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                    : "bg-red-50 text-red-700 ring-red-200"
                            )}>
                                <span className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    studentData?.is_actif ? "bg-emerald-500" : "bg-red-500"
                                )} />
                                {studentData?.is_actif ? 'Actif' : 'Inactif'}
                            </span>
                        </div>

                        <div className="shrink-0 rounded-2xl bg-muted px-4 py-3 text-right ring-1 ring-border">
                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                                Solde
                            </p>
                            <p className={cn(
                                "mt-1 text-2xl font-black tracking-tight",
                                (studentData?.solde || 0) >= (ticket?.prix || 0) ? "text-emerald-600" : "text-red-600"
                            )}>
                                {(studentData?.solde || 0).toLocaleString('fr-FR')}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground">FCFA</p>
                        </div>
                    </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="border-b border-border bg-muted px-4 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                            Détails de l'opération
                        </p>
                    </div>

                    <div className="divide-y divide-border">
                        <div className="flex items-center justify-between px-4 py-3">
                            <span className="text-xs font-semibold text-muted-foreground">Service</span>
                            <span className="text-sm font-bold text-foreground">{service?.nom}</span>
                        </div>

                        <div className="flex items-center justify-between px-4 py-3">
                            <span className="text-xs font-semibold text-muted-foreground">Ticket</span>
                            <span className="text-sm font-bold text-foreground">{ticket?.nom}</span>
                        </div>

                        <div className="flex items-center justify-between bg-emerald-50/50 px-4 py-4">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                                Montant à débiter
                            </span>
                            <span className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-black tracking-tight text-emerald-700">
                                    {(ticket?.prix || 0).toLocaleString('fr-FR')}
                                </span>
                                <span className="text-xs font-bold text-emerald-600">FCFA</span>
                            </span>
                        </div>
                    </div>
                </section>

                <div className="flex justify-end gap-3 border-t border-border pt-4">
                    <button
                        type="button"
                        onClick={() => {
                            setModalOpened(false);
                            setStudentData(null);
                            setScannedCode(null);
                        }}
                        className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted active:scale-95"
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={handleValidateOperation}
                        disabled={!studentData?.is_actif || (studentData?.solde || 0) < (ticket?.prix || 0) || hasConsumedToday?.hasConsumed}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition active:scale-95",
                            (!studentData?.is_actif || (studentData?.solde || 0) < (ticket?.prix || 0) || hasConsumedToday?.hasConsumed)
                                ? "cursor-not-allowed bg-muted-foreground/30"
                                : "bg-emerald-600 shadow-lg shadow-emerald-600/25 hover:bg-emerald-700"
                        )}
                    >
                        <FaCheckCircle />
                        Valider l'opération
                    </button>
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
