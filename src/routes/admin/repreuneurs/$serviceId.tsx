import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { RestaurantService } from '@/services/restaurant.service'
import { DecadeService } from '@/services/decade.service'
import { requireRole } from '@/lib/route-protection'
import { USER_ROLE } from '@/types/user.roles'
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Space, 
  Table, 
  Tag, 
  Button,
  Statistic,
  Spin,
  Modal
} from 'antd'
import { 
  ShopOutlined, 
  CalendarOutlined,
  FileTextOutlined,
  DollarOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Operation } from '@/types/operation'
import type { Decade } from '@/types/decade'
import dayjs from '@/config/dayjs.config'
import { useState } from 'react'
import { OperationService } from '@/services/operation.service'
import { QUERY_KEYS } from '@/constants'

const { Title, Text } = Typography

export const Route = createFileRoute('/admin/repreuneurs/$serviceId')({
  beforeLoad: () => requireRole([USER_ROLE.REPREUNEUR, USER_ROLE.SUPERADMIN]),
  component: RouteComponent,
})

function RouteComponent() {
  const {serviceId} = Route.useParams()
  const restaurantService = new RestaurantService()
  const decadeService = new DecadeService()
  const operationService = new OperationService()
  const [selectedDecade, setSelectedDecade] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: service } = useQuery({
    queryKey: ['restaurant', serviceId],
    queryFn: () => restaurantService.getOne(serviceId),
    enabled: !!serviceId
  })

  // Récupérer toutes les décades
  const { data: decades, isLoading: isLoadingDecades } = useQuery({
    queryKey: [QUERY_KEYS.DECADES],
    queryFn: () => decadeService.getAll(),
  })

  // Récupérer les opérations de la décade sélectionnée
  const { data: operations, isLoading: isLoadingOperations } = useQuery({
    queryKey: ['operations', selectedDecade, serviceId],
    queryFn: () => operationService.byDecadeAndService(selectedDecade!, serviceId!),
    enabled: !!selectedDecade && !!serviceId
  })

  // Grouper les opérations par date et par ticket
  const groupedOperations = operations?.reduce((acc: any, op: Operation) => {
    const date = dayjs(op.createdAt).format('DD/MM/YYYY')
    const ticketId = op.ticketSnapshot?._id
    const ticketNom = op.ticketSnapshot?.nom
    const prixRepreneur = op.ticketSnapshot?.prix || 0

    if (!acc[date]) {
      acc[date] = {
        date,
        tickets: {},
        totalJour: 0
      }
    }

    if (!acc[date].tickets[ticketId!]) {
      acc[date].tickets[ticketId!] = {
        nom: ticketNom,
        count: 0,
        montant: 0
      }
    }

    acc[date].tickets[ticketId!].count++
    acc[date].tickets[ticketId!].montant += prixRepreneur
    acc[date].totalJour += prixRepreneur

    return acc
  }, {})

  const summaryData = Object.entries(groupedOperations || {}).map(([date, data]: [string, any]) => ({
    date,
    ...data,
    ticketDetails: Object.values(data.tickets)
  }))

  const columns: ColumnsType<any> = [
    {
      title: 'Date',
      key: 'date',
      dataIndex: 'date',
      render: (date: string) => (
        <Tag icon={<CalendarOutlined />} color="blue">
          {date}
        </Tag>
      )
    },
    {
      title: 'Détails des tickets',
      key: 'tickets',
      render: (_, record) => (
        <Space orientation="vertical">
          {record.ticketDetails.map((ticket: any) => (
            <Space key={ticket.nom}>
              <Tag color="green">{ticket.nom}</Tag>
              <Text>{ticket.count} utilisation(s)</Text>
              <Text strong>{ticket.montant.toLocaleString('fr-FR')} FCFA</Text>
            </Space>
          ))}
        </Space>
      )
    },
    {
      title: 'Total du jour',
      key: 'totalJour',
      align: 'right',
      render: (_, record) => (
        <Text strong style={{ fontSize: 16 }}>
          {record.totalJour.toLocaleString('fr-FR')} FCFA
        </Text>
      )
    }
  ]

  // Calculer les statistiques par ticket
  const ticketStats = operations?.reduce((acc: any, op: Operation) => {
    const ticketId = op.ticketSnapshot?._id
    const ticketNom = op.ticketSnapshot?.nom
    const prixRepreneur = op.ticketSnapshot?.prix || 0

    if (!acc[ticketId!]) {
      acc[ticketId!] = {
        nom: ticketNom,
        count: 0,
        montant: 0
      }
    }

    acc[ticketId!].count++
    acc[ticketId!].montant += prixRepreneur

    return acc
  }, {})

  const totalOperations = operations?.length || 0
  const totalAmount = Object.values(ticketStats || {}).reduce((acc: number, stat: any) => acc + stat.montant, 0)

  if (isLoadingDecades || isLoadingOperations) {
    return (
      <div className="controller-page">
        <div className="flex items-center justify-center min-h-[400px]">
          <Spin size="large" />
        </div>
      </div>
    )
  }


  const decadeColumns: ColumnsType<Decade> = [
    {
      title: 'Nom',
      dataIndex: 'nom',
      key: 'nom',
      render: (nom: string) => (
        <Space>
          <CalendarOutlined className="text-sky-600" />
          <span>{nom}</span>
        </Space>
      )
    },
    {
      title: 'Période',
      key: 'periode',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text type="secondary">Du: {dayjs(record.dateDebut).format("DD/MM/YYYY")}</Typography.Text>
          <Typography.Text type="secondary">Au: {dayjs(record.dateFin).format("DD/MM/YYYY")}</Typography.Text>
        </Space>
      )
    },
    {
      title: 'Session',
      key: 'session',
      render: (_, record) => (
        <Tag color="blue">{record.session.annee}</Tag>
      )
    },
    {
      title: 'Statut',
      key: 'active',
      render: (_, record) => (
        <Tag color={record.active ? 'success' : 'default'}>
          {record.active ? (
            <Space>
              <CheckCircleOutlined />
              <span>Active</span>
            </Space>
          ) : (
            <Space>
              <ClockCircleOutlined />
              <span>Terminée</span>
            </Space>
          )}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          type="primary" 
          onClick={() => {
            setSelectedDecade(record._id)
            setIsModalOpen(true)
          }}
          icon={<FileTextOutlined />}
        >
          Voir les opérations
        </Button>
      )
    }
  ]

  return (
    <div className="controller-page">
      <Spin spinning={isLoadingDecades}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          {/* Hero Header */}
          <Card className="controller-hero controller-hero-soft border">
            <Row gutter={[24, 16]} align="middle" wrap>
              <Col flex="none">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <ShopOutlined style={{ fontSize: 28 }} />
                </div>
              </Col>
              <Col flex="auto">
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Restaurant
                </Text>
                <Title level={3} className="mb-1! mt-1! text-foreground!">
                  {service?.nom}
                </Title>
                <Text type="secondary">
                  Gérez les décades et opérations
                </Text>
              </Col>
            </Row>
          </Card>

          {/* Décades Table */}
          <Card className="controller-panel" title={<span className="text-foreground font-semibold">Liste des Décades</span>}>
            <Table
              className="controller-table"
              columns={decadeColumns}
              dataSource={decades}
              rowKey="_id"
              loading={isLoadingDecades}
              pagination={{
                defaultPageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total: ${total} décades`
              }}
            />
          </Card>
        </Space>
      </Spin>

      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ fontSize: 20 }} />
            <span>
              Opérations - {decades?.find(d => d._id === selectedDecade)?.nom}
            </span>
          </Space>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width="95%"
        style={{ maxWidth: 1200 }}
        centered
        footer={null}
      >
        <div className="space-y-4">
          {/* Stats */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Card className="controller-stat-card" size="small">
                <Statistic
                  title={<span className="text-primary font-medium">Nombre d'opérations</span>}
                  value={totalOperations}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#0ea5e9', fontSize: '1.75rem', fontWeight: 800 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card className="controller-stat-card" size="small">
                <Statistic
                  title={<span className="text-emerald-700 font-medium">Montant total</span>}
                  value={totalAmount}
                  suffix="FCFA"
                  prefix={<DollarOutlined />}
                  valueStyle={{ color: '#16a34a', fontSize: '1.75rem', fontWeight: 800 }}
                />
              </Card>
            </Col>
          </Row>

          {/* Ticket stats */}
          {Object.keys(ticketStats || {}).length > 0 && (
            <Row gutter={[16, 16]}>
              {Object.values(ticketStats || {}).map((stat: any) => (
                <Col xs={24} sm={8} key={stat.nom}>
                  <Card className="controller-stat-card" size="small">
                    <Statistic
                      title={
                        <Space>
                          <Tag color="green">{stat.nom}</Tag>
                          <span>{stat.count} utilisation(s)</span>
                        </Space>
                      }
                      value={stat.montant}
                      suffix="FCFA"
                      valueStyle={{ color: '#16a34a', fontWeight: 700 }}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          )}

          {/* Operations table */}
          <Table
            className="controller-table"
            columns={columns}
            dataSource={summaryData}
            rowKey="date"
            loading={isLoadingOperations}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total: ${total} jours`
            }}
          />

          <div className="flex justify-end">
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              disabled={!operations?.length}
              onClick={() => {
                console.log('Generate PDF')
              }}
            >
              Générer la facture
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
