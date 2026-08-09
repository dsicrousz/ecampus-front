import { Link, createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Store,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Inbox,
  CheckCircle2,
} from 'lucide-react';
import { requireRole, canModify } from '@/lib/route-protection';
import { useSession } from '@/auth/auth-client';
import { RestaurantService } from '@/services/restaurant.service';
import { UserService } from '@/services/user.service';
import { USER_ROLE } from '@/types/user.roles';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/pagination-controls';
import { QUERY_KEYS } from '@/constants';
import type { Restaurant, RestaurantFormValues } from '@/types/restaurant';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/admin/restaurations/')({
  beforeLoad: () =>
    requireRole([
      USER_ROLE.SUPERVISEUR,
      USER_ROLE.CHEF_DIV_RESTAURANT,
      USER_ROLE.SUPERADMIN,
      USER_ROLE.ADMIN,
    ]),
  component: RouteComponent,
});

// ---- Stat card helper -------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accent: 'blue' | 'emerald' | 'amber';
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

// ---- Empty state -----------------------------------------------------------

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

// ---- Toggle switch ---------------------------------------------------------

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange();
      }}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:pointer-events-none',
        checked ? 'bg-primary' : 'bg-muted'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

// ---- Restaurant card skeleton ----------------------------------------------

function RestaurantCardSkeleton() {
  return (
    <Card className="border-border/60 shadow-none">
      <CardContent className="space-y-3 px-5 py-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-12 rounded-full" />
          <div className="flex gap-2">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Restaurant form (shared create/edit) ----------------------------------

interface RestaurantFormProps {
  values: RestaurantFormValues;
  setFieldValue: <K extends keyof RestaurantFormValues>(
    key: K,
    value: RestaurantFormValues[K]
  ) => void;
  superviseurs: any[];
  repreneurs: any[];
  isLoadingSuperviseurs: boolean;
  isLoadingRepreneurs: boolean;
}

function RestaurantForm({
  values,
  setFieldValue,
  superviseurs,
  repreneurs,
  isLoadingSuperviseurs,
  isLoadingRepreneurs,
}: RestaurantFormProps) {
  return (
    <div className="space-y-4">
      {/* Nom */}
      <div className="space-y-2">
        <Label htmlFor="nom">Nom du Restaurant</Label>
        <div className="relative">
          <Store className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="nom"
            className="h-10 pl-9"
            placeholder="Ex: Restaurant Central"
            value={values.nom}
            onChange={(e) => setFieldValue('nom', e.target.value)}
          />
        </div>
      </div>

      {/* Superviseur */}
      <div className="space-y-2">
        <Label htmlFor="superviseur">Superviseur</Label>
        <select
          id="superviseur"
          value={values.superviseur}
          onChange={(e) => setFieldValue('superviseur', e.target.value)}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'dark:bg-input/30'
          )}
        >
          <option value="">
            {isLoadingSuperviseurs ? 'Chargement...' : 'Sélectionner un superviseur'}
          </option>
          {superviseurs.map((u: any) => (
            <option key={u._id} value={u._id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
      </div>

      {/* Repreneur */}
      <div className="space-y-2">
        <Label htmlFor="repreneur">Repreneur</Label>
        <select
          id="repreneur"
          value={values.repreneur}
          onChange={(e) => setFieldValue('repreneur', e.target.value)}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'dark:bg-input/30'
          )}
        >
          <option value="">
            {isLoadingRepreneurs ? 'Chargement...' : 'Sélectionner un repreneur'}
          </option>
          {repreneurs.map((u: any) => (
            <option key={u._id} value={u._id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
      </div>

      {/* Localisation */}
      <div className="space-y-2">
        <Label htmlFor="localisation">Localisation</Label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="localisation"
            className="h-10 pl-9"
            placeholder="Ex: Campus central, Bâtiment A"
            value={values.localisation || ''}
            onChange={(e) => setFieldValue('localisation', e.target.value)}
          />
        </div>
      </div>

      {/* Nombre de places */}
      <div className="space-y-2">
        <Label htmlFor="nombrePlaces">Nombre de Places</Label>
        <Input
          id="nombrePlaces"
          type="number"
          min={0}
          className="h-10 tabular-nums"
          placeholder="Ex: 100"
          value={values.nombrePlaces ?? ''}
          onChange={(e) =>
            setFieldValue('nombrePlaces', e.target.value ? Number(e.target.value) : undefined)
          }
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          rows={4}
          placeholder="Description du restaurant..."
          value={values.description || ''}
          onChange={(e) => setFieldValue('description', e.target.value)}
          className={cn(
            'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'dark:bg-input/30 placeholder:text-muted-foreground'
          )}
        />
      </div>

      {/* Statut */}
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
        <div className="space-y-0.5">
          <Label>Statut</Label>
          <p className="text-xs text-muted-foreground">
            {values.active ? 'Restaurant actif' : 'Restaurant inactif'}
          </p>
        </div>
        <Toggle
          checked={values.active}
          onChange={() => setFieldValue('active', !values.active)}
        />
      </div>
    </div>
  );
}

// ==============================================================================
//  Page principale
// ==============================================================================

function RouteComponent() {
  const { data: session } = useSession();
  const canEdit = canModify(session?.user?.role);
  const pagination = usePagination({ initialLimit: 10, initialSortBy: 'nom', initialSortOrder: 'asc' });
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);

  // Form state (create)
  const emptyForm: RestaurantFormValues = {
    nom: '',
    superviseur: '',
    repreneur: '',
    localisation: '',
    nombrePlaces: undefined,
    description: '',
    active: true,
  };
  const [createForm, setCreateForm] = useState<RestaurantFormValues>(emptyForm);
  const [editForm, setEditForm] = useState<RestaurantFormValues>(emptyForm);

  const setCreateFieldValue = <K extends keyof RestaurantFormValues>(
    key: K,
    value: RestaurantFormValues[K]
  ) => setCreateForm((prev) => ({ ...prev, [key]: value }));

  const setEditFieldValue = <K extends keyof RestaurantFormValues>(
    key: K,
    value: RestaurantFormValues[K]
  ) => setEditForm((prev) => ({ ...prev, [key]: value }));

  const restaurantService = new RestaurantService();
  const userService = new UserService();
  const queryClient = useQueryClient();

  const { data: restaurantsData, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.RESTAURANTS, 'paginated', pagination.params],
    queryFn: () => restaurantService.getPaginated(pagination.params),
  });
  const services = restaurantsData?.data ?? [];
  const total = restaurantsData?.total ?? 0;
  const totalPages = restaurantsData?.totalPages ?? 1;

  // Fetch superviseurs for select
  const { data: superviseurs, isLoading: isLoadingSuperviseurs } = useQuery({
    queryKey: ['users', USER_ROLE.SUPERVISEUR],
    queryFn: () => userService.byRole(USER_ROLE.SUPERVISEUR),
  });

  // Fetch repreneurs for select
  const { data: repreneurs, isLoading: isLoadingRepreneurs } = useQuery({
    queryKey: ['users', USER_ROLE.REPREUNEUR],
    queryFn: () => userService.byRole(USER_ROLE.REPREUNEUR),
  });

  // Create mutation
  const { mutate: createRestaurant, isPending: loadingCreate } = useMutation({
    mutationFn: (data: RestaurantFormValues) => restaurantService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RESTAURANTS] });
      setCreateOpen(false);
      setCreateForm(emptyForm);
    },
  });

  // Update mutation
  const { mutate: updateRestaurant, isPending: loadingUpdate } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RestaurantFormValues> }) =>
      restaurantService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RESTAURANTS] });
      setEditOpen(false);
      setEditingRestaurant(null);
      setEditForm(emptyForm);
    },
  });

  // Delete mutation
  const { mutate: deleteRestaurant } = useMutation({
    mutationFn: (id: string) => restaurantService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RESTAURANTS] });
    },
  });

  // Mutation pour activer/désactiver un restaurant
  const { mutate: toggleServiceStatus } = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      restaurantService.update(id, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RESTAURANTS] });
    },
  });

  // Handler pour le switch
  const handleToggleStatus = (serviceId: string, currentStatus: boolean) => {
    toggleServiceStatus({ id: serviceId, active: !currentStatus });
  };

  const handleCreate = () => {
    createRestaurant(createForm);
  };

  const handleOpenEdit = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setEditForm({
      _id: restaurant._id,
      nom: restaurant.nom,
      superviseur: restaurant.superviseur,
      repreneur: restaurant.repreneur,
      localisation: restaurant.localisation || '',
      nombrePlaces: restaurant.nombrePlaces,
      description: restaurant.description || '',
      active: restaurant.active,
    });
    setEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingRestaurant) return;
    const { _id, ...rest } = editForm;
    updateRestaurant({ id: editingRestaurant._id, data: rest });
  };

  const handleDelete = (id: string) => {
    deleteRestaurant(id);
  };

  const handleOpenCreate = () => {
    setCreateForm(emptyForm);
    setCreateOpen(true);
  };

  const totalServices = total;
  const activeCount = services.filter((s) => s.active).length;

  return (
    <div className="controller-page space-y-6">
      <div className="mx-auto max-w-7xl">
        {/* Hero Header */}
        <Card className="overflow-hidden border-border/60 shadow-none">
          <CardContent className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Store className="size-7" />
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                  Gestion
                </span>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                  Restaurations
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Gérez vos services de restauration
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-10 w-full pl-9 sm:w-64"
                  placeholder="Rechercher..."
                  value={pagination.search}
                  onChange={(e) => pagination.setSearch(e.target.value)}
                />
              </div>
              {canEdit && (
                <Button onClick={handleOpenCreate} className="h-10">
                  <Plus className="size-4" />
                  Nouveau Restaurant
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Statistiques */}
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
                label="Total Restaurants"
                value={total}
                icon={<Store className="size-5" />}
                accent="blue"
              />
              <StatCard
                label="Actifs"
                value={activeCount}
                icon={<CheckCircle2 className="size-5" />}
                accent="emerald"
              />
              <StatCard
                label="Services"
                value={totalServices}
                icon={<Inbox className="size-5" />}
                accent="amber"
              />
            </>
          )}
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <RestaurantCardSkeleton key={i} />
            ))}
          </div>
        ) : services.length === 0 ? (
          <Card className="border-border/60 shadow-none">
            <CardContent className="px-5 py-5">
              <EmptyState
                message={
                  pagination.debouncedSearch
                    ? 'Aucun résultat pour votre recherche'
                    : 'Aucun restaurant disponible'
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {services.map((service) => (
              <Link
                key={service._id}
                to="/admin/restaurations/$restaurantId"
                params={{ restaurantId: service._id }}
              >
                <Card className="group h-full border-border/60 shadow-none transition-all duration-300 hover:shadow-md hover:border-border">
                  <CardContent className="space-y-3 px-5 py-5">
                    {/* Status Badge + Actions */}
                    <div className="flex items-center justify-between">
                      <div
                        onClick={() =>
                          canEdit && handleToggleStatus(service._id, service.active)
                        }
                      >
                        <Toggle
                          checked={service.active}
                          onChange={() => handleToggleStatus(service._id, service.active)}
                          disabled={!canEdit}
                        />
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleOpenEdit(service);
                            }}
                            title="Modifier"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (
                                window.confirm(
                                  'Supprimer ce restaurant ? Cette action est irréversible.'
                                )
                              ) {
                                handleDelete(service._id);
                              }
                            }}
                            title="Supprimer"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Restaurant Name */}
                    <div>
                      <h3 className="mb-1 font-semibold text-foreground">{service.nom}</h3>
                      {service.description && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {service.description}
                        </p>
                      )}
                    </div>

                    {/* Restaurant Location */}
                    {service.localisation && (
                      <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                        <MapPin className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm text-foreground">
                          {service.localisation}
                        </span>
                      </div>
                    )}

                    {/* Services Info */}
                    <div className="flex items-center justify-between border-t border-border/60 pt-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground tabular-nums">
                        {service.services?.length || 0} service
                        {(service.services?.length || 0) > 1 ? 's' : ''}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                        Voir détails →
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        <PaginationControls
          pagination={pagination}
          total={total}
          totalPages={totalPages}
          pageSizeOptions={[10, 20, 50]}
          searchPlaceholder="Rechercher un restaurant..."
          loading={isLoading}
        />
      </div>

      {/* Create Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Créer un Restaurant</SheetTitle>
            <SheetDescription>
              Renseignez les informations du nouveau restaurant.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4">
            {loadingCreate || isLoadingSuperviseurs || isLoadingRepreneurs ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <RestaurantForm
                values={createForm}
                setFieldValue={setCreateFieldValue}
                superviseurs={superviseurs || []}
                repreneurs={repreneurs || []}
                isLoadingSuperviseurs={isLoadingSuperviseurs}
                isLoadingRepreneurs={isLoadingRepreneurs}
              />
            )}
          </div>

          <SheetFooter className="flex-row items-center justify-end gap-2 border-t border-border/60">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={loadingCreate}>
              {loadingCreate ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Sauvegarder
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditingRestaurant(null);
            setEditForm(emptyForm);
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Modifier le Restaurant</SheetTitle>
            <SheetDescription>
              Mettez à jour les informations du restaurant.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4">
            {loadingUpdate || isLoadingSuperviseurs || isLoadingRepreneurs ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <RestaurantForm
                values={editForm}
                setFieldValue={setEditFieldValue}
                superviseurs={superviseurs || []}
                repreneurs={repreneurs || []}
                isLoadingSuperviseurs={isLoadingSuperviseurs}
                isLoadingRepreneurs={isLoadingRepreneurs}
              />
            )}
          </div>

          <SheetFooter className="flex-row items-center justify-end gap-2 border-t border-border/60">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdate} disabled={loadingUpdate}>
              {loadingUpdate ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Mettre à jour
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
