import { createFileRoute } from '@tanstack/react-router';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { Spin, Card, Row, Col, Typography, Descriptions, Space, Statistic, Tag, Switch, Table } from 'antd';
import { UserOutlined, CheckCircleOutlined, CloseCircleOutlined, FolderOutlined, ShoppingCartOutlined, ShopOutlined } from '@ant-design/icons';
import { CompteService } from '@/services/compte.service';
import { OperationService } from '@/services/operation.service';
import dayjs from 'dayjs';
import { QUERY_KEYS } from '@/constants';
const { Title, Text } = Typography;

// Fonction utilitaire pour formater les montants
const formatMontant = (montant: number): string => {
  return new Intl.NumberFormat('fr-FR', { 
    style: 'currency', 
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(montant);
};

// Fonction utilitaire pour formater les dates
const format = (date: Date, formatStr: string): string => {
  return dayjs(date).format(formatStr.replace(/d/g, 'D').replace(/y/g, 'Y').replace(/H/g, 'H').replace(/m/g, 'm'));
};

export const Route = createFileRoute('/admin/comptes/$compteId')({
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

  // Account activation handler
  const handleToggleAccount = async (checked: boolean) => {
    try {
      await compteService.toggleState(compteId, { is_actif: checked });
     queryClient.invalidateQueries({ queryKey: qkAccount });
    } catch (error) {
      console.error('Erreur lors de la modification du statut:', error);
    }
  };


   // Account activation handler
  const handleLostCard = async (checked: boolean) => {
    try {
      await compteService.update(compteId, { est_perdu: checked });
     queryClient.invalidateQueries({ queryKey: qkAccount });
    } catch (error) {
      console.error('Erreur lors de la modification du statut:', error);
    }
  };

  return (
    <div>
      <Spin spinning={isLoadingAccount} size="large">
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          {/* Account Details Card */}
          <Card>
            <Title level={3} style={{ marginBottom: 16 }}>
              <UserOutlined /> Détails du Compte
            </Title>

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
                      {accountData.createdAt ? format(new Date(accountData.createdAt), 'dd/MM/yyyy HH:mm') : 'N/A'}
                    </Descriptions.Item>
                  </Descriptions>
                </Col>

                <Col xs={24} lg={12}>
                  <Space  orientation="vertical" size="large" style={{ width: '100%' }}>
                    <Statistic
                      title="Solde actuel"
                      value={balance}
                      precision={0}
                      valueStyle={{ color: '#1890ff' }}
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
                        <Tag color={accountData?.is_perdu ? 'error' : 'success'}>
                          {accountData?.is_perdu ? 'PERDU' : 'EN MAIN'}
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
            <Card>
              <Title level={4} style={{ marginBottom: 16 }}>
                <ShoppingCartOutlined /> Historique des Recharges ({recharges.length})
              </Title>
              <Table
                                    columns={[
                                        {
                                            title: 'Date',
                                            dataIndex: 'createdAt',
                                            key: 'createdAt',
                                            align: 'center',
                                            render: (createdAt) => format(new Date(createdAt), 'dd/MM/yyyy HH:mm'),
                                            sorter: (a: any, b: any) => dayjs(a.createdAt).isBefore(dayjs(b.createdAt)) ? -1 : 1,
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
                    render: (agent: any) => agent ? `${agent.prenom} ${agent.nom}` : 'N/A',
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
            <Card>
              <Title level={4} style={{ marginBottom: 16 }}>
                <ShopOutlined /> Historique des Utilisations ({utilisations.length})
              </Title>
              <Table
                columns={[
                  {
                    title: 'Date',
                    dataIndex: 'createdAt',
                    key: 'createdAt',
                    align: 'center' as const,
                    render: (createdAt: string) => format(new Date(createdAt), 'dd/MM/yyyy HH:mm'),
                    sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                  },
                  {
                    title: 'Ticket',
                    dataIndex: ['ticket', 'nom'],
                    key: 'ticket',
                    align: 'center' as const,
                    render: (nom: string) => (
                      <Tag color="orange">{nom || 'N/A'}</Tag>
                    ),
                  },
                  {
                    title: 'Service',
                    dataIndex: ['service', 'nom'],
                    key: 'service',
                    align: 'center' as const,
                    render: (nom: string) => (
                      <Tag color="green">{nom || 'N/A'}</Tag>
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
                    render: (agent: any) => agent ? `${agent.prenom} ${agent.nom}` : 'N/A',
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
            <Card>
              <Title level={4} style={{ marginBottom: 16 }}>
                <ShopOutlined /> Historique des Transferts ({transferts.length})
              </Title>
              <Table
                columns={[
                  {
                    title: 'Date',
                    dataIndex: 'createdAt',
                    key: 'createdAt',
                    align: 'center' as const,
                    render: (createdAt: string) => format(new Date(createdAt), 'dd/MM/yyyy HH:mm'),
                    sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                  },
                  {
                    title: 'Montant',
                    dataIndex: 'montant',
                    key: 'montant',
                    align: 'center' as const,
                    render: (montant: number) => (
                      <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
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
