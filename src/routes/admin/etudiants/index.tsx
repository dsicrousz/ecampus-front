import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from "@tanstack/react-query"
import { useState, useMemo } from "react"
import { Spin, Table, Avatar, Button, Input, Space, Card, Typography } from "antd"
import { UserOutlined, SearchOutlined, EyeOutlined } from "@ant-design/icons"
import { EtudiantService } from '@/services/etudiant.service'
import { env } from '@/env'
import dayjs from '@/config/dayjs.config'
import type { ColumnsType } from 'antd/es/table'
import type { Etudiant } from '@/types/etudiant'

const { Title } = Typography
const PAGE_SIZE = 15

export const Route = createFileRoute('/admin/etudiants/')({
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
            icon={<EyeOutlined />} 
            onClick={() => navigate({ to: `/admin/etudiants/${record._id}` })}
          >
            Voir
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Title level={3} style={{ margin: 0 }}>
            📚 Gestion des Étudiants
          </Title>
          
          <Input
            placeholder="Rechercher par nom, prénom ou N° sociale..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value)
              setPage(1) // Réinitialiser à la page 1 lors de la recherche
            }}
            allowClear
            size="large"
          />
        </Space>
      </Card>

      <Card>
        <Spin spinning={isLoading}>
          <Table
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
        </Spin>
      </Card>
    </Space>
  )
}
