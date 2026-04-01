import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  Table,
  Button,
  Space,
  Tag,
  Typography,
  message,
  Modal,
  Form,
  Input,
  DatePicker,
  Switch,
  Popconfirm,
  Row,
  Col,
  Statistic
} from 'antd';
import { 
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useState } from "react";
import dayjs from "@/config/dayjs.config";
import { SessionService } from '@/services/session.service';
import type { AxiosError } from 'axios';
import type { Session, SessionStatus, SessionFormValues } from '@/types/session';
import type { ColumnsType } from 'antd/es/table';
import { getSession } from '@/auth/auth-client';
import { USER_ROLE } from '@/types/user.roles';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// Constantes pour les statuts
const SessionStatusColors: Record<SessionStatus, string> = {
  active: 'green',
  en_cours: 'blue',
  a_venir: 'orange',
  terminee: 'default'
};

const SessionStatusLabels: Record<SessionStatus, string> = {
  active: 'ACTIVE',
  en_cours: 'EN COURS',
  a_venir: 'À VENIR',
  terminee: 'TERMINÉE'
};

// Fonctions utilitaires
const formatSessionDate = (date: string): string => {
  return dayjs(date).format('DD/MM/YYYY');
};

const getSessionStatus = (session: Session): SessionStatus => {
  if (session.isActive) return 'active';
  
  const now = dayjs();
  const debut = dayjs(session.dateDebut);
  const fin = dayjs(session.dateFin);
  
  if (now.isBefore(debut)) return 'a_venir';
  if (now.isAfter(fin)) return 'terminee';
  return 'en_cours';
};

const isValidAnnee = (annee: string): boolean => {
  // Format: 2024-2025 ou 2024
  const regex = /^\d{4}(-\d{4})?$/;
  return regex.test(annee);
};

export const Route = createFileRoute('/admin/sessions/')({
   beforeLoad: async () => {
    const session = await getSession();
    if (session.data?.user?.role !== USER_ROLE.SUPERADMIN) {
      throw redirect({ to: '/admin/unauthorized' });
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [form] = Form.useForm<SessionFormValues>();
  const queryClient = useQueryClient();
  const sessionService = new SessionService();

  // Récupérer toutes les sessions
  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: () => sessionService.getAll(),
  });

  // Récupérer la session active
  const { data: activeSession } = useQuery<Session>({
    queryKey: ['session-active'],
    queryFn: () => sessionService.getActive(),
  });

  // Mutation pour créer une session
  const createMutation = useMutation({
    mutationFn: (data: Partial<Session>) => sessionService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey:['sessions']});
      queryClient.invalidateQueries({queryKey:['session-active']});
      message.success('Session créée avec succès');
      setModalOpen(false);
      form.resetFields();
    },
    onError: (error:AxiosError) => {
      message.error(error.message || 'Erreur lors de la création');
    }
  });

  // Mutation pour mettre à jour une session
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Session> }) => sessionService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session-active'] });
      message.success('Session mise à jour avec succès');
      setModalOpen(false);
      setEditingSession(null);
      form.resetFields();
    },
    onError: (error:AxiosError) => {
      message.error(error.message || 'Erreur lors de la mise à jour');
    }
  });

  // Mutation pour supprimer une session
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sessionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session-active'] });
      message.success('Session supprimée avec succès');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  });

  // Mutation pour activer une session
  const activateMutation = useMutation({
    mutationFn: (id: string) => sessionService.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session-active'] });
      message.success('Session activée avec succès');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error(error.response?.data?.message || 'Erreur lors de l\'activation');
    }
  });

  // Mutation pour désactiver une session
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => sessionService.update(id, { isActive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session-active'] });
      message.success('Session désactivée avec succès');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error(error.response?.data?.message || 'Erreur lors de la désactivation');
    }
  });

  // Ouvrir le modal de création
  const handleCreate = () => {
    setEditingSession(null);
    form.resetFields();
    setModalOpen(true);
  };

  // Ouvrir le modal d'édition
  const handleEdit = (session: Session) => {
    setEditingSession(session);
    form.setFieldsValue({
      annee: session.annee,
      dateRange: [dayjs(session.dateDebut), dayjs(session.dateFin)],
      description: session.description,
    });
    setModalOpen(true);
  };

  // Soumettre le formulaire
  const handleSubmit = async (values: SessionFormValues) => {
    const sessionData = {
      annee: values.annee,
      dateDebut: values.dateRange[0].toISOString(),
      dateFin: values.dateRange[1].toISOString(),
      description: values.description || '',
    };

    if (editingSession) {
      updateMutation.mutate({ id: editingSession._id, data: sessionData });
    } else {
      createMutation.mutate(sessionData);
    }
  };

  // Supprimer une session
  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // Activer/Désactiver une session
  const handleToggleActive = (session: Session) => {
    if (session.isActive) {
      deactivateMutation.mutate(session._id);
    } else {
      activateMutation.mutate(session._id);
    }
  };

  // Statistiques
  const stats = {
    total: sessions?.length || 0,
    active: sessions?.filter((s: Session) => s.isActive).length || 0,
    enCours: sessions?.filter((s: Session) => getSessionStatus(s) === 'en_cours').length || 0,
    aVenir: sessions?.filter((s: Session) => getSessionStatus(s) === 'a_venir').length || 0,
  };

  // Colonnes du tableau
  const columns: ColumnsType<Session> = [
    {
      title: 'Année',
      dataIndex: 'annee',
      key: 'annee',
      sorter: (a: Session, b: Session) => a.annee.localeCompare(b.annee),
      render: (annee: string) => <Text strong>{annee}</Text>
    },
    {
      title: 'Période',
      key: 'periode',
      render: (_: any, record: Session) => (
        <Space direction="vertical" size={0}>
          <Text>Du {formatSessionDate(record.dateDebut)}</Text>
          <Text>Au {formatSessionDate(record.dateFin)}</Text>
        </Space>
      )
    },
    {
      title: 'Statut',
      key: 'statut',
      render: (_, record) => {
        const status = getSessionStatus(record);
        return (
          <Tag color={SessionStatusColors[status]}>
            {SessionStatusLabels[status]}
          </Tag>
        );
      },
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'En cours', value: 'en_cours' },
        { text: 'À venir', value: 'a_venir' },
        { text: 'Terminée', value: 'terminee' },
      ],
      onFilter: (value: any, record: Session) => getSessionStatus(record) === value,
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      align: 'center',
      render: (isActive: boolean, record: Session) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleActive(record)}
          checkedChildren={<CheckCircleOutlined />}
          unCheckedChildren={<CloseCircleOutlined />}
          loading={activateMutation.isPending || deactivateMutation.isPending}
        />
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || <Text type="secondary">Aucune description</Text>
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_: any, record: Session) => (
        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            Modifier
          </Button>
          <Popconfirm
            title="Supprimer la session"
            description="Êtes-vous sûr de vouloir supprimer cette session ?"
            onConfirm={() => handleDelete(record._id)}
            okText="Oui"
            cancelText="Non"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
              loading={deleteMutation.isPending}
            >
              Supprimer
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', padding: '24px' }}>
      {/* Header */}
      <Card style={{ background: 'linear-gradient(to right, #e6f7ff, #f0f5ff)' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Title level={2} style={{ margin: 0 }}>
                <CalendarOutlined style={{ marginRight: 8 }} />
                Gestion des Sessions E-campus
              </Title>
              <Text type="secondary">
                Gérez les sessions e-campus
              </Text>
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              size="large"
            >
              Nouvelle Session
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Session Active */}
      {activeSession && (
        <Card style={{ borderLeft: '4px solid #52c41a' }}>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space direction="vertical" size={0}>
                <Text type="secondary">Session Active</Text>
                <Title level={3} style={{ margin: 0 }}>
                  {activeSession.annee}
                </Title>
                <Text>
                  Du {formatSessionDate(activeSession.dateDebut)} au {formatSessionDate(activeSession.dateFin)}
                </Text>
              </Space>
            </Col>
            <Col>
              <Tag color="green" style={{ fontSize: '16px', padding: '8px 16px' }}>
                <CheckCircleOutlined /> ACTIVE
              </Tag>
            </Col>
          </Row>
        </Card>
      )}

      {/* Statistiques */}
      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Sessions"
              value={stats.total}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Session Active"
              value={stats.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="En Cours"
              value={stats.enCours}
              prefix={<InfoCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="À Venir"
              value={stats.aVenir}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tableau des sessions */}
      <Card>
        <Table
          columns={columns}
          dataSource={sessions}
          rowKey="_id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total: ${total} sessions`,
          }}
        />
      </Card>

      {/* Modal de création/édition */}
      <Modal
        title={editingSession ? 'Modifier la Session' : 'Nouvelle Session'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingSession(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Année Académique"
            name="annee"
            rules={[
              { required: true, message: 'Saisissez l\'année' },
              {
                validator: (_, value) => {
                  if (!value || isValidAnnee(value)) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Format invalide (ex: 2024-2025 ou 2024)'));
                }
              }
            ]}
          >
            <Input placeholder="Ex: 2024-2025" />
          </Form.Item>

          <Form.Item
            label="Période"
            name="dateRange"
            rules={[{ required: true, message: 'Sélectionnez la période' }]}
          >
            <RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder={['Date de début', 'Date de fin']}
            />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <TextArea
              rows={4}
              placeholder="Description de la session (optionnel)"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setModalOpen(false);
                setEditingSession(null);
                form.resetFields();
              }}>
                Annuler
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingSession ? 'Mettre à jour' : 'Créer'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
