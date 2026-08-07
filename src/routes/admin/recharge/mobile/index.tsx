import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  QrCode,
  X,
  Wallet,
  User,
  IdCard,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  Hourglass,
  XCircle,
  ArrowLeftRight,
} from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CompteService } from '@/services/compte.service';
import { OperationService } from '@/services/operation.service';
import { VendeurService } from '@/services/vendeurservice';
import { TransfertVersementService } from '@/services/transfert-versement.service';
import { TicketService } from '@/services/ticket.service';
import { useMemo, useState } from 'react';
import { validate } from 'uuid';
import { authClient } from '@/auth/auth-client';
import type { Compte } from '@/types/compte';
import type { Operation } from '@/types/operation';
import type { TransfertVersement } from '@/types/transfert-versement';
import { ETAT_TRANSFERT } from '@/types/transfert-versement';
import { formatMontant } from '@/types/operation';
import { env } from '@/env';
import { cn } from '@/lib/utils';
import { QUERY_KEYS, queryKeys } from '@/constants';
import dayjs from '@/config/dayjs.config';

interface RechargeData {
  compte: string;
  montant: number;
  agentControle: string;
  note: string;
}

export const Route = createFileRoute('/admin/recharge/mobile/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();
  const [openedRecharge, setOpenedRecharge] = useState(false);
  const [scannerOpened, setScannerOpened] = useState(false);
  const [montantRecharge, setMontantRecharge] = useState<number>(0);
  const [qr, setQr] = useState<string>();
  const [openedEchange, setOpenedEchange] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string>();
  const [quantiteEchange, setQuantiteEchange] = useState<number>(1);

  const qc = useQueryClient();
  const vendeurService = useMemo(() => new VendeurService(), []);
  const compteService = useMemo(() => new CompteService(), []);
  const operationService = useMemo(() => new OperationService(), []);
  const transfertVersementService = useMemo(() => new TransfertVersementService(), []);
  const ticketService = useMemo(() => new TicketService(), []);

  const soldeVendeurKey = ['solde', session?.user?.id];
  const operationKey = ['operations', session?.user?.id];
  const transfertsKey = ['transferts-vendeur', session?.user?.id];
  const ticketsKey = ['tickets', 'active'];
  const compteKey = qr
    ? queryKeys.compteByCode(qr)
    : ([QUERY_KEYS.COMPTES, 'code', 'pending'] as const);

  const { data: soldeData } = useQuery({
    queryKey: soldeVendeurKey,
    queryFn: () => vendeurService.getSolde(session!.user.id),
    enabled: !!session?.user?.id,
  });

  const { data } = useQuery<Compte>({
    queryKey: compteKey,
    queryFn: () => compteService.byCode(qr!),
    enabled: qr !== undefined,
  });

  const { data: operationsData } = useQuery<Operation[]>({
    queryKey: operationKey,
    queryFn: () => operationService.byAgent(session!.user.id),
    enabled: !!session?.user?.id,
  });

  const { data: mesTransferts } = useQuery<TransfertVersement[]>({
    queryKey: transfertsKey,
    queryFn: () => transfertVersementService.findByVendeur(session!.user.id),
    enabled: !!session?.user?.id,
  });

  const { data: activeTickets } = useQuery<any[]>({
    queryKey: ticketsKey,
    queryFn: () => ticketService.byActive(),
  });

  const { mutate: createRecharge, isPending: isPendingRecharge } = useMutation({
    mutationFn: (data: RechargeData) => operationService.recharge(data),
    onSuccess: () => {
      setOpenedRecharge(false);
      setMontantRecharge(0);
      setQr(undefined);
      if (qr) {
        qc.invalidateQueries({ queryKey: queryKeys.compteByCode(qr) });
      }
      qc.invalidateQueries({ queryKey: soldeVendeurKey });
    },
  });

  const { mutate: createEchange, isPending: isPendingEchange } = useMutation({
    mutationFn: (data: any) => operationService.echangeTicket(data),
    onSuccess: () => {
      setOpenedEchange(false);
      setSelectedTicket(undefined);
      setQuantiteEchange(1);
      if (qr) {
        qc.invalidateQueries({ queryKey: queryKeys.compteByCode(qr) });
      }
      qc.invalidateQueries({ queryKey: soldeVendeurKey });
      qc.invalidateQueries({ queryKey: operationKey });
    },
  });

  const handleEchange = () => {
    if (!selectedTicket) {
      return;
    }
    if (!quantiteEchange || quantiteEchange < 1) {
      return;
    }

    const echangeData = {
      compte: data?._id!,
      ticket: selectedTicket,
      agentControle: session?.user?.id!,
      quantite: quantiteEchange,
      montant: 0,
    };

    createEchange(echangeData);
  };

  const handleRecharge = () => {
    if (!montantRecharge || montantRecharge <= 0) {
      return;
    }

    const rechargeData: RechargeData = {
      compte: data?._id!,
      montant: montantRecharge,
      agentControle: session?.user?.id!,
      note: `Recharge effectuée par ${session?.user?.name}`
    };

    createRecharge(rechargeData);
  };

  const openRecharge = () => setOpenedRecharge(true);

  const handleScan = (detectedCodes: any) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const code = detectedCodes[0].rawValue;
      if (code && validate(code)) {
        setQr(code);
        setScannerOpened(false);
      }
    }
  };

  const handleScanError = (error: any) => {
    console.error('Erreur de scan:', error);
  };

  const studentSolde = data?.solde || 0;
  const nouveauSolde = studentSolde + montantRecharge;
  const canValidate = montantRecharge > 0 && !!data;
  const selectedTicketData = activeTickets?.find(t => t._id === selectedTicket);
  const montantEchange = (selectedTicketData?.prix || 0) * quantiteEchange;
  const nouveauSoldeEchange = studentSolde + montantEchange;
  const canValidateEchange = !!selectedTicket && quantiteEchange >= 1 && !!data;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-card">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate({ to: '/' })}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground active:scale-95"
            aria-label="Retour"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Espace vendeur
            </p>
            <p className="truncate text-sm font-bold text-foreground">Recharge de comptes</p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
            En ligne
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 pt-4">
        {/* Solde vendeur */}
        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Mon solde vendeur
              </p>
              <p className="mt-1 text-3xl font-black tracking-tight text-foreground">
                {formatMontant(soldeData|| 0)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
              <Wallet className="size-5" />
            </div>
          </div>
        </section>

        {/* Scan CTA */}
        <button
          type="button"
          onClick={() => setScannerOpened(true)}
          className="group relative flex w-full items-center justify-center gap-3 rounded-3xl bg-primary px-4 py-5 text-base font-bold text-white shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <QrCode className="size-5" />
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span className="text-sm font-semibold uppercase tracking-wider text-white/80">
              Action principale
            </span>
            <span className="text-lg">Scanner le QR code</span>
          </span>
        </button>

        {/* Carte étudiant ou empty state */}
        {data ? (
          <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-2 ring-border">
                {data.etudiant?.avatar ? (
                  <img
                    src={`${env.VITE_APP_BACKURL_ETUDIANT}/${data.etudiant.avatar}`}
                    alt={`${data.etudiant.prenom} ${data.etudiant.nom}`}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground/70">
                    <User className="size-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-foreground">
                  {data.etudiant?.prenom} {data.etudiant?.nom}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <IdCard className="size-4 text-muted-foreground/70" />
                  {data.etudiant?.ncs || 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Solde du compte
                </p>
                <p className="mt-0.5 text-2xl font-black tracking-tight text-emerald-600">
                  {formatMontant(studentSolde)}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                <Wallet className="size-5" />
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={openRecharge}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-[0.98]"
                >
                  <Plus className="size-5" />
                  Recharger
                </button>
                <button
                  type="button"
                  onClick={() => setOpenedEchange(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-cyan-700 active:scale-[0.98]"
                >
                  <ArrowLeftRight className="size-5" />
                  Échange
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground/70">
              <QrCode className="size-7" />
            </div>
            <p className="mt-3 text-sm font-bold text-foreground">En attente de scan</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Scannez un QR code étudiant pour commencer une recharge
            </p>
          </section>
        )}

        {/* Section Transferts vers Recouvreur */}
        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600 ring-1 ring-orange-200">
                <Send className="size-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Transferts
                </p>
                <p className="text-sm font-bold text-foreground">Vers Recouvreurs</p>
              </div>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-xl bg-muted p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                En attente
              </p>
              <p className="mt-1 text-lg font-black text-orange-600">
                {mesTransferts?.filter(t => t.etat === ETAT_TRANSFERT.EN_ATTENTE).length || 0}
              </p>
            </div>
            <div className="rounded-xl bg-muted p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Validés
              </p>
              <p className="mt-1 text-lg font-black text-emerald-600">
                {mesTransferts?.filter(t => t.etat === ETAT_TRANSFERT.VALIDE).length || 0}
              </p>
            </div>
            <div className="rounded-xl bg-muted p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total
              </p>
              <p className="mt-1 text-sm font-black text-foreground">
                {formatMontant(mesTransferts?.filter(t => t.etat === ETAT_TRANSFERT.VALIDE).reduce((acc, t) => acc + t.montant, 0) || 0)}
              </p>
            </div>
          </div>

          {/* Liste des transferts */}
          <div className="space-y-2">
            {mesTransferts && mesTransferts.length > 0 ? (
              mesTransferts.slice(0, 5).map((transfert) => (
                <div
                  key={transfert._id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-foreground">
                      {transfert.destination_acteur_name || 'Recouvreur'}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="size-3 text-muted-foreground/70" />
                      {dayjs(transfert.createdAt).format('DD/MM HH:mm')}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-foreground">
                      {formatMontant(transfert.montant)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {transfert.etat === ETAT_TRANSFERT.EN_ATTENTE && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-700 ring-1 ring-orange-200">
                        <Hourglass className="size-2" />
                        En attente
                      </span>
                    )}
                    {transfert.etat === ETAT_TRANSFERT.VALIDE && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                        <CheckCircle2 className="size-2" />
                        Validé
                      </span>
                    )}
                    {transfert.etat === ETAT_TRANSFERT.REFUSE && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700 ring-1 ring-red-200">
                        <XCircle className="size-2" />
                        Refusé
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-muted-foreground">Aucun transfert</p>
            )}
          </div>
        </section>

        {/* Section Opérations de Recharge */}
        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
              <Wallet className="size-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Historique
              </p>
              <p className="text-sm font-bold text-foreground">Recharges effectuées</p>
            </div>
          </div>

          {/* Liste des opérations */}
          <div className="space-y-2">
            {operationsData && operationsData.length > 0 ? (
              operationsData.slice(0, 5).map((operation) => (
                <div
                  key={operation._id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-foreground">
                      {operation.compte?.etudiant?.prenom} {operation.compte?.etudiant?.nom}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="size-3 text-muted-foreground/70" />
                      {dayjs(operation.createdAt).format('DD/MM HH:mm')}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-emerald-600">
                      +{formatMontant(operation.montant)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                      <CheckCircle2 className="size-2" />
                      Effectué
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-muted-foreground">Aucune recharge</p>
            )}
          </div>
        </section>
      </main>

      {/* Modal Scanner */}
      {scannerOpened && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setScannerOpened(false)}
        >
          <div
            className="w-full max-w-[500px] rounded-3xl bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="size-5 text-primary" />
                <span className="text-base font-semibold text-foreground">Scanner le QR Code</span>
              </div>
              <button
                type="button"
                onClick={() => setScannerOpened(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>
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
                <X className="size-5" /> Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Recharge */}
      {openedRecharge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setOpenedRecharge(false);
            setMontantRecharge(0);
          }}
        >
          <div
            className="w-full max-w-[500px] rounded-3xl bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="size-5 text-emerald-600" />
                <span className="text-base font-semibold text-foreground">Recharge de compte</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpenedRecharge(false);
                  setMontantRecharge(0);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-3">
              {data && (
                <section className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-2 ring-border">
                    {data.etudiant?.avatar ? (
                      <img
                        src={`${env.VITE_APP_BACKURL_ETUDIANT}/${data.etudiant.avatar}`}
                        alt={`${data.etudiant.prenom} ${data.etudiant.nom}`}
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground/70">
                        <User className="size-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {data.etudiant?.prenom} {data.etudiant?.nom}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <IdCard className="size-4 text-muted-foreground/70" />
                      {data.etudiant?.ncs || 'N/A'}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Solde :{' '}
                      </span>
                      <span className="font-bold text-emerald-600">
                        {formatMontant(studentSolde)}
                      </span>
                    </p>
                  </div>
                </section>
              )}

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Montant de la recharge
                </label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  placeholder="Entrez le montant"
                  value={montantRecharge || ''}
                  onChange={(e) => setMontantRecharge(Number(e.target.value) || 0)}
                  className="mt-1.5 w-full rounded-2xl border border-border bg-card px-4 py-3 text-base font-semibold text-foreground tabular-nums"
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">Montant minimum : 100 FCFA</p>
              </div>

              {canValidate && (
                <section className="overflow-hidden rounded-2xl border border-border bg-white">
                  <div className="border-b border-border px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Aperçu de la recharge
                    </p>
                  </div>
                  <div className="divide-y divide-border">
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-xs font-semibold text-muted-foreground">Solde actuel</span>
                      <span className="text-sm font-bold text-foreground">
                        {formatMontant(studentSolde)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-xs font-semibold text-muted-foreground">Montant à ajouter</span>
                      <span className="text-sm font-bold text-primary">
                        + {formatMontant(montantRecharge)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-emerald-50/40 px-3 py-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                        Nouveau solde
                      </span>
                      <span className="text-lg font-black text-emerald-700">
                        {formatMontant(nouveauSolde)}
                      </span>
                    </div>
                  </div>
                </section>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpenedRecharge(false);
                    setMontantRecharge(0);
                  }}
                  className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground active:scale-[0.98]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleRecharge}
                  disabled={!canValidate || isPendingRecharge}
                  className={cn(
                    'rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-md transition active:scale-[0.98]',
                    canValidate && !isPendingRecharge
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'cursor-not-allowed bg-muted-foreground/30 shadow-none',
                  )}
                >
                  {isPendingRecharge ? '...' : '✓ Valider'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Échange Tickets */}
      {openedEchange && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setOpenedEchange(false);
            setSelectedTicket(undefined);
            setQuantiteEchange(1);
          }}
        >
          <div
            className="w-full max-w-[500px] rounded-3xl bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="size-5 text-cyan-600" />
                <span className="text-base font-semibold text-foreground">Échange de Tickets</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpenedEchange(false);
                  setSelectedTicket(undefined);
                  setQuantiteEchange(1);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-3">
              {data && (
                <section className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-2 ring-border">
                    {data.etudiant?.avatar ? (
                      <img
                        src={`${env.VITE_APP_BACKURL_ETUDIANT}/${data.etudiant.avatar}`}
                        alt={`${data.etudiant.prenom} ${data.etudiant.nom}`}
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground/70">
                        <User className="size-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {data.etudiant?.prenom} {data.etudiant?.nom}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <IdCard className="size-4 text-muted-foreground/70" />
                      {data.etudiant?.ncs || 'N/A'}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Solde :{' '}
                      </span>
                      <span className="font-bold text-emerald-600">
                        {formatMontant(studentSolde)}
                      </span>
                    </p>
                  </div>
                </section>
              )}

              {/* Sélection du ticket */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ticket à échanger
                </label>
                <select
                  value={selectedTicket ?? ''}
                  onChange={(e) => setSelectedTicket(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-border bg-card px-4 py-3 text-base text-foreground"
                >
                  <option value="">Choisir un ticket</option>
                  {activeTickets?.map((ticket: any) => (
                    <option key={ticket._id} value={ticket._id}>
                      {ticket.nom} — {formatMontant(ticket.prix)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantité */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Quantité de tickets ramenés
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Nombre de tickets"
                  value={quantiteEchange || ''}
                  onChange={(e) => setQuantiteEchange(Number(e.target.value) || 1)}
                  className="mt-1.5 w-full rounded-2xl border border-border bg-card px-4 py-3 text-base font-semibold text-foreground tabular-nums"
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Le montant sera calculé automatiquement: prix du ticket × quantité
                </p>
              </div>

              {/* Aperçu de l'échange */}
              {canValidateEchange && (
                <section className="overflow-hidden rounded-2xl border border-border bg-white">
                  <div className="border-b border-border px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Aperçu de l'échange
                    </p>
                  </div>
                  <div className="divide-y divide-border">
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-xs font-semibold text-muted-foreground">Ticket</span>
                      <span className="text-sm font-bold text-foreground">
                        {selectedTicketData?.nom || '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-xs font-semibold text-muted-foreground">Prix unitaire</span>
                      <span className="text-sm font-bold text-foreground">
                        {formatMontant(selectedTicketData?.prix || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-xs font-semibold text-muted-foreground">Quantité</span>
                      <span className="text-sm font-bold text-foreground">
                        × {quantiteEchange}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-xs font-semibold text-muted-foreground">Montant à créditer</span>
                      <span className="text-sm font-bold text-cyan-600">
                        + {formatMontant(montantEchange)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-cyan-50/40 px-3 py-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-cyan-700">
                        Nouveau solde
                      </span>
                      <span className="text-lg font-black text-cyan-700">
                        {formatMontant(nouveauSoldeEchange)}
                      </span>
                    </div>
                  </div>
                </section>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpenedEchange(false);
                    setSelectedTicket(undefined);
                    setQuantiteEchange(1);
                  }}
                  className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground active:scale-[0.98]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleEchange}
                  disabled={!canValidateEchange || isPendingEchange}
                  className={cn(
                    'rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-md transition active:scale-[0.98]',
                    canValidateEchange && !isPendingEchange
                      ? 'bg-cyan-600 hover:bg-cyan-700'
                      : 'cursor-not-allowed bg-muted-foreground/30 shadow-none',
                  )}
                >
                  {isPendingEchange ? '...' : '✓ Valider'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
