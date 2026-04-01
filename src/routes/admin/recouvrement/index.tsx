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
  DollarOutlined,
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TransfertVersementService } from '@/services/transfert-versement.service';
import { UserService } from '@/services/user.service';
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
  
  const transfertsRecusKey = ['transferts-recouvreur', session?.user?.id];
  const transfertsEnvoyesKey = ['transferts-envoyes-recouvreur', session?.user?.id];
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
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Erreur lors du transfert');
    }
  });

  // Calcul du solde disponible (transferts validés - transferts envoyés validés)
  const soldeDisponible = (transfertsRecus?.filter(t => t.etat === ETAT_TRANSFERT.VALIDE).reduce((acc, t) => acc + t.montant, 0) || 0)
    - (transfertsEnvoyes?.filter(t => t.etat === ETAT_TRANSFERT.VALIDE && typeof t.expediteur === 'object' && t.expediteur._id === session?.user?.id).reduce((acc, t) => acc + t.montant, 0) || 0);

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

  // Filtrer les transferts selon l'onglet actif
  const transfertsEnAttenteRecus = transfertsRecus?.filter(t => t.etat === ETAT_TRANSFERT.EN_ATTENTE) || [];
  const transfertsValidesRecus = transfertsRecus?.filter(t => t.etat === ETAT_TRANSFERT.VALIDE) || [];
  const transfertsRefusesRecus = transfertsRecus?.filter(t => t.etat === ETAT_TRANSFERT.REFUSE) || [];

  const mesTransfertsEnvoyes = transfertsEnvoyes?.filter(t => 
    typeof t.expediteur === 'object' && t.expediteur._id === session?.user?.id
  ) || [];

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
      dataIndex: 'source_acteur_id',
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
      dataIndex: 'destinataire',
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
    <Spin spinning={isLoadingTransfertsRecus || isLoadingTransfertsEnvoyes || isPendingValider || isPendingRefuser}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        {/* Header Section */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card style={{ background: 'linear-gradient(to right, #fff7e6, #ffe7ba)', borderColor: '#ffd591' }}>
              <Space orientation="vertical">
                <Title level={3} style={{ margin: 0, color: '#fa8c16' }}>
                  💼 Espace Recouvreur
                </Title>
                <Text type="secondary">
                  Gérez les transferts reçus des vendeurs et envoyez les fonds au caissier principal
                </Text>
              </Space>
            </Card>
          </Col>
          
          <Col xs={24} lg={8}>
            <Card style={{ background: 'linear-gradient(to bottom right, #f6ffed, #d9f7be)', borderColor: '#b7eb8f' }}>
              <Space orientation="vertical" style={{ width: '100%' }}>
                <Space>
                  <WalletOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                  <Text strong style={{ color: '#389e0d' }}>
                    Mon Solde Disponible
                  </Text>
                </Space>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Fonds à transférer</Text>
                  <Title level={2} style={{ margin: '8px 0', color: '#52c41a' }}>
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
                value={transfertsValidesRecus.reduce((acc, t) => acc + t.montant, 0)}
                formatter={(value) => formatMontant(Number(value))}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Transferts reçus des vendeurs */}
        <Card
          title={
            <Space>
              <DollarOutlined style={{ fontSize: 20, color: '#fa8c16' }} />
              <Text strong style={{ color: '#fa8c16' }}>Transferts reçus des vendeurs</Text>
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

        {/* Section Transfert vers Caissier Principal */}
        <Card
          title={
            <Space>
              <SendOutlined style={{ fontSize: 20, color: '#1890ff' }} />
              <Text strong style={{ color: '#1890ff' }}>Transfert vers Caissier Principal</Text>
            </Space>
          }
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
                size="small" 
                style={{ 
                  background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
                  borderColor: '#91d5ff'
                }}
              >
                <Statistic
                  title="Transferts en attente"
                  value={mesTransfertsEnvoyes.filter(t => t.etat === ETAT_TRANSFERT.EN_ATTENTE).length}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card 
                size="small"
                style={{ 
                  background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                  borderColor: '#b7eb8f'
                }}
              >
                <Statistic
                  title="Transferts validés"
                  value={mesTransfertsEnvoyes.filter(t => t.etat === ETAT_TRANSFERT.VALIDE).length}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card 
                size="small"
                style={{ 
                  background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                  borderColor: '#b7eb8f'
                }}
              >
                <Statistic
                  title="Montant total transféré"
                  value={mesTransfertsEnvoyes.filter(t => t.etat === ETAT_TRANSFERT.VALIDE).reduce((acc, t) => acc + t.montant, 0)}
                  formatter={(value) => formatMontant(Number(value))}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>
          
          <Table
            columns={columnsTransfertsEnvoyes}
            dataSource={mesTransfertsEnvoyes}
            rowKey="_id"
            pagination={{ pageSize: 5 }}
            scroll={{ x: 600 }}
          />
        </Card>
      </Space>

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
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(24, 144, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <SendOutlined style={{ color: '#1890ff', fontSize: 20 }} />
            </div>
            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>Transfert vers Caissier Principal</Title>
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
            size="small" 
            style={{ 
              background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
              border: '1px solid #b7eb8f',
              borderRadius: 12
            }}
          >
            <Row align="middle" gutter={16}>
              <Col flex="none">
                <WalletOutlined style={{ fontSize: 24, color: '#52c41a' }} />
              </Col>
              <Col flex="auto">
                <Text type="secondary" style={{ fontSize: 12 }}>Votre solde disponible</Text>
                <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
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
              size="small" 
              style={{ 
                background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', 
                borderColor: '#91d5ff',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(24, 144, 255, 0.1)'
              }}
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
                    <Text strong style={{ color: '#1890ff', fontSize: 16 }}>
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
                    <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
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
