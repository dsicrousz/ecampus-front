import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Plus, MinusCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlanningService } from '@/services/planning.service';
import { UserService } from '@/services/user.service';
import { USER_ROLE } from '@/types/user.roles';
import type { PlanningControle, Planning } from '@/types/planning';

const DayOptions = [
  { value: 0, label: 'Lundi' },
  { value: 1, label: 'Mardi' },
  { value: 2, label: 'Mercredi' },
  { value: 3, label: 'Jeudi' },
  { value: 4, label: 'Vendredi' },
  { value: 5, label: 'Samedi' },
  { value: 6, label: 'Dimanche' },
];

interface PlanningEntry {
  jour: number;
  heureDebut: string;
  heureFin: string;
  agents: string[];
}

interface PlanningFormProps {
  /** ID du restaurant */
  restaurantId: string;
  /** ID du service */
  serviceId: string;
  /** Nom du service (pour l'affichage) */
  serviceNom: string;
  /** Contrôle l'ouverture du Sheet */
  open: boolean;
  /** Callback à la fermeture */
  onOpenChange: (open: boolean) => void;
}

/**
 * Composant réutilisable d'édition de planning.
 *
 * Au montage, appelle GET /planning/restaurant/:restaurantId/service/:serviceId
 * pour vérifier si un planning existe déjà.
 * - Si oui : mode édition (pré-remplir creneaux + active)
 * - Si non : mode création
 *
 * À la sauvegarde :
 * - Mode création : POST /planning
 * - Mode édition : PATCH /planning/:id
 */
export function PlanningForm({
  restaurantId,
  serviceId,
  serviceNom,
  open,
  onOpenChange,
}: PlanningFormProps) {
  const planningService = new PlanningService();
  const userService = new UserService();
  const qc = useQueryClient();

  const [entries, setEntries] = useState<PlanningEntry[]>([]);
  const [existingPlanning, setExistingPlanning] = useState<Planning | null>(null);

  // Récupérer le planning existant
  const { data: planning, isLoading: isLoadingPlanning } = useQuery<Planning | null>({
    queryKey: ['planning', restaurantId, serviceId],
    queryFn: () => planningService.findByRestaurantAndService(restaurantId, serviceId),
    enabled: open && !!restaurantId && !!serviceId,
  });

  // Récupérer les contrôleurs
  const { data: controleurs, isLoading: isLoadingControleurs } = useQuery<any[]>({
    queryKey: ['users', USER_ROLE.CONTROLEUR],
    queryFn: () => userService.byRole(USER_ROLE.CONTROLEUR),
  });

  const controleurOptions = (controleurs || []).map((u: any) => ({
    value: u._id,
    label: `${u.name} (${u.email})`,
  }));

  // Pré-remplir le formulaire quand le planning est chargé
  useEffect(() => {
    if (planning) {
      setExistingPlanning(planning);
      setEntries(
        (planning.creneaux || []).map((c: PlanningControle) => ({
          jour: c.jour,
          heureDebut: c.heureDebut || '',
          heureFin: c.heureFin || '',
          agents: c.agents || [],
        }))
      );
    } else if (!isLoadingPlanning && open) {
      setExistingPlanning(null);
      setEntries([]);
    }
  }, [planning, isLoadingPlanning, open]);

  // Reset quand on ferme
  useEffect(() => {
    if (!open) {
      setEntries([]);
      setExistingPlanning(null);
    }
  }, [open]);

  // Mutation création
  const { mutate: createPlanning, isPending: isCreating } = useMutation({
    mutationFn: (data: { restaurant: string; service: string; creneaux: PlanningControle[] }) =>
      planningService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning', restaurantId, serviceId] });
      qc.invalidateQueries({ queryKey: ['planning', 'restaurant', restaurantId] });
      qc.invalidateQueries({ queryKey: ['planning', 'service', serviceId] });
      onOpenChange(false);
    },
  });

  // Mutation mise à jour
  const { mutate: updatePlanning, isPending: isUpdating } = useMutation({
    mutationFn: (data: { id: string; creneaux: PlanningControle[] }) =>
      planningService.update(data.id, { creneaux: data.creneaux }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning', restaurantId, serviceId] });
      qc.invalidateQueries({ queryKey: ['planning', 'restaurant', restaurantId] });
      qc.invalidateQueries({ queryKey: ['planning', 'service', serviceId] });
      onOpenChange(false);
    },
  });

  const isPending = isCreating || isUpdating;

  // Helpers
  const addEntry = () => {
    setEntries((prev) => [...prev, { jour: 0, heureDebut: '', heureFin: '', agents: [] }]);
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof PlanningEntry, value: any) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
    );
  };

  const toggleAgent = (entryIndex: number, agentId: string) => {
    setEntries((prev) =>
      prev.map((entry, i) => {
        if (i !== entryIndex) return entry;
        const has = entry.agents.includes(agentId);
        return {
          ...entry,
          agents: has ? entry.agents.filter((a) => a !== agentId) : [...entry.agents, agentId],
        };
      })
    );
  };

  const handleSubmit = () => {
    const creneaux: PlanningControle[] = entries.map((e) => ({
      jour: e.jour,
      heureDebut: e.heureDebut,
      heureFin: e.heureFin,
      agents: e.agents,
    }));

    if (existingPlanning) {
      updatePlanning({ id: existingPlanning._id, creneaux });
    } else {
      createPlanning({ restaurant: restaurantId, service: serviceId, creneaux });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock className="size-5" />
            Planning de Contrôle — {serviceNom}
          </SheetTitle>
          <SheetDescription>
            Définissez les créneaux et les agents de contrôle pour ce service.
          </SheetDescription>
        </SheetHeader>

        {isLoadingPlanning ? (
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
              {entries.map((entry, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-border bg-muted/50 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      Créneau {index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => removeEntry(index)}
                    >
                      <MinusCircle className="size-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Jour</Label>
                      <select
                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"
                        value={entry.jour}
                        onChange={(e) => updateEntry(index, 'jour', Number(e.target.value))}
                      >
                        {DayOptions.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Heure début</Label>
                      <Input
                        type="time"
                        value={entry.heureDebut}
                        onChange={(e) => updateEntry(index, 'heureDebut', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Heure fin</Label>
                      <Input
                        type="time"
                        value={entry.heureFin}
                        onChange={(e) => updateEntry(index, 'heureFin', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <Label className="text-xs">Agents de contrôle</Label>
                    {isLoadingControleurs ? (
                      <div className="space-y-2">
                        {Array.from({ length: 2 }).map((_, i) => (
                          <Skeleton key={i} className="h-6 w-full" />
                        ))}
                      </div>
                    ) : controleurOptions.length > 0 ? (
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {controleurOptions.map((agent) => {
                          const checked = entry.agents.includes(agent.value);
                          return (
                            <label
                              key={agent.value}
                              className={cn(
                                'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors',
                                checked
                                  ? 'border-primary bg-primary/5 text-foreground'
                                  : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleAgent(index, agent.value)}
                                className="size-3.5 rounded border-input accent-primary"
                              />
                              <span className="truncate">{agent.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Aucun contrôleur disponible</p>
                    )}
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={addEntry}
              >
                <Plus className="size-4" />
                Ajouter un créneau
              </Button>
            </div>

            <div className="flex justify-end gap-2 border-t border-border p-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {existingPlanning ? 'Mettre à jour' : 'Enregistrer'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
