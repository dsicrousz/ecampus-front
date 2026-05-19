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
  WalletOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { createFileRoute } from '@tanstack/react-router';
import { requireRole } from '@/lib/route-protection';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TransfertVersementService } from '@/services/transfert-versement.service';
import { UserService } from '@/services/user.service';
import { VendeurService } from '@/services/vendeurservice';
import { useState } from 'react';
import dayjs from '@/config/dayjs.config';
import { authClient } from '@/auth/auth-client';
import type { TransfertVersement } from '@/types/transfert-versement';
import { EtatTransfertColors, EtatTransfertLabels, ETAT_TRANSFERT, TYPE_ACTEUR } from '@/types/transfert-versement';
import type { User } from '@/types/user';
import { formatMontant } from '@/types/operation';
import { USER_ROLE } from '@/types/user.roles';

const { Title, Text } = Typography;

export const Route = createFileRoute('/admin/agent-comptable/')({
  beforeLoad: () => requireRole([USER_ROLE.ACP, USER_ROLE.SUPERADMIN]),
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
    queryFn: () => userService.byRole(USER_ROLE.VENDEUR),
  });

  // Liste des recouvreurs
  const { data: recouvreurs, isLoading: isLoadingRecouvreurs } = useQuery<User[]>({
    queryKey: recouvreursKey,
    queryFn: () => userService.byRole(USER_ROLE.RECOUVREUR),
  });

  // Liste des caissiers principaux
  const { data: caissiersPrincipaux, isLoading: isLoadingCaissiers } = useQuery<User[]>({
    queryKey: caissiersPrincipauxKey,
    queryFn: () => userService.byRole(USER_ROLE.CAISSIER),
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
  const transfertsRecusAgentComptable = transfertsRecus?.filter(
    t => t.destination_type_acteur === TYPE_ACTEUR.AGENT_COMPTABLE
  ) || [];

  const soldeTotal = transfertsRecusAgentComptable.filter(t => t.etat === ETAT_TRANSFERT.VALIDE).reduce((acc, t) => acc + t.montant, 0) || 0;

  // Filtrer les transferts selon l'onglet actif
  const transfertsEnAttenteRecus = transfertsRecusAgentComptable.filter(t => t.etat === ETAT_TRANSFERT.EN_ATTENTE);
  const transfertsValidesRecus = transfertsRecusAgentComptable.filter(t => t.etat === ETAT_TRANSFERT.VALIDE);
  const transfertsRefusesRecus = transfertsRecusAgentComptable.filter(t => t.etat === ETAT_TRANSFERT.REFUSE);

  // Statistiques globales
  const totalTransfertsVendeurRecouvreur = allTransferts?.filter(t => t.source_type_acteur === TYPE_ACTEUR.VENDEUR && t.destination_type_acteur === TYPE_ACTEUR.RECOUVREUR && t.etat === ETAT_TRANSFERT.VALIDE).reduce((acc, t) => acc + t.montant, 0) || 0;
  const totalTransfertsRecouvreurCaissier = allTransferts?.filter(t => t.source_type_acteur === TYPE_ACTEUR.RECOUVREUR && t.destination_type_acteur === TYPE_ACTEUR.CAISSIER_PRINCIPAL && t.etat === ETAT_TRANSFERT.VALIDE).reduce((acc, t) => acc + t.montant, 0) || 0;
  const totalTransfertsCaissierAgent = allTransferts?.filter(t => t.source_type_acteur === TYPE_ACTEUR.CAISSIER_PRINCIPAL && t.destination_type_acteur === TYPE_ACTEUR.AGENT_COMPTABLE && t.etat === ETAT_TRANSFERT.VALIDE).reduce((acc, t) => acc + t.montant, 0) || 0;

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
      dataIndex: 'source_acteur_name',
      key: 'expediteur',
      width: '25%',
      render: (exp: any) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <Text strong>{exp || '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Montant',
      dataIndex: 'montant',
      key: 'montant',
      width: '20%',
      render: (montant: number) => <Text strong style={{ color: '#16a34a' }}>{formatMontant(montant)}</Text>,
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
                style={{ background: '#16a34a', borderColor: '#16a34a' }}
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
      <div className="controller-page">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Hero Header */}
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={16}>
            <Card className="controller-hero controller-hero-soft border-0 shadow-xl">
              <Row gutter={[24, 16]} align="middle" wrap>
                <Col flex="none">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <SafetyOutlined style={{ fontSize: 28 }} />
                  </div>
                </Col>
                <Col flex="auto">
                  <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Finance
                  </Text>
                  <Title level={3} className="mb-1! mt-1! text-slate-900!">
                    Agent Comptable
                  </Title>
                  <Text type="secondary">
                    Validez les transferts reçus des caissiers principaux
                  </Text>
                </Col>
              </Row>
            </Card>
          </Col>
          
          <Col xs={24} lg={8}>
            <Card className="controller-stat-card" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <WalletOutlined style={{ fontSize: 20, color: '#16a34a' }} />
                  <Text className="text-emerald-700 font-medium">
                    Total Encaissé
                  </Text>
                </Space>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Fonds validés</Text>
                  <Title level={2} style={{ color: '#16a34a', margin: 0 }}>
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
            <Card className="controller-stat-card" size="small">
              <Statistic
                title={<span className="text-orange-700 font-medium">En attente</span>}
                value={transfertsEnAttenteRecus.length}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#f97316', fontSize: '1.75rem', fontWeight: 800 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="controller-stat-card" size="small">
              <Statistic
                title={<span className="text-emerald-700 font-medium">Validés</span>}
                value={transfertsValidesRecus.length}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#16a34a', fontSize: '1.75rem', fontWeight: 800 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="controller-stat-card" size="small">
              <Statistic
                title={<span className="text-red-700 font-medium">Refusés</span>}
                value={transfertsRefusesRecus.length}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#dc2626', fontSize: '1.75rem', fontWeight: 800 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="controller-stat-card" size="small">
              <Statistic
                title={<span className="text-blue-700 font-medium">Montant total reçu</span>}
                value={soldeTotal}
                formatter={(value) => formatMontant(Number(value))}
                valueStyle={{ color: '#0ea5e9', fontSize: '1.75rem', fontWeight: 800 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Vue globale des flux */}
        <Card
          className="controller-panel"
          title={<span className="text-slate-900 font-semibold">Vue Globale des Flux Financiers</span>}
          loading={isLoadingAllTransferts}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card 
                className="controller-panel"
                size="small" 
                style={{ textAlign: 'center' }}
              >
                <Statistic
                  title={<span className="text-orange-700 font-medium">Vendeurs → Recouvreurs</span>}
                  value={totalTransfertsVendeurRecouvreur}
                  formatter={(value) => formatMontant(Number(value))}
                  valueStyle={{ color: '#f97316', fontSize: '1.5rem', fontWeight: 700 }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {allTransferts?.filter(t => t.source_type_acteur === TYPE_ACTEUR.VENDEUR && t.destination_type_acteur === TYPE_ACTEUR.RECOUVREUR && t.etat === ETAT_TRANSFERT.VALIDE).length || 0} transferts validés
                </Text>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card 
                className="controller-panel"
                size="small"
                style={{ textAlign: 'center' }}
              >
                <Statistic
                  title={<span className="text-blue-700 font-medium">Recouvreurs → Caissiers</span>}
                  value={totalTransfertsRecouvreurCaissier}
                  formatter={(value) => formatMontant(Number(value))}
                  valueStyle={{ color: '#0ea5e9', fontSize: '1.5rem', fontWeight: 700 }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {allTransferts?.filter(t => t.source_type_acteur === TYPE_ACTEUR.RECOUVREUR && t.destination_type_acteur === TYPE_ACTEUR.CAISSIER_PRINCIPAL && t.etat === ETAT_TRANSFERT.VALIDE).length || 0} transferts validés
                </Text>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card 
                className="controller-panel"
                size="small"
                style={{ textAlign: 'center' }}
              >
                <Statistic
                  title={<span className="text-purple-700 font-medium">Caissiers → Agent Comptable</span>}
                  value={totalTransfertsCaissierAgent}
                  formatter={(value) => formatMontant(Number(value))}
                  valueStyle={{ color: '#9333ea', fontSize: '1.5rem', fontWeight: 700 }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {allTransferts?.filter(t => t.source_type_acteur === TYPE_ACTEUR.CAISSIER_PRINCIPAL && t.destination_type_acteur === TYPE_ACTEUR.AGENT_COMPTABLE && t.etat === ETAT_TRANSFERT.VALIDE).length || 0} transferts validés
                </Text>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* Soldes des acteurs */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Card
              className="controller-panel"
              title={<span className="text-orange-700 font-semibold">Vendeurs</span>}
              loading={isLoadingVendeurs || isLoadingSoldes}
              size="small"
            >
              <Table
                className="controller-table"
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
                        <Text strong style={{ color: (solde?.solde || 0) > 0 ? '#16a34a' : '#8c8c8c' }}>
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
              className="controller-panel"
              title={<span className="text-blue-700 font-semibold">Recouvreurs</span>}
              loading={isLoadingRecouvreurs || isLoadingAllTransferts}
              size="small"
            >
              <Table
                className="controller-table"
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
                        t => t.source_type_acteur === TYPE_ACTEUR.VENDEUR &&
                        t.destination_type_acteur === TYPE_ACTEUR.RECOUVREUR &&
                        t.etat === ETAT_TRANSFERT.VALIDE && 
                        typeof t.destination_acteur_id === 'object' && 
                        t.destination_acteur_id._id === record._id
                      ).reduce((acc, t) => acc + t.montant, 0) || 0;
                      return <Text style={{ color: '#16a34a' }}>{formatMontant(totalRecu)}</Text>;
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
              className="controller-panel"
              title={<span className="text-purple-700 font-semibold">Caissiers Principaux</span>}
              loading={isLoadingCaissiers || isLoadingAllTransferts}
              size="small"
            >
              <Table
                className="controller-table"
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
                        t => t.source_type_acteur === TYPE_ACTEUR.RECOUVREUR &&
                        t.destination_type_acteur === TYPE_ACTEUR.CAISSIER_PRINCIPAL &&
                        t.etat === ETAT_TRANSFERT.VALIDE && 
                        typeof t.destination_acteur_id === 'object' && 
                        t.destination_acteur_id._id === record._id
                      ).reduce((acc, t) => acc + t.montant, 0) || 0;
                      return <Text style={{ color: '#16a34a' }}>{formatMontant(totalRecu)}</Text>;
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
          className="controller-panel"
          title={<span className="text-slate-900 font-semibold">Transferts reçus des caissiers principaux</span>}
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
                    className="controller-table"
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
                    className="controller-table"
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
                    className="controller-table"
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
      </div>
    </Spin>
  );
}
