import { createFileRoute, useNavigate} from '@tanstack/react-router'
import { requireRole, canModify } from '@/lib/route-protection';
import { useSession } from '@/auth/auth-client';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Table,
  Button,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Typography,
  Row,
  Col,
  message,
  Switch,
  Tag,
  Popconfirm,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ShopOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useState } from "react";
import { ServiceService } from '@/services/service.service';
import type { ColumnsType } from 'antd/es/table';
import { TypeService, type Service } from '@/types/service';
import { USER_ROLE } from '@/types/user.roles';
import { QUERY_KEYS } from '@/constants';
import { TicketService } from '@/services/ticket.service';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/pagination-controls';

const { Title, Text } = Typography;

interface ServiceFormValues {
  _id?: string;
  nom: string;
  type: TypeService;
  ticket: string;
  active: boolean;
}

// Constants
const TypeServiceOptions = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'sport', label: 'Sport' },
  { value: 'medical', label: 'Médical' },
  { value: 'culture', label: 'Culture' },
  { value: 'logement', label: 'Logement' },
  { value: 'autre', label: 'Autre' }
];

const TypeServiceColors: Record<TypeService, string> = {
  restaurant: 'orange',
  sport: 'green',
  medical: 'red',
  culture: 'purple',
  logement: 'blue',
  autre: 'default'
};

const TypeServiceLabels: Record<TypeService, string> = {
  restaurant: 'Restaurant',
  sport: 'Sport',
  medical: 'Médical',
  culture: 'Culture',
  logement: 'Logement',
  autre: 'Autre'
};

export const Route = createFileRoute('/admin/services/')({
  beforeLoad: () => requireRole([USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN]),
  component: RouteComponent,
})

function RouteComponent() {
  const { data: session } = useSession();
  const canEdit = canModify(session?.user?.role);
  const [opened, setOpened] = useState(false);
  const [openedU, setOpenedU] = useState(false);
  const ticketService = new TicketService();
  const navigate = useNavigate();
  const pagination = usePagination({ initialLimit: 10, initialSortBy: 'nom', initialSortOrder: 'asc' });
  
  const [form] = Form.useForm();
  const [formU] = Form.useForm();
  
  const qc = useQueryClient();
  const serviceService = new ServiceService();


  const { data: servicesData, isLoading: isLoadingServices } = useQuery({ 
    queryKey: [QUERY_KEYS.SERVICES, 'paginated', pagination.params], 
    queryFn: () => serviceService.getPaginated(pagination.params) 
  });
  const services = servicesData?.data ?? [];
  const total = servicesData?.total ?? 0;
  const totalPages = servicesData?.totalPages ?? 1;

  // Fetch tickets for service selection
  const { data: ticketsRaw, isLoading: isLoadingTickets } = useQuery<any>({
    queryKey: [QUERY_KEYS.TICKETS],
    queryFn: () => ticketService.getAll()
  });
  const tickets = Array.isArray(ticketsRaw) ? ticketsRaw : (ticketsRaw?.data ?? []);


  // Create mutation
  const { mutate: createService, isPending: loadingCreate } = useMutation({
    mutationFn: (data: ServiceFormValues) => serviceService.create(data),
    onSuccess: () => {
      message.success('Service créé avec succès!');
      setOpened(false);
      qc.invalidateQueries({queryKey:[QUERY_KEYS.SERVICES]});
      form.resetFields();
    },
    onError: (error) => {
      message.error(error?.message || 'Erreur lors de la création du service');
    }
  });

  // Update mutation
  const { mutate: updateService, isPending: loadingUpdate } = useMutation({
    mutationFn: (data: { id: string; data: Partial<ServiceFormValues> }) => serviceService.update(data.id, data.data),
    onSuccess: () => {
      message.success('Service modifié avec succès!');
      setOpenedU(false);
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.SERVICES] });
    },
    onError: (error: any) => {
      message.error(error?.message || 'Erreur lors de la modification du service');
    }
  });

  // Delete mutation
  const { mutate: deleteService } = useMutation({
    mutationFn: (id: string) => serviceService.delete(id),
    onSuccess: () => {
      message.success('Service supprimé avec succès!');
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.SERVICES] });
    },
    onError: (error: any) => {
      message.error(error?.message || 'Erreur lors de la suppression du service');
    }
  });

  const handleChangeState = (checked: boolean, _id: string) => {
    updateService({ id: _id, data: { active: checked } });
  };

  const onCreate = (values: any) => {
    const data: ServiceFormValues = {
      nom: values.nom,
      type: values.type,
      ticket: values.ticket,
      active: values.active,
    };
    createService(data);
  };

  const onUpdate = (values: any) => {
    const { _id, createdAt, updatedAt, ...rest } = values as any;
    const data: Partial<ServiceFormValues> = {
      nom: rest.nom,
      type: rest.type,
      ticket: typeof rest.ticket === 'object' && rest.ticket?._id ? rest.ticket._id : (rest.ticket as any),
      active: rest.active,
    };
    updateService({ id: _id, data });
  };

  const handleUpdate = (record: Service) => {
    const formData = {
      ...record,
      ticket: typeof record.ticket === 'object' && (record.ticket as any)?._id ? (record.ticket as any)._id : record.ticket,
    };
    formU.setFieldsValue(formData);
    setOpenedU(true);
  };

  const handleDelete = (id: string) => {
    deleteService(id);
  };

  const handleOpenCreate = () => {
    form.resetFields();
    form.setFieldsValue({
      active: true
    });
    setOpened(true);
  };



  // Prepare ticket options

  const columns: ColumnsType<Service> = [
    {
      title: 'Nom',
      dataIndex: 'nom',
      key: 'nom',
      sorter: (a: any, b: any) => a.nom.localeCompare(b.nom),
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      align: 'center' as const,
      filters: TypeServiceOptions.map(opt => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.type === value,
      render: (type: TypeService) => (
        <Tag color={TypeServiceColors[type]} icon={<ShopOutlined />}>
          {TypeServiceLabels[type]}
        </Tag>
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'active',
      key: 'active',
      align: 'center' as const,
      render: (active: boolean, record: Service) => (
        <Switch
          checked={active}
          onChange={(checked) => handleChangeState(checked, record._id)}
          checkedChildren="Actif"
          unCheckedChildren="Inactif"
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      fixed: 'right' as const,
      width: 150,
      render: (_: any, record: Service) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => {
             navigate({to: '/admin/services/$serviceId', params: {serviceId: record._id}});
            }}
            style={{ color: '#1890ff' }}
            title="Voir les détails"
          />
          {canEdit && <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleUpdate(record)}
            style={{ color: '#52c41a' }}
            title="Modifier"
          />}
          {canEdit && <Popconfirm
            title="Supprimer ce service?"
            description="Cette action est irréversible."
            onConfirm={() => handleDelete(record._id)}
            okText="Oui"
            cancelText="Non"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              title="Supprimer"
            />
          </Popconfirm>}
        </Space>
      ),
    },
  ];

  const activeServices = services.filter(s => s.active).length;
  const inactiveServices = services.filter(s => !s.active).length;

  return (
    <div className="controller-page">
      <Spin spinning={isLoadingServices}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          {/* Hero Header */}
          <Card className="controller-hero controller-hero-soft border">
            <Row gutter={[24, 16]} align="middle" wrap>
              <Col flex="none">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <ShopOutlined style={{ fontSize: 28 }} />
                </div>
              </Col>
              <Col flex="auto">
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Gestion
                </Text>
                <Title level={3} className="mb-1! mt-1! text-foreground!">
                  Services
                </Title>
                <Text type="secondary">
                  Gérez tous les services du campus
                </Text>
              </Col>
              <Col flex="none">
                <Space>
                  <Select
                    placeholder="Type"
                    allowClear
                    style={{ width: 150 }}
                    value={pagination.type as TypeService | undefined}
                    onChange={(value) => pagination.setType(value || undefined)}
                    options={TypeServiceOptions}
                  />
                  {canEdit && <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={handleOpenCreate}
                  >
                    Nouveau
                  </Button>}
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Statistiques */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card className="controller-stat-card" size="small">
                <Statistic
                  title={<span className="text-primary font-medium">Total Services</span>}
                  value={total}
                  prefix={<ShopOutlined />}
                  valueStyle={{ color: '#0ea5e9', fontSize: '1.75rem', fontWeight: 800 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="controller-stat-card" size="small">
                <Statistic
                  title={<span className="text-emerald-700 font-medium">Actifs</span>}
                  value={activeServices}
                  valueStyle={{ color: '#16a34a', fontSize: '1.75rem', fontWeight: 800 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="controller-stat-card" size="small">
                <Statistic
                  title={<span className="text-orange-700 font-medium">Inactifs</span>}
                  value={inactiveServices}
                  valueStyle={{ color: '#f97316', fontSize: '1.75rem', fontWeight: 800 }}
                />
              </Card>
            </Col>
          </Row>

          {/* Table */}
          <Card className="controller-panel" title={<span className="text-foreground font-semibold">Liste des Services</span>}>
            <div className="mb-4">
              <PaginationControls
                pagination={pagination}
                total={total}
                totalPages={totalPages}
                pageSizeOptions={[10, 20, 50]}
                searchPlaceholder="Rechercher un service..."
                loading={isLoadingServices}
              />
            </div>
            <Table
              className="controller-table"
              columns={columns}
              dataSource={services}
              rowKey="_id"
              scroll={{ x: 1200 }}
              pagination={false}
              loading={isLoadingServices}
            />
          </Card>
        </Space>
      </Spin>

      {/* Create Drawer */}
      <Drawer
        title={
          <Space>
            <PlusOutlined />
            <span>Créer un Nouveau Service</span>
          </Space>
        }
        width={600}
        open={opened}
        onClose={() => setOpened(false)}
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={() => setOpened(false)}>Annuler</Button>
            <Button 
              type="primary" 
              onClick={() => form.submit()}
              loading={loadingCreate}
              style={{ background: '#422AFB', borderColor: '#422AFB' }}
            >
              Sauvegarder
            </Button>
          </Space>
        }
      >
        <Spin spinning={loadingCreate || isLoadingTickets}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onCreate}
            initialValues={{
              active: true
            }}
          >
            <Form.Item
              name="nom"
              label="Nom du Service"
              rules={[{ required: true, message: 'Le nom est requis' }]}
            >
              <Input 
                size="large" 
                prefix={<ShopOutlined />} 
                placeholder="Ex: Restaurant Central"
              />
            </Form.Item>

            <Form.Item
              name="type"
              label="Type de Service"
              rules={[{ required: true, message: 'Le type est requis' }]}
            >
              <Select
                size="large"
                placeholder="Sélectionner un type"
                options={TypeServiceOptions}
              />
            </Form.Item>

            <Form.Item
              name="ticket"
              label="Ticket"
              rules={[{ required: true, message: 'Le ticket est requis' }]}
            >
              <Select
                size="large"
                showSearch
                placeholder="Sélectionner un ticket"
                options={tickets?.map((t: any) => ({
                  value: t._id,
                  label: `${t.nom} (${t.prix} FCFA)`
                }))}
              />
            </Form.Item>

            <Form.Item
              name="active"
              label="Statut"
              valuePropName="checked"
            >
              <Switch
                checkedChildren="Actif"
                unCheckedChildren="Inactif"
              />
            </Form.Item>
          </Form>
        </Spin>
      </Drawer>

      {/* Update Drawer */}
      <Drawer
        title={
          <Space>
            <EditOutlined />
            <span>Modifier le Service</span>
          </Space>
        }
        width={600}
        open={openedU}
        onClose={() => setOpenedU(false)}
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={() => setOpenedU(false)}>Annuler</Button>
            <Button 
              type="primary" 
              onClick={() => formU.submit()}
              loading={loadingUpdate}
              style={{ background: '#422AFB', borderColor: '#422AFB' }}
            >
              Mettre à jour
            </Button>
          </Space>
        }
      >
        <Spin spinning={loadingUpdate || isLoadingTickets}>
          <Form
            form={formU}
            layout="vertical"
            onFinish={onUpdate}
          >
            <Form.Item name="_id" hidden>
              <Input />
            </Form.Item>

            <Form.Item
              name="nom"
              label="Nom du Service"
              rules={[{ required: true, message: 'Le nom est requis' }]}
            >
              <Input 
                size="large" 
                prefix={<ShopOutlined />} 
                placeholder="Ex: Restaurant Central"
              />
            </Form.Item>

            <Form.Item
              name="type"
              label="Type de Service"
              rules={[{ required: true, message: 'Le type est requis' }]}
            >
              <Select
                size="large"
                placeholder="Sélectionner un type"
                options={TypeServiceOptions}
              />
            </Form.Item>

            <Form.Item
              name="ticket"
              label="Ticket"
              rules={[{ required: true, message: 'Le ticket est requis' }]}
            >
              <Select
                size="large"
                showSearch
                placeholder="Sélectionner un ticket"
                options={tickets?.map((t: any) => ({
                  value: t._id,
                  label: `${t.nom} (${t.prix} FCFA)`
                }))}
              />
            </Form.Item>

            <Form.Item
              name="active"
              label="Statut"
              valuePropName="checked"
            >
              <Switch
                checkedChildren="Actif"
                unCheckedChildren="Inactif"
              />
            </Form.Item>
          </Form>
        </Spin>
      </Drawer>
    </div>
  );
}
