import { useQuery } from "@tanstack/react-query";
import { Spin, Table, Button, Space, Card, Row, Col, Statistic, Typography, Tag } from "antd";
import { FolderOutlined, SearchOutlined, WalletOutlined } from "@ant-design/icons";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { requireRole } from '@/lib/route-protection';
import { CompteService } from "@/services/compte.service";
import type { Compte } from "@/types/compte";
import type { ColumnsType, TableProps } from 'antd/es/table';
import { USER_ROLE } from '@/types/user.roles';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/pagination-controls';

const { Title, Text } = Typography;

// Fonction utilitaire pour formater les montants
const formatMontant = (montant: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(montant)
}

export const Route = createFileRoute('/admin/comptes/')({
  beforeLoad: () => requireRole([USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN]),
  component: RouteComponent,
})

function RouteComponent() {
  const compteService = new CompteService();
  const goTo = useNavigate();

  const pagination = usePagination({
    initialPage: 1,
    initialLimit: 10,
    initialSortBy: 'solde',
    initialSortOrder: 'desc',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['comptes', 'paginated', pagination.params],
    queryFn: () => compteService.getPaginated(pagination.params),
  });

  const comptes = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleTableChange: TableProps<Compte>['onChange'] = (_pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    if (!s || !s.columnKey) return;
    const field = String(s.field ?? s.columnKey);
    // Cycle à 2 états (grâce à sortDirections) : s.order est toujours 'ascend' ou 'descend'
    if (!s.order) {
      // Fallback : toggle la direction courante
      pagination.setSort(field, pagination.sortOrder === 'asc' ? 'desc' : 'asc');
      return;
    }
    pagination.setSort(field, s.order === 'ascend' ? 'asc' : 'desc');
  };

  const columns: ColumnsType<Compte> = [
    {
      title: 'Étudiant',
      key: 'etudiant',
      align: 'center' as const,
      render: (_: any, record: Compte) => (
        record.etudiant ? (
          <div>
            <div>{record.etudiant.prenom} {record.etudiant.nom}</div>
            <Tag color="blue" style={{ marginTop: 4 }}>{record.etudiant.ncs}</Tag>
          </div>
        ) : (
          <Tag color="default">Non assigné</Tag>
        )
      ),
      sorter: true,
      sortOrder: pagination.sortBy === 'etudiant' ? (pagination.sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
    },
    {
      title: 'Solde',
      dataIndex: 'solde',
      key: 'solde',
      align: 'center' as const,
      render: (solde: number) => (
        <Tag color={solde > 0 ? 'success' : 'default'}>
          {formatMontant(solde)}
        </Tag>
      ),
      sorter: true,
      sortOrder: pagination.sortBy === 'solde' ? (pagination.sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
    },
    {
      title: 'État',
      dataIndex: 'is_actif',
      key: 'actif',
      align: 'center' as const,
      render: (actif: boolean) => (
        <Tag color={actif ? 'success' : 'error'}>
          {actif ? 'Actif' : 'Inactif'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      render: (_: any, record: Compte) => (
        <Button
          type="primary"
          icon={<FolderOutlined />}
          onClick={() => goTo({ to: '/admin/comptes/$compteId', params: { compteId: record._id } })}
        >
          Voir
        </Button>
      ),
    },
  ];

  // Comptes actifs sur la page courante (indicateur partiel)
  const activeOnPage = comptes.filter((c) => c.is_actif).length;

  return (
    <div className="controller-page">
      <Spin spinning={isLoading}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          {/* Hero Header */}
          <Card className="controller-hero controller-hero-soft border">
            <Row gutter={[24, 16]} align="middle" wrap>
              <Col flex="none">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <WalletOutlined style={{ fontSize: 28 }} />
                </div>
              </Col>
              <Col flex="auto">
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Gestion
                </Text>
                <Title level={3} className="mb-1! mt-1! text-foreground!">
                  Comptes
                </Title>
                <Text type="secondary">
                  Gérez les comptes étudiants et leurs soldes
                </Text>
              </Col>
            </Row>
          </Card>

          {/* Statistiques */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Card className="controller-stat-card" size="small">
                <Statistic
                  title={<span className="text-primary font-medium">Total Comptes</span>}
                  value={total}
                  prefix={<WalletOutlined />}
                  valueStyle={{ color: '#0ea5e9', fontSize: '1.75rem', fontWeight: 800 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card className="controller-stat-card" size="small">
                <Statistic
                  title={<span className="text-emerald-700 font-medium">Actifs (page courante)</span>}
                  value={activeOnPage}
                  prefix={<SearchOutlined />}
                  valueStyle={{ color: '#16a34a', fontSize: '1.75rem', fontWeight: 800 }}
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
          <Card className="controller-panel" title={<span className="text-foreground font-semibold">Liste des Comptes</span>}>
            <div className="mb-4">
              <PaginationControls
                pagination={pagination}
                total={total}
                totalPages={totalPages}
                pageSizeOptions={[10, 20, 50]}
                searchPlaceholder="Rechercher un compte..."
                loading={isLoading}
              />
            </div>
            <Table
              className="controller-table"
              columns={columns}
              dataSource={comptes}
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
