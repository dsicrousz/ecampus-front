import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Spin, Table, Button, Input, Space, Card, Row, Col, Statistic, Typography, Tag } from "antd";
import { FolderOutlined, SearchOutlined, CheckCircleOutlined, WalletOutlined } from "@ant-design/icons";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CompteService } from "@/services/compte.service";
import type { Compte } from "@/types/compte";
import type { ColumnsType } from "antd/es/table";

export const Route = createFileRoute('/admin/comptes/')({
  component: RouteComponent,
})

const { Title } = Typography;
const PAGE_SIZE = 10;

// Fonction utilitaire pour formater les montants
const formatMontant = (montant: number): string => {
  return new Intl.NumberFormat('fr-FR', { 
    style: 'currency', 
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(montant)
}

function RouteComponent() {
  const compteService = new CompteService();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);

  const key = ['comptes'];
  const { data: comptes, isLoading: isLoadingF } = useQuery({ 
    queryKey: key, 
    queryFn: () => compteService.getAll() 
  });

  // Filtrer les comptes selon la recherche
  const filteredComptes = useMemo(() => {
    if (!comptes) return [];
    if (!searchText) return comptes;
    
    const search = searchText.toLowerCase();
    return comptes.filter((compte: Compte) => 
      compte.code?.toLowerCase().includes(search) ||
      compte.etudiant?.prenom?.toLowerCase().includes(search) ||
      compte.etudiant?.nom?.toLowerCase().includes(search) ||
      compte.etudiant?.ncs?.toLowerCase().includes(search)
    );
  }, [comptes, searchText]);

  // Paginer les résultats
  const paginatedComptes = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredComptes.slice(start, end);
  }, [filteredComptes, page]);

  // Calculate statistics
  const activeAccounts = comptes?.filter((c: Compte) => c.is_actif)?.length || 0;
  
  // Calculer le solde total (montant numérique)
  const totalBalance = comptes?.reduce((sum, c) => {
    return sum + (c.solde || 0);
  }, 0) || 0;

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
      sorter: (a, b) => {
        const nameA = a.etudiant ? `${a.etudiant.prenom} ${a.etudiant.nom}` : '';
        const nameB = b.etudiant ? `${b.etudiant.prenom} ${b.etudiant.nom}` : '';
        return nameA.localeCompare(nameB);
      },
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
      sorter: (a, b) => a.solde - b.solde,
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
      filters: [
        { text: 'Actif', value: true },
        { text: 'Inactif', value: false },
      ],
      onFilter: (value, record) => record.is_actif === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      render: (_: any, record: Compte) => (
        <Button
          type="primary"
          icon={<FolderOutlined />}
          onClick={() => navigate({ to: `/admin/comptes/${record._id}` })}
        >
          Voir
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Statistiques */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Comptes"
              value={comptes?.length || 0}
              prefix={<WalletOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Comptes Actifs"
              value={activeAccounts}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Solde Total"
              value={totalBalance}
              formatter={(value) => formatMontant(value as number)}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Recherche */}
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Title level={3} style={{ margin: 0 }}>
            💳 Gestion des Comptes
          </Title>
          
          <Input
            placeholder="Rechercher par code, nom d'étudiant ou N° sociale..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            allowClear
            size="large"
          />
        </Space>
      </Card>

      {/* Table */}
      <Card>
        <Spin spinning={isLoadingF}>
          <Table
            columns={columns}
            dataSource={paginatedComptes}
            rowKey="_id"
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total: filteredComptes.length,
              onChange: (p) => setPage(p),
              showSizeChanger: false,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} sur ${total} compte${total > 1 ? 's' : ''}`,
            }}
            loading={isLoadingF}
            scroll={{ x: 'max-content' }}
          />
        </Spin>
      </Card>
    </Space>
  )
}
