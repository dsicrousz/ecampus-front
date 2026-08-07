import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  User as UserIcon,
  Building2,
  Loader2,
  Inbox,
} from 'lucide-react';
import { requireRole } from '@/lib/route-protection';
import { TransfertVersementService } from '@/services/transfert-versement.service';
import { UserService } from '@/services/user.service';
import { VendeurService } from '@/services/vendeurservice';
import { CaissierService } from '@/services/caissierservice';
import { RecouvreurService } from '@/services/recouvreurservice';
import { authClient } from '@/auth/auth-client';
import type {
  TransfertVersement,
  TransfertCaissierPrincipalAgentComptableDto,
} from '@/types/transfert-versement';
import {
  EtatTransfertLabels,
  ETAT_TRANSFERT,
  TYPE_ACTEUR,
  TYPE_TRANSFERT,
} from '@/types/transfert-versement';
import type { User as UserType } from '@/types/user';
import { formatMontant } from '@/types/operation';
import { USER_ROLE } from '@/types/user.roles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import dayjs from '@/config/dayjs.config';

export const Route = createFileRoute('/admin/caisse-principale/')({
  beforeLoad: () => requireRole([USER_ROLE.CAISSIER, USER_ROLE.SUPERADMIN]),
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
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110',
            s.icon
          )}
        >
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

// ---- Mini stat card (for transfert section) ---------------------------------

interface MiniStatCardProps {
  label: string;
  value: string | number;
  accent: 'violet' | 'emerald';
}

const miniStatAccentMap = {
  violet: 'text-violet-600 dark:text-violet-400',
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
      <Skeleton className="mx-auto mt-2 h-6 w-28" />
    </div>
  );
}

// ---- Acteur row (vendeurs / recouvreurs) ------------------------------------

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
        <p
          className={cn(
            'text-sm font-bold tabular-nums',
            positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
          )}
        >
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
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums',
          active ? 'bg-primary-foreground/20' : 'bg-muted-foreground/15'
        )}
      >
        {count}
      </span>
    </button>
  );
}

// ---- Transfert row (reçus des recouvreurs) ----------------------------------

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
    <div className="grid grid-cols-1 gap-3 border-b border-border/40 px-4 py-3.5 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_1.5fr_1fr_1fr_0.8fr] sm:items-center sm:gap-4">
      {/* Date */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="size-3.5 shrink-0" />
        <span className="tabular-nums">
          {transfert.createdAt ? dayjs(transfert.createdAt).format('DD/MM/YYYY HH:mm') : '-'}
        </span>
      </div>

      {/* Recouvreur */}
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

// ---- Transfert envoyé row (vers agent comptable) ----------------------------

interface TransfertEnvoyeRowProps {
  transfert: TransfertVersement;
}

function TransfertEnvoyeRow({ transfert }: TransfertEnvoyeRowProps) {
  return (
    <div className="grid grid-cols-1 gap-3 border-b border-border/40 px-4 py-3.5 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_1.5fr_1fr_1fr_1fr] sm:items-center sm:gap-4">
      {/* Date */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="size-3.5 shrink-0" />
        <span className="tabular-nums">
          {transfert.createdAt ? dayjs(transfert.createdAt).format('DD/MM/YYYY HH:mm') : '-'}
        </span>
      </div>

      {/* Agent Comptable */}
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
  const [selectedAgentComptable, setSelectedAgentComptable] = useState<string>();
  const [noteTransfert, setNoteTransfert] = useState<string>('');
  const [activeTabRecus, setActiveTabRecus] = useState<string>('en_attente');
  const [activeTabEnvoyes, setActiveTabEnvoyes] = useState<string>('envoyes_en_attente');

  const qc = useQueryClient();
  const transfertVersementService = new TransfertVersementService();
  const userService = new UserService();
  const caissierService = new CaissierService();
  const recouvreurService = new RecouvreurService();
  const vendeurService = new VendeurService();

  const transfertsRecusKey = ['transferts-caissier-principal', session?.user?.id];
  const transfertsEnvoyesKey = ['transferts-envoyes-caissier-principal', session?.user?.id];
  const soldeCaissierPrincipalKey = ['solde-caissier-principal', session?.user?.id];
  const agentsComptablesKey = ['agents-comptables'];
  const vendeursKey = ['vendeurs'];
  const recouvreursKey = ['recouvreurs'];
  const soldesVendeursKey = ['soldes-vendeurs'];

  // Transferts reçus des recouvreurs (en attente de validation)
  const { data: transfertsRecus, isLoading: isLoadingTransfertsRecus } = useQuery<TransfertVersement[]>({
    queryKey: transfertsRecusKey,
    queryFn: () => transfertVersementService.findByCaissierPrincipal(session!.user.id),
    enabled: !!session?.user?.id,
  });

  // Transferts envoyés vers l'agent comptable
  const { data: transfertsEnvoyes, isLoading: isLoadingTransfertsEnvoyes } = useQuery<TransfertVersement[]>({
    queryKey: transfertsEnvoyesKey,
    queryFn: () => transfertVersementService.findByTypeTransfert(TYPE_TRANSFERT.CAISSIER_PRINCIPAL_VERS_AGENT_COMPTABLE),
    enabled: !!session?.user?.id,
  });

  const { data: soldeCaissierPrincipal, isLoading: isLoadingSoldeCaissierPrincipal } = useQuery({
    queryKey: soldeCaissierPrincipalKey,
    queryFn: () => caissierService.getSolde(session!.user.id),
    enabled: !!session?.user?.id,
  });

  console.log(soldeCaissierPrincipal);

  // Liste des agents comptables
  const { data: agentsComptables, isLoading: isLoadingAgents } = useQuery<UserType[]>({
    queryKey: agentsComptablesKey,
    queryFn: () => userService.byRole(USER_ROLE.ACP),
  });

  // Liste des vendeurs avec leurs soldes
  const { data: vendeurs, isLoading: isLoadingVendeurs } = useQuery<UserType[]>({
    queryKey: vendeursKey,
    queryFn: () => userService.byRole(USER_ROLE.VENDEUR),
  });

  // Liste des recouvreurs
  const { data: recouvreurs, isLoading: isLoadingRecouvreurs } = useQuery<UserType[]>({
    queryKey: recouvreursKey,
    queryFn: () => userService.byRole(USER_ROLE.RECOUVREUR),
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

  // Mutation pour créer un transfert vers l'agent comptable
  const { mutate: createTransfert, isPending: isPendingTransfert } = useMutation({
    mutationFn: (data: TransfertCaissierPrincipalAgentComptableDto) =>
      transfertVersementService.createCaissierPrincipalAgentComptable(data),
    onSuccess: () => {
      setOpenedTransfert(false);
      setMontantTransfert(0);
      setSelectedAgentComptable(undefined);
      setNoteTransfert('');
      qc.invalidateQueries({ queryKey: transfertsEnvoyesKey });
      qc.invalidateQueries({ queryKey: soldeCaissierPrincipalKey });
    },
  });

  // Calcul du solde disponible (transferts validés - transferts envoyés validés)
  const transfertsRecusRecouvreurs =
    transfertsRecus?.filter(
      (t) => t.destination_type_acteur === TYPE_ACTEUR.CAISSIER_PRINCIPAL
    ) || [];
  const mesTransfertsEnvoyes =
    transfertsEnvoyes?.filter(
      (t) =>
        t.source_type_acteur === TYPE_ACTEUR.CAISSIER_PRINCIPAL &&
        t.destination_type_acteur === TYPE_ACTEUR.AGENT_COMPTABLE
    ) || [];

  const soldeDisponible = soldeCaissierPrincipal || 0;

  const handleTransfert = () => {
    if (!montantTransfert || montantTransfert <= 0) return;
    if (!selectedAgentComptable) return;
    if (montantTransfert > soldeDisponible) return;

    const transfertData: TransfertCaissierPrincipalAgentComptableDto = {
      caissier_principal_id: session!.user.id,
      agent_comptable_id: selectedAgentComptable,
      montant: montantTransfert,
      note: noteTransfert || `Versement de ${session?.user?.name}`,
    };

    createTransfert(transfertData);
  };

  // Filtrer les transferts reçus selon l'état
  const transfertsEnAttenteRecus = transfertsRecusRecouvreurs.filter(
    (t) => t.etat === ETAT_TRANSFERT.EN_ATTENTE
  );
  const transfertsValidesRecus = transfertsRecusRecouvreurs.filter(
    (t) => t.etat === ETAT_TRANSFERT.VALIDE
  );
  const transfertsRefusesRecus = transfertsRecusRecouvreurs.filter(
    (t) => t.etat === ETAT_TRANSFERT.REFUSE
  );

  // Filtrer les transferts envoyés selon l'état
  const transfertsEnAttenteEnvoyes = mesTransfertsEnvoyes.filter(
    (t) => t.etat === ETAT_TRANSFERT.EN_ATTENTE
  );
  const transfertsValidesEnvoyes = mesTransfertsEnvoyes.filter(
    (t) => t.etat === ETAT_TRANSFERT.VALIDE
  );
  const transfertsRefusesEnvoyes = mesTransfertsEnvoyes.filter(
    (t) => t.etat === ETAT_TRANSFERT.REFUSE
  );

  const isLoadingRecus = isLoadingTransfertsRecus || isPendingValider || isPendingRefuser;
  const isLoadingEnvoyes = isLoadingTransfertsEnvoyes || isPendingTransfert;

  // Transferts reçus affichés selon l'onglet actif
  const transfertsRecusAffiches =
    activeTabRecus === 'en_attente'
      ? transfertsEnAttenteRecus
      : activeTabRecus === 'valides'
        ? transfertsValidesRecus
        : transfertsRefusesRecus;

  // Transferts envoyés affichés selon l'onglet actif
  const transfertsEnvoyesAffiches =
    activeTabEnvoyes === 'envoyes_en_attente'
      ? transfertsEnAttenteEnvoyes
      : activeTabEnvoyes === 'envoyes_valides'
        ? transfertsValidesEnvoyes
        : transfertsRefusesEnvoyes;

  const montantTotalRecu = transfertsValidesRecus.reduce((acc, t) => acc + t.montant, 0);
  const montantTotalTransfere = transfertsValidesEnvoyes.reduce((acc, t) => acc + t.montant, 0);

  return (
    <div className="controller-page space-y-6">
      {/* Hero Header + Solde disponible */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden border-border/60 shadow-none">
          <CardContent className="flex items-center gap-5 px-6 py-6">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Building2 className="size-8" />
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                Finance
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                Caissier Principal
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
                {isLoadingSoldeCaissierPrincipal ? <Skeleton className="h-9 w-40" /> : formatMontant(soldeDisponible)}
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

      {/* Soldes des Vendeurs et Recouvreurs */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Soldes des Vendeurs */}
        <Card className="border-border/60 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
              <UserIcon className="size-4 text-amber-600" />
              Soldes des Vendeurs
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

        {/* Soldes des Recouvreurs */}
        <Card className="border-border/60 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
              <UserIcon className="size-4 text-sky-600" />
              Soldes des Recouvreurs
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 py-0">
            {isLoadingRecouvreurs ? (
              <ActeurTableSkeleton />
            ) : recouvreurs?.length ? (
              recouvreurs.map((recouvreur: UserType) => (
                <SoldeRecouvreurCell
                  key={recouvreur._id}
                  name={recouvreur.name || ''}
                  recouvreurId={recouvreur._id}
                  recouvreurService={recouvreurService}
                />
              ))
            ) : (
              <EmptyState message="Aucun recouvreur" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transferts reçus des recouvreurs */}
      <Card className="border-border/60 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-4">
          <CardTitle className="text-base font-bold text-foreground">
            Transferts reçus des recouvreurs
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 py-2">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 pb-3 mb-2">
            <TabButton
              active={activeTabRecus === 'en_attente'}
              onClick={() => setActiveTabRecus('en_attente')}
              icon={<Clock className="size-4" />}
              label="En attente"
              count={transfertsEnAttenteRecus.length}
            />
            <TabButton
              active={activeTabRecus === 'valides'}
              onClick={() => setActiveTabRecus('valides')}
              icon={<CheckCircle2 className="size-4" />}
              label="Validés"
              count={transfertsValidesRecus.length}
            />
            <TabButton
              active={activeTabRecus === 'refuses'}
              onClick={() => setActiveTabRecus('refuses')}
              icon={<XCircle className="size-4" />}
              label="Refusés"
              count={transfertsRefusesRecus.length}
            />
          </div>

          {/* Table header (desktop only) */}
          <div className="hidden grid-cols-[1fr_1.5fr_1fr_1fr_0.8fr] gap-4 border-b border-border/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
            <span>Date</span>
            <span>Recouvreur</span>
            <span>Montant</span>
            <span>Statut</span>
            <span>Actions</span>
          </div>

          {/* Transferts list */}
          {isLoadingRecus ? (
            <TransfertTableSkeleton />
          ) : transfertsRecusAffiches.length > 0 ? (
            <div className="divide-y divide-border/40">
              {transfertsRecusAffiches.map((transfert) => (
                <TransfertRecuRow
                  key={transfert._id}
                  transfert={transfert}
                  showActions={activeTabRecus === 'en_attente'}
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

      {/* Section Transfert vers Agent Comptable */}
      <Card className="border-border/60 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-4">
          <CardTitle className="flex items-center justify-between gap-2 text-base font-bold text-foreground">
            <span className="flex items-center gap-2">
              <Building2 className="size-4 text-violet-600" />
              Transfert vers Agent Comptable
            </span>
            <Button
              size="sm"
              onClick={() => setOpenedTransfert(true)}
              disabled={soldeDisponible <= 0}
            >
              <Send className="size-4" />
              Nouveau Transfert
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-5 space-y-5">
          {/* Mini stat cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {isLoadingTransfertsEnvoyes ? (
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
                  accent="violet"
                />
                <MiniStatCard
                  label="Transferts validés"
                  value={transfertsValidesEnvoyes.length}
                  accent="emerald"
                />
                <MiniStatCard
                  label="Montant total transféré"
                  value={formatMontant(montantTotalTransfere)}
                  accent="emerald"
                />
              </>
            )}
          </div>

          {/* Tabs pour les transferts envoyés */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 pb-3 mb-2">
            <TabButton
              active={activeTabEnvoyes === 'envoyes_en_attente'}
              onClick={() => setActiveTabEnvoyes('envoyes_en_attente')}
              icon={<Clock className="size-4" />}
              label="En attente"
              count={transfertsEnAttenteEnvoyes.length}
            />
            <TabButton
              active={activeTabEnvoyes === 'envoyes_valides'}
              onClick={() => setActiveTabEnvoyes('envoyes_valides')}
              icon={<CheckCircle2 className="size-4" />}
              label="Validés"
              count={transfertsValidesEnvoyes.length}
            />
            <TabButton
              active={activeTabEnvoyes === 'envoyes_refuses'}
              onClick={() => setActiveTabEnvoyes('envoyes_refuses')}
              icon={<XCircle className="size-4" />}
              label="Refusés"
              count={transfertsRefusesEnvoyes.length}
            />
          </div>

          {/* Table header (desktop only) */}
          <div className="hidden grid-cols-[1fr_1.5fr_1fr_1fr_1fr] gap-4 border-b border-border/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
            <span>Date</span>
            <span>Agent Comptable</span>
            <span>Montant</span>
            <span>Note</span>
            <span>Statut</span>
          </div>

          {/* Transferts envoyés list */}
          {isLoadingEnvoyes ? (
            <TransfertTableSkeleton />
          ) : transfertsEnvoyesAffiches.length > 0 ? (
            <div className="divide-y divide-border/40">
              {transfertsEnvoyesAffiches.map((transfert) => (
                <TransfertEnvoyeRow key={transfert._id} transfert={transfert} />
              ))}
            </div>
          ) : (
            <EmptyState message="Aucun transfert dans cette catégorie" />
          )}
        </CardContent>
      </Card>

      {/* Modal Transfert vers Agent Comptable (Sheet) */}
      <Sheet open={openedTransfert} onOpenChange={setOpenedTransfert}>
        <SheetContent side="bottom" className="mx-auto max-h-[90vh] max-w-2xl overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                <Building2 className="size-5" />
              </div>
              <SheetTitle className="text-lg font-bold text-violet-700 dark:text-violet-300">
                Transfert vers Agent Comptable
              </SheetTitle>
            </div>
          </SheetHeader>

          <div className="space-y-5 px-4 pb-4">
            {/* Solde disponible */}
            <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Wallet className="size-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Votre solde disponible</p>
                <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatMontant(soldeDisponible)}
                </p>
              </div>
            </div>

            {/* Sélection de l'agent comptable */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">
                Sélectionner un agent comptable
              </label>
              <select
                value={selectedAgentComptable ?? ''}
                onChange={(e) => setSelectedAgentComptable(e.target.value || undefined)}
                disabled={isLoadingAgents}
                className="h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Choisir un agent comptable</option>
                {agentsComptables?.map((agent) => (
                  <option key={agent._id} value={agent._id}>
                    {agent.name}
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
                  className="h-10 w-full rounded-md border border-input bg-transparent pr-16 pl-3 text-base font-semibold tabular-nums shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  FCFA
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Maximum: {formatMontant(soldeDisponible)}
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
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              />
            </div>

            {/* Aperçu du transfert */}
            {montantTransfert > 0 && selectedAgentComptable && (
              <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Aperçu du transfert
                </p>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Montant à transférer</span>
                  <span className="text-base font-bold tabular-nums text-violet-600 dark:text-violet-400">
                    {formatMontant(montantTransfert)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Agent Comptable</span>
                  <span className="text-sm font-semibold text-foreground">
                    {agentsComptables?.find((a) => a._id === selectedAgentComptable)?.name || '-'}
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
          </div>

          <SheetFooter className="flex-row justify-end gap-3 px-4 pb-6">
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setOpenedTransfert(false);
                setMontantTransfert(0);
                setSelectedAgentComptable(undefined);
                setNoteTransfert('');
              }}
            >
              Annuler
            </Button>
            <Button
              size="lg"
              onClick={handleTransfert}
              disabled={!montantTransfert || montantTransfert <= 0 || !selectedAgentComptable || isPendingTransfert}
            >
              {isPendingTransfert ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Envoyer le Transfert
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ---- SoldeRecouvreurCell (refondu) ------------------------------------------

function SoldeRecouvreurCell({
  name,
  recouvreurId,
  recouvreurService,
}: {
  name: string;
  recouvreurId: string;
  recouvreurService: RecouvreurService;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['solde-recouvreur', recouvreurId],
    queryFn: () => recouvreurService.getSolde(recouvreurId),
    enabled: !!recouvreurId,
  });

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
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Solde estimé</p>
        {isLoading ? (
          <Skeleton className="ml-auto h-4 w-20" />
        ) : (
          <p
            className={cn(
              'text-sm font-bold tabular-nums',
              data && data > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
            )}
          >
            {formatMontant(data || 0)}
          </p>
        )}
      </div>
    </div>
  );
}
