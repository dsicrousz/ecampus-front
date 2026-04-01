import { createFileRoute, redirect, useNavigate} from '@tanstack/react-router'
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
  Divider,
  Row,
  Col,
  message,
  Switch,
  Tag,
  Popconfirm,
  InputNumber
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  SearchOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useMemo, useState, useEffect } from "react";
import { TicketService } from '@/services/ticket.service';
import { ServiceService } from '@/services/service.service';
import { getSession } from '@/auth/auth-client';
import type { ColumnsType } from 'antd/es/table';
import { TypeService, type Service } from '@/types/service';
import { USER_ROLE } from '@/types/user.roles';
import { QUERY_KEYS } from '@/constants';
import { UserService } from '@/services/user.service';
import type { User } from '@/types/user';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ServiceFormValues {
  _id?: string;
  nom: string;
  typeService: TypeService;
  gerant: string;
  agentsControle?: string[];
  ticketsacceptes?: string[];
  localisation?: string;
  nombre_de_places?: number;
  description?: string;
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
   beforeLoad: async () => {
    const session = await getSession();
    if (session.data?.user?.role !== USER_ROLE.SUPERADMIN) {
      throw redirect({ to: '/admin/unauthorized' });
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const [opened, setOpened] = useState(false);
  const [openedU, setOpenedU] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeService | null>(null);
  const navigate = useNavigate();
  // Debounce search text
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);
  
  const [form] = Form.useForm();
  const [formU] = Form.useForm();
  
  const qc = useQueryClient();
  const serviceService = new ServiceService();
  const ticketService = new TicketService();
  const userService = new UserService();


  const { data: services, isLoading: isLoadingServices } = useQuery({ 
    queryKey: [QUERY_KEYS.SERVICES], 
    queryFn: () => serviceService.getAll() 
  });

  // Fetch users for gerant and agents selection
  const { data: controleurs, isLoading: isLoadingControleurs } = useQuery({ 
    queryKey: [QUERY_KEYS.USERS,USER_ROLE.CONTROLEUR], 
    queryFn: () =>  userService.byRole(USER_ROLE.CONTROLEUR)
  });

   // Fetch users for gerant and agents selection
  const { data: gerants, isLoading: isLoadingGerants } = useQuery({ 
    queryKey: [QUERY_KEYS.USERS,USER_ROLE.REPREUNEUR], 
    queryFn: () =>  userService.byRole(USER_ROLE.REPREUNEUR)
  });


  // Fetch tickets for selection
  const { data: tickets, isLoading: isLoadingTickets } = useQuery({ 
    queryKey: [QUERY_KEYS.TICKETS], 
    queryFn: () => ticketService.getAll() 
  });

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

  const onCreate = (values: ServiceFormValues) => {
    createService(values);
  };

  const onUpdate = (values: Service) => {
    const { _id, createdAt, updatedAt, __v, ...rest } = values as any;
    // Extract IDs if gerant, agentsControle or ticketsacceptes are objects
    const data: Partial<ServiceFormValues> = {
      nom: rest.nom,
      typeService: rest.typeService,
      gerant: typeof rest.gerant === 'object' && rest.gerant?._id ? rest.gerant._id : (rest.gerant as any),
      agentsControle: rest.agentsControle?.map((agent: any) => 
        typeof agent === 'object' && agent._id ? agent._id : agent
      ) || [],
      ticketsacceptes: rest.ticketsacceptes?.map((ticket: any) => 
        typeof ticket === 'object' && ticket._id ? ticket._id : ticket
      ) || [],
      localisation: rest.localisation,
      nombre_de_places: rest.nombre_de_places,
      description: rest.description,
      active: rest.active
    };
    updateService({ id: _id, data });
  };

  const handleUpdate = (record: Service) => {
    // Extract IDs for form
    const formData = {
      ...record,
      gerant: typeof record.gerant === 'object' && record.gerant?._id ? record.gerant._id : record.gerant,
      agentsControle: record.agentsControle?.map((agent: any) => 
        typeof agent === 'object' && agent._id ? agent._id : agent
      ) || [],
      ticketsacceptes: record.ticketsacceptes?.map((ticket: any) => 
        typeof ticket === 'object' && ticket._id ? ticket._id : ticket
      ) || []
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
      active: true,
      agentsControle: [],
      ticketsacceptes: []
    });
    setOpened(true);
  };



  // Prepare ticket options
  const ticketOptions = useMemo(() => {
    if (!tickets) return [];
    return tickets.map(ticket => ({
      value: ticket._id,
      label: `${ticket.nom} - ${ticket.prix} FCFA`
    }));
  }, [tickets]);

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
      dataIndex: 'typeService',
      key: 'typeService',
      align: 'center' as const,
      filters: TypeServiceOptions.map(opt => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.typeService === value,
      render: (type: TypeService) => (
        <Tag color={TypeServiceColors[type]} icon={<ShopOutlined />}>
          {TypeServiceLabels[type]}
        </Tag>
      ),
    },
    {
      title: 'Gérant',
      dataIndex: 'gerant',
      key: 'gerant',
      render: (gerant) => gerant ? gerants?.find((user: User) => user._id === gerant)?.name : '-',
    },
    {
      title: 'Agents de Contrôle',
      dataIndex: 'agentsControle',
      key: 'agentsControle',
      align: 'center' as const,
      render: (agents: any[]) => (
        <Tag color="blue" icon={<TeamOutlined />}>
          {agents?.length || 0} agent(s)
        </Tag>
      ),
    },
    {
      title: 'Tickets Acceptés',
      dataIndex: 'ticketsacceptes',
      key: 'ticketsacceptes',
      align: 'center' as const,
      render: (tickets: any[]) => (
        <Tag color="green">
          {tickets?.length || 0} ticket(s)
        </Tag>
      ),
    },
    {
      title: 'Localisation',
      dataIndex: 'localisation',
      key: 'localisation',
      render: (text: string) => text ? (
        <Space>
          <EnvironmentOutlined style={{ color: '#1890ff' }} />
          <Text>{text}</Text>
        </Space>
      ) : '-',
    },
    {
      title: 'Places',
      dataIndex: 'nombre_de_places',
      key: 'nombre_de_places',
      align: 'center' as const,
      sorter: (a: Service, b: Service) => (a.nombre_de_places || 0) - (b.nombre_de_places || 0),
      render: (nb: number) => nb || '-',
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
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleUpdate(record)}
            style={{ color: '#52c41a' }}
            title="Modifier"
          />
          <Popconfirm
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
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredServices = useMemo(() => {
    if (!services) return [];
    let filtered = services;
    
    // Filter by search text
    if (debouncedSearchText) {
      const searchLower = debouncedSearchText.toLowerCase();
      filtered = filtered.filter(service => 
        service.nom?.toLowerCase().includes(searchLower) ||
        service.localisation?.toLowerCase().includes(searchLower) ||
        service.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by type
    if (typeFilter) {
      filtered = filtered.filter(service => service.typeService === typeFilter);
    }
    
    return filtered;
  }, [services, debouncedSearchText, typeFilter]);

  return (
    <div>
      <Card 
        style={{ 
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
        }}
      >
        <Space orientation="vertical" size="large" style={{ width: '90%' }}>
          {/* Header */}
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={3} style={{ margin: 0 }}>
                <ShopOutlined /> Gestion des Services
              </Title>
              <Text type="secondary">
                {filteredServices?.length || 0} service(s) au total
              </Text>
            </Col>
            <Col>
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={handleOpenCreate}
                style={{ 
                  background: '#22C55E',
                  borderColor: '#22C55E'
                }}
              >
                Ajouter un service
              </Button>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />

          {/* Search & Filters */}
          <Row gutter={16}>
            <Col xs={24} sm={12} md={10}>
              <Input.Search
                prefix={<SearchOutlined />}
                placeholder="Rechercher par nom, localisation..."
                allowClear
                size="large"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Filtrer par type"
                allowClear
                size="large"
                style={{ width: '100%' }}
                value={typeFilter}
                onChange={setTypeFilter}
                options={TypeServiceOptions}
              />
            </Col>
          </Row>

          {/* Table */}
          <Table
            columns={columns}
            dataSource={filteredServices}
            rowKey="_id"
            scroll={{ x: 1200 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total: ${total} services`,
            }}
            bordered
          />
        </Space>
      </Card>

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
        <Spin spinning={loadingCreate || isLoadingControleurs || isLoadingGerants || isLoadingServices}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onCreate}
            initialValues={{
              active: true,
              agentsControle: []
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
              name="typeService"
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
              name="gerant"
              label="Gérant"
              rules={[{ required: true, message: 'Le gérant est requis' }]}
            >
              <Select
                size="large"
                showSearch
                placeholder="Sélectionner un gérant"
                options={gerants?.map(user => ({
                  value: user._id,
                  label: `${user.email} - ${user.name}`
                }))}
              />
            </Form.Item>

            <Form.Item
              name="agentsControle"
              label="Agents de Contrôle"
            >
              <Select
                mode="multiple"
                size="large"
                showSearch
                placeholder="Sélectionner des agents"
                options={controleurs?.map(user => ({
                  value: user._id,
                  label: `${user.email} - ${user.name}`
                }))}
              />
            </Form.Item>

            <Form.Item
              name="ticketsacceptes"
              label="Tickets Acceptés"
              tooltip="Sélectionnez les tickets qui peuvent être utilisés dans ce service"
            >
              <Select
                mode="multiple"
                size="large"
                showSearch
                placeholder="Sélectionner des tickets"
                options={ticketOptions}
                loading={isLoadingTickets}
                filterOption={(input, option) =>
                  option?.label?.toLowerCase().includes(input.toLowerCase()) || false
                }
              />
            </Form.Item>

            <Form.Item
              name="localisation"
              label="Localisation"
            >
              <Input 
                size="large" 
                prefix={<EnvironmentOutlined />} 
                placeholder="Ex: Bâtiment A, 1er étage"
              />
            </Form.Item>

            <Form.Item
              name="nombre_de_places"
              label="Nombre de Places"
            >
              <InputNumber 
                size="large" 
                min={0}
                style={{ width: '100%' }}
                placeholder="Ex: 100"
              />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
            >
              <TextArea 
                rows={4}
                placeholder="Description du service..."
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
        <Spin spinning={loadingUpdate || isLoadingControleurs}>
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
              name="typeService"
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
              name="gerant"
              label="Gérant"
              rules={[{ required: true, message: 'Le gérant est requis' }]}
            >
              <Select
                size="large"
                showSearch
                placeholder="Sélectionner un gérant"
                options={gerants?.map(user => ({
                  value: user._id,
                  label: `${user.email} - ${user.name}`
                }))}
              />
            </Form.Item>

            <Form.Item
              name="agentsControle"
              label="Agents de Contrôle"
            >
              <Select
                mode="multiple"
                size="large"
                showSearch
                placeholder="Sélectionner des agents"
                options={controleurs?.map(user => ({
                  value: user._id,
                  label: `${user.email} - ${user.name}`
                }))}
              />
            </Form.Item>

            <Form.Item
              name="ticketsacceptes"
              label="Tickets Acceptés"
              tooltip="Sélectionnez les tickets qui peuvent être utilisés dans ce service"
            >
              <Select
                mode="multiple"
                size="large"
                showSearch
                placeholder="Sélectionner des tickets"
                options={ticketOptions}
                loading={isLoadingTickets}
                filterOption={(input, option) =>
                  option?.label?.toLowerCase().includes(input.toLowerCase()) || false
                }
              />
            </Form.Item>

            <Form.Item
              name="localisation"
              label="Localisation"
            >
              <Input 
                size="large" 
                prefix={<EnvironmentOutlined />} 
                placeholder="Ex: Bâtiment A, 1er étage"
              />
            </Form.Item>

            <Form.Item
              name="nombre_de_places"
              label="Nombre de Places"
            >
              <InputNumber 
                size="large" 
                min={0}
                style={{ width: '100%' }}
                placeholder="Ex: 100"
              />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
            >
              <TextArea 
                rows={4}
                placeholder="Description du service..."
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
