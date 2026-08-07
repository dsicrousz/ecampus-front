import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  X,
  Loader2,
  Inbox,
} from 'lucide-react';
import { requireRole } from '@/lib/route-protection';
import { TransfertVersementService } from '@/services/transfert-versement.service';
import { UserService } from '@/services/user.service';
import { RecouvreurService } from '@/services/recouvreurservice';
import { authClient } from '@/auth/auth-client';
import type { TransfertVersement, TransfertRecouvreurCaissierPrincipalDto } from '@/types/transfert-versement';
import { EtatTransfertLabels, ETAT_TRANSFERT, TYPE_TRANSFERT } from '@/types/transfert-versement';
import type { User as UserType } from '@/types/user';
import { formatMontant } from '@/types/operation';
import { USER_ROLE } from '@/types/user.roles';
import { Card, CardContent, CardHeader, CardTitle, CardAction, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import dayjs from '@/config/dayjs.config';

export const Route = createFileRoute('/admin/recouvrement/')({
  beforeLoad: () => requireRole([USER_ROLE.RECOUVREUR, USER_ROLE.SUPERADMIN]),
  component: RouteComponent,
});

// ---- Statut badge -----------------------------------------------------------

const etatBadgeStyles: Record<ETAT_TRANSFERT, string> = {
  [ETAT_TRANSFERT.EN_ATTENTE]:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  [ETAT_TRANSFERT.VALIDE]:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  [ETAT_TRANSFERT.REFUSE]:
    'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
  [ETAT_TRANSFERT.ANNULE]:
    'bg-muted text-muted-foreground border-border',
};

function StatusBadge({ etat }: { etat: ETAT_TRANSFERT }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        etatBadgeStyles[etat]
      )}
    >
      {EtatTransfertLabels[etat]}
    </span>
  );
}

// ---- Stat card helper -------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accent: 'blue' | 'emerald' | 'amber' | 'red';
}

const statAccentMap = {
  blue: {
    icon: 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
    value: 'text-sky-600 dark:text-sky-400',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    value: 'text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    value: 'text-amber-600 dark:text-amber-400',
  },
  red: {
    icon: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
    value: 'text-red-600 dark:text-red-400',
  },
};

function StatCard({ label, value, subtitle, icon, accent }: StatCardProps) {
  const s = statAccentMap[accent];
  return (
    <Card className="group border-border/60 shadow-none transition-all duration-300 hover:shadow-md hover:border-border">
      <CardContent className="flex items-start justify-between gap-4 px-5 py-5">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className={cn('text-2xl font-bold tracking-tight tabular-nums', s.value)}>
            {value}
          </p>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110',
          s.icon
        )}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="border-border/60 shadow-none">
      <CardContent className="flex items-start justify-between gap-4 px-5 py-5">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="size-11 rounded-xl" />
      </CardContent>
    </Card>
  );
}

// ---- Mini stat card ---------------------------------------------------------

interface MiniStatCardProps {
  label: string;
  value: string | number;
  accent: 'blue' | 'emerald';
}

const miniStatAccentMap = {
  blue: 'text-sky-600 dark:text-sky-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
};

function MiniStatCard({ label, value, accent }: MiniStatCardProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 text-center transition-all duration-300 hover:shadow-md hover:border-border">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className={cn('mt-2 text-xl font-bold tabular-nums', miniStatAccentMap[accent])}>
        {value}
      </p>
    </div>
  );
}

function MiniStatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 text-center">
      <Skeleton className="mx-auto h-4 w-32" />
      <Skeleton className="mx-auto mt-2 h-6 w-20" />
    </div>
  );
}

// ---- Tab button -------------------------------------------------------------

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}

function TabButton({ active, onClick, icon, label, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {icon}
      {label}
      <span className={cn(
        'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums',
        active ? 'bg-primary-foreground/20' : 'bg-muted-foreground/15'
      )}>
        {count}
      </span>
    </button>
  );
}

// ---- Transfert recu row (transferts reçus des vendeurs) ---------------------

interface TransfertRecuRowProps {
  transfert: TransfertVersement;
  showActions: boolean;
  onValider?: (id: string) => void;
  onRefuser?: (id: string) => void;
  isPendingValider?: boolean;
  isPendingRefuser?: boolean;
}

function TransfertRecuRow({
  transfert,
  showActions,
  onValider,
  onRefuser,
  isPendingValider,
  isPendingRefuser,
}: TransfertRecuRowProps) {
  return (
    <div className="grid grid-cols-1 gap-3 border-b border-border/40 px-4 py-3.5 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_1.5fr_1fr_1.2fr_0.7fr_0.7fr] sm:items-center sm:gap-4">
      {/* Date */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="size-3.5 shrink-0" />
        <span className="tabular-nums">{transfert.createdAt ? dayjs(transfert.createdAt).format('DD/MM/YYYY HH:mm') : '-'}</span>
      </div>

      {/* Vendeur */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className="size-8 border border-border shrink-0">
          <AvatarFallback className="text-xs font-semibold">
            {transfert.source_acteur_name?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <span className="truncate text-sm font-medium text-foreground">
          {transfert.source_acteur_name || '-'}
        </span>
      </div>

      {/* Montant */}
      <div className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
        {formatMontant(transfert.montant)}
      </div>

      {/* Note */}
      <div className="truncate text-xs text-muted-foreground">
        {transfert.note || '-'}
      </div>

      {/* Statut */}
      <div>
        <StatusBadge etat={transfert.etat} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {showActions && transfert.etat === ETAT_TRANSFERT.EN_ATTENTE && (
          <>
            <Button
              size="icon-sm"
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => onValider?.(transfert._id)}
              disabled={isPendingValider}
              title="Valider ce transfert"
            >
              {isPendingValider ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
            </Button>
            <Button
              size="icon-sm"
              variant="destructive"
              onClick={() => onRefuser?.(transfert._id)}
              disabled={isPendingRefuser}
              title="Refuser ce transfert"
            >
              {isPendingRefuser ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <XCircle className="size-4" />
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Transfert envoye row (transferts vers caissier principal) --------------

function TransfertEnvoyeRow({ transfert }: { transfert: TransfertVersement }) {
  return (
    <div className="grid grid-cols-1 gap-3 border-b border-border/40 px-4 py-3.5 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_1.5fr_1fr_1.2fr_0.8fr] sm:items-center sm:gap-4">
      {/* Date */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="size-3.5 shrink-0" />
        <span className="tabular-nums">{transfert.createdAt ? dayjs(transfert.createdAt).format('DD/MM/YYYY HH:mm') : '-'}</span>
      </div>

      {/* Caissier Principal */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className="size-8 border border-border shrink-0">
          <AvatarFallback className="text-xs font-semibold">
            {transfert.destination_acteur_name?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <span className="truncate text-sm font-medium text-foreground">
          {transfert.destination_acteur_name || '-'}
        </span>
      </div>

      {/* Montant */}
      <div className="text-sm font-bold tabular-nums text-foreground">
        {formatMontant(transfert.montant)}
      </div>

      {/* Note */}
      <div className="truncate text-xs text-muted-foreground">
        {transfert.note || '-'}
      </div>

      {/* Statut */}
      <div>
        <StatusBadge etat={transfert.etat} />
      </div>
    </div>
  );
}

// ---- Table skeleton ---------------------------------------------------------

function TransfertTableSkeleton() {
  return (
    <div className="space-y-2 px-4 py-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

// ---- Empty state ------------------------------------------------------------

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Inbox className="size-6 text-muted-foreground" />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ==============================================================================
//  Page principale
// ==============================================================================

function RouteComponent() {
  const { data: session } = authClient.useSession();
  const [openedTransfert, setOpenedTransfert] = useState(false);
  const [montantTransfert, setMontantTransfert] = useState<number>(0);
  const [selectedCaissier, setSelectedCaissier] = useState<string>();
  const [noteTransfert, setNoteTransfert] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('en_attente');
  const [activeTabEnvoyes, setActiveTabEnvoyes] = useState<string>('en_attente');

  const qc = useQueryClient();
  const transfertVersementService = new TransfertVersementService();
  const userService = new UserService();
  const recouvreurService = new RecouvreurService();

  const transfertsRecusKey = ['transferts-recouvreur', session?.user?.id];
  const transfertsEnvoyesKey = ['transferts-envoyes-recouvreur', session?.user?.id];
  const soldeRecouvreurKey = ['solde-recouvreur', session?.user?.id];
  const caissiersPrincipauxKey = ['caissiers-principaux'];

  // Transferts reçus des vendeurs (en attente de validation)
  const { data: transfertsRecus, isLoading: isLoadingTransfertsRecus } = useQuery<TransfertVersement[]>({
    queryKey: transfertsRecusKey,
    queryFn: () => transfertVersementService.findByRecouvreur(session!.user.id),
    enabled: !!session?.user?.id,
  });

  // Transferts envoyés vers le caissier principal
  const { data: transfertsEnvoyes, isLoading: isLoadingTransfertsEnvoyes } = useQuery<TransfertVersement[]>({
    queryKey: transfertsEnvoyesKey,
    queryFn: () => transfertVersementService.findByTypeTransfert(TYPE_TRANSFERT.RECOUVREUR_VERS_CAISSIER_PRINCIPAL),
    enabled: !!session?.user?.id,
  });

  const { data: soldeRecouvreur, isLoading: isLoadingSoldeRecouvreur } = useQuery({
    queryKey: soldeRecouvreurKey,
    queryFn: () => recouvreurService.getSolde(session!.user.id),
    enabled: !!session?.user?.id,
  });

  // Liste des caissiers principaux
  const { data: caissiersPrincipaux, isLoading: isLoadingCaissiers } = useQuery<UserType[]>({
    queryKey: caissiersPrincipauxKey,
    queryFn: () => userService.byRole(USER_ROLE.CAISSIER),
  });

  const soldeDisponible = soldeRecouvreur || 0;

  const closeModal = () => {
    setOpenedTransfert(false);
    setMontantTransfert(0);
    setSelectedCaissier(undefined);
    setNoteTransfert('');
  };

  // Mutation pour valider un transfert
  const { mutate: validerTransfert, isPending: isPendingValider } = useMutation({
    mutationFn: (id: string) => transfertVersementService.valider(id, { validateur_id: session!.user.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transfertsRecusKey });
    },
  });

  // Mutation pour refuser un transfert
  const { mutate: refuserTransfert, isPending: isPendingRefuser } = useMutation({
    mutationFn: (id: string) => transfertVersementService.refuser(id, { validateur_id: session!.user.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transfertsRecusKey });
    },
  });

  // Mutation pour créer un transfert vers le caissier principal
  const { mutate: createTransfert, isPending: isPendingTransfert } = useMutation({
    mutationFn: (data: TransfertRecouvreurCaissierPrincipalDto) => transfertVersementService.createRecouvreurCaissierPrincipal(data),
    onSuccess: () => {
      closeModal();
      qc.invalidateQueries({ queryKey: transfertsEnvoyesKey });
      qc.invalidateQueries({ queryKey: soldeRecouvreurKey });
    },
  });

  const handleTransfert = () => {
    if (!montantTransfert || montantTransfert <= 0) return;
    if (!selectedCaissier) return;
    if (montantTransfert > soldeDisponible) return;

    const transfertData: TransfertRecouvreurCaissierPrincipalDto = {
      recouvreur_id: session!.user.id,
      caissier_principal_id: selectedCaissier,
      montant: montantTransfert,
      note: noteTransfert || `Versement de ${session?.user?.name}`,
    };

    createTransfert(transfertData);
  };

  const transfertsRecusDesVendeurs = transfertsRecus?.filter(
    (t) => t.destination_type_acteur !== 'CAISSIER_PRINCIPAL'
  ) || [];

  // Filtrer les transferts reçus selon l'état
  const transfertsEnAttenteRecus = transfertsRecusDesVendeurs.filter((t) => t.etat === ETAT_TRANSFERT.EN_ATTENTE);
  const transfertsValidesRecus = transfertsRecusDesVendeurs.filter((t) => t.etat === ETAT_TRANSFERT.VALIDE);
  const transfertsRefusesRecus = transfertsRecusDesVendeurs.filter((t) => t.etat === ETAT_TRANSFERT.REFUSE);

  // Filtrer les transferts envoyés selon l'état
  const transfertsEnAttenteEnvoyes = transfertsEnvoyes?.filter((t) => t.etat === ETAT_TRANSFERT.EN_ATTENTE) || [];
  const transfertsValidesEnvoyes = transfertsEnvoyes?.filter((t) => t.etat === ETAT_TRANSFERT.VALIDE) || [];
  const transfertsRefusesEnvoyes = transfertsEnvoyes?.filter((t) => t.etat === ETAT_TRANSFERT.REFUSE) || [];

  const montantTotalRecu = transfertsValidesRecus.reduce((acc, t) => acc + t.montant, 0);

  const isLoadingRecus = isLoadingTransfertsRecus || isPendingValider || isPendingRefuser;
  const isLoadingEnvoyes = isLoadingTransfertsEnvoyes;

  // Transferts affichés selon l'onglet actif (reçus)
  const transfertsAffichesRecus =
    activeTab === 'en_attente'
      ? transfertsEnAttenteRecus
      : activeTab === 'valides'
        ? transfertsValidesRecus
        : transfertsRefusesRecus;

  // Transferts affichés selon l'onglet actif (envoyés)
  const transfertsAffichesEnvoyes =
    activeTabEnvoyes === 'en_attente'
      ? transfertsEnAttenteEnvoyes
      : activeTabEnvoyes === 'valides'
        ? transfertsValidesEnvoyes
        : transfertsRefusesEnvoyes;

  const selectedCaissierName = caissiersPrincipaux?.find((c) => c._id === selectedCaissier)?.name || '-';

  return (
    <div className="controller-page space-y-6">
      {/* Hero Header + Solde Disponible */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden border-border/60 shadow-none">
          <CardContent className="flex items-center gap-5 px-6 py-6">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Briefcase className="size-8" />
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                Finance
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                Recouvreur
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Gérez les transferts reçus et envoyez les fonds
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/60 shadow-none">
          <CardContent className="flex items-center justify-between gap-4 px-6 py-6">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Solde Disponible
              </p>
              <p className="text-3xl font-bold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                {isLoadingSoldeRecouvreur ? <Skeleton className="h-9 w-40" /> : formatMontant(soldeDisponible)}
              </p>
              <p className="text-xs text-muted-foreground">Fonds à transférer</p>
            </div>
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Wallet className="size-7" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoadingTransfertsRecus ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="En attente"
              value={transfertsEnAttenteRecus.length}
              icon={<Clock className="size-5" />}
              accent="amber"
            />
            <StatCard
              label="Validés"
              value={transfertsValidesRecus.length}
              icon={<CheckCircle2 className="size-5" />}
              accent="emerald"
            />
            <StatCard
              label="Refusés"
              value={transfertsRefusesRecus.length}
              icon={<XCircle className="size-5" />}
              accent="red"
            />
            <StatCard
              label="Montant total reçu"
              value={formatMontant(montantTotalRecu)}
              icon={<Wallet className="size-5" />}
              accent="blue"
            />
          </>
        )}
      </div>

      {/* Transferts reçus des vendeurs */}
      <Card className="border-border/60 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-4">
          <CardTitle className="text-base font-bold text-foreground">
            Transferts reçus des vendeurs
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 py-2">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 pb-3 mb-2">
            <TabButton
              active={activeTab === 'en_attente'}
              onClick={() => setActiveTab('en_attente')}
              icon={<Clock className="size-4" />}
              label="En attente"
              count={transfertsEnAttenteRecus.length}
            />
            <TabButton
              active={activeTab === 'valides'}
              onClick={() => setActiveTab('valides')}
              icon={<CheckCircle2 className="size-4" />}
              label="Validés"
              count={transfertsValidesRecus.length}
            />
            <TabButton
              active={activeTab === 'refuses'}
              onClick={() => setActiveTab('refuses')}
              icon={<XCircle className="size-4" />}
              label="Refusés"
              count={transfertsRefusesRecus.length}
            />
          </div>

          {/* Table header (desktop only) */}
          <div className="hidden grid-cols-[1fr_1.5fr_1fr_1.2fr_0.7fr_0.7fr] gap-4 border-b border-border/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
            <span>Date</span>
            <span>Vendeur</span>
            <span>Montant</span>
            <span>Note</span>
            <span>Statut</span>
            <span>Actions</span>
          </div>

          {/* Transferts list */}
          {isLoadingRecus ? (
            <TransfertTableSkeleton />
          ) : transfertsAffichesRecus.length > 0 ? (
            <div className="divide-y divide-border/40">
              {transfertsAffichesRecus.map((transfert) => (
                <TransfertRecuRow
                  key={transfert._id}
                  transfert={transfert}
                  showActions={activeTab === 'en_attente'}
                  onValider={(id) => validerTransfert(id)}
                  onRefuser={(id) => refuserTransfert(id)}
                  isPendingValider={isPendingValider}
                  isPendingRefuser={isPendingRefuser}
                />
              ))}
            </div>
          ) : (
            <EmptyState message="Aucun transfert dans cette catégorie" />
          )}
        </CardContent>
      </Card>

      {/* Section Transfert vers Caissier Principal */}
      <Card className="border-border/60 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-4">
          <CardTitle className="text-base font-bold text-foreground">
            Transfert vers Caissier Principal
          </CardTitle>
          <CardAction>
            <Button
              onClick={() => setOpenedTransfert(true)}
              disabled={soldeDisponible <= 0}
            >
              <Send className="size-4" />
              Nouveau Transfert
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-5 py-5 space-y-5">
          {/* Mini stat cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {isLoadingEnvoyes ? (
              <>
                <MiniStatCardSkeleton />
                <MiniStatCardSkeleton />
                <MiniStatCardSkeleton />
              </>
            ) : (
              <>
                <MiniStatCard
                  label="Transferts en attente"
                  value={transfertsEnAttenteEnvoyes.length}
                  accent="blue"
                />
                <MiniStatCard
                  label="Transferts validés"
                  value={transfertsValidesEnvoyes.length}
                  accent="emerald"
                />
                <MiniStatCard
                  label="Montant total transféré"
                  value={formatMontant(transfertsValidesEnvoyes.reduce((acc, t) => acc + t.montant, 0))}
                  accent="emerald"
                />
              </>
            )}
          </div>

          {/* Tabs for sent transferts */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 pb-3 mb-2">
            <TabButton
              active={activeTabEnvoyes === 'en_attente'}
              onClick={() => setActiveTabEnvoyes('en_attente')}
              icon={<Clock className="size-4" />}
              label="En attente"
              count={transfertsEnAttenteEnvoyes.length}
            />
            <TabButton
              active={activeTabEnvoyes === 'valides'}
              onClick={() => setActiveTabEnvoyes('valides')}
              icon={<CheckCircle2 className="size-4" />}
              label="Validés"
              count={transfertsValidesEnvoyes.length}
            />
            <TabButton
              active={activeTabEnvoyes === 'refuses'}
              onClick={() => setActiveTabEnvoyes('refuses')}
              icon={<XCircle className="size-4" />}
              label="Refusés"
              count={transfertsRefusesEnvoyes.length}
            />
          </div>

          {/* Table header (desktop only) */}
          <div className="hidden grid-cols-[1fr_1.5fr_1fr_1.2fr_0.8fr] gap-4 border-b border-border/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
            <span>Date</span>
            <span>Caissier Principal</span>
            <span>Montant</span>
            <span>Note</span>
            <span>Statut</span>
          </div>

          {/* Transferts envoyés list */}
          {isLoadingEnvoyes ? (
            <TransfertTableSkeleton />
          ) : transfertsAffichesEnvoyes.length > 0 ? (
            <div className="divide-y divide-border/40">
              {transfertsAffichesEnvoyes.map((transfert) => (
                <TransfertEnvoyeRow
                  key={transfert._id}
                  transfert={transfert}
                />
              ))}
            </div>
          ) : (
            <EmptyState message="Aucun transfert dans cette catégorie" />
          )}
        </CardContent>
      </Card>

      {/* Modal Transfert vers Caissier Principal */}
      {openedTransfert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <Card
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                  <Send className="size-5" />
                </div>
                <CardTitle className="text-lg font-bold text-primary">
                  Transfert vers Caissier Principal
                </CardTitle>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={closeModal}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Solde disponible */}
              <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Wallet className="size-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Votre solde disponible</p>
                  <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatMontant(soldeDisponible)}
                  </p>
                </div>
              </div>

              {/* Sélection du caissier principal */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  Sélectionner un caissier principal
                </label>
                <select
                  className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/50 disabled:opacity-50"
                  value={selectedCaissier ?? ''}
                  onChange={(e) => setSelectedCaissier(e.target.value || undefined)}
                  disabled={isLoadingCaissiers}
                >
                  <option value="">
                    {isLoadingCaissiers ? 'Chargement...' : 'Choisir un caissier principal'}
                  </option>
                  {caissiersPrincipaux?.map((caissier) => (
                    <option key={caissier._id} value={caissier._id}>
                      {caissier.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Montant du transfert */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  Montant du transfert
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={soldeDisponible}
                    step={100}
                    placeholder="Entrez le montant"
                    value={montantTransfert || ''}
                    onChange={(e) => setMontantTransfert(Number(e.target.value) || 0)}
                    className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-base text-foreground outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/50"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    FCFA
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Maximum: <span className="tabular-nums">{formatMontant(soldeDisponible)}</span>
                </p>
              </div>

              {/* Note optionnelle */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  Note (optionnelle)
                </label>
                <textarea
                  placeholder="Ajouter une note..."
                  value={noteTransfert}
                  onChange={(e) => setNoteTransfert(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-md border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/50"
                />
              </div>

              {/* Aperçu du transfert */}
              {montantTransfert > 0 && selectedCaissier && (
                <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
                  <p className="text-sm text-muted-foreground">Aperçu du transfert</p>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Montant à transférer</span>
                    <span className="text-base font-bold tabular-nums text-primary">
                      {formatMontant(montantTransfert)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Caissier Principal</span>
                    <span className="text-sm font-semibold text-foreground">
                      {selectedCaissierName}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">Solde après transfert</span>
                    <span className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatMontant(soldeDisponible - montantTransfert)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="justify-end gap-3 border-t border-border/60">
              <Button variant="outline" onClick={closeModal}>
                Annuler
              </Button>
              <Button
                onClick={handleTransfert}
                disabled={!montantTransfert || montantTransfert <= 0 || !selectedCaissier || isPendingTransfert}
              >
                {isPendingTransfert ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Envoyer le Transfert
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
