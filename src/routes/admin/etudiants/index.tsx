import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { requireRole } from '@/lib/route-protection';
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Spin, Table, Input, Space, Card, Avatar, Typography, Row, Col, Statistic, Button } from "antd";
import { SearchOutlined, UserOutlined } from "@ant-design/icons";
import { EtudiantService } from "@/services/etudiant.service";
import type { Etudiant } from "@/types/etudiant";
import type { ColumnsType } from "antd/es/table";
import { env } from "@/env";
import dayjs from '@/config/dayjs.config'
import { USER_ROLE } from '@/types/user.roles'

const { Title, Text } = Typography;
const PAGE_SIZE = 15

export const Route = createFileRoute('/admin/etudiants/')({
  beforeLoad: () => requireRole([USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN]),
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const etudiantService = new EtudiantService()
  const [searchText, setSearchText] = useState('')
  const [page, setPage] = useState(1)
  
  const { data: etudiants, isLoading } = useQuery({ 
    queryKey: ['etudiants'], 
    queryFn: () => etudiantService.getAll() 
  })

  // Filtrer les étudiants selon la recherche
  const filteredEtudiants = useMemo(() => {
    if (!etudiants) return []
    if (!searchText) return etudiants
    
    const search = searchText.toLowerCase()
    return etudiants.filter((etudiant: Etudiant) => 
      etudiant.prenom?.toLowerCase().includes(search) ||
      etudiant.nom?.toLowerCase().includes(search) ||
      etudiant.ncs?.toLowerCase().includes(search)
    )
  }, [etudiants, searchText])

  // Paginer les résultats
  const paginatedEtudiants = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    const end = start + PAGE_SIZE
    return filteredEtudiants.slice(start, end)
  }, [filteredEtudiants, page])

  const totalPages = Math.ceil(filteredEtudiants.length / PAGE_SIZE)

  const columns: ColumnsType<Etudiant> = [
    {
      title: 'Date de Création',
      dataIndex: 'createdAt',
      key: 'createdAt',
      align: 'center' as const,
      render: (createdAt: string) => dayjs(createdAt).format('DD/MM/YYYY'),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Photo',
      dataIndex: 'avatar',
      key: 'avatar',
      align: 'center' as const,
      render: (avatar: string) => (
        <Avatar 
          size={64} 
          src={avatar ? `${env.VITE_APP_BACKURL_ETUDIANT}/${avatar}` : undefined}
          icon={<UserOutlined />}
        />
      ),
    },
    {
      title: 'Prénom',
      dataIndex: 'prenom',
      key: 'prenom',
      align: 'center' as const,
      sorter: (a, b) => a.prenom.localeCompare(b.prenom),
    },
    {
      title: 'Nom',
      dataIndex: 'nom',
      key: 'nom',
      align: 'center' as const,
      sorter: (a, b) => a.nom.localeCompare(b.nom),
    },
    {
      title: 'N° SOCIALE',
      dataIndex: 'ncs',
      key: 'ncs',
      align: 'center' as const,
      sorter: (a, b) => a.ncs.localeCompare(b.ncs),
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
            onClick={() => navigate({ to: `/admin/etudiants/${record._id}` })}
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
          <Card className="controller-hero controller-hero-soft border-0 shadow-xl">
            <Row gutter={[24, 16]} align="middle" wrap>
              <Col flex="none">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <UserOutlined style={{ fontSize: 28 }} />
                </div>
              </Col>
              <Col flex="auto">
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Utilisateurs
                </Text>
                <Title level={3} className="mb-1! mt-1! text-slate-900!">
                  Étudiants
                </Title>
                <Text type="secondary">
                  Gérez les étudiants et leurs informations
                </Text>
              </Col>
              <Col flex="none">
                <Input
                  placeholder="Rechercher..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setPage(1);
                  }}
                  allowClear
                  style={{ width: 300 }}
                />
              </Col>
            </Row>
          </Card>

          {/* Statistiques */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card className="controller-stat-card" size="small">
                <Statistic
                  title={<span className="text-blue-700 font-medium">Total Étudiants</span>}
                  value={etudiants?.length || 0}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#0ea5e9', fontSize: '1.75rem', fontWeight: 800 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="controller-stat-card" size="small">
                <Statistic
                  title={<span className="text-emerald-700 font-medium">Filtrés</span>}
                  value={filteredEtudiants.length}
                  prefix={<SearchOutlined />}
                  valueStyle={{ color: '#16a34a', fontSize: '1.75rem', fontWeight: 800 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="controller-stat-card" size="small">
                <Statistic
                  title={<span className="text-orange-700 font-medium">Page actuelle</span>}
                  value={page}
                  suffix={`/ ${totalPages}`}
                  valueStyle={{ color: '#f97316', fontSize: '1.75rem', fontWeight: 800 }}
                />
              </Card>
            </Col>
          </Row>

          {/* Table */}
          <Card className="controller-panel" title={<span className="text-slate-900 font-semibold">Liste des Étudiants</span>}>
            <Table
              className="controller-table"
              columns={columns}
              dataSource={paginatedEtudiants}
              rowKey="_id"
              pagination={{
                current: page,
                pageSize: PAGE_SIZE,
                total: filteredEtudiants.length,
                onChange: (p) => setPage(p),
                showSizeChanger: false,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} sur ${total} étudiant${total > 1 ? 's' : ''}`,
              }}
              loading={isLoading}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Space>
      </Spin>
    </div>
  )
}
