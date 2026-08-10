import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requireRole, canModify } from '@/lib/route-protection';
import { useSession } from '@/auth/auth-client';
import { DatePicker } from 'antd';
import {
  ArrowLeft,
  FileText,
  DollarSign,
  User,
  Store,
  Printer,
  Search,
  Users,
  Settings,
  UserPlus,
  CheckCircle2,
  XCircle,
  MapPin,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Inbox,
  Clock,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { RestaurantService } from '@/services/restaurant.service';
import { OperationService } from '@/services/operation.service';
import { ServiceService } from '@/services/service.service';
import { useDebounce } from 'react-use';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { UserService } from '@/services/user.service';
import { TicketService } from '@/services/ticket.service';
import { USER_ROLE } from '@/types/user.roles';
import { QUERY_KEYS } from '@/constants';
import type { Ticket } from '@/types/ticket';
import { TypeService, type Service } from '@/types/service';
import type { Operation } from '@/types/operation';
import type { RestaurantServiceEntry } from '@/types/restaurant';
import { formatMontant } from '@/types/operation';
import { PlanningForm } from '@/components/planning-form';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { Card, CardContent, CardHeader, CardTitle, CardAction, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

dayjs.extend(isBetween);
// @ts-ignore
pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts;

const { RangePicker } = DatePicker;

export const Route = createFileRoute('/admin/restaurations/$restaurantId')({
  beforeLoad: () => requireRole([USER_ROLE.SUPERVISEUR, USER_ROLE.CHEF_DIV_RESTAURANT, USER_ROLE.SUPERADMIN, USER_ROLE.ADMIN]),
  component: RouteComponent,
});

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

// ---- Status badge -----------------------------------------------------------

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        active
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
          : 'bg-muted text-muted-foreground border-border'
      )}
    >
      {active ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
      {active ? 'Ouvert' : 'Fermé'}
    </span>
  );
}

// ---- Toggle switch ----------------------------------------------------------

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
}

function ToggleSwitch({ checked, onChange, disabled, loading }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && !loading && onChange(!checked)}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
        checked ? 'bg-emerald-500' : 'bg-muted-foreground/30',
        (disabled || loading) && 'cursor-not-allowed opacity-50'
      )}
    >
      {loading && (
        <Loader2 className="absolute left-1 top-1/2 size-4 -translate-y-1/2 animate-spin text-white" />
      )}
      <span className={cn(
        'pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform',
        checked ? 'translate-x-5' : 'translate-x-0'
      )} />
    </button>
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

// ---- Operation row ----------------------------------------------------------

interface OperationRowProps {
  op: any;
}

function OperationRow({ op }: OperationRowProps) {
  const prenom = op.compte?.etudiant?.prenom || '';
  const nom = op.compte?.etudiant?.nom || '';
  const code = op.compte?.etudiant?.ncs || '';
  const prixStandard = op.ticketSnapshot?.prix || 0;

  return (
    <div className="grid grid-cols-1 gap-3 border-b border-border/40 px-4 py-3.5 transition-colors hover:bg-muted/30 sm:grid-cols-[auto_auto_1fr_auto_auto_auto] sm:items-center sm:gap-4">
      {/* Date */}
      <div className="text-sm tabular-nums text-muted-foreground">
        {dayjs(op.createdAt).format('DD/MM/YYYY')}
      </div>
      {/* Heure */}
      <div className="text-sm tabular-nums text-muted-foreground">
        {dayjs(op.createdAt).format('HH:mm:ss')}
      </div>
      {/* Étudiant */}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{prenom} {nom}</p>
        <p className="text-xs text-muted-foreground">{code}</p>
      </div>
      {/* Ticket */}
      <div>
        <span className="inline-flex items-center rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 px-2.5 py-0.5 text-xs font-semibold dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
          {op.ticketSnapshot?.nom || '—'}
        </span>
      </div>
      {/* Prix */}
      <div className="text-sm font-bold tabular-nums text-foreground">
        {formatMontant(prixStandard)}
      </div>
      {/* Agent */}
      <div className="text-sm text-muted-foreground">
        {op.agentControle?.name || 'Non assigné'}
      </div>
    </div>
  );
}

function OperationTableSkeleton() {
  return (
    <div className="space-y-2 px-4 py-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

// ---- Service entry row ------------------------------------------------------

interface ServiceEntryRowProps {
  entry: RestaurantServiceEntry;
  ticketLabelMap: Record<string, string>;
  canEdit: boolean;
  onEdit: (record: RestaurantServiceEntry) => void;
  onRemove: (id: string) => void;
  onEditPlanning: (serviceId: string, serviceNom: string) => void;
  isRemoving: boolean;
}

function ServiceEntryRow({ entry, ticketLabelMap, canEdit, onEdit, onRemove, onEditPlanning, isRemoving }: ServiceEntryRowProps) {
  const svc = typeof entry.service === 'object' ? entry.service : null;
  const svcId = typeof entry.service === 'object' ? (entry.service as Service)._id : entry.service as string;
  const ticketId = svc && typeof svc.ticket === 'object' ? (svc.ticket as any)?._id : svc?.ticket as string;

  return (
    <div className="grid grid-cols-1 gap-3 border-b border-border/40 px-4 py-3.5 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center sm:gap-4">
      {/* Nom */}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{svc?.nom || '—'}</p>
      </div>
      {/* Type */}
      <div>
        <span className="inline-flex items-center gap-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200 px-2.5 py-0.5 text-xs font-semibold dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
          <Store className="size-3" />
          {svc?.type || '—'}
        </span>
      </div>
      {/* Ticket */}
      <div className="text-sm text-muted-foreground">
        {ticketId ? (ticketLabelMap[ticketId] || '—') : '—'}
      </div>
      {/* Prix Repreneur */}
      <div className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
        {formatMontant(entry.prixRepreneur || 0)}
      </div>
      {/* Actions */}
      <div className="flex items-center gap-1">
        {canEdit && (
          <>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onEditPlanning(svcId, svc?.nom || 'Service')}
              title="Gérer le planning de contrôle"
            >
              <Clock className="size-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onEdit(entry)}
              title="Modifier le prix repreneur"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (window.confirm('Retirer ce service du restaurant? Le service ne sera pas supprimé, seulement retiré de cette liste.')) {
                  onRemove(svcId);
                }
              }}
              disabled={isRemoving}
              title="Retirer"
            >
              {isRemoving ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function ServiceTableSkeleton() {
  return (
    <div className="space-y-2 px-4 py-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between border-b border-border/40 pb-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

// ---- Native select wrapper --------------------------------------------------

const nativeSelectClass =
  'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30';

// ==============================================================================
//  Page principale
// ==============================================================================

function RouteComponent() {
  const { data: session } = useSession();
  const canEdit = canModify(session?.user?.role);
  const { restaurantId } = useParams({ from: '/admin/restaurations/$restaurantId' });
  const navigate = useNavigate();

  // State
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [serviceDrawerOpen, setServiceDrawerOpen] = useState(false);
  const [editServiceModalOpen, setEditServiceModalOpen] = useState(false);

  // Config modal form state
  const [configRepreneur, setConfigRepreneur] = useState<string | undefined>(undefined);
  const [configSuperviseur, setConfigSuperviseur] = useState<string | undefined>(undefined);

  // Service drawer form state
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({});

  // Edit service modal form state
  const [editServiceId, setEditServiceId] = useState<string>('');
  const [editServiceNom, setEditServiceNom] = useState<string>('');
  const [editPrixRepreneur, setEditPrixRepreneur] = useState<number>(0);
  // Planning form state
  const [planningOpen, setPlanningOpen] = useState(false);
  const [planningTarget, setPlanningTarget] = useState<{ id: string; nom: string } | null>(null);

  const userService = new UserService();
  const keyRepreneurs = ['repreneurs'];

  const { data: repreneurs, isLoading: isRepreneursLoading } = useQuery({
    queryKey: keyRepreneurs,
    queryFn: () => userService.byRole(USER_ROLE.REPREUNEUR),
  });

  const keySuperviseurs = ['superviseurs'];
  const { data: superviseurs } = useQuery({
    queryKey: keySuperviseurs,
    queryFn: () => userService.byRole(USER_ROLE.SUPERVISEUR),
  });

  const isLoadingRepreneurs = isRepreneursLoading;

  useDebounce(() => setDebouncedSearchText(searchText), 300, [searchText]);

  const restaurantService = new RestaurantService();
  const operationService = new OperationService();
  const ticketService = new TicketService();
  const serviceService = new ServiceService();
  const queryClient = useQueryClient();

  // Récupérer les tickets pour la sélection
  const { data: ticketsRaw, isLoading: isLoadingTickets } = useQuery<any>({
    queryKey: [QUERY_KEYS.ALLTICKETS],
    queryFn: () => ticketService.getAll(),
  });
  // Rétro-compatibilité : le backend peut retourner un array ou un PaginatedResult
  const tickets = useMemo(() => {
    if (!ticketsRaw) return [];
    return Array.isArray(ticketsRaw) ? ticketsRaw : (ticketsRaw.data ?? []);
  }, [ticketsRaw]);

  // Récupérer tous les services de type restaurant (créés par l'administrateur)
  const { data: allRestaurantServices, isLoading: isLoadingAllServices } = useQuery({
    queryKey: ['services_by_type', TypeService.RESTAURANT],
    queryFn: () => serviceService.getByType(TypeService.RESTAURANT),
  });

  // Récupérer le restaurant (avec services peuplés)
  const { data: service, isLoading: isLoadingService } = useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: () => restaurantService.getOne(restaurantId),
    enabled: !!restaurantId,
  });

  // Tickets dérivés des services du restaurant
  const restaurantTickets = useMemo(() => {
    if (!service?.services) return [];
    const tickets: Ticket[] = [];
    const seenIds = new Set<string>();
    for (const entry of service.services) {
      const svc = typeof entry.service === 'object' ? entry.service : null;
      const ticket = svc && typeof svc.ticket === 'object' ? svc.ticket : null;
      if (ticket && ticket._id && !seenIds.has(ticket._id)) {
        tickets.push(ticket);
        seenIds.add(ticket._id);
      }
    }
    return tickets;
  }, [service]);

  // Prix repreneur par ticket, dérivés des entrées de services du restaurant
  const restaurantPrixRepreneur = useMemo(() => {
    if (!service?.services) return {};
    const prix: Record<string, number> = {};
    for (const entry of service.services) {
      const svc = typeof entry.service === 'object' ? entry.service : null;
      const ticket = svc && typeof svc.ticket === 'object' ? svc.ticket : null;
      if (ticket && ticket._id && entry.prixRepreneur != null) {
        prix[ticket._id] = entry.prixRepreneur;
      }
    }
    return prix;
  }, [service]);

  // Repreneur dérivé
  const restaurantGerant = useMemo(() => {
    if (!service?.repreneur) return null;
    const repreneurId = service.repreneur;
    const user = repreneurs?.find((u: any) => u._id === repreneurId);
    return user || null;
  }, [service, repreneurs]);

  // Superviseur dérivé
  const restaurantSuperviseur = useMemo(() => {
    if (!service?.superviseur) return null;
    const superviseurId = service.superviseur;
    const user = superviseurs?.find((u: any) => u._id === superviseurId);
    return user || null;
  }, [service, superviseurs]);

  // Mutation pour activer/désactiver le restaurant
  const { mutate: toggleServiceStatus, isPending: isTogglingStatus } = useMutation({
    mutationFn: (data: any) => restaurantService.update(restaurantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RESTAURANTS] });
    },
  });

  // Handler pour le switch
  const handleToggleStatus = (checked: boolean) => {
    toggleServiceStatus({ active: checked });
  };

  // Mutation pour mettre à jour la configuration du restaurant
  const { mutate: updateConfiguration, isPending: isUpdatingConfig } = useMutation({
    mutationFn: (data: any) => restaurantService.update(restaurantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId] });
      setConfigModalOpen(false);
      setConfigRepreneur(undefined);
      setConfigSuperviseur(undefined);
    },
  });

  // Handler pour ouvrir le modal de configuration
  const handleOpenConfig = () => {
    setConfigRepreneur(service?.repreneur || undefined);
    setConfigSuperviseur(service?.superviseur || undefined);
    setConfigModalOpen(true);
  };

  // Handler pour soumettre la configuration
  const handleSubmitConfig = () => {
    updateConfiguration({
      repreneur: configRepreneur,
      superviseur: configSuperviseur,
    });
  };

  // Helpers pour gérer la liste des services du restaurant
  const getRestaurantServiceIds = useMemo(() => {
    if (!service?.services) return [];
    return service.services.map((entry: RestaurantServiceEntry) =>
      typeof entry.service === 'object' ? (entry.service as Service)._id : entry.service as string
    );
  }, [service]);

  // Helper: serialize entries to { service: id, prixRepreneur } for backend
  const serializeEntries = (entries: RestaurantServiceEntry[]): { service: string; prixRepreneur: number }[] =>
    entries.map((entry) => ({
      service: typeof entry.service === 'object' ? (entry.service as Service)._id : entry.service as string,
      prixRepreneur: entry.prixRepreneur,
    }));

  // Mutation pour assigner des services existants au restaurant (avec prixRepreneur)
  const { mutate: assignServices, isPending: isAssigningServices } = useMutation({
    mutationFn: async (entries: RestaurantServiceEntry[]) => {
      const existing = service?.services || [];
      const merged = [...existing];
      for (const newEntry of entries) {
        const newSvcId = typeof newEntry.service === 'object' ? (newEntry.service as Service)._id : newEntry.service as string;
        const alreadyExists = merged.some((e) => {
          const existingId = typeof e.service === 'object' ? (e.service as Service)._id : e.service as string;
          return existingId === newSvcId;
        });
        if (!alreadyExists) {
          merged.push(newEntry);
        }
      }
      return restaurantService.update(restaurantId, { services: serializeEntries(merged) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId] });
      setServiceDrawerOpen(false);
      setSelectedServices([]);
      setServicePrices({});
    },
  });

  // Mutation pour retirer un service du restaurant (ne supprime pas le service)
  const { mutate: removeServiceFromRestaurant, isPending: isRemovingService } = useMutation({
    mutationFn: async (id: string) => {
      const remaining = (service?.services || []).filter((entry: RestaurantServiceEntry) => {
        const svcId = typeof entry.service === 'object' ? (entry.service as Service)._id : entry.service as string;
        return svcId !== id;
      });
      return restaurantService.update(restaurantId, { services: serializeEntries(remaining) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId] });
    },
  });

  const openAssignDrawer = () => {
    setSelectedServices([]);
    setServicePrices({});
    setServiceDrawerOpen(true);
  };

  const handleAssignServices = () => {
    const entries: RestaurantServiceEntry[] = selectedServices.map((id) => ({
      service: id,
      prixRepreneur: servicePrices[id] ?? 0,
    }));
    assignServices(entries);
  };

  const handleRemoveService = (id: string) => {
    removeServiceFromRestaurant(id);
  };

  // Mutation pour modifier le prixRepreneur d'un service assigné
  const { mutate: updateServiceEntry, isPending: isUpdatingServiceEntry } = useMutation({
    mutationFn: async (data: { serviceId: string; prixRepreneur: number }) => {
      const updated = (service?.services || []).map((entry: RestaurantServiceEntry) => {
        const svcId = typeof entry.service === 'object' ? (entry.service as Service)._id : entry.service as string;
        if (svcId === data.serviceId) {
          return { ...entry, prixRepreneur: data.prixRepreneur };
        }
        return entry;
      });
      return restaurantService.update(restaurantId, { services: serializeEntries(updated) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId] });
      setEditServiceModalOpen(false);
      setEditServiceId('');
      setEditServiceNom('');
      setEditPrixRepreneur(0);
    },
  });

  const handleEditServiceEntry = (record: RestaurantServiceEntry) => {
    const svcId = typeof record.service === 'object' ? (record.service as Service)._id : record.service as string;
    const svc = typeof record.service === 'object' ? record.service : null;
    setEditServiceId(svcId);
    setEditServiceNom(svc?.nom || 'Service');
    setEditPrixRepreneur(record.prixRepreneur);
    setEditServiceModalOpen(true);
  };

  const handleSubmitEditService = () => {
    updateServiceEntry({
      serviceId: editServiceId,
      prixRepreneur: editPrixRepreneur,
    });
  };

  // Ouvrir le formulaire de planning pour un service donné
  const handleEditPlanning = (serviceId: string, serviceNom: string) => {
    setPlanningTarget({ id: serviceId, nom: serviceNom });
    setPlanningOpen(true);
  };

  // Préparer les options pour les repreneurs
  const gerantOptions = useMemo(() => {
    if (!repreneurs) return [];
    return repreneurs.map((user: any) => ({
      value: user._id,
      label: `${user.name} ${user.email}`,
    }));
  }, [repreneurs]);

  // Préparer les options pour les superviseurs
  const superviseurOptions = useMemo(() => {
    if (!superviseurs) return [];
    return superviseurs.map((user: any) => ({
      value: user._id,
      label: `${user.name} ${user.email}`,
    }));
  }, [superviseurs]);

  // Récupérer les opérations d'utilisation du service
  const { data: operations, isLoading: isLoadingOperations } = useQuery({
    queryKey: ['operations_by_service', restaurantId],
    queryFn: () => operationService.byService(restaurantId),
    enabled: !!restaurantId,
  });

  // Filtrer les opérations
  const filteredOperations = useMemo(() => {
    if (!operations) return [];

    return operations.filter((op: Operation) => {
      // Filtre par date
      if (dateRange && dateRange[0] && dateRange[1]) {
        const opDate = dayjs(op.createdAt);
        const startDate = dateRange[0].startOf('day');
        const endDate = dateRange[1].endOf('day');
        if (!opDate.isBetween(startDate, endDate, 'day', '[]')) {
          return false;
        }
      }

      // Filtre par ticket
      if (selectedTicket && op.ticketSnapshot?._id !== selectedTicket) {
        return false;
      }

      // Filtre par recherche textuelle
      if (debouncedSearchText) {
        const searchLower = debouncedSearchText.toLowerCase();
        const etudiant = op.compte?.etudiant;
        const matchText =
          etudiant?.prenom?.toLowerCase().includes(searchLower) ||
          etudiant?.nom?.toLowerCase().includes(searchLower) ||
          etudiant?.ncs?.toLowerCase().includes(searchLower) ||
          op.compte?.code?.toLowerCase().includes(searchLower);
        if (!matchText) return false;
      }

      return true;
    });
  }, [operations, dateRange, selectedTicket, debouncedSearchText]);

  // Calculer les statistiques avec montants des opérations
  const statistics = useMemo(() => {
    const total = filteredOperations.length;

    const totalAmount = filteredOperations.reduce((acc: number, op: any) => {
      return acc + (op.ticketSnapshot?.prix || 0);
    }, 0);

    // Grouper par ticket avec calcul du prix repreneur
    const byTicket = filteredOperations.reduce((acc: any, op: any) => {
      const ticketId = op.ticket;
      if (!ticketId) return acc;

      if (!acc[ticketId]) {
        const prixStandard = op.ticketSnapshot?.prix || 0;
        const prixRepreneur = restaurantPrixRepreneur[ticketId];
        const prixEffectif = prixRepreneur !== undefined && prixRepreneur !== null ? prixRepreneur : prixStandard;

        acc[ticketId] = {
          nom: op.ticketSnapshot?.nom,
          prix: prixEffectif,
          prixStandard: prixStandard,
          prixRepreneur: prixRepreneur,
          count: 0,
          total: 0,
          totalStandard: 0,
          totalRepreneur: 0,
        };
      }
      acc[ticketId].count += 1;

      // Calculer les totaux
      const ticketPrixStandard = op.ticketSnapshot?.prix || 0;
      const ticketPrixEffectif = ticketPrixStandard;

      // Total avec prix effectif
      acc[ticketId].total += ticketPrixEffectif;

      // Total avec prix standard (toujours calculé)
      acc[ticketId].totalStandard = (acc[ticketId].totalStandard || 0) + ticketPrixStandard;

      // Total repreneur = total standard (le prix du ticket est le prix repreneur)
      acc[ticketId].totalRepreneur = (acc[ticketId].totalRepreneur || 0) + ticketPrixStandard;

      return acc;
    }, {});

    return { total, totalAmount, byTicket };
  }, [filteredOperations, restaurantPrixRepreneur]);

  // Options pour le select des tickets
  const ticketOptions = useMemo(() => {
    return restaurantTickets.map((ticket: any) => ({
      label: ticket.nom,
      value: ticket._id,
    }));
  }, [restaurantTickets]);

  const ticketLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    (tickets || []).forEach((t: any) => {
      if (t._id) map[t._id] = `${t.nom} (${t.prix} FCFA)`;
    });
    return map;
  }, [tickets]);

  // Available services for assign drawer (not already assigned)
  const availableServices = useMemo(() => {
    if (!allRestaurantServices) return [];
    return allRestaurantServices.filter((svc: Service) => !getRestaurantServiceIds.includes(svc._id));
  }, [allRestaurantServices, getRestaurantServiceIds]);

  // Générer le rapport PDF
  const handleGenerateReport = () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      return;
    }

    if (filteredOperations.length === 0) {
      return;
    }

    // Préparer les données du tableau
    const tableBody = [
      // En-tête du tableau
      [
        { text: 'Date', style: 'tableHeader', fillColor: '#422AFB' },
        { text: 'Heure', style: 'tableHeader', fillColor: '#422AFB' },
        { text: 'Étudiant', style: 'tableHeader', fillColor: '#422AFB' },
        { text: 'Code', style: 'tableHeader', fillColor: '#422AFB' },
        { text: 'Ticket', style: 'tableHeader', fillColor: '#422AFB' },
        { text: 'Prix Standard', style: 'tableHeader', fillColor: '#422AFB', alignment: 'right' },
        { text: 'Prix Repreneur', style: 'tableHeader', fillColor: '#422AFB', alignment: 'right' },
        { text: 'Agent', style: 'tableHeader', fillColor: '#422AFB' },
      ],
      // Lignes de données
      ...filteredOperations.map((op: any) => {
        const prixStandard = op.ticketSnapshot?.prix || 0;
        return [
          { text: dayjs(op.createdAt).format('DD/MM/YYYY'), style: 'tableCell' },
          { text: dayjs(op.createdAt).format('HH:mm:ss'), style: 'tableCell' },
          { text: `${op.compte?.etudiant?.prenom || ''} ${op.compte?.etudiant?.nom || ''}`, style: 'tableCell' },
          { text: op.compte?.etudiant?.ncs || '', style: 'tableCell', fontSize: 8 },
          { text: op.ticketSnapshot?.nom || '', style: 'tableCell' },
          { text: `${prixStandard?.toLocaleString('fr-FR')} FCFA`, style: 'tableCell', alignment: 'right' },
          {
            text: `${prixStandard?.toLocaleString('fr-FR')} FCFA`,
            style: 'tableCell',
            alignment: 'right',
            color: '#10B981',
          },
          { text: op.agentControle?.name || 'Non assigné', style: 'tableCell', fontSize: 8 },
        ];
      }),
    ];

    // Calculer les totaux par ticket
    const recapByTicket = Object.entries(statistics.byTicket).map(([_, data]: [string, any]) => {
      const hasPrixRepreneur = data.prixRepreneur !== undefined && data.prixRepreneur !== null;
      return [
        { text: data.nom, style: 'tableCell', bold: true } as any,
        { text: data.count.toString(), style: 'tableCell', alignment: 'center' } as any,
        { text: `${data.prixStandard?.toLocaleString('fr-FR')} FCFA`, style: 'tableCell', alignment: 'right' } as any,
        {
          text: hasPrixRepreneur ? `${data.prixRepreneur?.toLocaleString('fr-FR')} FCFA` : '-',
          style: 'tableCell',
          alignment: 'right',
          color: hasPrixRepreneur ? '#10B981' : '#999',
        } as any,
        { text: `${data.totalStandard?.toLocaleString('fr-FR')} FCFA`, style: 'tableCell', alignment: 'right' } as any,
        {
          text: hasPrixRepreneur ? `${data.totalRepreneur?.toLocaleString('fr-FR')} FCFA` : '-',
          style: 'tableCell',
          alignment: 'right',
          color: hasPrixRepreneur ? '#10B981' : '#999',
          bold: true,
        } as any,
      ];
    });

    // Définition du document PDF
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 60, 40, 60],
      header: {
        margin: [40, 20, 40, 0],
        columns: [
          {
            width: '*',
            stack: [
              { text: 'RAPPORT DES OPÉRATIONS', style: 'header', color: '#422AFB' },
              { text: service?.nom || '', style: 'subheader', color: '#666' },
            ],
          },
          {
            width: 'auto',
            stack: [
              { text: dayjs().format('DD/MM/YYYY HH:mm'), style: 'date', alignment: 'right' },
              { text: service?.nom || '', style: 'restaurant', alignment: 'right', color: '#666' },
            ],
          },
        ],
      },
      footer: (currentPage: number, pageCount: number) => {
        return {
          margin: [40, 0, 40, 20],
          columns: [
            { text: `Généré le ${dayjs().format('DD/MM/YYYY à HH:mm')}`, style: 'footer' },
            { text: `Page ${currentPage} / ${pageCount}`, style: 'footer', alignment: 'right' },
          ],
        };
      },
      content: [
        // Informations de la période
        {
          margin: [0, 0, 0, 15],
          columns: [
            {
              width: '*',
              stack: [
                { text: 'Période du rapport', style: 'sectionTitle' },
                {
                  text: `Du ${dateRange[0].format('DD/MM/YYYY')} au ${dateRange[1].format('DD/MM/YYYY')}`,
                  style: 'period',
                },
              ],
            },
            {
              width: 'auto',
              stack: [
                { text: 'Repreneur', style: 'sectionTitle' },
                { text: restaurantGerant?.name || 'Non assigné', style: 'period' },
              ],
            },
          ],
        },

        // Statistiques globales
        {
          margin: [0, 0, 0, 20],
          columns: [
            {
              width: '*',
              stack: [
                {
                  canvas: [
                    {
                      type: 'rect',
                      x: 0,
                      y: 0,
                      w: 200,
                      h: 60,
                      r: 5,
                      color: '#E8F5E9',
                    },
                  ],
                },
                {
                  absolutePosition: { x: 50, y: 110 },
                  stack: [
                    { text: 'Total Utilisations', style: 'statLabel', color: '#2E7D32' },
                    { text: statistics.total.toString(), style: 'statValue', color: '#1B5E20' },
                  ],
                },
              ],
            },
            {
              width: '*',
              stack: [
                {
                  canvas: [
                    {
                      type: 'rect',
                      x: 0,
                      y: 0,
                      w: 200,
                      h: 60,
                      r: 5,
                      color: '#FFF3E0',
                    },
                  ],
                },
                {
                  absolutePosition: { x: 280, y: 110 },
                  stack: [
                    { text: 'Montant Total', style: 'statLabel', color: '#E65100' },
                    {
                      text: `${statistics.totalAmount.toLocaleString('fr-FR')} FCFA`,
                      style: 'statValue',
                      color: '#BF360C',
                    },
                  ],
                },
              ],
            },
            {
              width: '*',
              stack: [
                {
                  canvas: [
                    {
                      type: 'rect',
                      x: 0,
                      y: 0,
                      w: 200,
                      h: 60,
                      r: 5,
                      color: '#E8EAF6',
                    },
                  ],
                },
                {
                  absolutePosition: { x: 510, y: 110 },
                  stack: [
                    { text: 'Tickets', style: 'statLabel', color: '#283593' },
                    {
                      text: Object.keys(statistics.byTicket).length.toString(),
                      style: 'statValue',
                      color: '#1A237E',
                    },
                  ],
                },
              ],
            },
          ],
        },

        // Titre du tableau
        { text: 'Liste des Opérations', style: 'tableTitle', margin: [0, 30, 0, 10] },

        // Tableau des opérations
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
            body: tableBody,
          },
          layout: {
            fillColor: (rowIndex: number) => {
              return rowIndex === 0 ? '#422AFB' : rowIndex % 2 === 0 ? '#F5F5F5' : null;
            },
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#E0E0E0',
            vLineColor: () => '#E0E0E0',
          },
        },

        // Récapitulatif par ticket
        { text: 'Récapitulatif par Ticket', style: 'tableTitle', margin: [0, 30, 0, 10], pageBreak: 'before' },

        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Ticket', style: 'tableHeader', fillColor: '#10B981' } as any,
                { text: 'Quantité', style: 'tableHeader', fillColor: '#10B981', alignment: 'center' } as any,
                { text: 'Prix Standard', style: 'tableHeader', fillColor: '#10B981', alignment: 'right' } as any,
                { text: 'Prix Repreneur', style: 'tableHeader', fillColor: '#10B981', alignment: 'right' } as any,
                { text: 'Total Standard', style: 'tableHeader', fillColor: '#10B981', alignment: 'right' } as any,
                { text: 'Total Repreneur', style: 'tableHeader', fillColor: '#10B981', alignment: 'right' } as any,
              ],
              ...recapByTicket,
              // Ligne de total
              [
                { text: 'TOTAL GÉNÉRAL', style: 'tableCell', bold: true, colSpan: 4, alignment: 'right' } as any,
                {} as any,
                {} as any,
                {} as any,
                {
                  text: `${Object.values(statistics.byTicket).reduce((sum: number, ticket: any) => sum + (ticket.totalStandard || 0), 0).toLocaleString('fr-FR')} FCFA`,
                  style: 'tableCell',
                  bold: true,
                  fontSize: 11,
                  alignment: 'right',
                  fillColor: '#F3F4F6',
                } as any,
                {
                  text: `${Object.values(statistics.byTicket).reduce((sum: number, ticket: any) => sum + (ticket.totalRepreneur || 0), 0)} FCFA`,
                  style: 'tableCell',
                  bold: true,
                  fontSize: 11,
                  alignment: 'right',
                  fillColor: '#D1FAE5',
                  color: '#10B981',
                } as any,
              ],
            ] as any,
          },
          layout: {
            fillColor: (rowIndex: number) => {
              return rowIndex === 0 ? '#10B981' : rowIndex % 2 === 0 ? '#F5F5F5' : null;
            },
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#E0E0E0',
            vLineColor: () => '#E0E0E0',
          },
        },
      ],
      styles: {
        header: {
          fontSize: 20,
          bold: true,
          margin: [0, 0, 0, 5],
        },
        subheader: {
          fontSize: 12,
          italics: true,
        },
        date: {
          fontSize: 10,
          color: '#666',
        },
        restaurant: {
          fontSize: 10,
          italics: true,
        },
        sectionTitle: {
          fontSize: 11,
          bold: true,
          color: '#333',
          margin: [0, 0, 0, 5],
        },
        period: {
          fontSize: 13,
          color: '#422AFB',
          bold: true,
        },
        statLabel: {
          fontSize: 10,
          margin: [10, 10, 0, 5],
        },
        statValue: {
          fontSize: 18,
          bold: true,
          margin: [10, 0, 0, 10],
        },
        tableTitle: {
          fontSize: 14,
          bold: true,
          color: '#333',
        },
        tableHeader: {
          fontSize: 10,
          bold: true,
          color: 'white',
          margin: [5, 5, 5, 5],
        },
        tableCell: {
          fontSize: 9,
          margin: [5, 3, 5, 3],
        },
        footer: {
          fontSize: 8,
          color: '#999',
        },
      },
      defaultStyle: {
        font: 'Roboto',
      },
    };

    // Générer et ouvrir le PDF
    try {
      pdfMake.createPdf(docDefinition).open();
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
    }
  };

  const isLoading = isLoadingService || isLoadingOperations || isLoadingRepreneurs || isLoadingTickets || isLoadingAllServices;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <Card className="border-border/60 shadow-none">
        <CardContent className="px-5 py-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: '/admin/restaurations' })}
              >
                <ArrowLeft className="size-4" />
                Retour
              </Button>
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Store className="size-7" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Restaurant
              </p>
              <h2 className="mb-1 mt-1 text-xl font-bold text-foreground">
                {service?.nom}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {service?.active ? (
                  <StatusBadge active={true} />
                ) : (
                  <StatusBadge active={false} />
                )}
                {service?.localisation && (
                  <span className="inline-flex items-center gap-1 rounded-full border bg-sky-50 text-sky-700 border-sky-200 px-2.5 py-0.5 text-xs font-semibold dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900">
                    <MapPin className="size-3" />
                    {service.localisation}
                  </span>
                )}
              </div>
            </div>
            {canEdit && (
              <div className="min-w-[220px] rounded-xl border border-border bg-muted px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Statut
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {service?.active ? 'Ouvert' : 'Fermé'}
                  </span>
                  <ToggleSwitch
                    checked={service?.active ?? false}
                    onChange={handleToggleStatus}
                    disabled={!canEdit}
                    loading={isTogglingStatus}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Total Utilisations"
              value={statistics.total}
              icon={<User className="size-5" />}
              accent="blue"
            />
            <StatCard
              label="Montant Total"
              value={formatMontant(statistics.totalAmount)}
              icon={<DollarSign className="size-5" />}
              accent="emerald"
            />
            <StatCard
              label="Types de Tickets"
              value={Object.keys(statistics.byTicket).length}
              icon={<FileText className="size-5" />}
              accent="amber"
            />
          </>
        )}
      </div>

      {/* Configuration du Personnel */}
      <Card className="border-border/60 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-4">
          <CardTitle className="text-sm font-bold text-foreground">
            Configuration du Personnel
          </CardTitle>
          {canEdit && (
            <CardAction>
              <Button variant="outline" size="sm" onClick={handleOpenConfig}>
                <Settings className="size-4" />
                Configurer
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="px-5 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Repreneur */}
            <div className="rounded-xl border border-border bg-muted p-4">
              <div className="flex items-center gap-2">
                <User className="size-5 text-primary" />
                <h3 className="text-base font-semibold text-foreground">Repreneur</h3>
              </div>
              {restaurantGerant ? (
                <div className="mt-3 flex items-center gap-3">
                  <Avatar className="size-12 border border-border bg-blue-500">
                    <AvatarFallback className="bg-blue-500 text-white font-semibold">
                      {restaurantGerant.name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {restaurantGerant.name}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {restaurantGerant.email}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-muted-foreground/70">
                  <UserPlus className="size-4" />
                  <span className="text-sm text-muted-foreground">Aucun repreneur assigné</span>
                </div>
              )}
            </div>

            {/* Superviseur */}
            <div className="rounded-xl border border-border bg-muted p-4">
              <div className="flex items-center gap-2">
                <User className="size-5 text-sky-600" />
                <h3 className="text-base font-semibold text-foreground">Superviseur</h3>
              </div>
              {restaurantSuperviseur ? (
                <div className="mt-3 flex items-center gap-3">
                  <Avatar className="size-12 border border-border bg-sky-500">
                    <AvatarFallback className="bg-sky-500 text-white font-semibold">
                      {restaurantSuperviseur.name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {restaurantSuperviseur.name}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {restaurantSuperviseur.email}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-muted-foreground/70">
                  <UserPlus className="size-4" />
                  <span className="text-sm text-muted-foreground">Aucun superviseur assigné</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services du Restaurant */}
      <Card className="border-border/60 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-4">
          <CardTitle className="text-sm font-bold text-foreground">
            Services du Restaurant
          </CardTitle>
          {canEdit && (
            <CardAction>
              <Button size="sm" onClick={openAssignDrawer}>
                <Plus className="size-4" />
                Assigner des services
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="px-0 py-0">
          {/* Table header (desktop only) */}
          <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b border-border/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
            <span>Nom</span>
            <span>Type</span>
            <span>Ticket</span>
            <span className="text-right">Prix Repreneur</span>
            <span className="text-center">Actions</span>
          </div>

          {isAssigningServices || isRemovingService ? (
            <ServiceTableSkeleton />
          ) : (service?.services || []).length > 0 ? (
            <div className="divide-y divide-border/40">
              {(service?.services || []).map((entry: RestaurantServiceEntry) => (
                <ServiceEntryRow
                  key={typeof entry.service === 'object' ? (entry.service as Service)._id : entry.service as string}
                  entry={entry}
                  ticketLabelMap={ticketLabelMap}
                  canEdit={canEdit}
                  onEdit={handleEditServiceEntry}
                  onRemove={handleRemoveService}
                  onEditPlanning={handleEditPlanning}
                  isRemoving={isRemovingService}
                />
              ))}
            </div>
          ) : (
            <EmptyState message="Aucun service assigné à ce restaurant" />
          )}
        </CardContent>
      </Card>

      {/* Filtres et Actions */}
      <Card className="border-border/60 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-4">
          <CardTitle className="text-sm font-bold text-foreground">
            Filtres et Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-5">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* RangePicker - kept from Ant Design */}
              <div>
                <Label className="mb-1.5">Période</Label>
                <RangePicker
                  className="w-full"
                  placeholder={['Date début', 'Date fin']}
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                  format="DD/MM/YYYY"
                />
              </div>
              {/* Ticket filter - native select */}
              <div>
                <Label className="mb-1.5">Ticket</Label>
                <select
                  className={nativeSelectClass}
                  value={selectedTicket || ''}
                  onChange={(e) => setSelectedTicket(e.target.value || null)}
                >
                  <option value="">Tous les tickets</option>
                  {ticketOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {/* Search input */}
              <div>
                <Label className="mb-1.5">Recherche</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Rechercher étudiant, code..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-8"
                  />
                  {searchText && (
                    <button
                      onClick={() => setSearchText('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <XCircle className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <Button
              onClick={handleGenerateReport}
              disabled={!dateRange || filteredOperations.length === 0}
              size="lg"
            >
              <Printer className="size-4" />
              Imprimer les opérations
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des opérations */}
      <Card className="border-border/60 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-4">
          <CardTitle className="text-sm font-bold text-foreground">
            Liste des Utilisations ({filteredOperations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {/* Table header (desktop only) */}
          <div className="hidden grid-cols-[auto_auto_1fr_auto_auto_auto] gap-4 border-b border-border/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
            <span>Date</span>
            <span>Heure</span>
            <span>Étudiant</span>
            <span>Ticket</span>
            <span className="text-right">Prix</span>
            <span>Agent</span>
          </div>

          {isLoadingOperations ? (
            <OperationTableSkeleton />
          ) : filteredOperations.length > 0 ? (
            <div className="divide-y divide-border/40">
              {filteredOperations.map((op: any) => (
                <OperationRow key={op._id} op={op} />
              ))}
            </div>
          ) : (
            <EmptyState message="Aucune utilisation trouvée" />
          )}
        </CardContent>
      </Card>

      {/* Détails par ticket */}
      {Object.keys(statistics.byTicket).length > 0 && (
        <Card className="border-border/60 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-4">
            <CardTitle className="text-sm font-bold text-foreground">
              Récapitulatif par Ticket
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {Object.entries(statistics.byTicket).map(([ticketId, data]: [string, any]) => (
                <div key={ticketId} className="rounded-xl border border-border/60 bg-card p-4 transition-all duration-300 hover:shadow-md hover:border-border">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">{data.nom}</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Prix unitaire:</span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatMontant(data.prix || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Quantité:</span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">{data.count}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-foreground">Total:</span>
                      <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatMontant(data.total || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Configuration (custom dialog) */}
      {configModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setConfigModalOpen(false);
            setConfigRepreneur(undefined);
            setConfigSuperviseur(undefined);
          }}
        >
          <Card
            className="w-full max-w-[600px] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b border-border/60 px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Settings className="size-5" />
                Configuration du Personnel
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 py-5">
              {isUpdatingConfig || isLoadingRepreneurs ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Repreneur */}
                  <div className="rounded-xl border border-border bg-muted p-4">
                    <Label className="mb-2">Repreneur</Label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <select
                        className={cn(nativeSelectClass, 'pl-8')}
                        value={configRepreneur || ''}
                        onChange={(e) => setConfigRepreneur(e.target.value || undefined)}
                      >
                        <option value="">Sélectionner un repreneur</option>
                        {gerantOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Superviseur */}
                  <div className="rounded-xl border border-border bg-muted p-4">
                    <Label className="mb-2">Superviseur</Label>
                    <div className="relative">
                      <Users className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <select
                        className={cn(nativeSelectClass, 'pl-8')}
                        value={configSuperviseur || ''}
                        onChange={(e) => setConfigSuperviseur(e.target.value || undefined)}
                      >
                        <option value="">Sélectionner un superviseur</option>
                        {superviseurOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-end gap-2 border-t border-border/60 px-5 py-4">
              <Button
                variant="outline"
                onClick={() => {
                  setConfigModalOpen(false);
                  setConfigRepreneur(undefined);
                  setConfigSuperviseur(undefined);
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmitConfig}
                disabled={isUpdatingConfig || !configRepreneur || !configSuperviseur}
              >
                {isUpdatingConfig && <Loader2 className="size-4 animate-spin" />}
                Enregistrer
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Modal de modification d'un service assigné (custom dialog) */}
      {editServiceModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setEditServiceModalOpen(false);
            setEditServiceId('');
            setEditServiceNom('');
            setEditPrixRepreneur(0);
          }}
        >
          <Card
            className="w-full max-w-[500px] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b border-border/60 px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Pencil className="size-5" />
                Modifier le Prix Repreneur
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 py-5">
              {isUpdatingServiceEntry ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Service name (read-only) */}
                  <div className="rounded-xl border border-border bg-muted p-4">
                    <Label className="mb-2">Service</Label>
                    <Input value={editServiceNom} disabled />
                  </div>

                  {/* Prix Repreneur */}
                  <div className="rounded-xl border border-border bg-muted p-4">
                    <Label className="mb-2">Prix Repreneur (FCFA)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="number"
                        min={0}
                        placeholder="Prix repreneur en FCFA"
                        value={editPrixRepreneur || ''}
                        onChange={(e) => setEditPrixRepreneur(Number(e.target.value))}
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-end gap-2 border-t border-border/60 px-5 py-4">
              <Button
                variant="outline"
                onClick={() => {
                  setEditServiceModalOpen(false);
                  setEditServiceId('');
                  setEditServiceNom('');
                  setEditPrixRepreneur(0);
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmitEditService}
                disabled={isUpdatingServiceEntry || editPrixRepreneur < 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isUpdatingServiceEntry && <Loader2 className="size-4 animate-spin" />}
                Enregistrer
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Drawer d'assignation de services (Sheet shadcn) */}
      <Sheet open={serviceDrawerOpen} onOpenChange={(open) => {
        setServiceDrawerOpen(open);
        if (!open) {
          setSelectedServices([]);
          setServicePrices({});
        }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Plus className="size-5" />
              Assigner des Services
            </SheetTitle>
            <SheetDescription>
              Sélectionnez les services de type restaurant à assigner.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4">
            {isAssigningServices || isLoadingAllServices ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : availableServices.length === 0 ? (
              <EmptyState message="Aucun service disponible à assigner" />
            ) : (
              <div className="space-y-4">
                {/* Service checkboxes */}
                <div>
                  <Label className="mb-2">Services disponibles</Label>
                  <div className="space-y-2">
                    {availableServices.map((svc: Service) => {
                      const ticketId = typeof svc.ticket === 'object' ? (svc.ticket as any)?._id : svc.ticket as string;
                      const label = `${svc.nom} — ${ticketLabelMap[ticketId] || 'Ticket non lié'}`;
                      const isSelected = selectedServices.includes(svc._id);
                      return (
                        <label
                          key={svc._id}
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/50'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedServices([...selectedServices, svc._id]);
                              } else {
                                setSelectedServices(selectedServices.filter((id) => id !== svc._id));
                                const newPrices = { ...servicePrices };
                                delete newPrices[svc._id];
                                setServicePrices(newPrices);
                              }
                            }}
                            className="size-4 rounded border-border accent-primary"
                          />
                          <span className="text-sm font-medium text-foreground">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Prix Repreneur for selected services */}
                {selectedServices.length > 0 && (
                  <div className="space-y-4">
                    <Separator />
                    <Label className="font-semibold">Prix Repreneur (FCFA)</Label>
                    {selectedServices.map((svcId) => {
                      const svc = allRestaurantServices?.find((s: Service) => s._id === svcId);
                      const svcNom = svc?.nom || svcId;
                      return (
                        <div key={svcId} className="rounded-xl border border-border bg-muted p-4">
                          <Label className="mb-2">{svcNom}</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              type="number"
                              min={0}
                              placeholder="Prix repreneur en FCFA"
                              value={servicePrices[svcId] ?? ''}
                              onChange={(e) =>
                                setServicePrices({
                                  ...servicePrices,
                                  [svcId]: Number(e.target.value),
                                })
                              }
                              className="pl-8"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  Seuls les services de type "restaurant" créés par l'administrateur sont listés ici.
                </p>
              </div>
            )}
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => {
                setServiceDrawerOpen(false);
                setSelectedServices([]);
                setServicePrices({});
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAssignServices}
              disabled={isAssigningServices || selectedServices.length === 0}
            >
              {isAssigningServices && <Loader2 className="size-4 animate-spin" />}
              Assigner
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Planning de contrôle (composant dédié) */}
      {planningTarget && (
        <PlanningForm
          restaurantId={restaurantId}
          serviceId={planningTarget.id}
          serviceNom={planningTarget.nom}
          open={planningOpen}
          onOpenChange={(open) => {
            setPlanningOpen(open);
            if (!open) setPlanningTarget(null);
          }}
        />
      )}
    </div>
  );
}
