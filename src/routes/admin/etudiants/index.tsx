import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { requireRole } from '@/lib/route-protection';
import { useQuery } from "@tanstack/react-query";
import { Spin, Table, Space, Card, Avatar, Typography, Row, Col, Statistic, Button } from "antd";
import { SearchOutlined, UserOutlined } from "@ant-design/icons";
import { EtudiantService } from "@/services/etudiant.service";
import type { Etudiant } from "@/types/etudiant";
import type { ColumnsType, TableProps } from "antd/es/table";
import { env } from "@/env";
import dayjs from '@/config/dayjs.config'
import { USER_ROLE } from '@/types/user.roles'
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/pagination-controls';

const { Title, Text } = Typography;

export const Route = createFileRoute('/admin/etudiants/')({
  beforeLoad: () => requireRole([USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN]),
  component: RouteComponent,
})

function RouteComponent() {
  const goTo = useNavigate()
  const etudiantService = new EtudiantService()

  const pagination = usePagination({
    initialPage: 1,
    initialLimit: 15,
    initialSortBy: 'createdAt',
    initialSortOrder: 'desc',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['etudiants', 'paginated', pagination.params],
    queryFn: () => etudiantService.getPaginated(pagination.params),
  })

  const etudiants = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleTableChange: TableProps<Etudiant>['onChange'] = (_pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    if (!s || !s.order) {
      pagination.setSort('createdAt', 'desc');
      return;
    }
    const field = String(s.field ?? s.columnKey ?? 'createdAt');
    pagination.setSort(field, s.order === 'ascend' ? 'asc' : 'desc');
  };

  const columns: ColumnsType<Etudiant> = [
    {
      title: 'Date de Création',
      dataIndex: 'createdAt',
      key: 'createdAt',
      align: 'center' as const,
      render: (createdAt: string) => dayjs(createdAt).format('DD/MM/YYYY'),
      sorter: true,
      sortOrder: pagination.sortBy === 'createdAt' ? (pagination.sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
    },
    {
      title: 'Photo',
      dataIndex: 'avatar',
      key: 'avatar',
      align: 'center' as const,
      render: (avatar: string) => (
        <Avatar
          size={64}
          src={avatar ? `${env.VITE_R2_URL}/${avatar}` : undefined}
          icon={<UserOutlined />}
        />
      ),
    },
    {
      title: 'Prénom',
      dataIndex: 'prenom',
      key: 'prenom',
      align: 'center' as const,
      sorter: true,
      sortOrder: pagination.sortBy === 'prenom' ? (pagination.sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
    },
    {
      title: 'Nom',
      dataIndex: 'nom',
      key: 'nom',
      align: 'center' as const,
      sorter: true,
      sortOrder: pagination.sortBy === 'nom' ? (pagination.sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
    },
    {
      title: 'N° SOCIALE',
      dataIndex: 'ncs',
      key: 'ncs',
      align: 'center' as const,
      sorter: true,
      sortOrder: pagination.sortBy === 'ncs' ? (pagination.sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      render: (_: any, record: Etudiant) => (
        <Space>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={() => goTo({ to: '/admin/etudiants/$etudiantId', params: { etudiantId: record._id } })}
          >
            Voir
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="controller-page">
      <Spin spinning={isLoading}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          {/* Hero Header */}
          <Card className="controller-hero controller-hero-soft border">
            <Row gutter={[24, 16]} align="middle" wrap>
              <Col flex="none">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <UserOutlined style={{ fontSize: 28 }} />
                </div>
              </Col>
              <Col flex="auto">
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Utilisateurs
                </Text>
                <Title level={3} className="mb-1! mt-1! text-foreground!">
                  Étudiants
                </Title>
                <Text type="secondary">
                  Gérez les étudiants et leurs informations
                </Text>
              </Col>
            </Row>
          </Card>

          {/* Statistiques */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Card className="controller-stat-card" size="small">
                <Statistic
                  title={<span className="text-primary font-medium">Total Étudiants</span>}
                  value={total}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#0ea5e9', fontSize: '1.75rem', fontWeight: 800 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card className="controller-stat-card" size="small">
                <Statistic
                  title={<span className="text-orange-700 font-medium">Page actuelle</span>}
                  value={pagination.page}
                  suffix={`/ ${Math.max(1, totalPages)}`}
                  valueStyle={{ color: '#f97316', fontSize: '1.75rem', fontWeight: 800 }}
                />
              </Card>
            </Col>
          </Row>

          {/* Table */}
          <Card className="controller-panel" title={<span className="text-foreground font-semibold">Liste des Étudiants</span>}>
            <div className="mb-4">
              <PaginationControls
                pagination={pagination}
                total={total}
                totalPages={totalPages}
                pageSizeOptions={[15, 30, 50]}
                searchPlaceholder="Rechercher un étudiant..."
                loading={isLoading}
              />
            </div>
            <Table
              className="controller-table"
              columns={columns}
              dataSource={etudiants}
              rowKey="_id"
              pagination={false}
              loading={isLoading}
              onChange={handleTableChange}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Space>
      </Spin>
    </div>
  )
}
