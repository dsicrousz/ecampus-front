import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Loader2,
  Inbox,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { MenuService } from '@/services/menu.service';
import { PlatService } from '@/services/plat.service';
import { RestaurantService } from '@/services/restaurant.service';
import { useSession } from '@/auth/auth-client';
import { env } from '@/env';
import type { Menu } from '@/types/menu';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

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

export default function MenusTab() {
  const { data: sessionData } = useSession();
  const qc = useQueryClient();
  const menuService = useMemo(() => new MenuService(), []);
  const platService = useMemo(() => new PlatService(), []);
  const restaurantService = useMemo(() => new RestaurantService(), []);

  // Form state (replacing Form.useForm)
  const [formNom, setFormNom] = useState('');
  const [formDate, setFormDate] = useState<dayjs.Dayjs | null>(null);
  const [formRestaurant, setFormRestaurant] = useState('');
  const [formPlats, setFormPlats] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: restaurants } = useQuery({
    queryKey: ['superviseur-restaurants', sessionData?.user?.id],
    queryFn: () => restaurantService.bySuperviseur(sessionData?.user?.id!),
    enabled: !!sessionData?.user?.id,
  });

  const { data: menus, isLoading: isLoadingMenus } = useQuery({
    queryKey: ['menus', selectedRestaurant],
    queryFn: () => menuService.byRestaurant(selectedRestaurant!),
    enabled: !!selectedRestaurant,
  });

  const { data: platsForForm, isLoading: isLoadingPlatsForm } = useQuery({
    queryKey: ['plats', formRestaurant, 'all'],
    queryFn: () => platService.byRestaurant(formRestaurant!),
    enabled: !!formRestaurant,
  });

  const platOptions = (platsForForm || []).map((p: any) => ({
    value: p._id,
    label: `${p.nom}${typeof p.service === 'object' && p.service ? ` (${p.service.nom})` : ''}`,
  }));

  const { mutate: createMenu, isPending: isCreating } = useMutation({
    mutationFn: (data: any) => menuService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menus'] });
      handleCloseModal();
    },
    onError: () => {
      // Error handled silently
    },
  });

  const { mutate: updateMenu, isPending: isUpdating } = useMutation({
    mutationFn: (data: any) => menuService.update(editingMenu!._id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menus'] });
      handleCloseModal();
    },
    onError: () => {
      // Error handled silently
    },
  });

  const { mutate: deleteMenu } = useMutation({
    mutationFn: (id: string) => menuService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menus'] });
    },
    onError: () => {
      // Error handled silently
    },
  });

  const handleOpenCreate = () => {
    setEditingMenu(null);
    setFormNom('');
    setFormDate(null);
    setFormRestaurant(selectedRestaurant || '');
    setFormPlats([]);
    setFormNotes('');
    setModalOpen(true);
  };

  const handleOpenEdit = (menu: Menu) => {
    setEditingMenu(menu);
    const restaurantId = typeof menu.restaurant === 'object' ? (menu.restaurant as any)._id : menu.restaurant;
    const platIds = (menu.plats || []).map((p: any) =>
      typeof p === 'object' ? p._id : p
    );
    setFormRestaurant(restaurantId);
    setFormNom(menu.nom);
    setFormDate(menu.date ? dayjs(menu.date) : null);
    setFormPlats(platIds);
    setFormNotes(menu.notes || '');
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingMenu(null);
    setFormNom('');
    setFormDate(null);
    setFormRestaurant('');
    setFormPlats([]);
    setFormNotes('');
  };

  const handleSubmit = () => {
    if (!formNom || !formDate || !formRestaurant || formPlats.length === 0) return;
    const payload = {
      nom: formNom,
      date: formDate.format('YYYY-MM-DD'),
      restaurant: formRestaurant,
      plats: formPlats,
      notes: formNotes,
    };
    if (editingMenu) {
      updateMenu(payload);
    } else {
      createMenu(payload);
    }
  };

  const handleDelete = (menu: Menu) => {
    if (window.confirm('Supprimer ce menu ?')) {
      deleteMenu(menu._id);
    }
  };

  const togglePlat = (platId: string) => {
    setFormPlats((prev) =>
      prev.includes(platId)
        ? prev.filter((p) => p !== platId)
        : [...prev, platId]
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sortedMenus = useMemo(() => {
    if (!menus) return [];
    return [...menus].sort((a: any, b: any) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [menus]);

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-[1fr_auto]">
        <select
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"
          value={selectedRestaurant || ''}
          onChange={(e) => setSelectedRestaurant(e.target.value || undefined)}
        >
          <option value="">Sélectionner un restaurant</option>
          {(restaurants || []).map((r: any) => (
            <option key={r._id} value={r._id}>
              {r.nom}
            </option>
          ))}
        </select>

        <Button
          onClick={handleOpenCreate}
          disabled={!selectedRestaurant}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="size-4" />
          Créer un menu
        </Button>
      </div>

      {/* Content */}
      {!selectedRestaurant ? (
        <EmptyState message="Sélectionnez un restaurant pour voir les menus" />
      ) : isLoadingMenus ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border/40 px-4 py-3">
              <Skeleton className="size-5 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      ) : sortedMenus.length > 0 ? (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          {/* Table header (desktop only) */}
          <div className="hidden grid-cols-[auto_1.5fr_1fr_1fr_1fr_100px] gap-4 border-b border-border/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid">
            <span />
            <span>Nom</span>
            <span>Date</span>
            <span>Plats</span>
            <span>Notes</span>
            <span className="text-center">Actions</span>
          </div>

          {/* Menu rows */}
          <div className="divide-y divide-border/40">
            {sortedMenus.map((menu) => (
              <MenuRow
                key={menu._id}
                menu={menu}
                expanded={expandedRows.has(menu._id)}
                onToggle={() => toggleExpand(menu._id)}
                onEdit={() => handleOpenEdit(menu)}
                onDelete={() => handleDelete(menu)}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState message="Aucun menu pour ce restaurant" />
      )}

      {/* Modal: Create / Edit menu */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleCloseModal}
        >
          <Card
            className="w-full max-w-[600px] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="px-6 py-6 space-y-4">
              <h3 className="text-lg font-bold text-foreground">
                {editingMenu ? 'Modifier le menu' : 'Créer un menu'}
              </h3>

              {/* Nom */}
              <div className="space-y-1.5">
                <Label>Nom du menu</Label>
                <Input
                  placeholder="Ex: Menu du jour - 06/08/2026"
                  value={formNom}
                  onChange={(e) => setFormNom(e.target.value)}
                />
              </div>

              {/* Date - DatePicker Ant Design conservé */}
              <div className="space-y-1.5">
                <Label>Date</Label>
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{ width: '100%' }}
                  value={formDate}
                  onChange={(date) => setFormDate(date)}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </div>

              {/* Restaurant */}
              <div className="space-y-1.5">
                <Label>Restaurant</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"
                  value={formRestaurant}
                  onChange={(e) => {
                    setFormRestaurant(e.target.value);
                    setFormPlats([]);
                  }}
                >
                  <option value="">Sélectionner un restaurant</option>
                  {(restaurants || []).map((r: any) => (
                    <option key={r._id} value={r._id}>
                      {r.nom}
                    </option>
                  ))}
                </select>
              </div>

              {/* Plats - multi-select as checkboxes */}
              <div className="space-y-1.5">
                <Label>Plats du menu</Label>
                {isLoadingPlatsForm ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : platOptions.length > 0 ? (
                  <div className="max-h-[200px] overflow-y-auto space-y-1.5 rounded-md border border-border p-3">
                    {platOptions.map((p: { value: string; label: string }) => {
                      const checked = formPlats.includes(p.value);
                      return (
                        <label
                          key={p.value}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                            checked
                              ? 'border-primary bg-primary/5 text-foreground'
                              : 'border-transparent bg-background text-muted-foreground hover:bg-muted/50'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePlat(p.value)}
                            className="size-4 rounded border-input accent-primary"
                          />
                          <span className="truncate">{p.label}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {formRestaurant ? 'Aucun plat disponible' : 'Sélectionnez un restaurant'}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Notes (optionnel)</Label>
                <textarea
                  rows={2}
                  placeholder="Notes sur le menu"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"
                />
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCloseModal}>
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isCreating || isUpdating || !formNom || !formDate || !formRestaurant || formPlats.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {(isCreating || isUpdating) && <Loader2 className="size-4 animate-spin" />}
                  {editingMenu ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---- Menu row -----------------------------------------------------------------

interface MenuRowProps {
  menu: Menu;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function MenuRow({ menu, expanded, onToggle, onEdit, onDelete }: MenuRowProps) {
  const plats = menu.plats || [];

  return (
    <>
      <div className="grid grid-cols-1 gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30 md:grid-cols-[auto_1.5fr_1fr_1fr_1fr_100px] md:items-center md:gap-4">
        {/* Expand toggle */}
        <button
          onClick={onToggle}
          className="flex size-5 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>

        {/* Nom */}
        <div className="text-sm font-semibold text-foreground">{menu.nom}</div>

        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Calendar className="size-3.5 shrink-0 text-sky-600" />
          <span className="tabular-nums">{dayjs(menu.date).format('DD/MM/YYYY')}</span>
        </div>

        {/* Plats count */}
        <div>
          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
            {plats.length} plat(s)
          </span>
        </div>

        {/* Notes */}
        <div className="text-sm text-muted-foreground truncate">
          {menu.notes || '-'}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={onEdit} title="Modifier">
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            title="Supprimer"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Expanded row */}
      {expanded && (
        <div className="border-t border-border/40 bg-muted/20 px-4 py-4">
          {plats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun plat</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {plats.map((p: any) => (
                <div
                  key={p._id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
                >
                  {p.image && (
                    <img
                      src={`${env.VITE_APP_BACKEND}${p.image}`}
                      alt={p.nom}
                      className="size-10 rounded-md object-cover"
                    />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{p.nom}</p>
                    {typeof p.service === 'object' && p.service && (
                      <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
                        {p.service.nom}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
