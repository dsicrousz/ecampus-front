import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { requireRole } from '@/lib/route-protection';
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/auth/auth-client'
import { RestaurantService } from '@/services/restaurant.service'
import { 
  Card, 
  Table, 
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
import type { Restaurant } from '@/types/restaurant'
import { USER_ROLE } from '@/types/user.roles'

const { Title, Text } = Typography

export const Route = createFileRoute('/admin/repreuneurs/')({
  beforeLoad: () => requireRole([USER_ROLE.REPREUNEUR, USER_ROLE.SUPERADMIN]),
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { data: sessionData } = useSession()
  const restaurantService = new RestaurantService()

  // Récupérer les restaurants du repreneur
  const { data: restaurants, isLoading } = useQuery({
    queryKey: ['restaurants', sessionData?.user?.id],
    queryFn: () => restaurantService.byRepreneur(sessionData?.user?.id!),
    enabled: !!sessionData?.user?.id
  })

  const columns: ColumnsType<Restaurant> = [
    {
      title: 'Restaurant',
      key: 'nom',
      render: (_, record) => (
        <Space>
          <ShopOutlined className="text-sky-600" />
          <span>{record.nom}</span>
        </Space>
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
      <div className="controller-page">
        <div className="flex items-center justify-center min-h-[400px]">
          <Spin size="large" />
        </div>
      </div>
    )
  }

  if (!restaurants?.length) {
    return (
      <div className="controller-page">
        <Card className="controller-panel">
          <Empty
            description="Vous n'êtes repreneur d'aucun restaurant"
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
          <Card className="controller-hero controller-hero-soft border">
            <Row gutter={[24, 16]} align="middle" wrap>
              <Col flex="none">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <ShopOutlined style={{ fontSize: 28 }} />
                </div>
              </Col>
              <Col flex="auto">
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Gestion
                </Text>
                <Title level={3} className="mb-1! mt-1! text-foreground!">
                  Mes Restaurants
                </Title>
                <Text type="secondary">
                  Restaurants dont vous êtes gérant
                </Text>
              </Col>
              <Col flex="none">
                <div className="min-w-[220px] rounded-2xl border border-border bg-muted px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Total
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {restaurants?.length || 0}
                  </p>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Table */}
          <Card className="controller-panel" title={<span className="text-foreground font-semibold">Liste des Restaurants</span>}>
            <Table
              className="controller-table"
              columns={columns}
              dataSource={restaurants}
              rowKey="_id"
              pagination={{
                defaultPageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total: ${total} restaurant(s)`
              }}
            />
          </Card>
        </Space>
      </Spin>
    </div>
  )
}
