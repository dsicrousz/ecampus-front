import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/route-protection'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/auth/auth-client'
import { RestaurantService } from '@/services/restaurant.service'
import { PlanningService } from '@/services/planning.service'
import {
  Store,
  Clock,
  Pencil,
  Coffee,
  Calendar,
  ChevronDown,
  Inbox,
} from 'lucide-react'
import { USER_ROLE } from '@/types/user.roles'
import type { RestaurantServiceEntry } from '@/types/restaurant'
import type { Planning } from '@/types/planning'
import { useState } from 'react'
import PlatsTab from './PlatsTab'
import MenusTab from './MenusTab'
import { PlanningForm } from '@/components/planning-form'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

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
  planningCount: number
  onEditPlanning: (entry: RestaurantServiceEntry) => void
}

function ServiceRow({ record, planningCount, onEditPlanning }: ServiceRowProps) {
  const svc = typeof record.service === 'object' ? record.service : null

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
            planningCount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
          )}
        />
        <span className={planningCount > 0 ? 'text-foreground' : 'text-muted-foreground'}>
          {planningCount > 0 ? `${planningCount} créneau(x)` : 'Non configuré'}
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

function RouteComponent() {
  const { data: sessionData } = useSession()
  const restaurantService = new RestaurantService()

  const [activeTab, setActiveTab] = useState<'services' | 'plats' | 'menus'>('services')
  const [planningFormOpen, setPlanningFormOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<{
    restaurantId: string
    serviceId: string
    serviceNom: string
  } | null>(null)

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ['superviseur-restaurants', sessionData?.user?.id],
    queryFn: () => restaurantService.bySuperviseur(sessionData?.user?.id!),
    enabled: !!sessionData?.user?.id,
  })

  const handleEditPlanning = (entry: {
    restaurantId: string
    serviceId: string
    serviceNom: string
  }) => {
    setEditingEntry(entry)
    setPlanningFormOpen(true)
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

      {/* Planning form (managed by dedicated component) */}
      {editingEntry && (
        <PlanningForm
          restaurantId={editingEntry.restaurantId}
          serviceId={editingEntry.serviceId}
          serviceNom={editingEntry.serviceNom}
          open={planningFormOpen}
          onOpenChange={(open) => {
            setPlanningFormOpen(open)
            if (!open) setEditingEntry(null)
          }}
        />
      )}
    </div>
  )
}

// ---- Restaurant collapsible ---------------------------------------------------

interface RestaurantCollapsibleProps {
  restaurant: any
  defaultOpen: boolean
  onEditPlanning: (entry: { restaurantId: string; serviceId: string; serviceNom: string }) => void
}

function RestaurantCollapsible({ restaurant, defaultOpen, onEditPlanning }: RestaurantCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)
  const services = restaurant.services || []
  const restaurantId = restaurant._id
  const planningService = new PlanningService()

  // Fetch les plannings de ce restaurant (service populé)
  const { data: plannings } = useQuery<Planning[]>({
    queryKey: ['planning', 'restaurant', restaurantId],
    queryFn: () => planningService.findByRestaurant(restaurantId),
    enabled: !!restaurantId,
  })

  // Map serviceId → nombre de créneaux
  const planningCountByService = (() => {
    const map: Record<string, number> = {}
    for (const p of plannings || []) {
      map[p.service._id] = (p.creneaux || []).length
    }
    return map
  })()

  const handleEdit = (entry: RestaurantServiceEntry) => {
    const svc = typeof entry.service === 'object' ? entry.service : null
    if (!svc) return
    onEditPlanning({
      restaurantId,
      serviceId: svc._id,
      serviceNom: svc.nom,
    })
  }

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
                  const serviceId = typeof svc === 'object' ? svc._id : svc
                  return (
                    <ServiceRow
                      key={key}
                      record={entry}
                      planningCount={planningCountByService[serviceId] || 0}
                      onEditPlanning={handleEdit}
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
