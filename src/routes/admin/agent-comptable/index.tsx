import {
  Card,
  Table,
  Space,
  Button,
  Tag,
  Typography,
  Avatar,
  Row,
  Col,
  Statistic,
  Spin,
  message,
  Popconfirm,
  Tabs,
} from 'antd';
import {
  DollarOutlined,
  WalletOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  BankOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TransfertVersementService } from '@/services/transfert-versement.service';
import { UserService } from '@/services/user.service';
import { VendeurService } from '@/services/vendeurservice';
import { useState } from 'react';
import dayjs from '@/config/dayjs.config';
import { authClient } from '@/auth/auth-client';
import type { TransfertVersement } from '@/types/transfert-versement';
import { EtatTransfertColors, EtatTransfertLabels, ETAT_TRANSFERT, TYPE_TRANSFERT } from '@/types/transfert-versement';
import type { User } from '@/types/user';
import { formatMontant } from '@/types/operation';

const { Title, Text } = Typography;

export const Route = createFileRoute('/admin/agent-comptable/')({
  component: RouteComponent
});

function RouteComponent() {
  const { data: session } = authClient.useSession();
  const [activeTab, setActiveTab] = useState<string>('en_attente');
  
  const qc = useQueryClient();
  const transfertVersementService = new TransfertVersementService();
  const userService = new UserService();
  const vendeurService = new VendeurService();
  
  const transfertsRecusKey = ['transferts-agent-comptable', session?.user?.id];
  const vendeursKey = ['vendeurs'];
  const recouvreursKey = ['recouvreurs'];
  const caissiersPrincipauxKey = ['caissiers-principaux'];
  const soldesVendeursKey = ['soldes-vendeurs'];
  const allTransfertsKey = ['all-transferts'];

  // Transferts reçus des caissiers principaux
  const { data: transfertsRecus, isLoading: isLoadingTransfertsRecus } = useQuery<TransfertVersement[]>({
    queryKey: transfertsRecusKey,
    queryFn: () => transfertVersementService.findByAgentComptable(session!.user.id),
    enabled: !!session?.user?.id,
  });

  // Tous les transferts pour avoir une vue globale
  const { data: allTransferts, isLoading: isLoadingAllTransferts } = useQuery<TransfertVersement[]>({
    queryKey: allTransfertsKey,
    queryFn: () => transfertVersementService.getAll(),
  });

  // Liste des vendeurs
  const { data: vendeurs, isLoading: isLoadingVendeurs } = useQuery<User[]>({
    queryKey: vendeursKey,
    queryFn: () => userService.byRole('vendeur'),
  });

  // Liste des recouvreurs
  const { data: recouvreurs, isLoading: isLoadingRecouvreurs } = useQuery<User[]>({
    queryKey: recouvreursKey,
    queryFn: () => userService.byRole('recouvreur'),
  });

  // Liste des caissiers principaux
  const { data: caissiersPrincipaux, isLoading: isLoadingCaissiers } = useQuery<User[]>({
    queryKey: caissiersPrincipauxKey,
    queryFn: () => userService.byRole('caissier_principal'),
  });

  // Soldes des vendeurs
  const { data: soldesVendeurs, isLoading: isLoadingSoldes } = useQuery<any[]>({
    queryKey: soldesVendeursKey,
    queryFn: () => vendeurService.getAllSoldes(),
  });

  // Mutation pour valider un transfert
  const { mutate: validerTransfert, isPending: isPendingValider } = useMutation({
    mutationFn: (id: string) => transfertVersementService.valider(id, { validateur_id: session!.user.id }),
    onSuccess: () => {
      message.success('Transfert validé avec succès');
      qc.invalidateQueries({ queryKey: transfertsRecusKey });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Erreur lors de la validation');
    }
  });

  // Mutation pour refuser un transfert
  const { mutate: refuserTransfert, isPending: isPendingRefuser } = useMutation({
    mutationFn: (id: string) => transfertVersementService.refuser(id, { validateur_id: session!.user.id }),
    onSuccess: () => {
      message.success('Transfert refusé');
      qc.invalidateQueries({ queryKey: transfertsRecusKey });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Erreur lors du refus');
    }
  });

  // Calcul du solde total reçu
  const soldeTotal = transfertsRecus?.filter(t => t.etat === ETAT_TRANSFERT.VALIDE).reduce((acc, t) => acc + t.montant, 0) || 0;

  // Filtrer les transferts selon l'onglet actif
  const transfertsEnAttenteRecus = transfertsRecus?.filter(t => t.etat === ETAT_TRANSFERT.EN_ATTENTE) || [];
  const transfertsValidesRecus = transfertsRecus?.filter(t => t.etat === ETAT_TRANSFERT.VALIDE) || [];
  const transfertsRefusesRecus = transfertsRecus?.filter(t => t.etat === ETAT_TRANSFERT.REFUSE) || [];

  // Statistiques globales
  const totalTransfertsVendeurRecouvreur = allTransferts?.filter(t => t.typeTransfert === TYPE_TRANSFERT.VENDEUR_VERS_RECOUVREUR && t.etat === ETAT_TRANSFERT.VALIDE).reduce((acc, t) => acc + t.montant, 0) || 0;
  const totalTransfertsRecouvreurCaissier = allTransferts?.filter(t => t.typeTransfert === TYPE_TRANSFERT.RECOUVREUR_VERS_CAISSIER_PRINCIPAL && t.etat === ETAT_TRANSFERT.VALIDE).reduce((acc, t) => acc + t.montant, 0) || 0;
  const totalTransfertsCaissierAgent = allTransferts?.filter(t => t.typeTransfert === TYPE_TRANSFERT.CAISSIER_PRINCIPAL_VERS_AGENT_COMPTABLE && t.etat === ETAT_TRANSFERT.VALIDE).reduce((acc, t) => acc + t.montant, 0) || 0;

  const columnsTransfertsRecus = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '15%',
      render: (text: string) => <Text>{dayjs(text).format('DD/MM/YYYY HH:mm')}</Text>,
    },
    {
      title: 'Caissier Principal',
      dataIndex: 'expediteur',
      key: 'expediteur',
      width: '25%',
      render: (exp: any) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <Text strong>{typeof exp === 'object' ? `${exp.prenom} ${exp.nom}` : exp}</Text>
        </Space>
      ),
    },
    {
      title: 'Montant',
      dataIndex: 'montant',
      key: 'montant',
      width: '20%',
      render: (montant: number) => <Text strong style={{ color: '#52c41a' }}>{formatMontant(montant)}</Text>,
    },
    {
      title: 'Note',
      dataIndex: 'note',
      key: 'note',
      width: '20%',
      render: (note: string) => <Text type="secondary">{note || '-'}</Text>,
    },
    {
      title: 'Statut',
      dataIndex: 'etat',
      key: 'etat',
      width: '10%',
      render: (etat: ETAT_TRANSFERT) => (
        <Tag color={EtatTransfertColors[etat]}>{EtatTransfertLabels[etat]}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '10%',
      render: (_: any, record: TransfertVersement) => (
        record.etat === ETAT_TRANSFERT.EN_ATTENTE ? (
          <Space>
            <Popconfirm
              title="Valider ce transfert ?"
              description="Cette action confirmera la réception des fonds."
              onConfirm={() => validerTransfert(record._id)}
              okText="Valider"
              cancelText="Annuler"
            >
              <Button 
                type="primary" 
                size="small" 
                icon={<CheckOutlined />}
                loading={isPendingValider}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              />
            </Popconfirm>
            <Popconfirm
              title="Refuser ce transfert ?"
              description="Le caissier principal sera notifié du refus."
              onConfirm={() => refuserTransfert(record._id)}
              okText="Refuser"
              cancelText="Annuler"
              okButtonProps={{ danger: true }}
            >
              <Button 
                danger 
                size="small" 
                icon={<CloseOutlined />}
                loading={isPendingRefuser}
              />
            </Popconfirm>
          </Space>
        ) : null
      ),
    },
  ];

  return (
    <Spin spinning={isLoadingTransfertsRecus || isPendingValider || isPendingRefuser}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header Section */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card style={{ background: 'linear-gradient(to right, #f9f0ff, #efdbff)', borderColor: '#d3adf7' }}>
              <Space direction="vertical">
                <Title level={3} style={{ margin: 0, color: '#722ed1' }}>
                  <SafetyOutlined /> Espace Agent Comptable
                </Title>
                <Text type="secondary">
                  Validez les transferts reçus des caissiers principaux et consultez les statistiques globales
                </Text>
              </Space>
            </Card>
          </Col>
          
          <Col xs={24} lg={8}>
            <Card style={{ background: 'linear-gradient(to bottom right, #f6ffed, #d9f7be)', borderColor: '#b7eb8f' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <WalletOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                  <Text strong style={{ color: '#389e0d' }}>
                    Total Encaissé
                  </Text>
                </Space>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Fonds validés</Text>
                  <Title level={2} style={{ margin: '8px 0', color: '#52c41a' }}>
                    {formatMontant(soldeTotal)}
                  </Title>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Statistics des transferts */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable style={{ borderLeft: '4px solid #fa8c16' }}>
              <Statistic
                title="En attente"
                value={transfertsEnAttenteRecus.length}
                prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable style={{ borderLeft: '4px solid #52c41a' }}>
              <Statistic
                title="Validés"
                value={transfertsValidesRecus.length}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable style={{ borderLeft: '4px solid #ff4d4f' }}>
              <Statistic
                title="Refusés"
                value={transfertsRefusesRecus.length}
                prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable style={{ borderLeft: '4px solid #1890ff' }}>
              <Statistic
                title="Montant total reçu"
                value={soldeTotal}
                formatter={(value) => formatMontant(Number(value))}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Vue globale des flux */}
        <Card
          title={
            <Space>
              <BankOutlined style={{ fontSize: 20, color: '#722ed1' }} />
              <Text strong style={{ color: '#722ed1' }}>Vue Globale des Flux Financiers</Text>
            </Space>
          }
          loading={isLoadingAllTransferts}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card 
                size="small" 
                style={{ 
                  background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)',
                  borderColor: '#ffd591',
                  textAlign: 'center'
                }}
              >
                <Statistic
                  title="Vendeurs → Recouvreurs"
                  value={totalTransfertsVendeurRecouvreur}
                  formatter={(value) => formatMontant(Number(value))}
                  valueStyle={{ color: '#fa8c16' }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {allTransferts?.filter(t => t.typeTransfert === TYPE_TRANSFERT.VENDEUR_VERS_RECOUVREUR && t.etat === ETAT_TRANSFERT.VALIDE).length || 0} transferts validés
                </Text>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card 
                size="small"
                style={{ 
                  background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
                  borderColor: '#91d5ff',
                  textAlign: 'center'
                }}
              >
                <Statistic
                  title="Recouvreurs → Caissiers"
                  value={totalTransfertsRecouvreurCaissier}
                  formatter={(value) => formatMontant(Number(value))}
                  valueStyle={{ color: '#1890ff' }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {allTransferts?.filter(t => t.typeTransfert === TYPE_TRANSFERT.RECOUVREUR_VERS_CAISSIER_PRINCIPAL && t.etat === ETAT_TRANSFERT.VALIDE).length || 0} transferts validés
                </Text>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card 
                size="small"
                style={{ 
                  background: 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)',
                  borderColor: '#d3adf7',
                  textAlign: 'center'
                }}
              >
                <Statistic
                  title="Caissiers → Agent Comptable"
                  value={totalTransfertsCaissierAgent}
                  formatter={(value) => formatMontant(Number(value))}
                  valueStyle={{ color: '#722ed1' }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {allTransferts?.filter(t => t.typeTransfert === TYPE_TRANSFERT.CAISSIER_PRINCIPAL_VERS_AGENT_COMPTABLE && t.etat === ETAT_TRANSFERT.VALIDE).length || 0} transferts validés
                </Text>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* Soldes des acteurs */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Card
              title={
                <Space>
                  <UserOutlined style={{ fontSize: 18, color: '#fa8c16' }} />
                  <Text strong style={{ color: '#fa8c16' }}>Vendeurs</Text>
                </Space>
              }
              loading={isLoadingVendeurs || isLoadingSoldes}
              size="small"
            >
              <Table
                columns={[
                  {
                    title: 'Nom',
                    dataIndex: 'name',
                    key: 'name',
                    render: (name: string) => <Text>{name}</Text>,
                  },
                  {
                    title: 'Solde',
                    key: 'solde',
                    render: (_: any, record: User) => {
                      const solde = soldesVendeurs?.find((s: any) => s.vendeur_id === record._id || s.vendeur_id?._id === record._id);
                      return (
                        <Text strong style={{ color: (solde?.solde || 0) > 0 ? '#52c41a' : '#8c8c8c' }}>
                          {formatMontant(solde?.solde || 0)}
                        </Text>
                      );
                    },
                  },
                ]}
                dataSource={vendeurs}
                rowKey="_id"
                pagination={{ pageSize: 5 }}
                size="small"
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              title={
                <Space>
                  <UserOutlined style={{ fontSize: 18, color: '#1890ff' }} />
                  <Text strong style={{ color: '#1890ff' }}>Recouvreurs</Text>
                </Space>
              }
              loading={isLoadingRecouvreurs || isLoadingAllTransferts}
              size="small"
            >
              <Table
                columns={[
                  {
                    title: 'Nom',
                    dataIndex: 'name',
                    key: 'name',
                    render: (name: string) => <Text>{name}</Text>,
                  },
                  {
                    title: 'Reçu',
                    key: 'recu',
                    render: (_: any, record: User) => {
                      const totalRecu = allTransferts?.filter(
                        t => t.typeTransfert === TYPE_TRANSFERT.VENDEUR_VERS_RECOUVREUR &&
                        t.etat === ETAT_TRANSFERT.VALIDE && 
                        typeof t.destinataire === 'object' && 
                        t.destinataire._id === record._id
                      ).reduce((acc, t) => acc + t.montant, 0) || 0;
                      return <Text style={{ color: '#52c41a' }}>{formatMontant(totalRecu)}</Text>;
                    },
                  },
                ]}
                dataSource={recouvreurs}
                rowKey="_id"
                pagination={{ pageSize: 5 }}
                size="small"
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              title={
                <Space>
                  <BankOutlined style={{ fontSize: 18, color: '#722ed1' }} />
                  <Text strong style={{ color: '#722ed1' }}>Caissiers Principaux</Text>
                </Space>
              }
              loading={isLoadingCaissiers || isLoadingAllTransferts}
              size="small"
            >
              <Table
                columns={[
                  {
                    title: 'Nom',
                    dataIndex: 'name',
                    key: 'name',
                    render: (name: string) => <Text>{name}</Text>,
                  },
                  {
                    title: 'Reçu',
                    key: 'recu',
                    render: (_: any, record: User) => {
                      const totalRecu = allTransferts?.filter(
                        t => t.typeTransfert === TYPE_TRANSFERT.RECOUVREUR_VERS_CAISSIER_PRINCIPAL &&
                        t.etat === ETAT_TRANSFERT.VALIDE && 
                        typeof t.destinataire === 'object' && 
                        t.destinataire._id === record._id
                      ).reduce((acc, t) => acc + t.montant, 0) || 0;
                      return <Text style={{ color: '#52c41a' }}>{formatMontant(totalRecu)}</Text>;
                    },
                  },
                ]}
                dataSource={caissiersPrincipaux}
                rowKey="_id"
                pagination={{ pageSize: 5 }}
                size="small"
              />
            </Card>
          </Col>
        </Row>

        {/* Transferts reçus des caissiers principaux */}
        <Card
          title={
            <Space>
              <DollarOutlined style={{ fontSize: 20, color: '#722ed1' }} />
              <Text strong style={{ color: '#722ed1' }}>Transferts reçus des caissiers principaux</Text>
            </Space>
          }
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'en_attente',
                label: (
                  <Space>
                    <ClockCircleOutlined />
                    En attente ({transfertsEnAttenteRecus.length})
                  </Space>
                ),
                children: (
                  <Table
                    columns={columnsTransfertsRecus}
                    dataSource={transfertsEnAttenteRecus}
                    rowKey="_id"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 800 }}
                  />
                ),
              },
              {
                key: 'valides',
                label: (
                  <Space>
                    <CheckCircleOutlined />
                    Validés ({transfertsValidesRecus.length})
                  </Space>
                ),
                children: (
                  <Table
                    columns={columnsTransfertsRecus.filter(c => c.key !== 'actions')}
                    dataSource={transfertsValidesRecus}
                    rowKey="_id"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 800 }}
                  />
                ),
              },
              {
                key: 'refuses',
                label: (
                  <Space>
                    <CloseCircleOutlined />
                    Refusés ({transfertsRefusesRecus.length})
                  </Space>
                ),
                children: (
                  <Table
                    columns={columnsTransfertsRecus.filter(c => c.key !== 'actions')}
                    dataSource={transfertsRefusesRecus}
                    rowKey="_id"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 800 }}
                  />
                ),
              },
            ]}
          />
        </Card>
      </Space>
    </Spin>
  );
}
