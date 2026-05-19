import {
  Card,
  Table,
  Space,
  Button,
  Tag,
  InputNumber,
  Typography,
  Avatar,
  Divider,
  Row,
  Col,
  Statistic,
  Modal,
  Spin,
  message,
  Input,
  Select,
  Popconfirm,
  Tabs,
} from 'antd';
import {
  WalletOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { createFileRoute } from '@tanstack/react-router';
import { requireRole } from '@/lib/route-protection';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TransfertVersementService } from '@/services/transfert-versement.service';
import { UserService } from '@/services/user.service';
import { RecouvreurService } from '@/services/recouvreurservice';
import { useState } from 'react';
import dayjs from '@/config/dayjs.config';
import { authClient } from '@/auth/auth-client';
import type { TransfertVersement, TransfertRecouvreurCaissierPrincipalDto } from '@/types/transfert-versement';
import { EtatTransfertColors, EtatTransfertLabels, ETAT_TRANSFERT, TYPE_TRANSFERT } from '@/types/transfert-versement';
import type { User } from '@/types/user';
import { formatMontant } from '@/types/operation';
import { USER_ROLE } from '@/types/user.roles';

const { Title, Text } = Typography;

export const Route = createFileRoute('/admin/recouvrement/')({
  beforeLoad: () => requireRole([USER_ROLE.RECOUVREUR, USER_ROLE.SUPERADMIN]),
  component: RouteComponent
});

function RouteComponent() {
  const { data: session } = authClient.useSession();
  const [openedTransfert, setOpenedTransfert] = useState(false);
  const [montantTransfert, setMontantTransfert] = useState<number>(0);
  const [selectedCaissier, setSelectedCaissier] = useState<string>();
  const [noteTransfert, setNoteTransfert] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('en_attente');
  
  const qc = useQueryClient();
  const transfertVersementService = new TransfertVersementService();
  const userService = new UserService();
  const recouvreurService = new RecouvreurService();
  
  const transfertsRecusKey = ['transferts-recouvreur', session?.user?.id];
  const transfertsEnvoyesKey = ['transferts-envoyes-recouvreur', session?.user?.id];
  const soldeRecouvreurKey = ['solde-recouvreur', session?.user?.id];
  const caissiersPrincipauxKey = ['caissiers-principaux'];

  // Transferts reçus des vendeurs (en attente de validation)
  const { data: transfertsRecus, isLoading: isLoadingTransfertsRecus } = useQuery<TransfertVersement[]>({
    queryKey: transfertsRecusKey,
    queryFn: () => transfertVersementService.findByRecouvreur(session!.user.id),
    enabled: !!session?.user?.id,
  });

  // Transferts envoyés vers le caissier principal
  const { data: transfertsEnvoyes, isLoading: isLoadingTransfertsEnvoyes } = useQuery<TransfertVersement[]>({
    queryKey: transfertsEnvoyesKey,
    queryFn: () => transfertVersementService.findByTypeTransfert(TYPE_TRANSFERT.RECOUVREUR_VERS_CAISSIER_PRINCIPAL),
    enabled: !!session?.user?.id,
  });

  const { data: soldeRecouvreur, isLoading: isLoadingSoldeRecouvreur } = useQuery({
    queryKey: soldeRecouvreurKey,
    queryFn: () => recouvreurService.getSolde(session!.user.id),
    enabled: !!session?.user?.id,
  });


  // Liste des caissiers principaux
  const { data: caissiersPrincipaux, isLoading: isLoadingCaissiers } = useQuery<User[]>({
    queryKey: caissiersPrincipauxKey,
    queryFn: () => userService.byRole(USER_ROLE.CAISSIER),
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

  // Mutation pour créer un transfert vers le caissier principal
  const { mutate: createTransfert, isPending: isPendingTransfert } = useMutation({
    mutationFn: (data: TransfertRecouvreurCaissierPrincipalDto) => transfertVersementService.createRecouvreurCaissierPrincipal(data),
    onSuccess: () => {
      message.success('Transfert envoyé avec succès');
      setOpenedTransfert(false);
      setMontantTransfert(0);
      setSelectedCaissier(undefined);
      setNoteTransfert('');
      qc.invalidateQueries({ queryKey: transfertsEnvoyesKey });
      qc.invalidateQueries({ queryKey: soldeRecouvreurKey });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Erreur lors du transfert');
    }
  });

  const soldeDisponible = soldeRecouvreur || 0;

  const handleTransfert = () => {
    if (!montantTransfert || montantTransfert <= 0) {
      message.warning('Veuillez indiquer un montant valide');
      return;
    }
    if (!selectedCaissier) {
      message.warning('Veuillez sélectionner un caissier principal');
      return;
    }
    if (montantTransfert > soldeDisponible) {
      message.warning('Montant supérieur à votre solde disponible');
      return;
    }

    const transfertData: TransfertRecouvreurCaissierPrincipalDto = {
      recouvreur_id: session!.user.id,
      caissier_principal_id: selectedCaissier,
      montant: montantTransfert,
      note: noteTransfert || `Versement de ${session?.user?.name}`
    };
    
    createTransfert(transfertData);
  };

  const transfertsRecusDesVendeurs = transfertsRecus?.filter(
    t => t.destination_type_acteur !== 'CAISSIER_PRINCIPAL'
  ) || [];

  // Filtrer les transferts selon l'onglet actif
  const transfertsEnAttenteRecus = transfertsRecusDesVendeurs.filter(t => t.etat === ETAT_TRANSFERT.EN_ATTENTE);
  const transfertsValidesRecus = transfertsRecusDesVendeurs.filter(t => t.etat === ETAT_TRANSFERT.VALIDE);
  const transfertsRefusesRecus = transfertsRecusDesVendeurs.filter(t => t.etat === ETAT_TRANSFERT.REFUSE);

  const transfertsEnAttenteEnvoyes = transfertsEnvoyes?.filter(t => t.etat === ETAT_TRANSFERT.EN_ATTENTE) || [];
  const transfertsValidesEnvoyes = transfertsEnvoyes?.filter(t => t.etat === ETAT_TRANSFERT.VALIDE) || [];
  const transfertsRefusesEnvoyes = transfertsEnvoyes?.filter(t => t.etat === ETAT_TRANSFERT.REFUSE) || [];

  const columnsTransfertsRecus = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '15%',
      render: (text: string) => <Text>{dayjs(text).format('DD/MM/YYYY HH:mm')}</Text>,
    },
    {
      title: 'Vendeur',
      dataIndex: 'source_acteur_name',
      key: 'expediteur',
      width: '25%',
      render: (exp: any) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <Text strong>{typeof exp === 'object' ? `${exp.name}` : exp}</Text>
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
              description="Le vendeur sera notifié du refus."
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

  const columnsTransfertsEnvoyes = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '15%',
      render: (text: string) => <Text>{dayjs(text).format('DD/MM/YYYY HH:mm')}</Text>,
    },
    {
      title: 'Caissier Principal',
      dataIndex: 'destination_acteur_name',
      key: 'destinataire',
      width: '25%',
      render: (dest: any) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <Text strong>{typeof dest === 'object' ? `${dest.prenom} ${dest.nom}` : dest}</Text>
        </Space>
      ),
    },
    {
      title: 'Montant',
      dataIndex: 'montant',
      key: 'montant',
      width: '20%',
      render: (montant: number) => <Text strong>{formatMontant(montant)}</Text>,
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
      width: '20%',
      render: (etat: ETAT_TRANSFERT) => (
        <Tag color={EtatTransfertColors[etat]}>{EtatTransfertLabels[etat]}</Tag>
      ),
    },
  ];

  return (
    <Spin spinning={isLoadingTransfertsRecus || isLoadingTransfertsEnvoyes || isLoadingSoldeRecouvreur || isPendingValider || isPendingRefuser}>
      <div className="controller-page">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Hero Header */}
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={16}>
            <Card className="controller-hero controller-hero-soft border-0 shadow-xl">
              <Row gutter={[24, 16]} align="middle" wrap>
                <Col flex="none">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <span style={{ fontSize: 28 }}>💼</span>
                  </div>
                </Col>
                <Col flex="auto">
                  <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Finance
                  </Text>
                  <Title level={3} className="mb-1! mt-1! text-slate-900!">
                    Recouvreur
                  </Title>
                  <Text type="secondary">
                    Gérez les transferts reçus et envoyez les fonds
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
                    Solde Disponible
                  </Text>
                </Space>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Fonds à transférer</Text>
                  <Title level={2} style={{ color: '#16a34a', margin: 0 }}>
                    {formatMontant(soldeDisponible)}
                  </Title>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Statistics */}
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
                value={transfertsValidesRecus.reduce((acc, t) => acc + t.montant, 0)}
                formatter={(value) => formatMontant(Number(value))}
                valueStyle={{ color: '#0ea5e9', fontSize: '1.75rem', fontWeight: 800 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Transferts reçus des vendeurs */}
        <Card
          className="controller-panel"
          title={<span className="text-orange-700 font-semibold">Transferts reçus des vendeurs</span>}
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

        {/* Section Transfert vers Caissier Principal */}
        <Card
          className="controller-panel"
          title={<span className="text-blue-700 font-semibold">Transfert vers Caissier Principal</span>}
          extra={
            <Button 
              type="primary"
              icon={<SendOutlined />}
              onClick={() => setOpenedTransfert(true)}
              disabled={soldeDisponible <= 0}
            >
              Nouveau Transfert
            </Button>
          }
        >
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} md={8}>
              <Card 
                className="controller-panel"
                size="small" 
                style={{ textAlign: 'center' }}
              >
                <Statistic
                  title={<span className="text-blue-700 font-medium">Transferts en attente</span>}
                  value={transfertsEnvoyes?.filter(t => t.etat === ETAT_TRANSFERT.EN_ATTENTE).length || 0}
                  valueStyle={{ color: '#0ea5e9', fontSize: '1.5rem', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card 
                className="controller-panel"
                size="small"
                style={{ textAlign: 'center' }}
              >
                <Statistic
                  title={<span className="text-emerald-700 font-medium">Transferts validés</span>}
                  value={transfertsEnvoyes?.filter(t => t.etat === ETAT_TRANSFERT.VALIDE).length || 0}
                  valueStyle={{ color: '#16a34a', fontSize: '1.5rem', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card 
                className="controller-panel"
                size="small"
                style={{ textAlign: 'center' }}
              >
                <Statistic
                  title={<span className="text-emerald-700 font-medium">Montant total transféré</span>}
                  value={transfertsEnvoyes?.filter(t => t.etat === ETAT_TRANSFERT.VALIDE).reduce((acc, t) => acc + t.montant, 0) || 0}
                  formatter={(value) => formatMontant(Number(value))}
                  valueStyle={{ color: '#16a34a', fontSize: '1.5rem', fontWeight: 700 }}
                />
              </Card>
            </Col>
          </Row>
          
          <Tabs
            items={[
              {
                key: 'envoyes_en_attente',
                label: (
                  <Space>
                    <ClockCircleOutlined />
                    En attente ({transfertsEnAttenteEnvoyes.length})
                  </Space>
                ),
                children: (
                  <Table
                    className="controller-table"
                    columns={columnsTransfertsEnvoyes}
                    dataSource={transfertsEnAttenteEnvoyes}
                    rowKey="_id"
                    pagination={{ pageSize: 5 }}
                    scroll={{ x: 600 }}
                  />
                ),
              },
              {
                key: 'envoyes_valides',
                label: (
                  <Space>
                    <CheckCircleOutlined />
                    Validés ({transfertsValidesEnvoyes.length})
                  </Space>
                ),
                children: (
                  <Table
                    className="controller-table"
                    columns={columnsTransfertsEnvoyes}
                    dataSource={transfertsValidesEnvoyes}
                    rowKey="_id"
                    pagination={{ pageSize: 5 }}
                    scroll={{ x: 600 }}
                  />
                ),
              },
              {
                key: 'envoyes_refuses',
                label: (
                  <Space>
                    <CloseCircleOutlined />
                    Refusés ({transfertsRefusesEnvoyes.length})
                  </Space>
                ),
                children: (
                  <Table
                    className="controller-table"
                    columns={columnsTransfertsEnvoyes}
                    dataSource={transfertsRefusesEnvoyes}
                    rowKey="_id"
                    pagination={{ pageSize: 5 }}
                    scroll={{ x: 600 }}
                  />
                ),
              },
            ]}
          />
        </Card>
      </Space>
      </div>

      {/* Modal Transfert vers Caissier Principal */}
      <Modal 
        open={openedTransfert} 
        onCancel={() => {
          setOpenedTransfert(false);
          setMontantTransfert(0);
          setSelectedCaissier(undefined);
          setNoteTransfert('');
        }}
        title={
          <Space>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
              <SendOutlined style={{ fontSize: 20 }} />
            </div>
            <Title level={4} style={{ margin: 0, color: '#0ea5e9' }}>Transfert vers Caissier Principal</Title>
          </Space>
        }
        footer={[
          <Button 
            key="cancel" 
            size="large"
            onClick={() => {
              setOpenedTransfert(false);
              setMontantTransfert(0);
              setSelectedCaissier(undefined);
              setNoteTransfert('');
            }}
          >
            Annuler
          </Button>,
          <Button 
            key="submit" 
            type="primary"
            size="large"
            icon={<SendOutlined />}
            onClick={handleTransfert}
            disabled={!montantTransfert || montantTransfert <= 0 || !selectedCaissier}
            loading={isPendingTransfert}
          >
            Envoyer le Transfert
          </Button>,
        ]}
        width="90%"
        style={{ maxWidth: 600 }}
        centered
      >
        <Space direction="vertical" size="large" style={{ width: '100%', padding: '8px 0' }}>
          {/* Solde disponible */}
          <Card 
            className="controller-panel"
            size="small" 
          >
            <Row align="middle" gutter={16}>
              <Col flex="none">
                <WalletOutlined style={{ fontSize: 24, color: '#16a34a' }} />
              </Col>
              <Col flex="auto">
                <Text type="secondary" style={{ fontSize: 12 }}>Votre solde disponible</Text>
                <Title level={3} style={{ margin: 0, color: '#16a34a' }}>
                  {formatMontant(soldeDisponible)}
                </Title>
              </Col>
            </Row>
          </Card>

          {/* Sélection du caissier principal */}
          <div>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
              Sélectionner un caissier principal
            </Text>
            <Select
              size="large"
              placeholder="Choisir un caissier principal"
              value={selectedCaissier}
              onChange={(value) => setSelectedCaissier(value)}
              style={{ width: '100%' }}
              loading={isLoadingCaissiers}
              showSearch
              optionFilterProp="children"
            >
              {caissiersPrincipaux?.map((caissier) => (
                <Select.Option key={caissier._id} value={caissier._id}>
                  <Space>
                    <UserOutlined />
                    {caissier.name}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </div>
          
          {/* Montant du transfert */}
          <div>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
              Montant du transfert
            </Text>
            <InputNumber
              size="large"
              min={1}
              max={soldeDisponible}
              step={100}
              placeholder="Entrez le montant"
              value={montantTransfert}
              onChange={(value) => setMontantTransfert(value || 0)}
              style={{ width: '100%', fontSize: 16 }}
              addonAfter="FCFA"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
            />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
              Maximum: {formatMontant(soldeDisponible)}
            </Text>
          </div>

          {/* Note optionnelle */}
          <div>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
              Note (optionnelle)
            </Text>
            <Input.TextArea
              size="large"
              placeholder="Ajouter une note..."
              value={noteTransfert}
              onChange={(e) => setNoteTransfert(e.target.value)}
              rows={2}
            />
          </div>
          
          {/* Aperçu du transfert */}
          {montantTransfert > 0 && selectedCaissier && (
            <Card 
              className="controller-panel"
              size="small" 
            >
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Aperçu du transfert
                </Text>
                <Divider style={{ margin: '8px 0' }} />
                <Row justify="space-between" align="middle">
                  <Col>
                    <Text type="secondary">Montant à transférer</Text>
                  </Col>
                  <Col>
                    <Text strong style={{ color: '#0ea5e9', fontSize: 16 }}>
                      {formatMontant(montantTransfert)}
                    </Text>
                  </Col>
                </Row>
                <Row justify="space-between" align="middle">
                  <Col>
                    <Text type="secondary">Caissier Principal</Text>
                  </Col>
                  <Col>
                    <Text strong>
                      {caissiersPrincipaux?.find(c => c._id === selectedCaissier)?.name || '-'}
                    </Text>
                  </Col>
                </Row>
                <Divider style={{ margin: '8px 0' }} />
                <Row justify="space-between" align="middle">
                  <Col>
                    <Text strong style={{ fontSize: 15 }}>Solde après transfert</Text>
                  </Col>
                  <Col>
                    <Title level={3} style={{ margin: 0, color: '#16a34a' }}>
                      {formatMontant(soldeDisponible - montantTransfert)}
                    </Title>
                  </Col>
                </Row>
              </Space>
            </Card>
          )}
        </Space>
      </Modal>
    </Spin>
  );
}
