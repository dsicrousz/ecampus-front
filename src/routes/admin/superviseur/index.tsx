import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/route-protection'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/auth/auth-client'
import { RestaurantService } from '@/services/restaurant.service'
import { ServiceService } from '@/services/service.service'
import { UserService } from '@/services/user.service'
import {
  Store,
  Clock,
  Pencil,
  Plus,
  MinusCircle,
  Coffee,
  Calendar,
  ChevronDown,
  Loader2,
  Inbox,
} from 'lucide-react'
import { USER_ROLE } from '@/types/user.roles'
import type { RestaurantServiceEntry } from '@/types/restaurant'
import type { Service, PlanningControle } from '@/types/service'
import { useState } from 'react'
import PlatsTab from './PlatsTab'
import MenusTab from './MenusTab'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

const DayOptions = [
  { value: 0, label: 'Lundi' },
  { value: 1, label: 'Mardi' },
  { value: 2, label: 'Mercredi' },
  { value: 3, label: 'Jeudi' },
  { value: 4, label: 'Vendredi' },
  { value: 5, label: 'Samedi' },
  { value: 6, label: 'Dimanche' },
]

export const Route = createFileRoute('/admin/superviseur/')({
  beforeLoad: () => requireRole([USER_ROLE.SUPERVISEUR, USER_ROLE.SUPERADMIN, USER_ROLE.ADMIN]),
  component: RouteComponent,
})

// ---- Tab button ---------------------------------------------------------------

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
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
    </button>
  )
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
  )
}

// ---- Service row (table row as card) ------------------------------------------

interface ServiceRowProps {
  record: RestaurantServiceEntry
  onEditPlanning: (entry: RestaurantServiceEntry) => void
}

function ServiceRow({ record, onEditPlanning }: ServiceRowProps) {
  const svc = typeof record.service === 'object' ? record.service : null
  const count = svc?.planning?.length || 0

  return (
    <div className="grid grid-cols-1 gap-3 border-b border-border/40 px-4 py-3.5 transition-colors hover:bg-muted/30 sm:grid-cols-[1.5fr_1fr_1fr_0.5fr] sm:items-center sm:gap-4">
      {/* Service */}
      <div className="flex items-center gap-2 min-w-0">
        <Store className="size-4 shrink-0 text-sky-600" />
        <span className="truncate text-sm font-medium text-foreground">
          {svc?.nom || 'Service'}
        </span>
      </div>

      {/* Type */}
      <div>
        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {svc?.type || '-'}
        </span>
      </div>

      {/* Planning */}
      <div className="flex items-center gap-2 text-sm">
        <Clock
          className={cn(
            'size-3.5 shrink-0',
            count > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
          )}
        />
        <span className={count > 0 ? 'text-foreground' : 'text-muted-foreground'}>
          {count > 0 ? `${count} créneau(x)` : 'Non configuré'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center">
        <Button
          variant="ghost"
          size="icon-sm"
          title="Configurer le planning de contrôle"
          onClick={() => onEditPlanning(record)}
        >
          <Pencil className="size-4" />
        </Button>
      </div>
    </div>
  )
}

// ---- Planning form entry ------------------------------------------------------

interface PlanningEntry {
  jour: number
  heureDebut: string
  heureFin: string
  agents: string[]
}

function RouteComponent() {
  const { data: sessionData } = useSession()
  const restaurantService = new RestaurantService()
  const serviceService = new ServiceService()
  const userService = new UserService()
  const qc = useQueryClient()

  const [activeTab, setActiveTab] = useState<'services' | 'plats' | 'menus'>('services')
  const [planningDrawerOpen, setPlanningDrawerOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [planningEntries, setPlanningEntries] = useState<PlanningEntry[]>([])

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ['superviseur-restaurants', sessionData?.user?.id],
    queryFn: () => restaurantService.bySuperviseur(sessionData?.user?.id!),
    enabled: !!sessionData?.user?.id,
  })

  const { data: controleurs, isLoading: isLoadingControleurs } = useQuery({
    queryKey: ['users', USER_ROLE.CONTROLEUR],
    queryFn: () => userService.byRole(USER_ROLE.CONTROLEUR),
  })

  const controleurOptions = (controleurs || []).map((u: any) => ({
    value: u._id,
    label: `${u.name} (${u.email})`,
  }))

  const { mutate: updatePlanning, isPending: isUpdatingPlanning } = useMutation({
    mutationFn: async (data: { serviceId: string; planning: PlanningControle[] }) => {
      return serviceService.update(data.serviceId, { planning: data.planning })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superviseur-restaurants', sessionData?.user?.id] })
      setPlanningDrawerOpen(false)
      setPlanningEntries([])
      setEditingService(null)
    },
    onError: () => {
      // Error handled silently
    },
  })

  const handleEditPlanning = (entry: RestaurantServiceEntry) => {
    const svc = typeof entry.service === 'object' ? entry.service : null
    if (!svc) return
    setEditingService(svc)
    const formData = (svc.planning || []).map((p: PlanningControle) => ({
      jour: p.jour,
      heureDebut: p.heureDebut || '',
      heureFin: p.heureFin || '',
      agents: p.agents || [],
    }))
    setPlanningEntries(formData)
    setPlanningDrawerOpen(true)
  }

  const handleSubmitPlanning = () => {
    if (!editingService) return
    updatePlanning({
      serviceId: editingService._id,
      planning: planningEntries,
    })
  }

  const closePlanningDrawer = () => {
    setPlanningDrawerOpen(false)
    setPlanningEntries([])
    setEditingService(null)
  }

  // Planning entry helpers
  const addPlanningEntry = () => {
    setPlanningEntries((prev) => [
      ...prev,
      { jour: 0, heureDebut: '', heureFin: '', agents: [] },
    ])
  }

  const removePlanningEntry = (index: number) => {
    setPlanningEntries((prev) => prev.filter((_, i) => i !== index))
  }

  const updatePlanningEntry = (index: number, field: keyof PlanningEntry, value: any) => {
    setPlanningEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
    )
  }

  const toggleAgent = (entryIndex: number, agentId: string) => {
    setPlanningEntries((prev) =>
      prev.map((entry, i) => {
        if (i !== entryIndex) return entry
        const has = entry.agents.includes(agentId)
        return {
          ...entry,
          agents: has
            ? entry.agents.filter((a) => a !== agentId)
            : [...entry.agents, agentId],
        }
      })
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Hero skeleton */}
        <Card className="border-border/60 shadow-none">
          <CardContent className="flex items-center gap-5 px-5 py-5">
            <Skeleton className="size-16 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-20 w-[220px] rounded-2xl" />
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-none">
          <CardContent className="px-5 py-5">
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!restaurants?.length) {
    return (
      <Card className="border-border/60 shadow-none">
        <CardContent className="px-5 py-5">
          <EmptyState message="Vous n'êtes superviseur d'aucun restaurant" />
        </CardContent>
      </Card>
    )
  }

  const totalServices = restaurants.reduce(
    (acc: number, r: any) => acc + (r.services?.length || 0),
    0
  )

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <Card className="border-border/60 shadow-none">
        <CardContent className="flex flex-wrap items-center gap-5 px-5 py-5">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Store className="size-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Supervision
            </p>
            <h3 className="mb-1 mt-1 text-xl font-bold text-foreground">
              Mes Restaurants
            </h3>
            <p className="text-sm text-muted-foreground">
              Gérez les services, plats et menus de vos restaurants
            </p>
          </div>
          <div className="min-w-[220px] rounded-2xl border border-border bg-muted px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total
            </p>
            <p className="text-3xl font-bold tabular-nums text-foreground">
              {restaurants.length}
            </p>
            <p className="text-xs text-muted-foreground">{totalServices} service(s)</p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs + Content */}
      <Card className="border-border/60 shadow-none">
        <CardContent className="px-5 py-5">
          {/* Tab bar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3 mb-4">
            <TabButton
              active={activeTab === 'services'}
              onClick={() => setActiveTab('services')}
              icon={<Store className="size-4" />}
              label="Services & Planning"
            />
            <TabButton
              active={activeTab === 'plats'}
              onClick={() => setActiveTab('plats')}
              icon={<Coffee className="size-4" />}
              label="Plats"
            />
            <TabButton
              active={activeTab === 'menus'}
              onClick={() => setActiveTab('menus')}
              icon={<Calendar className="size-4" />}
              label="Menus"
            />
          </div>

          {/* Tab content */}
          {activeTab === 'services' && (
            <div className="space-y-3">
              {restaurants.map((restaurant: any) => (
                <RestaurantCollapsible
                  key={restaurant._id}
                  restaurant={restaurant}
                  defaultOpen={restaurant._id === restaurants[0]?._id}
                  onEditPlanning={handleEditPlanning}
                />
              ))}
            </div>
          )}

          {activeTab === 'plats' && <PlatsTab />}

          {activeTab === 'menus' && <MenusTab />}
        </CardContent>
      </Card>

      {/* Sheet: Planning editor */}
      <Sheet open={planningDrawerOpen} onOpenChange={(open) => { if (!open) closePlanningDrawer() }}>
        <SheetContent side="right" className="w-full sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              Planning de Contrôle — {editingService?.nom}
            </SheetTitle>
            <SheetDescription>
              Définissez les créneaux et les agents de contrôle pour ce service.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
            {planningEntries.map((entry, index) => (
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
                    onClick={() => removePlanningEntry(index)}
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
                      onChange={(e) => updatePlanningEntry(index, 'jour', Number(e.target.value))}
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
                      onChange={(e) => updatePlanningEntry(index, 'heureDebut', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Heure fin</Label>
                    <Input
                      type="time"
                      value={entry.heureFin}
                      onChange={(e) => updatePlanningEntry(index, 'heureFin', e.target.value)}
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
                        const checked = entry.agents.includes(agent.value)
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
                        )
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
              onClick={addPlanningEntry}
            >
              <Plus className="size-4" />
              Ajouter un créneau
            </Button>
          </div>

          <div className="flex justify-end gap-2 border-t border-border p-4">
            <Button variant="outline" onClick={closePlanningDrawer}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmitPlanning}
              disabled={isUpdatingPlanning}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isUpdatingPlanning && <Loader2 className="size-4 animate-spin" />}
              Enregistrer le Planning
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ---- Restaurant collapsible ---------------------------------------------------

interface RestaurantCollapsibleProps {
  restaurant: any
  defaultOpen: boolean
  onEditPlanning: (entry: RestaurantServiceEntry) => void
}

function RestaurantCollapsible({ restaurant, defaultOpen, onEditPlanning }: RestaurantCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)
  const services = restaurant.services || []

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <Store className="size-5 shrink-0 text-sky-600" />
              <span className="truncate font-semibold text-foreground">
                {restaurant.nom}
              </span>
              <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900">
                {services.length} service(s)
              </span>
            </div>
            <ChevronDown
              className={cn(
                'size-5 shrink-0 text-muted-foreground transition-transform duration-200',
                open && 'rotate-180'
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border/60">
            {/* Table header (desktop only) */}
            <div className="hidden grid-cols-[1.5fr_1fr_1fr_0.5fr] gap-4 border-b border-border/40 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
              <span>Service</span>
              <span>Type</span>
              <span>Planning</span>
              <span className="text-center">Actions</span>
            </div>

            {/* Service rows */}
            {services.length > 0 ? (
              <div className="divide-y divide-border/40">
                {services.map((entry: RestaurantServiceEntry) => {
                  const svc = typeof entry.service === 'object' ? entry.service : entry.service
                  const key = typeof svc === 'object' ? svc._id : svc
                  return (
                    <ServiceRow
                      key={key}
                      record={entry}
                      onEditPlanning={onEditPlanning}
                    />
                  )
                })}
              </div>
            ) : (
              <EmptyState message="Aucun service pour ce restaurant" />
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
