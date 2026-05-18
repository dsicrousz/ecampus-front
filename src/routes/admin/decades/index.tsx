import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/route-protection';
import { useQuery } from "@tanstack/react-query";
import { Spin, Table, Space, Card, Typography, Tag, Row, Col } from "antd";
import { CalendarOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { DecadeService } from "@/services/decade.service";
import type { Decade } from "@/types/decade";
import type { ColumnsType } from "antd/es/table";
import dayjs from '@/config/dayjs.config'
import { USER_ROLE } from '@/types/user.roles';

const { Title, Text } = Typography;

export const Route = createFileRoute('/admin/decades/')({
  beforeLoad: () => requireRole([USER_ROLE.CHEF_RESTAURANT, USER_ROLE.SUPERADMIN]),
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
    <div className="controller-page">
      <Spin spinning={isLoading}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          {/* Hero Header */}
          <Card className="controller-hero controller-hero-soft border-0 shadow-xl">
            <Row gutter={[24, 16]} align="middle" wrap>
              <Col flex="none">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <CalendarOutlined style={{ fontSize: 28 }} />
                </div>
              </Col>
              <Col flex="auto">
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Périodes
                </Text>
                <Title level={3} className="mb-1! mt-1! text-slate-900!">
                  Décades
                </Title>
                <Text type="secondary">
                  Gérez les périodes académiques
                </Text>
              </Col>
              <Col flex="none">
                <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Total
                  </p>
                  <p className="text-3xl font-bold text-slate-900">
                    {decades?.length || 0}
                  </p>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Table */}
          <Card className="controller-panel" title={<span className="text-slate-900 font-semibold">Liste des Décades</span>}>
            <Table
              className="controller-table"
              columns={columns}
              dataSource={decades}
              rowKey="_id"
              loading={isLoading}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                showQuickJumper: true,
                showTotal: (total) => `${total} décades`,
              }}
            />
          </Card>
        </Space>
      </Spin>
    </div>
  )
}
