import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { requireRole } from '@/lib/route-protection';
import { DateRangeFilter } from '@/components/date-range-filter';
import { useTimeRangeFilter } from '@/hooks/use-time-range-filter';
import { useTableSearchSort, type ColumnDef } from '@/hooks/use-table-search-sort';
import { SortableHeader, TableToolbar } from '@/components/table-controls';
import {
  Wallet,
  QrCode,
  CheckCircle2,
  DollarSign,
  IdCard,
  Printer,
  Plus,
  Send,
  ArrowLeftRight,
  Loader2,
  Inbox,
  Clock,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CompteService } from '@/services/compte.service';
import { OperationService } from '@/services/operation.service';
import { VendeurService } from '@/services/vendeurservice';
import { TransfertVersementService } from '@/services/transfert-versement.service';
import { UserService } from '@/services/user.service';
import { TicketService } from '@/services/ticket.service';
import { useState, useEffect, useMemo } from 'react';
import { validate } from 'uuid';
import pdfMake from 'pdfmake/build/pdfmake';
import dayjs from '@/config/dayjs.config';
import { font } from '@/components/vfs_fonts';
import { authClient } from '@/auth/auth-client';
import type { Compte } from '@/types/compte';
import type { Operation, TypeOperation } from '@/types/operation';
import type { TransfertVersement, TransfertVendeurRecouvreurDto } from '@/types/transfert-versement';
import { EtatTransfertLabels, ETAT_TRANSFERT } from '@/types/transfert-versement';
import { unwrapTransfertResponse, type TransfertResponseWithStats } from '@/types/pagination';
import type { User as UserType } from '@/types/user';
import { formatMontant, getOperationDescription, TypeOperationLabels } from '@/types/operation';
import { env } from '@/env';
import { useSymbologyScanner } from '@use-symbology-scanner/react';
import { USER_ROLE } from '@/types/user.roles';
import { QUERY_KEYS, queryKeys } from '@/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

(pdfMake as any).vfs = font;

interface RechargeData {
  compte: string;
  montant: number;
  agentControle: string;
  note: string;
}

export const Route = createFileRoute('/admin/recharge/')({
  beforeLoad: () => requireRole([USER_ROLE.VENDEUR, USER_ROLE.SUPERADMIN]),
  component: RouteComponent,
});

// ---- Status badge (ETAT_TRANSFERT) -------------------------------------------

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

// ---- Type operation badge ----------------------------------------------------

const typeOpBadgeStyles: Record<TypeOperation, string> = {
  RECHARGE:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  UTILISATION:
    'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
  TRANSFERT:
    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900',
  REMBOURSEMENT:
    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
  ECHANGE_TICKET:
    'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900',
};

function TypeOpBadge({ type }: { type: TypeOperation }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        typeOpBadgeStyles[type] || 'bg-muted text-muted-foreground border-border'
      )}
    >
      {TypeOperationLabels[type] || type}
    </span>
  );
}

// ---- Stat card helper --------------------------------------------------------

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
        </div>
        <Skeleton className="size-11 rounded-xl" />
      </CardContent>
    </Card>
  );
}

// ---- Empty state -------------------------------------------------------------

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

// ---- Modal (custom dialog) ---------------------------------------------------

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

function Modal({ open, onClose, title, children, footer, maxWidth = '600px' }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-h-[90vh] overflow-y-auto"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div className="flex items-center gap-3">{title}</div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Fermer"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>
        <CardContent className="px-6 py-5">{children}</CardContent>
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-border/60 px-6 py-4">
            {footer}
          </div>
        )}
      </Card>
    </div>
  );
}

// ---- Transfert row (table row as card) ---------------------------------------

interface TransfertRowProps {
  transfert: TransfertVersement;
}

function TransfertRow({ transfert }: TransfertRowProps) {
  return (
    <div className="grid grid-cols-1 gap-3 border-b border-border/40 px-4 py-3.5 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_1.5fr_1fr_1fr_0.8fr] sm:items-center sm:gap-4">
      {/* Date */}
      <div className="text-sm text-muted-foreground tabular-nums">
        {transfert.createdAt ? dayjs(transfert.createdAt).format('DD/MM/YYYY HH:mm') : '-'}
      </div>

      {/* Recouvreur */}
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

// ---- Operation row (table row as card) ---------------------------------------

interface OperationRowProps {
  operation: Operation;
}

function OperationRow({ operation }: OperationRowProps) {
  const dateStr = dayjs(operation.createdAt).format('DD/MM/YYYY HH:mm');

  return (
    <div className="grid grid-cols-1 gap-3 border-b border-border/40 px-4 py-3.5 transition-colors hover:bg-muted/30 sm:grid-cols-[1.2fr_0.8fr_1.2fr_1.5fr_1fr] sm:items-center sm:gap-4">
      {/* Date */}
      <div className="text-sm font-medium text-foreground tabular-nums">
        {dateStr}
      </div>

      {/* Type */}
      <div>
        <TypeOpBadge type={operation.type} />
      </div>

      {/* Compte */}
      <div className="truncate text-sm text-muted-foreground">
        {operation.compte?.etudiant?.prenom} {operation.compte?.etudiant?.nom} {operation.compte?.etudiant?.ncs || ''}
      </div>

      {/* Description */}
      <div className="truncate text-sm text-muted-foreground">
        {getOperationDescription(operation)}
      </div>

      {/* Montant */}
      <div className="text-sm font-bold tabular-nums text-foreground">
        {formatMontant(operation.montant)}
      </div>
    </div>
  );
}

function OperationTableSkeleton() {
  return (
    <div className="space-y-2 px-4 py-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between border-b border-border/40 pb-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

// ==============================================================================
//  Page principale
// ==============================================================================

function RouteComponent() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [openedRecharge, setOpenedRecharge] = useState(false);
  const [montantRecharge, setMontantRecharge] = useState<number>(0);
  const { range: timeFilter, setRange: setTimeFilter, params } = useTimeRangeFilter();
  const [qr, setQr] = useState<string>();
  const [openedTransfert, setOpenedTransfert] = useState(false);
  const [montantTransfert, setMontantTransfert] = useState<number>(0);
  const [selectedRecouvreur, setSelectedRecouvreur] = useState<string>();
  const [noteTransfert, setNoteTransfert] = useState<string>('');
  const [openedEchange, setOpenedEchange] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string>();
  const [quantiteEchange, setQuantiteEchange] = useState<number>(1);

  // Responsive routing: redirect to mobile on tablet and smaller screens
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 992) {
        navigate({ to: '/admin/recharge/mobile' });
      }
    };

    checkScreenSize();

    const handleResize = () => {
      checkScreenSize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [navigate]);

  const qc = useQueryClient();
  const vendeurService = useMemo(() => new VendeurService(), []);
  const compteService = useMemo(() => new CompteService(), []);
  const operationService = useMemo(() => new OperationService(), []);
  const transfertVersementService = useMemo(() => new TransfertVersementService(), []);
  const userService = useMemo(() => new UserService(), []);
  const ticketService = useMemo(() => new TicketService(), []);

  const operationKey = ['operations', session?.user?.id, params];
  const soldeVendeurKey = ['solde', session?.user?.id];
  const transfertsKey = ['transferts-vendeur', session?.user?.id, params];
  const recouvreursKey = ['recouvreurs'];
  const ticketsKey = ['tickets', 'active'];
  const compteKey = qr
    ? queryKeys.compteByCode(qr)
    : ([QUERY_KEYS.COMPTES, 'code', 'pending'] as const);

  const { data: allOperations, isLoading: isLoadingOperations } = useQuery<Operation[]>({
    queryKey: operationKey,
    queryFn: () => operationService.byAgent(session!.user.id, params),
    enabled: !!session?.user?.id,
  });

  const operationsData = allOperations ?? [];

  const { data: soldeData, isLoading: isLoadingSolde } = useQuery<number>({
    queryKey: soldeVendeurKey,
    queryFn: () => vendeurService.getSolde(session!.user.id),
    enabled: !!session?.user?.id,
  });

  const { data } = useQuery<Compte>({
    queryKey: compteKey,
    queryFn: () => compteService.byCode(qr!),
    enabled: qr !== undefined,
  });

  const { data: recouvreurs, isLoading: isLoadingRecouvreurs } = useQuery<UserType[]>({
    queryKey: recouvreursKey,
    queryFn: () => userService.byRole(USER_ROLE.RECOUVREUR),
  });

  const { data: activeTickets, isLoading: isLoadingTickets } = useQuery<any[]>({
    queryKey: ticketsKey,
    queryFn: () => ticketService.byActive(),
  });

  const { data: mesTransferts, isLoading: isLoadingTransferts } = useQuery<TransfertVersement[] | TransfertResponseWithStats<TransfertVersement>>({
    queryKey: transfertsKey,
    queryFn: () => transfertVersementService.findByVendeur(session!.user.id, params, true),
    enabled: !!session?.user?.id,
  });

  const { data: mesTransfertsData, stats: mesTransfertsStats } = unwrapTransfertResponse(mesTransferts ?? []);
  const mesTransfertsFiltres = mesTransfertsData;

  // ---- Recherche + tri : opérations -----------------------------------------
  const operationColumns: ColumnDef<'date' | 'type' | 'compte' | 'description' | 'montant'>[] = [
    {
      key: 'date',
      label: 'Date',
      accessor: (op: Operation) => op.createdAt ? dayjs(op.createdAt).valueOf() : null,
    },
    {
      key: 'type',
      label: 'Type',
      accessor: (op: Operation) => op.type,
    },
    {
      key: 'compte',
      label: 'Compte',
      accessor: (op: Operation) =>
        `${op.compte?.etudiant?.prenom ?? ''} ${op.compte?.etudiant?.nom ?? ''} ${op.compte?.etudiant?.ncs ?? ''}`.trim(),
    },
    {
      key: 'description',
      label: 'Description',
      accessor: (op: Operation) => getOperationDescription(op),
      sortable: false,
    },
    {
      key: 'montant',
      label: 'Montant',
      accessor: (op: Operation) => op.montant,
    },
  ];
  const {
    search: opSearch,
    setSearch: setOpSearch,
    sort: opSort,
    toggleSort: toggleOpSort,
    processed: processedOperations,
  } = useTableSearchSort(operationsData, operationColumns);

  // ---- Recherche + tri : transferts -----------------------------------------
  const transfertColumns: ColumnDef<'date' | 'recouvreur' | 'montant' | 'note' | 'statut'>[] = [
    {
      key: 'date',
      label: 'Date',
      accessor: (t: TransfertVersement) => t.createdAt ? dayjs(t.createdAt).valueOf() : null,
    },
    {
      key: 'recouvreur',
      label: 'Recouvreur',
      accessor: (t: TransfertVersement) => t.destination_acteur_name ?? '',
    },
    {
      key: 'montant',
      label: 'Montant',
      accessor: (t: TransfertVersement) => t.montant,
    },
    {
      key: 'note',
      label: 'Note',
      accessor: (t: TransfertVersement) => t.note ?? '',
      sortable: false,
    },
    {
      key: 'statut',
      label: 'Statut',
      accessor: (t: TransfertVersement) => EtatTransfertLabels[t.etat] ?? t.etat,
    },
  ];
  const {
    search: transfertSearch,
    setSearch: setTransfertSearch,
    sort: transfertSort,
    toggleSort: toggleTransfertSort,
    processed: processedTransferts,
  } = useTableSearchSort(mesTransfertsFiltres, transfertColumns);

  const { mutate: createTransfert, isPending: isPendingTransfert } = useMutation({
    mutationFn: (data: TransfertVendeurRecouvreurDto) => transfertVersementService.createVendeurRecouvreur(data),
    onSuccess: () => {
      setOpenedTransfert(false);
      setMontantTransfert(0);
      setSelectedRecouvreur(undefined);
      setNoteTransfert('');
      qc.invalidateQueries({ queryKey: transfertsKey });
      qc.invalidateQueries({ queryKey: soldeVendeurKey });
    },
  });

  const { mutate: createRecharge, isPending: isPendingRecharge } = useMutation({
    mutationFn: (data: RechargeData) => operationService.recharge(data),
    onSuccess: () => {
      setOpenedRecharge(false);
      setMontantRecharge(0);
      if (qr) {
        qc.invalidateQueries({ queryKey: queryKeys.compteByCode(qr) });
      }
      qc.invalidateQueries({ queryKey: soldeVendeurKey });
      qc.invalidateQueries({ queryKey: operationKey });
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
    if (!selectedTicket) return;
    if (!quantiteEchange || quantiteEchange < 1) return;

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
    if (!montantRecharge || montantRecharge <= 0) return;

    const rechargeData: RechargeData = {
      compte: data?._id!,
      montant: montantRecharge,
      agentControle: session?.user?.id!,
      note: `Recharge effectuée par ${session?.user?.name}`
    };

    createRecharge(rechargeData);
  };

  const openRecharge = () => setOpenedRecharge(true);

  const handleTransfert = () => {
    if (!montantTransfert || montantTransfert <= 0) return;
    if (!selectedRecouvreur) return;
    if (montantTransfert > (soldeData || 0)) return;

    const transfertData: TransfertVendeurRecouvreurDto = {
      vendeur_id: session!.user.id,
      recouvreur_id: selectedRecouvreur,
      montant: montantTransfert,
      note: noteTransfert || `Versement de ${session?.user?.name}`
    };

    createTransfert(transfertData);
  };

  const handleSymbol = (symbol: string) => {
    if (!symbol || symbol.length < 8) return;
    if (validate(symbol)) {
      setQr(symbol);
    }
  };

  useSymbologyScanner(handleSymbol, { symbologies: ['EAN 8', 'EAN 13', 'QR Code'] });

  const handlePrintRecord = () => {
    const docDefinition: any = {
      styles: {
        entete: { bold: true, alignment: 'center', fontSize: 10 },
        center: { alignment: 'center', fontSize: 8, bold: true },
        left: { alignment: 'left' },
        right: { alignment: 'right' },
        nombre: { alignment: 'right', fontSize: 10, bold: true },
        info: { fontSize: 8 },
        header3: { color: 'white', fillColor: '#73BFBA', bold: true, alignment: 'center', fontSize: 6 },
        header4: { color: 'white', fillColor: '#73BFBA', bold: true, alignment: 'right', fontSize: 6 },
        total: { color: 'white', bold: true, fontSize: 6, fillColor: '#73BFBA', alignment: 'center' },
        anotherStyle: { italics: true, alignment: 'right' }
      },
      content: [
        {
          columns: [
            {
              width: 'auto',
              alignment: 'left',
              stack: [
                { text: 'REPUBLIQUE DU SENEGAL\n', fontSize: 8, bold: true, alignment: 'center' },
                { text: 'Un Peuple, Un but, Une Foi\n', fontSize: 8, bold: true, margin: [0, 2], alignment: 'center' },
                { text: "MINISTERE DE L'ENSEIGNEMENT SUPERIEUR DE LA RECHERCHE ET DE L'INNOVATION \n", fontSize: 8, bold: true, margin: [0, 2], alignment: 'center' },
                { text: 'CENTRE REGIONAL DES OEUVRES UNIVERSITAIRES SOCIALES DE ZIGUINCHOR\n', fontSize: 8, bold: true, margin: [0, 2], alignment: 'center' },
              ]
            },
            {
              width: 'auto',
              alignment: 'right',
              stack: [
                { text: `Ziguinchor Le : ${dayjs().format('DD/MM/YYYY')}`, fontSize: 8, bold: true, alignment: 'center' },
              ]
            }
          ]
        },
        {
          margin: [0, 20],
          fillColor: '#422AFB',
          alignment: 'center',
          layout: 'noBorders',
          table: {
            widths: [500],
            body: [
              [{ text: `OPERATIONS DU ${dayjs().format('DD/MM/YYYY')}`, fontSize: 16, bold: true, color: 'white', margin: [0, 4] }],
            ]
          }
        },
        {
          margin: [4, 4, 4, 4],
          alignment: 'justify',
          layout: {
            fillColor: function (rowIndex: number) {
              return (rowIndex === 0) ? '#A3AED0' : null;
            }
          },
          table: {
            widths: ['5%', '15%', '10%', '50%', '20%'],
            body: [
              [
                { text: '#', style: 'entete' },
                { text: 'DATE', style: 'entete' },
                { text: 'HEURE', style: 'entete' },
                { text: 'DESCRIPTION', style: 'entete' },
                { text: 'MONTANT', style: 'entete' }
              ],
              ...operationsData?.map((k: Operation, i: number) => ([
                { text: `${i + 1}`, style: 'info' },
                { text: `${dayjs(k.createdAt).format('DD/MM/YYYY')}`, style: 'info' },
                { text: `${dayjs(k.createdAt).format('HH:mm:ss')}`, style: 'info' },
                { text: `${k.note || getOperationDescription(k)}`, style: 'info' },
                { text: `${formatMontant(k.montant)}`, style: 'nombre' }
              ])),
              [
                { text: 'Montant Total', style: 'info', colSpan: 4 },
                '', '', '',
                { text: `${formatMontant(operationsData?.reduce((acc, cur) => acc + cur.montant, 0) || 0)}`, style: 'nombre', color: 'white', fillColor: '#422AFB' }
              ]
            ]
          }
        },
      ]
    };

    pdfMake.createPdf(docDefinition).open();
  };

  return (
    <div className="space-y-6">
      {/* Hero Header + Solde vendeur */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden border-border/60 shadow-none">
          <CardContent className="flex items-center gap-5 px-6 py-6">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Wallet className="size-8" />
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                Espace vendeur
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                Recharge de comptes
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Scannez le QR code d'un étudiant pour effectuer une recharge sur son compte
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/60 shadow-none">
          <CardContent className="flex items-center justify-between gap-4 px-6 py-6">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mon solde vendeur
              </p>
              <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
                {isLoadingSolde ? <Skeleton className="h-9 w-40" /> : formatMontant(soldeData || 0)}
              </p>
            </div>
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Wallet className="size-7" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Scanner + Student Info */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
        {/* QR Scanner Section */}
        <Card className="border-border/60 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
              <QrCode className="size-4 text-foreground" />
              Scanner QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-5">
            <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-muted/30 p-4">
              <img
                src="/qrcode.gif"
                alt="QR Scanner"
                className="max-h-64 w-full rounded-lg object-contain"
              />
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Positionnez le QR code de l'étudiant devant la caméra
            </p>
          </CardContent>
        </Card>

        {/* Student Info Section */}
        {data ? (
          <Card className="overflow-hidden border-border/60 shadow-none">
            {/* En-tête étudiant */}
            <div className="flex items-center gap-4 border-b border-border/60 px-6 py-5">
              <Avatar className="size-20 shrink-0 border-2 border-border">
                <AvatarImage src={`${env.VITE_R2_URL}/${data.etudiant?.avatar}`} />
                <AvatarFallback className="text-lg font-semibold">
                  {data.etudiant?.prenom?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Étudiant scanné
                </p>
                <h3 className="mt-1 truncate text-xl font-bold text-foreground">
                  {data.etudiant?.prenom} {data.etudiant?.nom}
                </h3>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
                  <IdCard className="size-3.5" />
                  {data.etudiant?.ncs}
                </span>
              </div>
            </div>

            {/* Corps de la carte */}
            <CardContent className="px-6 py-5">
              {(data.etudiant as any)?.email || (data.etudiant as any)?.telephone ? (
                <>
                  <div className="flex flex-wrap gap-x-8 gap-y-2">
                    {(data.etudiant as any)?.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium text-foreground break-all">
                          {(data.etudiant as any).email}
                        </span>
                      </div>
                    )}
                    {(data.etudiant as any)?.telephone && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Téléphone:</span>
                        <span className="font-medium text-foreground">
                          {(data.etudiant as any).telephone}
                        </span>
                      </div>
                    )}
                  </div>
                  <Separator className="my-4" />
                </>
              ) : null}

              {/* Carte Solde */}
              <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-muted/30 p-5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Wallet className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Solde disponible
                  </p>
                  <p className="text-2xl font-bold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatMontant(data.solde || 0)}
                  </p>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={openRecharge}
                >
                  <Plus className="size-4" />
                  Recharger le Compte
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-cyan-600 text-white hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800"
                  onClick={() => setOpenedEchange(true)}
                >
                  <ArrowLeftRight className="size-4" />
                  Échange Tickets
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/60 shadow-none">
            <CardContent className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex size-20 items-center justify-center rounded-full bg-muted">
                <QrCode className="size-10 text-muted-foreground" />
              </div>
              <h3 className="mt-6 text-lg font-semibold text-muted-foreground">
                En attente de scan
              </h3>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                Scannez le QR code d'un étudiant pour voir ses informations et effectuer une recharge
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filtre par intervalle de temps (opérations + transferts) */}
      <Card className="border-border/60 shadow-none">
        <CardContent className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Filtrer par intervalle de temps
            </p>
            <p className="text-xs text-muted-foreground">
              Par défaut : mois en cours. S'applique aux opérations et transferts.
            </p>
          </div>
          <DateRangeFilter value={timeFilter} onChange={setTimeFilter} />
        </CardContent>
      </Card>

      {/* Section Transfert vers Recouvreur */}
      <Card className="border-border/60 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-4">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <Send className="size-5 text-foreground" />
            Transfert vers Recouvreur
          </CardTitle>
          <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
            <Button
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
              onClick={() => setOpenedTransfert(true)}
            >
              <Send className="size-4" />
              Nouveau Transfert
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-5 py-5">
          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {isLoadingTransferts ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard
                  label="Transferts en attente"
                  value={mesTransfertsStats?.enAttente ?? 0}
                  icon={<Clock className="size-5" />}
                  accent="amber"
                />
                <StatCard
                  label="Transferts validés"
                  value={mesTransfertsStats?.valides ?? 0}
                  icon={<CheckCircle2 className="size-5" />}
                  accent="emerald"
                />
                <StatCard
                  label="Montant total transféré"
                  value={formatMontant(mesTransfertsStats?.montantValide ?? 0)}
                  icon={<Wallet className="size-5" />}
                  accent="blue"
                />
              </>
            )}
          </div>

          <Separator className="my-5" />

          {/* Recherche */}
          <div className="mb-4">
            <TableToolbar
              value={transfertSearch}
              onChange={setTransfertSearch}
              placeholder="Rechercher un transfert..."
            />
          </div>

          {/* Table header (desktop only) */}
          <div className="hidden grid-cols-[1fr_1.5fr_1fr_1fr_0.8fr] gap-4 border-b border-border/60 px-4 py-2 sm:grid">
            <SortableHeader label="Date" columnKey="date" sort={transfertSort} onToggleSort={toggleTransfertSort} />
            <SortableHeader label="Recouvreur" columnKey="recouvreur" sort={transfertSort} onToggleSort={toggleTransfertSort} />
            <SortableHeader label="Montant" columnKey="montant" sort={transfertSort} onToggleSort={toggleTransfertSort} />
            <SortableHeader label="Note" columnKey="note" sort={transfertSort} onToggleSort={toggleTransfertSort} />
            <SortableHeader label="Statut" columnKey="statut" sort={transfertSort} onToggleSort={toggleTransfertSort} />
          </div>

          {/* Transferts list */}
          {isLoadingTransferts ? (
            <TransfertTableSkeleton />
          ) : processedTransferts.length > 0 ? (
            <div className="divide-y divide-border/40">
              {processedTransferts.map((transfert) => (
                <TransfertRow key={transfert._id} transfert={transfert} />
              ))}
            </div>
          ) : (
            <EmptyState message="Aucun transfert effectué sur cette période" />
          )}
        </CardContent>
      </Card>

      {/* Operations Table */}
      <Card className="border-border/60 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-4">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <DollarSign className="size-5 text-foreground" />
            Mes Opérations (Recharges)
          </CardTitle>
          <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
            <Button variant="outline" size="sm" onClick={handlePrintRecord}>
              <Printer className="size-4" />
              Imprimer
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-5 py-5">
          {/* Recherche */}
          <TableToolbar
            value={opSearch}
            onChange={setOpSearch}
            placeholder="Rechercher une opération..."
          />

          {/* Table header (desktop only) */}
          <div className="mt-4 hidden grid-cols-[1.2fr_0.8fr_1.2fr_1.5fr_1fr] gap-4 border-b border-border/60 px-4 py-2 sm:grid">
            <SortableHeader label="Date" columnKey="date" sort={opSort} onToggleSort={toggleOpSort} />
            <SortableHeader label="Type" columnKey="type" sort={opSort} onToggleSort={toggleOpSort} />
            <SortableHeader label="Compte" columnKey="compte" sort={opSort} onToggleSort={toggleOpSort} />
            <SortableHeader label="Description" columnKey="description" sort={opSort} onToggleSort={toggleOpSort} />
            <SortableHeader label="Montant" columnKey="montant" sort={opSort} onToggleSort={toggleOpSort} />
          </div>

          {/* Operations list */}
          {isLoadingOperations ? (
            <OperationTableSkeleton />
          ) : processedOperations.length > 0 ? (
            <div className="divide-y divide-border/40">
              {processedOperations.map((operation) => (
                <OperationRow key={operation._id} operation={operation} />
              ))}
            </div>
          ) : (
            <EmptyState message="Aucune opération trouvée sur cette période" />
          )}
        </CardContent>
      </Card>

      {/* Modal Recharge */}
      <Modal
        open={openedRecharge}
        onClose={() => {
          setOpenedRecharge(false);
          setMontantRecharge(0);
        }}
        title={
          <>
            <div className="flex size-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Plus className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Recharge de Compte</h3>
          </>
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setOpenedRecharge(false);
                setMontantRecharge(0);
              }}
            >
              Annuler
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800"
              onClick={handleRecharge}
              disabled={!montantRecharge || montantRecharge <= 0 || isPendingRecharge}
            >
              {isPendingRecharge ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Valider la Recharge
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {data && (
            <div className="flex items-center gap-4 rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/40">
              <Avatar className="size-14 shrink-0 border-2 border-background shadow-sm">
                <AvatarImage src={`${env.VITE_R2_URL}/${data.etudiant?.avatar}`} />
                <AvatarFallback className="text-sm font-semibold">
                  {data.etudiant?.prenom?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">
                  {data.etudiant?.prenom} {data.etudiant?.nom}
                </p>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
                  <IdCard className="size-3.5" />
                  {data.etudiant?.ncs}
                </span>
                <div className="mt-2 flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">Solde actuel:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatMontant(data.solde || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-bold text-foreground">
              Montant de la recharge
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={100}
                placeholder="Entrez le montant"
                value={montantRecharge || ''}
                onChange={(e) => setMontantRecharge(Number(e.target.value) || 0)}
                className="h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base font-medium tabular-nums shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                FCFA
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Montant minimum: 100 FCFA
            </p>
          </div>

          {montantRecharge > 0 && data && (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
              <p className="text-sm font-medium text-muted-foreground">
                Aperçu de la recharge
              </p>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Solde actuel</span>
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {formatMontant(data.solde || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Montant à ajouter</span>
                <span className="text-sm font-bold tabular-nums text-sky-600 dark:text-sky-400">
                  + {formatMontant(montantRecharge)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Nouveau solde</span>
                <span className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatMontant((data.solde || 0) + montantRecharge)}
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Transfert vers Recouvreur */}
      <Modal
        open={openedTransfert}
        onClose={() => {
          setOpenedTransfert(false);
          setMontantTransfert(0);
          setSelectedRecouvreur(undefined);
          setNoteTransfert('');
        }}
        title={
          <>
            <div className="flex size-10 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300">
              <Send className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-orange-600 dark:text-orange-400">Transfert vers Recouvreur</h3>
          </>
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setOpenedTransfert(false);
                setMontantTransfert(0);
                setSelectedRecouvreur(undefined);
                setNoteTransfert('');
              }}
            >
              Annuler
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
              onClick={handleTransfert}
              disabled={!montantTransfert || montantTransfert <= 0 || !selectedRecouvreur || isPendingTransfert}
            >
              {isPendingTransfert ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Envoyer le Transfert
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Solde disponible */}
          <div className="flex items-center gap-4 rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/40">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
              <Wallet className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Votre solde disponible</p>
              <p className="text-xl font-bold tabular-nums text-sky-600 dark:text-sky-400">
                {formatMontant(soldeData || 0)}
              </p>
            </div>
          </div>

          {/* Sélection du recouvreur */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-foreground">
              Sélectionner un recouvreur
            </label>
            <select
              value={selectedRecouvreur || ''}
              onChange={(e) => setSelectedRecouvreur(e.target.value)}
              disabled={isLoadingRecouvreurs}
              className="h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"
            >
              <option value="">Choisir un recouvreur</option>
              {recouvreurs?.map((rec) => (
                <option key={rec._id} value={rec._id}>
                  {rec.name}
                </option>
              ))}
            </select>
          </div>

          {/* Montant du transfert */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-foreground">
              Montant du transfert
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={soldeData || 0}
                step={100}
                placeholder="Entrez le montant"
                value={montantTransfert || ''}
                onChange={(e) => setMontantTransfert(Number(e.target.value) || 0)}
                className="h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base font-medium tabular-nums shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                FCFA
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum: {formatMontant(soldeData || 0)}
            </p>
          </div>

          {/* Note optionnelle */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-foreground">
              Note (optionnelle)
            </label>
            <textarea
              placeholder="Ajouter une note..."
              value={noteTransfert}
              onChange={(e) => setNoteTransfert(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"
            />
          </div>

          {/* Aperçu du transfert */}
          {montantTransfert > 0 && selectedRecouvreur && (
            <div className="space-y-3 rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/40">
              <p className="text-sm font-medium text-muted-foreground">
                Aperçu du transfert
              </p>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Montant à transférer</span>
                <span className="text-sm font-bold tabular-nums text-orange-600 dark:text-orange-400">
                  {formatMontant(montantTransfert)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Recouvreur</span>
                <span className="text-sm font-bold text-foreground">
                  {recouvreurs?.find(r => r._id === selectedRecouvreur)?.name || '-'}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Solde après transfert</span>
                <span className="text-xl font-bold tabular-nums text-sky-600 dark:text-sky-400">
                  {formatMontant((soldeData || 0) - montantTransfert)}
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Échange Tickets */}
      <Modal
        open={openedEchange}
        onClose={() => {
          setOpenedEchange(false);
          setSelectedTicket(undefined);
          setQuantiteEchange(1);
        }}
        title={
          <>
            <div className="flex size-10 items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 text-cyan-600 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-300">
              <ArrowLeftRight className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400">Échange de Tickets</h3>
          </>
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setOpenedEchange(false);
                setSelectedTicket(undefined);
                setQuantiteEchange(1);
              }}
            >
              Annuler
            </Button>
            <Button
              className="bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800"
              onClick={handleEchange}
              disabled={!selectedTicket || !quantiteEchange || quantiteEchange < 1 || !data || isPendingEchange}
            >
              {isPendingEchange ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Valider l'Échange
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {data && (
            <div className="flex items-center gap-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950/40">
              <Avatar className="size-14 shrink-0 border-2 border-background shadow-sm">
                <AvatarImage src={`${env.VITE_R2_URL}/${data.etudiant?.avatar}`} />
                <AvatarFallback className="text-sm font-semibold">
                  {data.etudiant?.prenom?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">
                  {data.etudiant?.prenom} {data.etudiant?.nom}
                </p>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
                  <IdCard className="size-3.5" />
                  {data.etudiant?.ncs}
                </span>
                <div className="mt-2 flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">Solde actuel:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatMontant(data.solde || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sélection du ticket */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-foreground">
              Ticket à échanger
            </label>
            <select
              value={selectedTicket || ''}
              onChange={(e) => setSelectedTicket(e.target.value)}
              disabled={isLoadingTickets}
              className="h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"
            >
              <option value="">Choisir un ticket</option>
              {activeTickets?.map((ticket: any) => (
                <option key={ticket._id} value={ticket._id}>
                  {ticket.type || 'ticket'} — {ticket.nom} — {formatMontant(ticket.prix)}
                </option>
              ))}
            </select>
          </div>

          {/* Quantité */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-foreground">
              Quantité de tickets ramenés
            </label>
            <input
              type="number"
              min={1}
              step={1}
              placeholder="Nombre de tickets"
              value={quantiteEchange || ''}
              onChange={(e) => setQuantiteEchange(Number(e.target.value) || 1)}
              className="h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base font-medium tabular-nums shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"
            />
            <p className="text-xs text-muted-foreground">
              Le montant sera calculé automatiquement: prix du ticket × quantité
            </p>
          </div>

          {/* Aperçu de l'échange */}
          {selectedTicket && quantiteEchange >= 1 && data && (
            <div className="space-y-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950/40">
              <p className="text-sm font-medium text-muted-foreground">
                Aperçu de l'échange
              </p>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ticket</span>
                <span className="text-sm font-bold text-foreground">
                  {activeTickets?.find(t => t._id === selectedTicket)?.nom || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Prix unitaire</span>
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {formatMontant(activeTickets?.find(t => t._id === selectedTicket)?.prix || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Quantité</span>
                <span className="text-sm font-bold tabular-nums text-foreground">
                  × {quantiteEchange}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Montant à créditer</span>
                <span className="text-sm font-bold tabular-nums text-cyan-600 dark:text-cyan-400">
                  + {formatMontant((activeTickets?.find(t => t._id === selectedTicket)?.prix || 0) * quantiteEchange)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Nouveau solde</span>
                <span className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatMontant((data.solde || 0) + (activeTickets?.find(t => t._id === selectedTicket)?.prix || 0) * quantiteEchange)}
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
