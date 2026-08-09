import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OperationService } from '@/services/operation.service';
import { memo, useEffect, useMemo, useState } from 'react';
import { FaArrowLeft, FaTicketAlt, FaMoneyBillWave, FaCheckCircle, FaClock, FaQrcode, FaTimes, FaUser, FaIdCard, FaWallet, FaExclamationTriangle } from 'react-icons/fa';
import { Scanner } from '@yudiel/react-qr-scanner';
import { ServiceService } from '@/services/service.service';
import { TicketService } from '@/services/ticket.service';
import { CompteService } from '@/services/compte.service';
import {Howl} from 'howler';
import success from '../../../../success.mp3';
import error from '../../../../error.mp3';
import { message, Spin, Modal, Image } from 'antd';
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
import { requireRole } from '@/lib/route-protection';
import { USER_ROLE } from '@/types/user.roles';


dayjs.extend(isBetween);

export const Route = createFileRoute(
  '/admin/controleurs/$serviceId/ticket/$ticketId/mobile/',
)({
  beforeLoad: () => requireRole([USER_ROLE.CONTROLEUR, USER_ROLE.CHEF_DIV_RESTAURANT, USER_ROLE.SUPERADMIN]),
  component: RouteComponent,
})

function RouteComponent() {
 const {serviceId, ticketId} = Route.useParams();
   const navigate = useNavigate();
   const {data:session} = useSession();
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
    const [scannerOpened, setScannerOpened] = useState(false);
    const ticketService = useMemo(() => new TicketService(), []);
    const serviceService = useMemo(() => new ServiceService(), []);
    const compteService = useMemo(() => new CompteService(), []);
    
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
                message.error("Carte perdue Signalement",5);
                playError.play();
            }
            console.log("data", data);
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


     console.log("hasConsumedToday", hasConsumedToday);


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

    const handleScan = (detectedCodes: any) => {
        if (detectedCodes && detectedCodes.length > 0) {
            const code = detectedCodes[0].rawValue;
            if (code && code.length >= 8 && ticket && service) {
                setScannedCode(code);
                setScannerOpened(false);
                fetchStudent(code);
            }
        }
    };

    const handleScanError = (error: any) => {
        console.error('Erreur de scan:', error);
    };

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
        "relative w-full overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm",
        "transition-all duration-300 ease-in-out hover:shadow-md"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <img
            src={`${env.VITE_R2_URL}/${operation.compte?.etudiant?.avatar}`}
            alt={`${operation.compte?.etudiant?.prenom ?? ''} ${operation.compte?.etudiant?.nom ?? ''}`}
            className="h-12 w-12 rounded-full border-2 border-border object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
          />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow ring-2 ring-white">
            <FaCheckCircle className="text-[10px]" />
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-foreground">
              {operation.compte?.etudiant?.prenom} {operation.compte?.etudiant?.nom}
            </span>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
              {operation.type}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <FaClock className="text-muted-foreground/70" />
            <span>{dayjs(operation.createdAt).format('DD/MM/YYYY HH:mm')}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <FaMoneyBillWave className="text-emerald-600" />
            <span className="text-base font-bold text-emerald-700">
              {operation.montant.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>
      </div>
    </figure>
  )
},(prevProps, nextProps) => prevProps.operation._id === nextProps.operation._id)

  const totalMontant = operations?.reduce((sum: number, op: Operation) => sum + (op.montant || 0), 0) || 0;
  const studentSolde = studentData?.solde || 0;
  const ticketPrice = ticket?.prix || 0;
  const soldeSuffisant = studentSolde >= ticketPrice;
  const canValidate = !!studentData?.is_actif && soldeSuffisant && !hasConsumedToday?.hasConsumed;

  return (
    <div className="min-h-screen bg-background pb-28">
         <Spin
       spinning={isLoadingTicket || isLoadingService || isLoadingR || isPending || isLoadingHasConsumedToday}
       size="large"
     >

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-card">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate({ to: '/admin/controleurs' })}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground active:scale-95"
            aria-label="Retour"
          >
            <FaArrowLeft />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Contrôle ticket
            </p>
            <p className="truncate text-sm font-bold text-foreground">
              {service?.nom || '—'}
            </p>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1',
              ticket
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : 'bg-muted text-muted-foreground ring-border',
            )}
          >
            {ticket ? 'Prêt' : '...'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 pt-4">
        {/* Ticket card */}
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <FaTicketAlt />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ticket</p>
              <p className="truncate text-base font-bold text-foreground">{ticket?.nom || '—'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Prix du ticket
              </p>
              <p className="mt-0.5 text-3xl font-black tracking-tight text-foreground">
                {ticketPrice.toLocaleString('fr-FR')}
                <span className="ml-1 text-sm font-bold text-muted-foreground">FCFA</span>
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
              <FaMoneyBillWave className="text-xl" />
            </div>
          </div>
        </section>

        {/* Scan CTA */}
        <button
          type="button"
          onClick={() => setScannerOpened(true)}
          disabled={!ticket || !service}
          className={cn(
            'group relative flex w-full items-center justify-center gap-3 rounded-3xl px-4 py-5 text-base font-bold text-white shadow-sm transition active:scale-[0.98]',
            !ticket || !service
              ? 'bg-muted-foreground/30 shadow-none'
              : 'bg-emerald-600 hover:bg-emerald-700',
          )}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <FaQrcode className="text-xl" />
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span className="text-sm font-semibold uppercase tracking-wider text-white/80">
              Action principale
            </span>
            <span className="text-lg">Scanner le QR code</span>
          </span>
        </button>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Opérations
            </p>
            <div className="mt-1 flex items-center gap-2">
              <FaCheckCircle className="text-primary" />
              <p className="text-2xl font-black text-foreground">{operations?.length || 0}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Montant total
            </p>
            <div className="mt-1 flex items-center gap-2">
              <FaMoneyBillWave className="text-emerald-600" />
              <p className="text-lg font-black text-foreground">
                {totalMontant.toLocaleString('fr-FR')}
                <span className="ml-1 text-xs font-bold text-muted-foreground">FCFA</span>
              </p>
            </div>
          </div>
        </section>

        {/* Recent operations */}
        <section className="rounded-3xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-sm font-bold text-foreground">Dernières opérations</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              {operations?.length || 0}
            </span>
          </div>
          <div className="relative h-[360px] overflow-hidden px-3 pb-3">
            {operations && operations.length > 0 ? (
              <>
                <AnimatedList>
                  {operations?.map((item: Operation) => (
                    <Notification operation={item} key={item._id} />
                  ))}
                </AnimatedList>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-white/85" />
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground/70">
                <FaTicketAlt className="mb-3 text-5xl opacity-40" />
                <p className="text-sm">Aucune opération pour le moment</p>
              </div>
            )}
          </div>
        </section>

        {/* Historique des opérations - Liste détaillée */}
        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-200">
              <FaWallet className="text-sm" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Historique
              </p>
              <p className="text-sm font-bold text-foreground">Opérations effectuées</p>
            </div>
          </div>

          {/* Liste des opérations */}
          <div className="space-y-2">
            {operations && operations.length > 0 ? (
              operations.slice(0, 10).map((operation: Operation) => (
                <div
                  key={operation._id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-slate-50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-foreground">
                      {operation.compte?.etudiant?.prenom} {operation.compte?.etudiant?.nom}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <FaClock className="text-muted-foreground/70" />
                      {dayjs(operation.createdAt).format('DD/MM HH:mm')}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-foreground">
                      {operation.type}
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-emerald-600">
                      -{operation.montant.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                      <FaCheckCircle className="text-[8px]" />
                      Effectué
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-muted-foreground">Aucune opération</p>
            )}
          </div>
        </section>
      </main>

     {/* Modal Scanner QR Code */}
     <Modal
        open={scannerOpened}
        onCancel={() => setScannerOpened(false)}
        title={
          <div className="flex items-center gap-2">
            <FaQrcode className="text-emerald-600 text-lg" />
            <span className="text-base font-semibold text-slate-800">Scanner le QR Code</span>
          </div>
        }
        width="95%"
        style={{ maxWidth: 500 }}
        centered
        footer={null}
        className="qr-scanner-modal"
     >
        <div className="space-y-3">
          <p className="text-center text-sm text-muted-foreground">
            Positionnez le QR code de l'étudiant devant la caméra
          </p>

          <div className="relative aspect-square overflow-hidden rounded-2xl bg-black ring-1 ring-border">
            <Scanner
              onScan={handleScan}
              onError={handleScanError}
              constraints={{ facingMode: 'environment' }}
              components={{ finder: true }}
            />
          </div>

          <button
            type="button"
            onClick={() => setScannerOpened(false)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground active:scale-[0.98]"
          >
            <FaTimes /> Annuler
          </button>
        </div>
     </Modal>

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
                <FaCheckCircle className="text-emerald-600 text-lg" />
                <span className="text-base font-semibold text-foreground">Validation de l'opération</span>
            </div>
        }
        width="95%"
        style={{ maxWidth: 500 }}
        centered
        footer={null}
     >
        <Spin spinning={isFetchingStudent || isPending}>
          {studentData && (
            <div className="space-y-3">
              {/* Alerte déjà utilisé */}
              {hasConsumedToday?.hasConsumed && (
                <div className="flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-orange-800">
                  <FaExclamationTriangle className="shrink-0 text-lg" />
                  <p className="text-sm font-semibold">
                    Ticket déjà utilisé aujourd'hui par cet étudiant
                  </p>
                </div>
              )}

              {/* Carte étudiant */}
              <section className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-2 ring-border">
                    {studentData?.etudiant?.avatar ? (
                      <Image
                        src={`${env.VITE_R2_URL}/${studentData.etudiant.avatar}`}
                        alt={`${studentData.etudiant.prenom} ${studentData.etudiant.nom}`}
                        width={64}
                        height={64}
                        fallback="/default-avatar.png"
                        preview={false}
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground/70">
                        <FaUser />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-foreground">
                      {studentData?.etudiant?.prenom} {studentData?.etudiant?.nom}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FaIdCard className="text-muted-foreground/70" />
                      {studentData?.etudiant?.ncs || 'N/A'}
                    </p>
                    <span
                      className={cn(
                        'mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1',
                        studentData?.is_actif
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-red-50 text-red-700 ring-red-200',
                      )}
                    >
                      {studentData?.is_actif ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>

                {/* Solde */}
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-muted p-3 ring-1 ring-border">
                  <div className="flex items-center gap-2">
                    <FaWallet className="text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Solde
                    </p>
                  </div>
                  <p
                    className={cn(
                      'text-lg font-black',
                      soldeSuffisant ? 'text-emerald-600' : 'text-red-600',
                    )}
                  >
                    {studentSolde.toLocaleString('fr-FR')}
                    <span className="ml-1 text-xs font-bold text-muted-foreground">FCFA</span>
                  </p>
                </div>
              </section>

              {/* Détails opération */}
              <section className="rounded-2xl border border-border bg-card">
                <div className="border-b border-border px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Détails de l'opération
                  </p>
                </div>
                <div className="divide-y divide-border">
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-xs font-semibold text-muted-foreground">Service</span>
                    <span className="text-sm font-bold text-foreground">{service?.nom}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-xs font-semibold text-muted-foreground">Ticket</span>
                    <span className="text-sm font-bold text-foreground">{ticket?.nom}</span>
                  </div>
                  <div className="flex items-center justify-between bg-emerald-50/40 px-3 py-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      À débiter
                    </span>
                    <span className="text-lg font-black text-emerald-700">
                      {ticketPrice.toLocaleString('fr-FR')}
                      <span className="ml-1 text-xs font-bold">FCFA</span>
                    </span>
                  </div>
                </div>
              </section>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpened(false);
                    setStudentData(null);
                    setScannedCode(null);
                  }}
                  className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground active:scale-[0.98]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleValidateOperation}
                  disabled={!canValidate}
                  className={cn(
                    'rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-md transition active:scale-[0.98]',
                    canValidate
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'cursor-not-allowed bg-muted-foreground/30 shadow-none',
                  )}
                >
                  ✓ Valider
                </button>
              </div>
            </div>
          )}
        </Spin>
     </Modal>
     </Spin>
    </div>
  )
}
