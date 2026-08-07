import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, memo } from "react"
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DatePicker } from "antd"
import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  Building2,
  Ticket as TicketIcon,
  Clock,
  CalendarDays,
  CalendarRange,
  GraduationCap,
  TrendingUp,
  Inbox,
} from 'lucide-react'
import dayjs from '@/config/dayjs.config'
import { OperationService } from '@/services/operation.service'
import { CompteService } from '@/services/compte.service'
import { SessionService } from '@/services/session.service'
import { AnimatedList } from '@/components/ui/animated-list'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import type { Operation } from '@/types/operation'
import { env } from '@/env'
import { cn } from '@/lib/utils'
import { Socket } from "socket.io-client";
import { useValue } from "@legendapp/state/react"
import { store$, operationActions } from '@/lib/operationStore'
import { getSocket, signSocket } from '@/lib/socket'
import { useSession } from '@/auth/auth-client'
import { USER_ROLE } from '@/types/user.roles'
import { QUERY_KEYS } from '@/constants'
import { requireRole } from '@/lib/route-protection'

const { RangePicker } = DatePicker

// Événements WebSocket pour les opérations
const SOCKET_EVENTS = {
  OPERATION_CREATED: 'operation_created',
  OPERATION_UPDATED: 'operation_updated',
  OPERATION_DELETED: 'operation_deleted',
  OPERATION_UPDATE: 'operation_update', // Legacy event
} as const;

export const Route = createFileRoute('/admin/')({
  beforeLoad: () => requireRole([USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN]),
  loader: () => {
    const socket = getSocket();
    return socket
  },
  component: RouteComponent,
})

// Fonction utilitaire pour formater les montants
const formatMontant = (montant: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(montant)
}

// Badge de statut de connexion temps réel
function ConnectionPill({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
        connected
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
          : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900"
      )}
    >
      <span className={cn(
        "relative flex size-2 rounded-full",
        connected ? "bg-emerald-500" : "bg-red-500"
      )}>
        {connected && (
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-75" />
        )}
      </span>
      {connected ? 'Temps réel actif' : 'Hors ligne'}
    </span>
  )
}

// Carte de statistique moderne
interface StatCardProps {
  label: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  accent: 'blue' | 'emerald' | 'amber' | 'violet'
}

const accentMap = {
  blue: {
    icon: "bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
    value: "text-sky-600 dark:text-sky-400",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    value: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    value: "text-amber-600 dark:text-amber-400",
  },
  violet: {
    icon: "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900",
    value: "text-violet-600 dark:text-violet-400",
  },
}

function StatCard({ label, value, subtitle, icon, accent }: StatCardProps) {
  const styles = accentMap[accent]
  return (
    <Card className="group relative overflow-hidden border-border/60 shadow-none transition-all duration-300 hover:shadow-md hover:border-border">
      <CardContent className="flex items-start justify-between gap-4 px-5 py-5">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className={cn("text-2xl font-bold tracking-tight tabular-nums", styles.value)}>
            {value}
          </p>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110",
          styles.icon
        )}>
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

// Carte de statistique en chargement
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
  )
}

// Composant mémoïsé pour afficher une opération (défini en dehors pour éviter les re-renders)
const OperationNotification = memo(({ operation }: { operation: Operation }) => {
  return (
    <figure
      className={cn(
        "relative mx-auto min-h-fit w-full max-w-[400px] cursor-pointer overflow-hidden rounded-xl p-4",
        "transition-all duration-300 ease-in-out hover:scale-[102%] hover:shadow-sm",
        "bg-card border border-border",
        "dark:bg-card dark:border-border"
      )}
    >
      <div className="flex flex-row items-center gap-4">
        <div className="relative">
          <Avatar className="size-14 border-2 border-primary/40">
            {operation.compte?.etudiant?.avatar ? (
              <AvatarImage src={`${env.VITE_APP_BACKURL_ETUDIANT}/${operation.compte.etudiant.avatar}`} />
            ) : null}
            <AvatarFallback>
              {operation.compte?.etudiant?.prenom?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 ring-2 ring-card">
            <svg className="text-white size-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-base font-semibold text-foreground truncate">
              {operation.compte?.etudiant?.prenom} {operation.compte?.etudiant?.nom}
            </span>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {operation.type}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Clock className="size-3 text-primary" />
            <span>{dayjs(operation.createdAt).format('DD/MM/YYYY HH:mm')}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {operation.montant.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>
      </div>
    </figure>
  )
}, (prevProps, nextProps) => prevProps.operation._id === nextProps.operation._id)

OperationNotification.displayName = 'OperationNotification'

function RouteComponent() {
  const socket: Socket = Route.useLoaderData();
  const { data: session } = useSession();
  const [timeFilter, setTimeFilter] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const operationService = new OperationService()
  const compteService = new CompteService()
  const sessionService = new SessionService()

  const qc = useQueryClient()
  const ops = useValue(store$.operations)
  const isConnected = useValue(store$.isConnected)

  // Gestion WebSocket temps réel
  useEffect(() => {
    if (!socket) return;

    const handleOperationCreated = (op: Operation) => {
      operationActions.addOperation(op);
    };

    const handleOperationUpdated = (op: Operation) => {
      operationActions.updateOperation(op);
    };

    const handleOperationDeleted = (data: { _id: string }) => {
      operationActions.removeOperation(data._id);
    };

    const handleConnect = () => {
      operationActions.setConnected(true);
      if (session?.user?.id) {
        signSocket(session.user.id);
      }
    };

    const handleDisconnect = () => {
      operationActions.setConnected(false);
    };

    const handleUpdate = () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.OPERATIONS] });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('update', handleUpdate);
    socket.on(SOCKET_EVENTS.OPERATION_CREATED, handleOperationCreated);
    socket.on(SOCKET_EVENTS.OPERATION_UPDATED, handleOperationUpdated);
    socket.on(SOCKET_EVENTS.OPERATION_DELETED, handleOperationDeleted);
    socket.on(SOCKET_EVENTS.OPERATION_UPDATE, handleOperationCreated);

    if (socket.connected) {
      operationActions.setConnected(true);
      if (session?.user?.id) {
        signSocket(session.user.id);
      }
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('update', handleUpdate);
      socket.off(SOCKET_EVENTS.OPERATION_CREATED, handleOperationCreated);
      socket.off(SOCKET_EVENTS.OPERATION_UPDATED, handleOperationUpdated);
      socket.off(SOCKET_EVENTS.OPERATION_DELETED, handleOperationDeleted);
      socket.off(SOCKET_EVENTS.OPERATION_UPDATE, handleOperationCreated);
    };
  }, [socket, session?.user?.id, qc]);

  // Récupérer la session active
  const { data: activeSession, isLoading: isLoadingSession } = useQuery({
    queryKey: [QUERY_KEYS.SESSION_ACTIVE],
    queryFn: () => sessionService.getActive(),
  })

  // Initialiser le timeFilter avec les dates de la session active
  useEffect(() => {
    if (activeSession && !timeFilter) {
      setTimeFilter([
        dayjs(activeSession.dateDebut),
        dayjs(activeSession.dateFin)
      ])
    }
  }, [activeSession, timeFilter])

  // Récupérer toutes les opérations
  const { data: operationsData, isLoading: isLoadingOperations, refetch: refetchOperations } = useQuery({
    queryKey: [QUERY_KEYS.OPERATIONS, timeFilter],
    queryFn: () => timeFilter != null
      ? operationService.byPeriod(timeFilter[0].toISOString(), timeFilter[1].toISOString())
      : operationService.getAll(),
  })

  // Synchroniser les opérations avec le store (en dehors du render)
  useEffect(() => {
    if (operationsData) {
      operationActions.setOperations(operationsData);
    }
  }, [operationsData])

  // Récupérer tous les comptes
  const { data: comptes, isLoading: isLoadingComptes } = useQuery({
    queryKey: [QUERY_KEYS.COMPTES],
    queryFn: () => compteService.getAll(),
  })

  const isLoading = isLoadingOperations || isLoadingComptes || isLoadingSession

  // Séparer les opérations par type
  const recharges = ops?.filter((op: any) => op.type === 'RECHARGE') || []
  const utilisations = ops?.filter((op: any) => op.type === 'UTILISATION') || []
  const transferts = ops?.filter((op: any) => op.type === 'TRANSFERT') || []

  // Grouper les utilisations par service puis par ticket
  const utilisationsParService = utilisations.reduce((acc: any, op: Operation) => {
    const serviceId = op.serviceSnapshot?._id || 'sans-service'
    const serviceNom = op.serviceSnapshot?.nom || 'Sans service'
    const serviceType = op.serviceSnapshot?.type || 'autre'

    const ticketId = op.ticketSnapshot?._id || 'sans-ticket'
    const ticketNom = op.ticketSnapshot?.nom || 'Sans ticket'
    const ticketPrix = op.ticketSnapshot?.prix || 0

    if (!acc[serviceId]) {
      acc[serviceId] = {
        serviceId,
        serviceNom,
        serviceType,
        tickets: {},
        totalOperations: 0,
        totalMontant: 0
      }
    }

    if (!acc[serviceId].tickets[ticketId]) {
      acc[serviceId].tickets[ticketId] = {
        ticketId,
        ticketNom,
        ticketPrix,
        operations: [],
        total: 0,
        count: 0
      }
    }

    acc[serviceId].tickets[ticketId].operations.push(op)
    acc[serviceId].tickets[ticketId].total += op.montant || 0
    acc[serviceId].tickets[ticketId].count += 1
    acc[serviceId].totalOperations += 1
    acc[serviceId].totalMontant += op.montant || 0

    return acc
  }, {})

  const servicesAvecOperations = Object.values(utilisationsParService)
    .map((service: any) => ({
      ...service,
      tickets: Object.values(service.tickets).sort((a: any, b: any) => b.count - a.count)
    }))
    .sort((a: any, b: any) => b.totalOperations - a.totalOperations)

  // Calculer le solde global
  const soldeGlobal = comptes?.reduce((total: number, compte: any) => {
    return total + (compte.solde || 0)
  }, 0) || 0

  useEffect(() => {
    refetchOperations()
  }, [timeFilter, refetchOperations])

  // Filtres rapides
  const handleFilterToday = () => {
    setTimeFilter([dayjs().startOf('day'), dayjs().endOf('day')])
  }

  const handleFilterThisMonth = () => {
    setTimeFilter([dayjs().startOf('month'), dayjs().endOf('month')])
  }

  const handleFilterSession = () => {
    if (activeSession) {
      setTimeFilter([
        dayjs(activeSession.dateDebut),
        dayjs(activeSession.dateFin)
      ])
    }
  }

  return (
    <div className="controller-page space-y-6">
      {/* Hero Header */}
      <Card className="overflow-hidden border-border/60 shadow-none">
        <CardContent className="px-6 py-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            {/* Titre + statuts */}
            <div className="space-y-3">
              <div>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                  Tableau de bord
                </span>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                  Opérations
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Vue d'ensemble des transactions et statistiques
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeSession && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
                    <GraduationCap className="size-3.5" />
                    Session {activeSession.annee}
                  </span>
                )}
                <ConnectionPill connected={isConnected} />
              </div>
            </div>

            {/* RangePicker + filtres rapides */}
            <div className="flex flex-col gap-3 lg:items-end">
              <RangePicker
                onChange={(dates) => setTimeFilter(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                value={timeFilter}
                placeholder={['Début', 'Fin']}
                maxDate={dayjs().endOf('day')}
                showTime
              />
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Button variant="outline" size="sm" onClick={handleFilterToday} className="gap-1.5">
                  <CalendarDays className="size-3.5" />
                  Aujourd'hui
                </Button>
                <Button variant="outline" size="sm" onClick={handleFilterThisMonth} className="gap-1.5">
                  <CalendarRange className="size-3.5" />
                  Ce mois
                </Button>
                {activeSession && (
                  <Button variant="default" size="sm" onClick={handleFilterSession} className="gap-1.5">
                    <GraduationCap className="size-3.5" />
                    Session {activeSession.annee}
                  </Button>
                )}
              </div>
              {timeFilter && (
                <p className="text-xs font-medium text-muted-foreground lg:text-right">
                  {timeFilter[0].format('DD/MM/YYYY')} — {timeFilter[1].format('DD/MM/YYYY')}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Solde Global"
              value={formatMontant(soldeGlobal)}
              subtitle={`${comptes?.length || 0} comptes`}
              icon={<Wallet className="size-5" />}
              accent="blue"
            />
            <StatCard
              label="Total Recharges"
              value={recharges.length}
              subtitle={formatMontant(recharges.reduce((total: number, op: any) => total + (op.montant || 0), 0))}
              icon={<ArrowUpCircle className="size-5" />}
              accent="emerald"
            />
            <StatCard
              label="Total Utilisations"
              value={utilisations.length}
              subtitle={formatMontant(utilisations.reduce((total: number, op: any) => total + (op.montant || 0), 0))}
              icon={<ArrowDownCircle className="size-5" />}
              accent="amber"
            />
            <StatCard
              label="Total Transferts"
              value={transferts.length}
              subtitle={formatMontant(transferts.reduce((total: number, op: any) => total + (op.montant || 0), 0))}
              icon={<ArrowLeftRight className="size-5" />}
              accent="violet"
            />
          </>
        )}
      </div>

      {/* Visualisation des opérations par service et ticket */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : servicesAvecOperations.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Opérations d'Utilisation par Service
            </h3>
          </div>

          {servicesAvecOperations.map((serviceData: any) => {
            const maxTicketCount = Math.max(...serviceData.tickets.map((t: any) => t.count))

            return (
              <Card
                key={serviceData.serviceId}
                className="overflow-hidden border-border/60 shadow-none"
              >
                {/* Header du service — élégant et léger */}
                <div className="flex items-center justify-between gap-4 border-b border-border/60 bg-muted/40 px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                      <Building2 className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-bold text-foreground">
                        {serviceData.serviceNom}
                      </h4>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {serviceData.totalOperations} opérations
                        </span>
                        <span className="inline-flex items-center rounded-md bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                          {serviceData.tickets.length} ticket(s)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Total Service
                    </p>
                    <p className="text-xl font-bold tabular-nums text-foreground">
                      {formatMontant(serviceData.totalMontant)}
                    </p>
                  </div>
                </div>

                {/* Grille responsive des tickets */}
                <CardContent className="px-5 py-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {serviceData.tickets.map((ticketData: any) => {
                      const percentage = Math.round((ticketData.count / maxTicketCount) * 100)

                      return (
                        <div
                          key={ticketData.ticketId}
                          className={cn(
                            "group flex flex-col rounded-xl border border-border/60 bg-card p-4",
                            "transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-border"
                          )}
                        >
                          {/* Header du ticket */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                              <TicketIcon className="size-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="truncate text-sm font-semibold text-foreground cursor-help">
                                    {ticketData.ticketNom}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {ticketData.ticketNom}
                                </TooltipContent>
                              </Tooltip>
                              <p className="text-xs text-muted-foreground tabular-nums">
                                {formatMontant(ticketData.ticketPrix)} / unité
                              </p>
                            </div>
                          </div>

                          {/* Stats du ticket */}
                          <div className="space-y-3 flex-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-muted-foreground">Opérations</span>
                              <span className="inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground tabular-nums">
                                {ticketData.count}
                              </span>
                            </div>

                            {/* Barre de progression */}
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>

                            {/* Total */}
                            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/30">
                              <span className="text-xs font-medium text-muted-foreground">Total</span>
                              <span className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                {formatMontant(ticketData.total)}
                              </span>
                            </div>

                            {/* Dernières opérations (aperçu) */}
                            {ticketData.operations && ticketData.operations.length > 0 && (
                              <div className="pt-2 border-t border-border/60">
                                <p className="mb-2 text-xs font-medium text-muted-foreground">
                                  Dernières opérations
                                </p>
                                <div className="relative h-[120px] overflow-hidden">
                                  <AnimatedList delay={1500}>
                                    {ticketData.operations.slice(0, 5).map((op: Operation) => (
                                      <div
                                        key={op._id}
                                        className="flex items-center gap-2 p-2 mb-1 rounded-lg bg-muted/60 border border-border/60"
                                      >
                                        <Avatar className="size-6 shrink-0 border border-border">
                                          {op.compte?.etudiant?.avatar ? (
                                            <AvatarImage src={`${env.VITE_APP_BACKURL_ETUDIANT}/${op.compte.etudiant.avatar}`} />
                                          ) : null}
                                          <AvatarFallback className="text-[10px] font-semibold">
                                            {op.compte?.etudiant?.prenom?.[0]}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs truncate text-foreground">
                                            {op.compte?.etudiant?.prenom} {op.compte?.etudiant?.nom?.[0]}.
                                          </p>
                                        </div>
                                        <span className="shrink-0 text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                          {formatMontant(op.montant)}
                                        </span>
                                      </div>
                                    ))}
                                  </AnimatedList>
                                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : ops && ops.length === 0 ? (
        <Card className="border-dashed border-border/60 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <Inbox className="size-7 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">
              Aucune opération trouvée
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Aucune opération n'a été enregistrée pour la période sélectionnée.
              Modifiez les filtres pour élargir la recherche.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
