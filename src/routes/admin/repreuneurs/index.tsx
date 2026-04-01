import { createFileRoute, useNavigate } from '@tanstack/react-router'
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
  Spin
} from 'antd'
import { 
  ShopOutlined,
  EnvironmentOutlined,
  ArrowRightOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Service } from '@/types/service'

const { Title } = Typography

export const Route = createFileRoute('/admin/repreuneurs/')({
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
      <Card>
        <Empty 
          description="Vous n'êtes gérant d'aucun service"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    )
  }

  return (
    <Card
      title={
        <Space>
          <ShopOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0 }}>Mes Services</Title>
        </Space>
      }
    >
      <Table
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
  )
}
