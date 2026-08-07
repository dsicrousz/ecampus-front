import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Spin, Card, Row, Col, Typography, Descriptions, Space, Statistic, Tag, Switch, Table, Button, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, FolderOutlined, ArrowLeftOutlined, ShoppingCartOutlined, ShopOutlined } from '@ant-design/icons';
import { CompteService } from '@/services/compte.service';
import { OperationService } from '@/services/operation.service';
import dayjs from 'dayjs';
import { QUERY_KEYS } from '@/constants';
import { requireRole } from '@/lib/route-protection';
import { USER_ROLE } from '@/types/user.roles';

const { Text } = Typography;

const formatMontant = (montant: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(montant);
};

export const Route = createFileRoute('/admin/comptes/$compteId')({
  beforeLoad: () => requireRole([USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN]),
  component: RouteComponent,
})

function RouteComponent() {
  const { compteId } = Route.useParams();

  const qkAccount = [QUERY_KEYS.COMPTES, compteId];
  const compteService = new CompteService();
  const operationService = new OperationService();
  const queryClient = useQueryClient();
  const { data: accountData, isLoading: isLoadingAccount } = useQuery({
    queryKey: qkAccount,
    queryFn: () => compteService.getOne(compteId),
  });

  // Récupérer les opérations du compte
  const { data: operations, isLoading: isLoadingOperations } = useQuery({
    queryKey: [QUERY_KEYS.OPERATIONS, compteId],
    queryFn: () => operationService.byCompte(compteId),
    enabled: !!compteId
  });
  // Calculate balance
  const balance = accountData?.solde || 0;

  // Séparer les opérations par type
  const recharges = operations?.filter((op: any) => op.type === 'RECHARGE') || [];
  const utilisations = operations?.filter((op: any) => op.type === 'UTILISATION') || [];
  const transferts = operations?.filter((op: any) => op.type === 'TRANSFERT') || [];

  const navigate = useNavigate();

  const handleToggleAccount = async (checked: boolean) => {
    try {
      await compteService.toggleState(compteId, { is_actif: checked });
      queryClient.invalidateQueries({ queryKey: qkAccount });
      message.success(checked ? 'Compte activé' : 'Compte désactivé');
    } catch (error) {
      console.error('Erreur lors de la modification du statut:', error);
      message.error('Erreur lors de la modification du statut');
    }
  };

  const handleLostCard = async (checked: boolean) => {
    try {
      await compteService.update(compteId, { est_perdu: checked });
      queryClient.invalidateQueries({ queryKey: qkAccount });
      message.success(checked ? 'Carte marquée comme perdue' : 'Carte retrouvée');
    } catch (error) {
      console.error('Erreur lors de la modification du statut:', error);
      message.error('Erreur lors de la modification du statut');
    }
  };

  return (
    <div className="controller-page">
      <Spin spinning={isLoadingAccount} size="large">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate({ to: '/admin/comptes', search: { page: 1 } })}
          >
            Retour à la liste
          </Button>

          {/* Account Details Card */}
          <Card className="controller-panel" title={<span className="text-foreground font-semibold">Détails du Compte</span>}>
            {accountData && (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Descriptions bordered column={1}>
                    <Descriptions.Item label="Étudiant">
                      {accountData.etudiant?.prenom} {accountData.etudiant?.nom}
                    </Descriptions.Item>
                    <Descriptions.Item label="N° Social">
                      <Text code>{accountData.etudiant?.ncs}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Date de création">
                      {accountData.createdAt ? dayjs(accountData.createdAt).format('DD/MM/YYYY HH:mm') : 'N/A'}
                    </Descriptions.Item>
                  </Descriptions>
                </Col>

                <Col xs={24} lg={12}>
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <Statistic
                      title={<span className="text-primary font-medium">Solde actuel</span>}
                      value={balance}
                      precision={0}
                      valueStyle={{ color: '#1677ff', fontSize: '1.75rem', fontWeight: 800 }}
                      prefix={<FolderOutlined />}
                      suffix="FCFA"
                    />

                    <div>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        Statut du compte:
                      </Text>
                      <Space>
                        <Switch
                          checked={accountData?.is_actif}
                          onChange={handleToggleAccount}
                          checkedChildren={<CheckCircleOutlined />}
                          unCheckedChildren={<CloseCircleOutlined />}
                        />
                        <Tag color={accountData?.is_actif ? 'success' : 'error'}>
                          {accountData?.is_actif ? 'ACTIF' : 'INACTIF'}
                        </Tag>
                      </Space>
                    </div>
                    <div>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        Carte Perdue:
                      </Text>
                      <Space>
                        <Switch
                          checked={accountData?.est_perdu}
                          onChange={handleLostCard}
                          checkedChildren={<CheckCircleOutlined />}
                          unCheckedChildren={<CloseCircleOutlined />}
                        />
                        <Tag color={accountData?.est_perdu ? 'error' : 'success'}>
                          {accountData?.est_perdu ? 'PERDU' : 'EN MAIN'}
                        </Tag>
                      </Space>
                    </div>
                  </Space>
                </Col>
              </Row>
            )}
          </Card>

          {/* Recharges Card */}
          {recharges && recharges.length > 0 && (
            <Card className="controller-panel" title={<span className="text-foreground font-semibold"><ShoppingCartOutlined /> Historique des Recharges ({recharges.length})</span>}>
              <Table
                className="controller-table"
                columns={[
                  {
                    title: 'Date',
                    dataIndex: 'createdAt',
                    key: 'createdAt',
                    align: 'center' as const,
                    render: (createdAt: string) => dayjs(createdAt).format('DD/MM/YYYY HH:mm'),
                    sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                    defaultSortOrder: 'descend' as const,
                  },
                  {
                    title: 'Montant',
                    dataIndex: 'montant',
                    key: 'montant',
                    align: 'center' as const,
                    render: (montant: number) => (
                      <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                        {formatMontant(montant)}
                      </span>
                    ),
                    sorter: (a: any, b: any) => a.montant - b.montant,
                  },
                  {
                    title: 'Agent',
                    dataIndex: 'agentControle',
                    key: 'agentControle',
                    align: 'center' as const,
                    render: (agent: any) => {
                      if (!agent) return 'N/A';
                      if (typeof agent === 'string') return 'N/A';
                      return agent.name || `${agent.prenom || ''} ${agent.nom || ''}`.trim() || 'N/A';
                    },
                  },
                  {
                    title: 'Note',
                    dataIndex: 'note',
                    key: 'note',
                    align: 'center' as const,
                    render: (note: string) => note || '-',
                  },
                ]}
                dataSource={recharges}
                rowKey="_id"
                pagination={{
                  pageSize: 10,
                  showTotal: (total) => `Total: ${total} recharges`,
                }}
                loading={isLoadingOperations}
                scroll={{ x: 'max-content' }}
              />
            </Card>
          )}

          {/* Utilisations Card */}
          {utilisations && utilisations.length > 0 && (
            <Card className="controller-panel" title={<span className="text-foreground font-semibold"><ShopOutlined /> Historique des Utilisations ({utilisations.length})</span>}>
              <Table
                className="controller-table"
                columns={[
                  {
                    title: 'Date',
                    dataIndex: 'createdAt',
                    key: 'createdAt',
                    align: 'center' as const,
                    render: (createdAt: string) => dayjs(createdAt).format('DD/MM/YYYY HH:mm'),
                    sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                    defaultSortOrder: 'descend' as const,
                  },
                  {
                    title: 'Ticket',
                    key: 'ticket',
                    align: 'center' as const,
                    render: (_: any, record: any) => (
                      <Tag color="orange">{record.ticketSnapshot?.nom || 'N/A'}</Tag>
                    ),
                  },
                  {
                    title: 'Service',
                    key: 'service',
                    align: 'center' as const,
                    render: (_: any, record: any) => (
                      <Tag color="green">{record.serviceSnapshot?.nom || 'N/A'}</Tag>
                    ),
                  },
                  {
                    title: 'Montant',
                    dataIndex: 'montant',
                    key: 'montant',
                    align: 'center' as const,
                    render: (montant: number) => (
                      <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>
                        {formatMontant(montant)}
                      </span>
                    ),
                    sorter: (a: any, b: any) => a.montant - b.montant,
                  },
                  {
                    title: 'Contrôleur',
                    dataIndex: 'agentControle',
                    key: 'agentControle',
                    align: 'center' as const,
                    render: (agent: any) => {
                      if (!agent) return 'N/A';
                      if (typeof agent === 'string') return 'N/A';
                      return agent.name || `${agent.prenom || ''} ${agent.nom || ''}`.trim() || 'N/A';
                    },
                  },
                ]}
                dataSource={utilisations}
                rowKey="_id"
                pagination={{
                  pageSize: 10,
                  showTotal: (total) => `Total: ${total} utilisations`,
                }}
                loading={isLoadingOperations}
                scroll={{ x: 'max-content' }}
              />
            </Card>
          )}

          {/* Transferts Card */}
          {transferts && transferts.length > 0 && (
            <Card className="controller-panel" title={<span className="text-foreground font-semibold"><ShopOutlined /> Historique des Transferts ({transferts.length})</span>}>
              <Table
                className="controller-table"
                columns={[
                  {
                    title: 'Date',
                    dataIndex: 'createdAt',
                    key: 'createdAt',
                    align: 'center' as const,
                    render: (createdAt: string) => dayjs(createdAt).format('DD/MM/YYYY HH:mm'),
                    sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                    defaultSortOrder: 'descend' as const,
                  },
                  {
                    title: 'Montant',
                    dataIndex: 'montant',
                    key: 'montant',
                    align: 'center' as const,
                    render: (montant: number) => (
                      <span style={{ fontWeight: 'bold', color: '#1677ff' }}>
                        {formatMontant(montant)}
                      </span>
                    ),
                    sorter: (a: any, b: any) => a.montant - b.montant,
                  },
                  {
                    title: 'Destinataire',
                    dataIndex: ['compteDestinataire', 'etudiant'],
                    key: 'destinataire',
                    align: 'center' as const,
                    render: (etudiant: any) => etudiant ? `${etudiant.prenom} ${etudiant.nom}` : 'N/A',
                  },
                  {
                    title: 'Note',
                    dataIndex: 'note',
                    key: 'note',
                    align: 'center' as const,
                    render: (note: string) => note || '-',
                  },
                ]}
                dataSource={transferts}
                rowKey="_id"
                pagination={{
                  pageSize: 10,
                  showTotal: (total) => `Total: ${total} transferts`,
                }}
                loading={isLoadingOperations}
                scroll={{ x: 'max-content' }}
              />
            </Card>
          )}
        </Space>
      </Spin>
    </div>
  )
}
