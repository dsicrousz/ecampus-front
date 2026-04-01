import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, memo } from "react"
import { useQuery } from '@tanstack/react-query'
import { Spin, DatePicker, Button, Space, Tag, Card, Row, Col, Typography, Statistic, Avatar, Badge, Tooltip, Progress } from "antd"
import { ArrowDownOutlined, ArrowUpOutlined, DollarOutlined, SwapOutlined } from '@ant-design/icons'
import { FaTicketAlt, FaCheckCircle, FaClock, FaMoneyBillWave } from 'react-icons/fa'
import dayjs from '@/config/dayjs.config'
import { OperationService } from '@/services/operation.service'
import { CompteService } from '@/services/compte.service'
import { SessionService } from '@/services/session.service'
import { AnimatedList } from '@/components/ui/animated-list'
import type { Operation } from '@/types/operation'
import { env } from '@/env'
import { cn } from '@/lib/utils'
import { QUERY_KEYS } from '@/constants'
import { Socket, io } from "socket.io-client";
import { useValue } from "@legendapp/state/react"
import { store$, operationActions } from '@/lib/operationStore'

const { RangePicker } = DatePicker
const { Title, Text } = Typography

// Événements WebSocket pour les opérations
const SOCKET_EVENTS = {
  OPERATION_CREATED: 'operation_created',
  OPERATION_UPDATED: 'operation_updated',
  OPERATION_DELETED: 'operation_deleted',
  OPERATION_UPDATE: 'operation_update', // Legacy event
} as const;

export const Route = createFileRoute('/admin/')({
  loader: () => {
    const socket = io(env.VITE_APP_BACKEND);
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

// Composant mémoïsé pour afficher une opération (défini en dehors pour éviter les re-renders)
const OperationNotification = memo(({ operation }: { operation: Operation }) => {
  return (
    <figure
      className={cn(
        "relative mx-auto min-h-fit w-full max-w-[400px] cursor-pointer overflow-hidden rounded-xl p-4",
        "transition-all duration-300 ease-in-out hover:scale-[102%] hover:shadow-lg",
        "bg-linear-to-br from-white to-blue-50 border border-blue-100",
        "dark:from-gray-800 dark:to-gray-900 dark:border-gray-700"
      )}
    >
      <div className="flex flex-row items-center gap-4">
        <div className="relative">
          <Avatar 
            src={operation.compte?.etudiant?.avatar ? `${env.VITE_APP_BACKURL_ETUDIANT}/${operation.compte.etudiant.avatar}` : undefined} 
            size={56} 
            className="border-2 border-blue-400 shadow-md"
          />
          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
            <FaCheckCircle className="text-white text-xs" />
          </div>
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-base font-semibold text-gray-800 dark:text-white truncate">
              {operation.compte?.etudiant?.prenom} {operation.compte?.etudiant?.nom}
            </span>
            <Badge 
              count={operation.type} 
              style={{ backgroundColor: '#52c41a' }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
            <FaClock className="text-blue-500" />
            <span>{dayjs(operation.createdAt).format('DD/MM/YYYY HH:mm')}</span>
          </div>
          <div className="flex items-center gap-1">
            <FaMoneyBillWave className="text-green-600" />
            <span className="text-lg font-bold text-green-600">
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
  const socket:Socket = Route.useLoaderData();
  const [timeFilter, setTimeFilter] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const operationService = new OperationService()
  const compteService = new CompteService()
  const sessionService = new SessionService()

  const ops = useValue(store$.operations)
  const isConnected = useValue(store$.isConnected)

  // Gestion WebSocket temps réel
  useEffect(() => {
    if (!socket) return;

    // Handlers pour les événements
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
    };

    const handleDisconnect = () => {
      operationActions.setConnected(false);
    };

    // Enregistrer les listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on(SOCKET_EVENTS.OPERATION_CREATED, handleOperationCreated);
    socket.on(SOCKET_EVENTS.OPERATION_UPDATED, handleOperationUpdated);
    socket.on(SOCKET_EVENTS.OPERATION_DELETED, handleOperationDeleted);
    socket.on(SOCKET_EVENTS.OPERATION_UPDATE, handleOperationCreated); // Legacy support

    // Vérifier l'état initial de connexion
    if (socket.connected) {
      operationActions.setConnected(true);
    }

    // Cleanup: retirer les listeners au démontage
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off(SOCKET_EVENTS.OPERATION_CREATED, handleOperationCreated);
      socket.off(SOCKET_EVENTS.OPERATION_UPDATED, handleOperationUpdated);
      socket.off(SOCKET_EVENTS.OPERATION_DELETED, handleOperationDeleted);
      socket.off(SOCKET_EVENTS.OPERATION_UPDATE, handleOperationCreated);
    };
  }, [socket]);

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
    const serviceType = op.serviceSnapshot?.typeService || 'autre'
    
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
      <Spin spinning={isLoading}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          {/* Header */}
          <Card style={{ background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)' }}>
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <Title level={3} style={{ margin: 0, color: '#0050b3' }}>
                    📊 Tableau de Bord - Opérations
                  </Title>
                  <Text type="secondary">
                    Vue d'ensemble des transactions et statistiques
                  </Text>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {activeSession && (
                      <Tag color="success">
                        📅 Session Active: {activeSession.annee}
                      </Tag>
                    )}
                    <Tag color={isConnected ? 'green' : 'red'}>
                      {isConnected ? '🟢 Temps réel actif' : '🔴 Hors ligne'}
                    </Tag>
                  </div>
                </div>
                
                <RangePicker 
                  onChange={(dates) => setTimeFilter(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)} 
                  value={timeFilter} 
                  placeholder={['Début', 'Fin']} 
                  maxDate={dayjs().endOf('day')} 
                  showTime 
                />
              </div>

              {/* Filtres rapides */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <Text strong style={{ color: '#595959' }}>
                  Filtres rapides:
                </Text>
                <Space size="small">
                  <Button 
                    type="default" 
                    size="small"
                    onClick={handleFilterToday}
                  >
                    📅 Aujourd'hui
                  </Button>
                  <Button 
                    type="default" 
                    size="small"
                    onClick={handleFilterThisMonth}
                  >
                    📆 Ce mois
                  </Button>
                  {activeSession && (
                    <Button 
                      type="primary" 
                      size="small"
                      onClick={handleFilterSession}
                    >
                      🎓 Session {activeSession.annee}
                    </Button>
                  )}
                </Space>
                {timeFilter && (
                  <Tag color="blue">
                    {timeFilter[0].format('DD/MM/YYYY')} - {timeFilter[1].format('DD/MM/YYYY')}
                  </Tag>
                )}
              </div>
            </Space>
          </Card>

          {/* Statistiques principales */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Solde Global"
                  value={soldeGlobal}
                  formatter={(value) => formatMontant(value as number)}
                  prefix={<DollarOutlined />}
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {comptes?.length || 0} comptes
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Total Recharges"
                  value={recharges.length}
                  prefix={<ArrowUpOutlined />}
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {formatMontant(recharges.reduce((total: number, op: any) => total + (op.montant || 0), 0))}
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Total Utilisations"
                  value={utilisations.length}
                  prefix={<ArrowDownOutlined />}
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {formatMontant(utilisations.reduce((total: number, op: any) => total + (op.montant || 0), 0))}
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Total Transferts"
                  value={transferts.length}
                  prefix={<SwapOutlined />}
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {formatMontant(transferts.reduce((total: number, op: any) => total + (op.montant || 0), 0))}
                </Text>
              </Card>
            </Col>
          </Row>

          {/* Visualisation des opérations par service et ticket */}
          {servicesAvecOperations.length > 0 && (
            <div className="space-y-6">
              <Title level={4} className="mb-4">
                📊 Opérations d'Utilisation par Service
              </Title>
              
              {servicesAvecOperations.map((serviceData: any) => {
                const maxTicketCount = Math.max(...serviceData.tickets.map((t: any) => t.count))
                
                return (
                  <Card 
                    key={serviceData.serviceId}
                    className="shadow-lg border-0 overflow-hidden"
                    styles={{ 
                      header: { 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderBottom: 'none'
                      }
                    }}
                    title={
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-4">
                          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                            <span className="text-3xl">
                              {serviceData.serviceType === 'restaurant' ? '🍴' : 
                               serviceData.serviceType === 'transport' ? '🚌' : 
                               serviceData.serviceType === 'hebergement' ? '🏠' : '🏫'}
                            </span>
                          </div>
                          <div>
                            <Text strong className="text-xl text-white block">{serviceData.serviceNom}</Text>
                            <div className="flex items-center gap-2 mt-1">
                              <Tag color="blue" className="m-0">{serviceData.totalOperations} opérations</Tag>
                              <Tag color="purple" className="m-0">{serviceData.tickets.length} ticket(s)</Tag>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-white/70">Total Service</div>
                          <div className="text-2xl font-bold text-white">
                            {formatMontant(serviceData.totalMontant)}
                          </div>
                        </div>
                      </div>
                    }
                  >
                    {/* Grille responsive des tickets */}
                    <Row gutter={[16, 16]}>
                      {serviceData.tickets.map((ticketData: any) => {
                        const percentage = Math.round((ticketData.count / maxTicketCount) * 100)
                        
                        return (
                          <Col xs={24} sm={12} lg={8} xl={6} key={ticketData.ticketId}>
                            <Card
                              className={cn(
                                "h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                                "bg-linear-to-br from-white to-gray-50 border border-gray-100"
                              )}
                              styles={{ body: { padding: '16px' } }}
                            >
                              {/* Header du ticket */}
                              <div className="flex items-center gap-3 mb-4">
                                <div className="bg-linear-to-br from-green-400 to-green-600 p-2.5 rounded-xl shadow-md">
                                  <FaTicketAlt className="text-white text-lg" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <Tooltip title={ticketData.ticketNom}>
                                    <Text strong className="text-base block truncate">
                                      {ticketData.ticketNom}
                                    </Text>
                                  </Tooltip>
                                  <Text type="secondary" className="text-xs">
                                    {formatMontant(ticketData.ticketPrix)} / unité
                                  </Text>
                                </div>
                              </div>

                              {/* Stats du ticket */}
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <Text type="secondary" className="text-sm">Opérations</Text>
                                  <Badge 
                                    count={ticketData.count} 
                                    style={{ backgroundColor: '#1677ff' }}
                                    overflowCount={9999}
                                  />
                                </div>
                                
                                <Progress 
                                  percent={percentage} 
                                  size="small" 
                                  strokeColor={{
                                    '0%': '#667eea',
                                    '100%': '#764ba2',
                                  }}
                                  showInfo={false}
                                />

                                <div className="bg-linear-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <FaMoneyBillWave className="text-green-500" />
                                      <Text type="secondary" className="text-xs">Total</Text>
                                    </div>
                                    <Text strong className="text-lg text-green-600">
                                      {formatMontant(ticketData.total)}
                                    </Text>
                                  </div>
                                </div>

                                {/* Dernières opérations (aperçu) */}
                                {ticketData.operations && ticketData.operations.length > 0 && (
                                  <div className="pt-2 border-t border-gray-100">
                                    <Text type="secondary" className="text-xs mb-2 block">Dernières opérations</Text>
                                    <div className="relative h-[120px] overflow-hidden">
                                      <AnimatedList delay={1500}>
                                        {ticketData.operations.slice(0, 5).map((op: Operation) => (
                                          <div 
                                            key={op._id}
                                            className="flex items-center gap-2 p-2 mb-1 rounded-lg bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-100"
                                          >
                                            <Avatar 
                                              src={op.compte?.etudiant?.avatar ? `${env.VITE_APP_BACKURL_ETUDIANT}/${op.compte.etudiant.avatar}` : undefined}
                                              size={24}
                                              className="border border-white shadow-sm shrink-0"
                                            >
                                              {op.compte?.etudiant?.prenom?.[0]}
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                              <Text className="text-xs truncate block">
                                                {op.compte?.etudiant?.prenom} {op.compte?.etudiant?.nom?.[0]}.
                                              </Text>
                                            </div>
                                            <Text strong className="text-xs text-green-600 shrink-0">
                                              {formatMontant(op.montant)}
                                            </Text>
                                          </div>
                                        ))}
                                      </AnimatedList>
                                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-white to-transparent"></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </Card>
                          </Col>
                        )
                      })}
                    </Row>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Message si pas de données */}
          {ops && ops.length === 0 && (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">
                  Aucune opération trouvée pour la période sélectionnée
                </Text>
              </div>
            </Card>
          )}
        </Space>
      </Spin>
  )
}
