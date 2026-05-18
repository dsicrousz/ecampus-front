import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { requireRole } from '@/lib/route-protection';
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/auth/auth-client'
import { ServiceService } from '@/services/service.service'
import { 
  Card, 
  Table, 
  Tag, 
  Space, 
  Typography,
  Button,
  Empty,
  Spin,
  Row,
  Col
} from 'antd'
import { 
  ShopOutlined,
  EnvironmentOutlined,
  ArrowRightOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Service } from '@/types/service'
import { USER_ROLE } from '@/types/user.roles'

const { Title, Text } = Typography

export const Route = createFileRoute('/admin/repreuneurs/')({
  beforeLoad: () => requireRole([USER_ROLE.REPREUNEUR, USER_ROLE.SUPERADMIN]),
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { data: sessionData } = useSession()
  const serviceService = new ServiceService()

  // Récupérer les services du repreneur
  const { data: services, isLoading } = useQuery({
    queryKey: ['services', sessionData?.user?.id],
    queryFn: () => serviceService.byGerant(sessionData?.user?.id!),
    enabled: !!sessionData?.user?.id
  })

  const columns: ColumnsType<Service> = [
    {
      title: 'Service',
      key: 'nom',
      render: (_, record) => (
        <Space>
          <ShopOutlined style={{ color: '#1890ff' }} />
          <span>{record.nom}</span>
        </Space>
      )
    },
    {
      title: 'Type',
      key: 'type',
      dataIndex: 'typeService',
      render: (type: string) => (
        <Tag color="blue">{type}</Tag>
      )
    },
    {
      title: 'Localisation',
      key: 'localisation',
      render: (_, record) => (
        <Space>
          <EnvironmentOutlined />
          <span>{record.localisation || 'Non spécifiée'}</span>
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          type="primary"
          icon={<ArrowRightOutlined />}
          onClick={() => navigate({ to: '/admin/repreuneurs/$serviceId', params: { serviceId: record._id } })}
        >
          Gérer
        </Button>
      )
    }
  ]

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!services?.length) {
    return (
      <div className="controller-page">
        <Card className="controller-panel">
          <Empty 
            description="Vous n'êtes gérant d'aucun service"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="controller-page">
      <Spin spinning={isLoading}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          {/* Hero Header */}
          <Card className="controller-hero controller-hero-soft border-0 shadow-xl">
            <Row gutter={[24, 16]} align="middle" wrap>
              <Col flex="none">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <ShopOutlined style={{ fontSize: 28 }} />
                </div>
              </Col>
              <Col flex="auto">
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Gestion
                </Text>
                <Title level={3} className="mb-1! mt-1! text-slate-900!">
                  Mes Services
                </Title>
                <Text type="secondary">
                  Services dont vous êtes gérant
                </Text>
              </Col>
              <Col flex="none">
                <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Total
                  </p>
                  <p className="text-3xl font-bold text-slate-900">
                    {services?.length || 0}
                  </p>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Table */}
          <Card className="controller-panel" title={<span className="text-slate-900 font-semibold">Liste des Services</span>}>
            <Table
              className="controller-table"
              columns={columns}
              dataSource={services}
              rowKey="_id"
              pagination={{
                defaultPageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total: ${total} service(s)`
              }}
            />
          </Card>
        </Space>
      </Spin>
    </div>
  )
}
