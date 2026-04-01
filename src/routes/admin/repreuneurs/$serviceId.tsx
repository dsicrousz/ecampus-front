import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ServiceService } from '@/services/service.service'
import { DecadeService } from '@/services/decade.service'
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
  component: RouteComponent,
})

function RouteComponent() {
  const {serviceId} = Route.useParams()
  const serviceService = new ServiceService()
  const decadeService = new DecadeService()
  const operationService = new OperationService()
  const [selectedDecade, setSelectedDecade] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: service } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => serviceService.getOne(serviceId),
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
    const prixRepreneur = op.serviceSnapshot?.prixRepreneur?.[ticketId!] || 0

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
    const prixRepreneur = op.serviceSnapshot?.prixRepreneur?.[ticketId!] || 0

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
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
          <CalendarOutlined style={{ color: '#1890ff' }} />
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
    <div className="space-y-6">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Space>
              <ShopOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Title level={4} style={{ margin: 0 }}>{service?.nom}</Title>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <CalendarOutlined style={{ fontSize: 20 }} />
            <span>Liste des Décades</span>
          </Space>
        }
      >
        <Table
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
        width={1200}
        footer={[
          <Button 
            key="download" 
            type="primary" 
            icon={<DownloadOutlined />}
            disabled={!operations?.length}
            onClick={() => {
              // TODO: Implement PDF generation
              console.log('Generate PDF')
            }}
          >
            Générer la facture
          </Button>
        ]}
      >
        <div className="space-y-4">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card>
                <Statistic 
                  title="Nombre d'opérations"
                  value={totalOperations}
                  prefix={<FileTextOutlined />}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card>
                <Statistic
                  title="Montant total"
                  value={totalAmount}
                  suffix="FCFA"
                  prefix={<DollarOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <div className="space-y-4">
            <Card>
              <Row gutter={[16, 16]}>
                {Object.values(ticketStats || {}).map((stat: any) => (
                  <Col key={stat.nom} span={8}>
                    <Card size="small">
                      <Statistic
                        title={
                          <Space>
                            <Tag color="green">{stat.nom}</Tag>
                            <span>{stat.count} utilisation(s)</span>
                          </Space>
                        }
                        value={stat.montant}
                        suffix="FCFA"
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>

            <Table
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
          </div>
        </div>
      </Modal>
    </div>
  )
}
