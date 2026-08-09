import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Loader2,
  Inbox,
} from 'lucide-react';
import { requireRole } from '@/lib/route-protection';
import { TransfertVersementService } from '@/services/transfert-versement.service';
import { UserService } from '@/services/user.service';
import { VendeurService } from '@/services/vendeurservice';
import { authClient } from '@/auth/auth-client';
import type { TransfertVersement } from '@/types/transfert-versement';
import { unwrapTransfertResponse, type TransfertResponseWithStats, type FluxStatsDto } from '@/types/pagination';
import {
  EtatTransfertLabels,
  ETAT_TRANSFERT,
  TYPE_ACTEUR,
} from '@/types/transfert-versement';
import type { User as UserType } from '@/types/user';
import { formatMontant } from '@/types/operation';
import { USER_ROLE } from '@/types/user.roles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import dayjs from '@/config/dayjs.config';
import { SafetyCertificateFilled } from '@ant-design/icons';
import { DateRangeFilter } from '@/components/date-range-filter';
import { useTimeRangeFilter } from '@/hooks/use-time-range-filter';
import { useTableSearchSort, type ColumnDef } from '@/hooks/use-table-search-sort';
import { SortableHeader, TableToolbar } from '@/components/table-controls';

export const Route = createFileRoute('/admin/agent-comptable/')({
  beforeLoad: () => requireRole([USER_ROLE.ACP, USER_ROLE.SUPERADMIN]),
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

// ---- Flux card (vue globale) ------------------------------------------------

interface FluxCardProps {
  label: string;
  montant: number;
  count: number;
  accent: 'amber' | 'blue' | 'violet';
}

const fluxAccentMap = {
  amber: 'text-amber-600 dark:text-amber-400',
  blue: 'text-sky-600 dark:text-sky-400',
  violet: 'text-violet-600 dark:text-violet-400',
};

function FluxCard({ label, montant, count, accent }: FluxCardProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 text-center transition-all duration-300 hover:shadow-md hover:border-border">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className={cn('mt-2 text-xl font-bold tabular-nums', fluxAccentMap[accent])}>
        {formatMontant(montant)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {count} transfert{count > 1 ? 's' : ''} validé{count > 1 ? 's' : ''}
      </p>
    </div>
  );
}

function FluxCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 text-center">
      <Skeleton className="mx-auto h-4 w-32" />
      <Skeleton className="mx-auto mt-2 h-6 w-28" />
      <Skeleton className="mx-auto mt-2 h-3 w-24" />
    </div>
  );
}

// ---- Acteur table (vendeurs / recouvreurs / caissiers) -----------------------

interface ActeurRowProps {
  name: string;
  amount: number;
  amountLabel?: string;
  positive?: boolean;
}

function ActeurRow({ name, amount, amountLabel = 'Solde', positive }: ActeurRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3 last:border-0 transition-colors hover:bg-muted/40">
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className="size-8 border border-border">
          <AvatarFallback className="text-xs font-semibold">
            {name?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <span className="truncate text-sm font-medium text-foreground">{name}</span>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {amountLabel}
        </p>
        <p className={cn(
          'text-sm font-bold tabular-nums',
          positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
        )}>
          {formatMontant(amount)}
        </p>
      </div>
    </div>
  );
}

function ActeurTableSkeleton() {
  return (
    <div className="space-y-2 px-4 py-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

// ---- Tab button ---------------------------------------------------------------

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count: number
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
  )
}

// ---- Transfert row (table row as card) ----------------------------------------

interface TransfertRowProps {
  transfert: TransfertVersement;
  showActions: boolean;
  onValider?: (id: string) => void;
  onRefuser?: (id: string) => void;
  isPendingValider?: boolean;
  isPendingRefuser?: boolean;
}

function TransfertRow({
  transfert,
  showActions,
  onValider,
  onRefuser,
  isPendingValider,
  isPendingRefuser,
}: TransfertRowProps) {
  return (
    <div className="grid grid-cols-1 gap-3 border-b border-border/40 px-4 py-3.5 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_1.5fr_1fr_1fr_0.8fr] sm:items-center sm:gap-4">
      {/* Date */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="size-3.5 shrink-0" />
        <span className="tabular-nums">{transfert.createdAt ? dayjs(transfert.createdAt).format('DD/MM/YYYY HH:mm') : '-'}</span>
      </div>

      {/* Expéditeur */}
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
        {transfert.note && (
          <span className="truncate text-xs text-muted-foreground hidden sm:block">
            {transfert.note}
          </span>
        )}
      </div>
    </div>
  );
}

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

// ---- Empty state --------------------------------------------------------------

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
  const [activeTab, setActiveTab] = useState<string>('en_attente');
  const { range: timeFilter, setRange: setTimeFilter, params } = useTimeRangeFilter();

  const qc = useQueryClient();
  const transfertVersementService = new TransfertVersementService();
  const userService = new UserService();
  const vendeurService = new VendeurService();

  const transfertsRecusKey = ['transferts-agent-comptable', session?.user?.id, params];
  const vendeursKey = ['vendeurs'];
  const recouvreursKey = ['recouvreurs'];
  const caissiersPrincipauxKey = ['caissiers-principaux'];
  const soldesVendeursKey = ['soldes-vendeurs'];

  // Transferts reçus des caissiers principaux
  const { data: transfertsRecus, isLoading: isLoadingTransfertsRecus } = useQuery<TransfertVersement[] | TransfertResponseWithStats<TransfertVersement>>({
    queryKey: transfertsRecusKey,
    queryFn: () => transfertVersementService.findByAgentComptable(session!.user.id, params, true),
    enabled: !!session?.user?.id,
  });

  const { data: transfertsRecusData, stats: transfertsRecusStats } = unwrapTransfertResponse(transfertsRecus ?? []);

  // Statistiques des flux (remplace le chargement de tous les transferts)
  const { data: fluxStats, isLoading: isLoadingFluxStats } = useQuery<FluxStatsDto>({
    queryKey: ['transfert-versement', 'stats', 'flux', params],
    queryFn: () => transfertVersementService.getFluxStats(params),
  });

  // Liste des vendeurs
  const { data: vendeurs, isLoading: isLoadingVendeurs } = useQuery<UserType[]>({
    queryKey: vendeursKey,
    queryFn: () => userService.byRole(USER_ROLE.VENDEUR),
  });

  // Liste des recouvreurs
  const { data: recouvreurs, isLoading: isLoadingRecouvreurs } = useQuery<UserType[]>({
    queryKey: recouvreursKey,
    queryFn: () => userService.byRole(USER_ROLE.RECOUVREUR),
  });

  // Liste des caissiers principaux
  const { data: caissiersPrincipaux, isLoading: isLoadingCaissiers } = useQuery<UserType[]>({
    queryKey: caissiersPrincipauxKey,
    queryFn: () => userService.byRole(USER_ROLE.CAISSIER),
  });

  // Soldes des vendeurs
  const { data: soldesVendeurs, isLoading: isLoadingSoldes } = useQuery<any[]>({
    queryKey: soldesVendeursKey,
    queryFn: () => vendeurService.getAllSoldes(),
  });

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

  // Calcul du solde total reçu
  const transfertsRecusAgentComptable =
    transfertsRecusData?.filter((t) => t.destination_type_acteur === TYPE_ACTEUR.AGENT_COMPTABLE) || [];

  const soldeTotal = transfertsRecusStats?.montantValide ?? 0;

  // Filtrer les transferts selon l'état
  const transfertsEnAttenteRecus = transfertsRecusAgentComptable.filter((t) => t.etat === ETAT_TRANSFERT.EN_ATTENTE);
  const transfertsValidesRecus = transfertsRecusAgentComptable.filter((t) => t.etat === ETAT_TRANSFERT.VALIDE);
  const transfertsRefusesRecus = transfertsRecusAgentComptable.filter((t) => t.etat === ETAT_TRANSFERT.REFUSE);

  // Statistiques globales des flux (depuis le backend)
  const findFlux = (src: string, dst: string) =>
    fluxStats?.fluxGlobaux?.find(
      (f) => f.sourceType === src && f.destinationType === dst
    );
  const fluxVR = findFlux(TYPE_ACTEUR.VENDEUR, TYPE_ACTEUR.RECOUVREUR);
  const totalTransfertsVendeurRecouvreur = fluxVR?.totalMontant ?? 0;
  const countVendeurRecouvreur = fluxVR?.count ?? 0;

  const fluxRC = findFlux(TYPE_ACTEUR.RECOUVREUR, TYPE_ACTEUR.CAISSIER_PRINCIPAL);
  const totalTransfertsRecouvreurCaissier = fluxRC?.totalMontant ?? 0;
  const countRecouvreurCaissier = fluxRC?.count ?? 0;

  const fluxCA = findFlux(TYPE_ACTEUR.CAISSIER_PRINCIPAL, TYPE_ACTEUR.AGENT_COMPTABLE);
  const totalTransfertsCaissierAgent = fluxCA?.totalMontant ?? 0;
  const countCaissierAgent = fluxCA?.count ?? 0;

  // Helper pour trouver le solde d'un acteur depuis les données backend
  const findSoldeActeur = (acteurId: string) =>
    fluxStats?.soldesActeurs?.find((s) => s.acteurId === acteurId);

  const isLoading = isLoadingTransfertsRecus || isPendingValider || isPendingRefuser;

  // Transferts affichés selon l'onglet actif
  const transfertsAffiches =
    activeTab === 'en_attente'
      ? transfertsEnAttenteRecus
      : activeTab === 'valides'
        ? transfertsValidesRecus
        : transfertsRefusesRecus;

  // ---- Recherche + tri : transferts reçus -----------------------------------
  const recusColumns: ColumnDef<'date' | 'caissier' | 'montant' | 'statut'>[] = [
    { key: 'date', label: 'Date', accessor: (t: TransfertVersement) => t.createdAt ? dayjs(t.createdAt).valueOf() : null },
    { key: 'caissier', label: 'Caissier Principal', accessor: (t: TransfertVersement) => t.source_acteur_name ?? '' },
    { key: 'montant', label: 'Montant', accessor: (t: TransfertVersement) => t.montant },
    { key: 'statut', label: 'Statut', accessor: (t: TransfertVersement) => EtatTransfertLabels[t.etat] ?? t.etat },
  ];
  const {
    search: recusSearch,
    setSearch: setRecusSearch,
    sort: recusSort,
    toggleSort: toggleRecusSort,
    processed: processedRecus,
  } = useTableSearchSort(transfertsAffiches, recusColumns);

  return (
    <div className="controller-page space-y-6">
      {/* Hero Header + Solde total */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden border-border/60 shadow-none">
          <CardContent className="flex items-center gap-5 px-6 py-6">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <SafetyCertificateFilled className="size-8" />
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                Finance
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                Agent Comptable
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Validez les transferts reçus des caissiers principaux
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/60 shadow-none">
          <CardContent className="flex items-center justify-between gap-4 px-6 py-6">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Encaissé
              </p>
              <p className="text-3xl font-bold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                {isLoadingTransfertsRecus ? <Skeleton className="h-9 w-40" /> : formatMontant(soldeTotal)}
              </p>
              <p className="text-xs text-muted-foreground">Fonds validés</p>
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
              value={transfertsRecusStats?.enAttente ?? 0}
              icon={<Clock className="size-5" />}
              accent="amber"
            />
            <StatCard
              label="Validés"
              value={transfertsRecusStats?.valides ?? 0}
              icon={<CheckCircle2 className="size-5" />}
              accent="emerald"
            />
            <StatCard
              label="Refusés"
              value={transfertsRecusStats?.refuses ?? 0}
              icon={<XCircle className="size-5" />}
              accent="red"
            />
            <StatCard
              label="Montant total reçu"
              value={formatMontant(soldeTotal)}
              icon={<Wallet className="size-5" />}
              accent="blue"
            />
          </>
        )}
      </div>

      {/* Filtre par intervalle de temps */}
      <Card className="border-border/60 shadow-none">
        <CardContent className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Filtrer par intervalle de temps
            </p>
            <p className="text-xs text-muted-foreground">
              Par défaut : mois en cours. S'applique aux transferts reçus et à la vue globale des flux.
            </p>
          </div>
          <DateRangeFilter value={timeFilter} onChange={setTimeFilter} />
        </CardContent>
      </Card>

      {/* Vue globale des flux financiers */}
      <Card className="border-border/60 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-4">
          <CardTitle className="text-base font-bold text-foreground">
            Vue Globale des Flux Financiers
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {isLoadingFluxStats ? (
              <>
                <FluxCardSkeleton />
                <FluxCardSkeleton />
                <FluxCardSkeleton />
              </>
            ) : (
              <>
                <FluxCard
                  label="Vendeurs → Recouvreurs"
                  montant={totalTransfertsVendeurRecouvreur}
                  count={countVendeurRecouvreur}
                  accent="amber"
                />
                <FluxCard
                  label="Recouvreurs → Caissiers"
                  montant={totalTransfertsRecouvreurCaissier}
                  count={countRecouvreurCaissier}
                  accent="blue"
                />
                <FluxCard
                  label="Caissiers → Agent Comptable"
                  montant={totalTransfertsCaissierAgent}
                  count={countCaissierAgent}
                  accent="violet"
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Soldes des acteurs */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Vendeurs */}
        <Card className="border-border/60 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Users className="size-4 text-amber-600" />
              Vendeurs
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 py-0">
            {isLoadingVendeurs || isLoadingSoldes ? (
              <ActeurTableSkeleton />
            ) : vendeurs?.length ? (
              vendeurs.map((vendeur: UserType) => {
                const solde = soldesVendeurs?.find(
                  (s: any) => s.vendeur_id === vendeur._id || s.vendeur_id?._id === vendeur._id
                );
                return (
                  <ActeurRow
                    key={vendeur._id}
                    name={vendeur.name || ''}
                    amount={solde?.solde || 0}
                    positive={(solde?.solde || 0) > 0}
                  />
                );
              })
            ) : (
              <EmptyState message="Aucun vendeur" />
            )}
          </CardContent>
        </Card>

        {/* Recouvreurs */}
        <Card className="border-border/60 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Users className="size-4 text-sky-600" />
              Recouvreurs
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 py-0">
            {isLoadingRecouvreurs || isLoadingFluxStats ? (
              <ActeurTableSkeleton />
            ) : recouvreurs?.length ? (
              recouvreurs.map((recouvreur: UserType) => {
                const soldeActeur = findSoldeActeur(recouvreur._id);
                const solde = soldeActeur?.solde ?? 0;
                return (
                  <ActeurRow
                    key={recouvreur._id}
                    name={recouvreur.name || ''}
                    amount={solde}
                    amountLabel="Solde"
                    positive={solde > 0}
                  />
                );
              })
            ) : (
              <EmptyState message="Aucun recouvreur" />
            )}
          </CardContent>
        </Card>

        {/* Caissiers Principaux */}
        <Card className="border-border/60 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Users className="size-4 text-violet-600" />
              Caissiers Principaux
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 py-0">
            {isLoadingCaissiers || isLoadingFluxStats ? (
              <ActeurTableSkeleton />
            ) : caissiersPrincipaux?.length ? (
              caissiersPrincipaux.map((caissier: UserType) => {
                const soldeActeur = findSoldeActeur(caissier._id);
                const solde = soldeActeur?.solde ?? 0;
                return (
                  <ActeurRow
                    key={caissier._id}
                    name={caissier.name || ''}
                    amount={solde}
                    amountLabel="Solde"
                    positive={solde > 0}
                  />
                );
              })
            ) : (
              <EmptyState message="Aucun caissier principal" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transferts reçus des caissiers principaux */}
      <Card className="border-border/60 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-4">
          <CardTitle className="text-base font-bold text-foreground">
            Transferts reçus des caissiers principaux
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

          {/* Recherche */}
          <div className="px-3 pb-3">
            <TableToolbar
              value={recusSearch}
              onChange={setRecusSearch}
              placeholder="Rechercher un transfert reçu..."
            />
          </div>

          {/* Table header (desktop only) */}
          <div className="hidden grid-cols-[1fr_1.5fr_1fr_1fr_0.8fr] gap-4 border-b border-border/60 px-4 py-2 sm:grid">
            <SortableHeader label="Date" columnKey="date" sort={recusSort} onToggleSort={toggleRecusSort} />
            <SortableHeader label="Caissier Principal" columnKey="caissier" sort={recusSort} onToggleSort={toggleRecusSort} />
            <SortableHeader label="Montant" columnKey="montant" sort={recusSort} onToggleSort={toggleRecusSort} />
            <SortableHeader label="Statut" columnKey="statut" sort={recusSort} onToggleSort={toggleRecusSort} />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</span>
          </div>

          {/* Transferts list */}
          {isLoading ? (
            <TransfertTableSkeleton />
          ) : processedRecus.length > 0 ? (
            <div className="divide-y divide-border/40">
              {processedRecus.map((transfert) => (
                <TransfertRow
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
    </div>
  );
}
