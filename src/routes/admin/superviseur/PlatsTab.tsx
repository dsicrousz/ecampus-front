import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Loader2,
  Inbox,
  X,
} from 'lucide-react';
import { PlatService } from '@/services/plat.service';
import { RestaurantService } from '@/services/restaurant.service';
import { useSession } from '@/auth/auth-client';
import { env } from '@/env';
import type { Plat } from '@/types/plat';
import type { RestaurantServiceEntry } from '@/types/restaurant';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface PlatFormValues {
  nom: string;
  restaurant: string;
  service: string;
  description?: string;
  ingredients?: string[];
  allergenes?: string[];
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

// ---- Tag input (mode="tags" replacement) --------------------------------------

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  accent?: 'default' | 'orange';
}

function TagInput({ value, onChange, placeholder, accent = 'default' }: TagInputProps) {
  const [input, setInput] = useState('');

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === ',' ) {
      e.preventDefault();
      addTag(input);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs dark:bg-input/30 focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
      {value.map((tag) => (
        <span
          key={tag}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
            accent === 'orange'
              ? 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300'
              : 'border-border bg-muted text-muted-foreground'
          )}
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input.trim() && addTag(input)}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

export default function PlatsTab() {
  const { data: sessionData } = useSession();
  const qc = useQueryClient();
  const platService = useMemo(() => new PlatService(), []);
  const restaurantService = useMemo(() => new RestaurantService(), []);

  // Form state (replacing Form.useForm)
  const [formNom, setFormNom] = useState('');
  const [formRestaurant, setFormRestaurant] = useState('');
  const [formService, setFormService] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIngredients, setFormIngredients] = useState<string[]>([]);
  const [formAllergenes, setFormAllergenes] = useState<string[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlat, setEditingPlat] = useState<Plat | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>();
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data: restaurants } = useQuery({
    queryKey: ['superviseur-restaurants', sessionData?.user?.id],
    queryFn: () => restaurantService.bySuperviseur(sessionData?.user?.id!),
    enabled: !!sessionData?.user?.id,
  });

  const servicesForRestaurant = useMemo(() => {
    if (!selectedRestaurant || !restaurants) return [];
    const restaurant = restaurants.find((r: any) => r._id === selectedRestaurant);
    if (!restaurant?.services) return [];
    return restaurant.services
      .map((entry: RestaurantServiceEntry) => {
        if (typeof entry.service === 'object') return entry.service;
        return null;
      })
      .filter(Boolean);
  }, [selectedRestaurant, restaurants]);

  const serviceOptions = servicesForRestaurant.map((s: any) => ({
    value: s._id,
    label: s.nom,
  }));

  const { data: plats, isLoading: isLoadingPlats } = useQuery({
    queryKey: ['plats', selectedRestaurant, selectedServiceFilter],
    queryFn: () => {
      if (selectedServiceFilter) {
        return platService.byRestaurantAndService(selectedRestaurant!, selectedServiceFilter);
      }
      return platService.byRestaurant(selectedRestaurant!);
    },
    enabled: !!selectedRestaurant,
  });

  const { mutate: createPlat, isPending: isCreating } = useMutation({
    mutationFn: (data: PlatFormValues) => platService.create(data),
    onSuccess: async (newPlat: any) => {
      if (imageFile && newPlat._id) {
        const formData = new FormData();
        formData.append('file', imageFile);
        try {
          await platService.updateImage(newPlat._id, formData);
        } catch {
          // Image upload failed silently
        }
      }
      qc.invalidateQueries({ queryKey: ['plats'] });
      handleCloseModal();
    },
    onError: () => {
      // Error handled silently
    },
  });

  const { mutate: updatePlat, isPending: isUpdating } = useMutation({
    mutationFn: (data: PlatFormValues) => platService.update(editingPlat!._id, data),
    onSuccess: async () => {
      if (imageFile && editingPlat) {
        const formData = new FormData();
        formData.append('file', imageFile);
        try {
          await platService.updateImage(editingPlat._id, formData);
        } catch {
          // Image upload failed silently
        }
      }
      qc.invalidateQueries({ queryKey: ['plats'] });
      handleCloseModal();
    },
    onError: () => {
      // Error handled silently
    },
  });

  const { mutate: deletePlat } = useMutation({
    mutationFn: (id: string) => platService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plats'] });
    },
    onError: () => {
      // Error handled silently
    },
  });

  const handleOpenCreate = () => {
    setEditingPlat(null);
    setFormNom('');
    setFormRestaurant(selectedRestaurant || '');
    setFormService('');
    setFormDescription('');
    setFormIngredients([]);
    setFormAllergenes([]);
    setImageFile(null);
    setImagePreview(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (plat: Plat) => {
    setEditingPlat(plat);
    const restaurantId = typeof plat.restaurant === 'object' ? plat.restaurant._id : plat.restaurant;
    const serviceId = typeof plat.service === 'object' ? plat.service._id : plat.service;
    setSelectedRestaurant(restaurantId);
    setFormNom(plat.nom);
    setFormRestaurant(restaurantId);
    setFormService(serviceId);
    setFormDescription(plat.description || '');
    setFormIngredients(plat.ingredients || []);
    setFormAllergenes(plat.allergenes || []);
    setImageFile(null);
    setImagePreview(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingPlat(null);
    setFormNom('');
    setFormRestaurant('');
    setFormService('');
    setFormDescription('');
    setFormIngredients([]);
    setFormAllergenes([]);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = () => {
    if (!formNom || !formRestaurant || !formService) return;
    const values: PlatFormValues = {
      nom: formNom,
      restaurant: formRestaurant,
      service: formService,
      description: formDescription,
      ingredients: formIngredients,
      allergenes: formAllergenes,
    };
    if (editingPlat) {
      updatePlat(values);
    } else {
      createPlat(values);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!isImage) return;
    if (file.size > 1024 * 1024) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDelete = (plat: Plat) => {
    if (window.confirm('Supprimer ce plat ?')) {
      deletePlat(plat._id);
    }
  };

  const sortedPlats = useMemo(() => {
    if (!plats) return [];
    return [...plats].sort((a, b) => a.nom.localeCompare(b.nom));
  }, [plats]);

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-[1fr_1fr_auto]">
        <select
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"
          value={selectedRestaurant || ''}
          onChange={(e) => {
            setSelectedRestaurant(e.target.value || undefined);
            setSelectedServiceFilter(undefined);
          }}
        >
          <option value="">Sélectionner un restaurant</option>
          {(restaurants || []).map((r: any) => (
            <option key={r._id} value={r._id}>
              {r.nom}
            </option>
          ))}
        </select>

        <select
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30 disabled:cursor-not-allowed disabled:opacity-50"
          value={selectedServiceFilter || ''}
          onChange={(e) => setSelectedServiceFilter(e.target.value || undefined)}
          disabled={!selectedRestaurant}
        >
          <option value="">Tous les services</option>
          {serviceOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <Button
          onClick={handleOpenCreate}
          disabled={!selectedRestaurant}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="size-4" />
          Ajouter un plat
        </Button>
      </div>

      {/* Content */}
      {!selectedRestaurant ? (
        <EmptyState message="Sélectionnez un restaurant pour voir les plats" />
      ) : isLoadingPlats ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border/40 px-4 py-3">
              <Skeleton className="size-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      ) : sortedPlats.length > 0 ? (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          {/* Table header (desktop only) */}
          <div className="hidden grid-cols-[80px_1.5fr_1fr_1.5fr_1.5fr_100px] gap-4 border-b border-border/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid">
            <span>Image</span>
            <span>Nom</span>
            <span>Service</span>
            <span>Ingrédients</span>
            <span>Allergènes</span>
            <span className="text-center">Actions</span>
          </div>

          {/* Plat rows */}
          <div className="divide-y divide-border/40">
            {sortedPlats.map((plat) => (
              <PlatRow
                key={plat._id}
                plat={plat}
                onEdit={() => handleOpenEdit(plat)}
                onDelete={() => handleDelete(plat)}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState message="Aucun plat pour ce restaurant" />
      )}

      {/* Modal: Create / Edit plat */}
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
                {editingPlat ? 'Modifier le plat' : 'Ajouter un plat'}
              </h3>

              {/* Nom */}
              <div className="space-y-1.5">
                <Label>Nom du plat</Label>
                <Input
                  placeholder="Ex: Riz au poulet"
                  value={formNom}
                  onChange={(e) => setFormNom(e.target.value)}
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
                    setSelectedRestaurant(e.target.value);
                    setFormService('');
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

              {/* Service */}
              <div className="space-y-1.5">
                <Label>Service</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formService}
                  onChange={(e) => setFormService(e.target.value)}
                  disabled={!formRestaurant}
                >
                  <option value="">Sélectionner un service</option>
                  {serviceOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label>Description</Label>
                <textarea
                  rows={2}
                  placeholder="Description du plat"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"
                />
              </div>

              {/* Ingrédients */}
              <div className="space-y-1.5">
                <Label>Ingrédients</Label>
                <TagInput
                  value={formIngredients}
                  onChange={setFormIngredients}
                  placeholder="Ajouter des ingrédients (Entrée pour valider)"
                />
              </div>

              {/* Allergènes */}
              <div className="space-y-1.5">
                <Label>Allergènes</Label>
                <TagInput
                  value={formAllergenes}
                  onChange={setFormAllergenes}
                  placeholder="Ajouter des allergènes (Entrée pour valider)"
                  accent="orange"
                />
              </div>

              {/* Image upload */}
              <div className="space-y-1.5">
                <Label>Image du plat</Label>
                <div className="flex items-center gap-4">
                  <label className="flex size-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:bg-muted">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="size-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Upload className="size-5" />
                        <span className="text-xs">Upload</span>
                      </div>
                    )}
                  </label>
                  {editingPlat?.image && !imageFile && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Image actuelle:</p>
                      <img
                        src={`${env.VITE_APP_BACKEND}${editingPlat.image}`}
                        alt={editingPlat.nom}
                        className="size-20 rounded-lg object-cover border border-border"
                      />
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCloseModal}>
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isCreating || isUpdating || !formNom || !formRestaurant || !formService}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {(isCreating || isUpdating) && <Loader2 className="size-4 animate-spin" />}
                  {editingPlat ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---- Plat row -----------------------------------------------------------------

interface PlatRowProps {
  plat: Plat;
  onEdit: () => void;
  onDelete: () => void;
}

function PlatRow({ plat, onEdit, onDelete }: PlatRowProps) {
  return (
    <div className="grid grid-cols-1 gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30 md:grid-cols-[80px_1.5fr_1fr_1.5fr_1.5fr_100px] md:items-center md:gap-4">
      {/* Image */}
      <div className="flex items-center">
        {plat.image ? (
          <img
            src={`${env.VITE_APP_BACKEND}${plat.image}`}
            alt={plat.nom}
            className="size-12 rounded-lg object-cover border border-border"
          />
        ) : (
          <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-[10px] text-muted-foreground">
            N/A
          </div>
        )}
      </div>

      {/* Nom */}
      <div className="text-sm font-semibold text-foreground">{plat.nom}</div>

      {/* Service */}
      <div>
        {typeof plat.service === 'object' && plat.service ? (
          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
            {plat.service.nom}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            N/A
          </span>
        )}
      </div>

      {/* Ingrédients */}
      <div className="flex flex-wrap gap-1">
        {plat.ingredients?.length > 0 ? (
          <>
            {plat.ingredients.slice(0, 4).map((ing, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {ing}
              </span>
            ))}
            {plat.ingredients.length > 4 && (
              <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                +{plat.ingredients.length - 4}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </div>

      {/* Allergènes */}
      <div className="flex flex-wrap gap-1">
        {plat.allergenes?.length > 0 ? (
          plat.allergenes.map((a, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300"
            >
              {a}
            </span>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
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
  );
}
