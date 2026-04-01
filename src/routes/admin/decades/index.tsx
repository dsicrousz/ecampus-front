import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { 
  Card, 
  Table, 
  Tag, 
  Space, 
  Typography
} from 'antd'
import { 
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { DecadeService } from '@/services/decade.service'
import type { Decade } from '@/types/decade'
import dayjs from '@/config/dayjs.config'

const { Title } = Typography

export const Route = createFileRoute('/admin/decades/')({
  component: RouteComponent,
})

function RouteComponent() {
  const decadeService = new DecadeService()

  const { data: decades, isLoading } = useQuery({
    queryKey: ['decades'],
    queryFn: () => decadeService.getAll()
  })

  const columns: ColumnsType<Decade> = [
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
      title: 'Référence',
      dataIndex: 'reference',
      key: 'reference',
    },
    {
      title: 'Période',
      key: 'periode',
      render: (_, record) => (
        <Space orientation="vertical" size={2}>
          <Typography.Text type="secondary">Du: {dayjs(record.dateDebut).format('DD/MM/YYYY')}</Typography.Text>
          <Typography.Text type="secondary">Au: {dayjs(record.dateFin).format('DD/MM/YYYY')}</Typography.Text>
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
        <Tag color={record.active ? 'success' : 'error'}>
          {record.active ? (
            <Space>
              <CheckCircleOutlined />
              <span>Active</span>
            </Space>
          ) : (
            <Space>
              <CloseCircleOutlined />
              <span>Inactive</span>
            </Space>
          )}
        </Tag>
      )
    }
  ]

  return (
    <Card
      title={
        <Space>
          <CalendarOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0 }}>Gestion des Décades</Title>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={decades}
        loading={isLoading}
        rowKey="_id"
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total: ${total} décades`
        }}
      />
    </Card>
  )
}
