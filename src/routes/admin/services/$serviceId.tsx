import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { 
  Card, 
  Descriptions, 
  Typography, 
  Space, 
  Button, 
  Tag, 
  Row, 
  Col, 
  Spin,
  Divider,
  Avatar,
  Empty,
  Table,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Select,
  Image,
  List,
  DatePicker,
} from 'antd';
import { 
  ArrowLeftOutlined, 
  ShopOutlined, 
  UserOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CoffeeOutlined,
  PictureOutlined,
  CalendarOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { ServiceService } from '@/services/service.service';
import { type Plat } from '@/types/plat';
import { PlatService } from '@/services/plat.service';
import { MenuService } from '@/services/menu.service';
import { QUERY_KEYS } from '@/constants';
import type { Menu } from '@/types/menu';
import type { User } from '@/types/user';
import type { Ticket } from '@/types/ticket';
import dayjs from '@/config/dayjs.config';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;


export const Route = createFileRoute('/admin/services/$serviceId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { serviceId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const serviceService = new ServiceService();
  const platService = new PlatService();
  const menuService = new MenuService();
  
  const [isPlatModalOpen, setIsPlatModalOpen] = useState(false);
  const [editingPlat, setEditingPlat] = useState<Plat | null>(null);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [platForm] = Form.useForm();
  const [menuForm] = Form.useForm();

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => serviceService.getOne(serviceId),
    enabled: !!serviceId
  });

  // Query pour les plats (uniquement si restaurant)
  const isRestaurant = service?.typeService === 'restaurant';
  const { data: plats, isLoading: isLoadingPlats } = useQuery({
    queryKey: [QUERY_KEYS.PLATS, QUERY_KEYS.SERVICES, serviceId],
    queryFn: () => platService.byRestaurant(serviceId),
    enabled: !!serviceId && isRestaurant
  });

  // Query pour les menus (uniquement si restaurant)
  const { data: menus, isLoading: isLoadingMenus } = useQuery({
    queryKey: [QUERY_KEYS.MENUS, QUERY_KEYS.SERVICES, serviceId],
    queryFn: () => menuService.byRestaurant(serviceId),
    enabled: !!serviceId && isRestaurant
  });

  // Plats mutations
  const { mutate: createPlat, isPending: loadingCreatePlat } = useMutation({
    mutationFn: (data: Plat) => platService.create(data),
    onSuccess: () => {
      message.success('Plat créé avec succès!');
      setIsPlatModalOpen(false);
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.PLATS, QUERY_KEYS.SERVICES, serviceId] });
      platForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.message || 'Erreur lors de la création du plat');
    }
  });

  const { mutate: updatePlat, isPending: loadingUpdatePlat } = useMutation({
    mutationFn: (data: {id:string,data:Plat}) => platService.update(data.id, data.data),
    onSuccess: () => {
      message.success('Plat modifié avec succès!');
      setIsPlatModalOpen(false);
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.PLATS, QUERY_KEYS.SERVICES, serviceId] });
      setEditingPlat(null);
    },
    onError: (error: any) => {
      message.error(error?.message || 'Erreur lors de la modification du plat');
    }
  });

  const { mutate: deletePlat } = useMutation({
    mutationFn: (platId: string) => platService.delete(platId),
    onSuccess: () => {
      message.success('Plat supprimé avec succès!');
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.PLATS, QUERY_KEYS.SERVICES, serviceId] });
    },
    onError: (error: any) => {
      message.error(error?.message || 'Erreur lors de la suppression du plat');
    }
  });

  // Plats handlers
  const handleOpenCreatePlat = () => {
    setEditingPlat(null);
    platForm.resetFields();
    platForm.setFieldsValue({
      service: serviceId
    });
    setIsPlatModalOpen(true);
  };

  const handleOpenEditPlat = (plat: any) => {
    setEditingPlat(plat);
    platForm.setFieldsValue({
      ...plat,
      service: plat.service?._id || plat.service || serviceId,
      ticket: typeof plat.ticket === 'object' ? plat.ticket._id : plat.ticket
    });
    setIsPlatModalOpen(true);
  };

  const handleSubmitPlat = (values: any) => {
    const data = {
      ...values,
      service: serviceId
    };

    if (editingPlat) {
      updatePlat({ id: editingPlat._id, data });
    } else {
      createPlat(data);
    }
  };

  const handleDeletePlat = (platId: string) => {
    deletePlat(platId);
  };

  // Menus mutations
  const { mutate: createMenu, isPending: loadingCreateMenu } = useMutation({
    mutationFn: (data: any) => menuService.create(data),
    onSuccess: () => {
      message.success('Menu créé avec succès!');
      setIsMenuModalOpen(false);
      qc.invalidateQueries({queryKey:[QUERY_KEYS.MENUS, QUERY_KEYS.SERVICES, serviceId]});
      menuForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.message || 'Erreur lors de la création du menu');
    }
  });

  const { mutate: updateMenu, isPending: loadingUpdateMenu } = useMutation({
    mutationFn: (data: any) => menuService.update(data.id, data.data),
    onSuccess: () => {
      message.success('Menu modifié avec succès!');
      setIsMenuModalOpen(false);
      qc.invalidateQueries({queryKey:[QUERY_KEYS.MENUS, QUERY_KEYS.SERVICES, serviceId]});
      setEditingMenu(null);
    },
    onError: (error: any) => {
      message.error(error?.message || 'Erreur lors de la modification du menu');
    }
  });

  const { mutate: deleteMenu } = useMutation({
    mutationFn: (menuId: string) => menuService.delete(menuId),
    onSuccess: () => {
      message.success('Menu supprimé avec succès!');
      qc.invalidateQueries({queryKey:[QUERY_KEYS.MENUS, QUERY_KEYS.SERVICES, serviceId]});
    },
    onError: (error: any) => {
      message.error(error?.message || 'Erreur lors de la suppression du menu');
    }
  });

  // Menus handlers
  const handleOpenCreateMenu = () => {
    setEditingMenu(null);
    menuForm.resetFields();
    menuForm.setFieldsValue({
      service: serviceId
    });
    setIsMenuModalOpen(true);
  };

  const handleOpenEditMenu = (menu: any) => {
    setEditingMenu(menu);
    // Extraire les IDs des plats si ce sont des objets
    const platIds = menu.plats?.map((p: any) => typeof p === 'string' ? p : p._id) || [];
    menuForm.setFieldsValue({
      ...menu,
      plats: platIds,
      date:dayjs(menu.date),
      service: menu.service?._id || menu.service || serviceId
    });
    setIsMenuModalOpen(true);
  };

  const handleSubmitMenu = (values: any) => {
    const data = {
      ...values,
      date: dayjs(values.date).toISOString(),
      service: serviceId
    };

    if (editingMenu) {
      updateMenu({ id: editingMenu._id, data });
    } else {
      createMenu(data);
    }
  };

  const handleDeleteMenu = (menuId: string) => {
    deleteMenu(menuId);
  };

  // Plats columns
  const platColumns = [
    {
      title: 'Image',
      dataIndex: 'image',
      key: 'image',
      width: 80,
      render: (image: string) => (
        image ? (
          <Image
            src={image}
            alt="Plat"
            width={60}
            height={60}
            style={{ borderRadius: 8, objectFit: 'cover' }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
          />
        ) : (
          <Avatar size={60} icon={<PictureOutlined />} />
        )
      ),
    },
    {
      title: 'Nom',
      dataIndex: 'nom',
      key: 'nom',
      sorter: (a: any, b: any) => a.nom.localeCompare(b.nom),
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Ticket',
      dataIndex: 'ticket',
      key: 'ticket',
      align: 'center' as const,
      render: (ticket: Ticket) => (
        <Tag color="orange" icon={<CoffeeOutlined />}>
          {typeof ticket === 'object' ? ticket.nom : ticket}
        </Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || <Text type="secondary">-</Text>,
    },
    {
      title: 'Ingrédients',
      dataIndex: 'ingredients',
      key: 'ingredients',
      ellipsis: true,
      render: (ingredients: string[]) => ingredients?.length > 0 ? (
        <Space wrap size={4}>
          {ingredients.slice(0, 3).map((ing: string, idx: number) => (
            <Tag key={idx}>{ing}</Tag>
          ))}
          {ingredients.length > 3 && <Tag>+{ingredients.length - 3}</Tag>}
        </Space>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      fixed: 'right' as const,
      width: 120,
      render: (_:any, record:any) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenEditPlat(record)}
            style={{ color: '#52c41a' }}
            title="Modifier"
          />
          <Popconfirm
            title="Supprimer ce plat?"
            description="Cette action est irréversible."
            onConfirm={() => handleDeletePlat(record._id)}
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

  // Menus columns
  const menuColumns = [
    {
      title: 'Nom',
      dataIndex: 'nom',
      key: 'nom',
      sorter: (a: any, b: any) => a.nom.localeCompare(b.nom),
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      align: 'center' as const,
      sorter: (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      render: (date: string) => (
        <Tag color="blue" icon={<CalendarOutlined />}>
          {dayjs(date).format('DD/MM/YYYY')}
        </Tag>
      ),
    },
    {
      title: 'Nombre de Plats',
      dataIndex: 'plats',
      key: 'plats',
      align: 'center' as const,
      render: (plats: any[]) => (
        <Tag color="green" icon={<UnorderedListOutlined />}>
          {plats?.length || 0} plat{plats?.length > 1 ? 's' : ''}
        </Tag>
      ),
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (text: string) => text || <Text type="secondary">-</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      fixed: 'right' as const,
      width: 120,
      render: (_:any, record:any) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenEditMenu(record)}
            style={{ color: '#52c41a' }}
            title="Modifier"
          />
          <Popconfirm
            title="Supprimer ce menu?"
            description="Cette action est irréversible."
            onConfirm={() => handleDeleteMenu(record._id)}
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

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!service) {
    return (
      <Card>
        <Empty description="Service introuvable" />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button 
            type="primary" 
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate({ to: '/admin/services' })}
          >
            Retour à la liste
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header avec bouton retour */}
      <Space style={{ marginBottom: 24 }}>
        <Button 
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate({ to: '/admin/services' })}
          size="large"
        >
          Retour
        </Button>
      </Space>

      <Row gutter={[24, 24]}>
        {/* Colonne principale - Informations générales */}
        <Col xs={24} lg={16}>
          <Card 
            title={
              <Space>
                <ShopOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                <Title level={3} style={{ margin: 0 }}>
                  {service.nom}
                </Title>
              </Space>
            }
            style={{ 
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
            }}
          >
            <Descriptions column={{ xs: 1, sm: 2 }} bordered>
              <Descriptions.Item 
                label={
                  <Space>
                    <ShopOutlined />
                    <span>Type de Service</span>
                  </Space>
                }
                span={2}
              >
              </Descriptions.Item>

              <Descriptions.Item 
                label={
                  <Space>
                    <CheckCircleOutlined />
                    <span>Statut</span>
                  </Space>
                }
              >
                {service.active ? (
                  <Tag icon={<CheckCircleOutlined />} color="success">
                    Actif
                  </Tag>
                ) : (
                  <Tag icon={<CloseCircleOutlined />} color="error">
                    Inactif
                  </Tag>
                )}
              </Descriptions.Item>

              <Descriptions.Item 
                label={
                  <Space>
                    <HomeOutlined />
                    <span>Nombre de Places</span>
                  </Space>
                }
              >
                {service.nombre_de_places ? (
                  <Text strong>{service.nombre_de_places} places</Text>
                ) : (
                  <Text type="secondary">Non spécifié</Text>
                )}
              </Descriptions.Item>

              <Descriptions.Item 
                label={
                  <Space>
                    <EnvironmentOutlined />
                    <span>Localisation</span>
                  </Space>
                }
                span={2}
              >
                {service.localisation ? (
                  <Space>
                    <EnvironmentOutlined style={{ color: '#1890ff' }} />
                    <Text>{service.localisation}</Text>
                  </Space>
                ) : (
                  <Text type="secondary">Non spécifiée</Text>
                )}
              </Descriptions.Item>

              <Descriptions.Item 
                label={
                  <Space>
                    <FileTextOutlined />
                    <span>Description</span>
                  </Space>
                }
                span={2}
              >
                {service.description ? (
                  <Paragraph style={{ margin: 0 }}>
                    {service.description}
                  </Paragraph>
                ) : (
                  <Text type="secondary">Aucune description</Text>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Colonne latérale - Gérant et Agents */}
        <Col xs={24} lg={8}>
          {/* Card Gérant */}
          <Card 
            title={
              <Space>
                <UserOutlined style={{ color: '#52c41a' }} />
                <span>Gérant</span>
              </Space>
            }
            style={{ 
              marginBottom: 24,
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
            }}
          >
            {service.gerant ? (
              <Space orientation="vertical" style={{ width: "100%" }}>
                <Space>
                  <Avatar 
                    size={48} 
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#52c41a' }}
                  />
                  <div>
                    <Text strong style={{ fontSize: 16 }}>
                      {service.gerant.name}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 14 }}>
                      {service.gerant.email}
                    </Text>
                  </div>
                </Space>
                {service.gerant.role && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">Rôles: </Text>
                    <Space wrap>
                      <Tag color="blue">{service.gerant.role}</Tag>
                    </Space>
                  </div>
                )}
              </Space>
            ) : (
              <Empty 
                description="Aucun gérant assigné" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>

          {/* Card Agents de Contrôle */}
          <Card 
            title={
              <Space>
                <TeamOutlined style={{ color: '#1890ff' }} />
                <span>Agents de Contrôle</span>
                <Tag color="blue">{service.agentsControle?.length || 0}</Tag>
              </Space>
            }
            style={{ 
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
            }}
          >
            {service.agentsControle && service.agentsControle.length > 0 ? (
              <List
                dataSource={service.agentsControle}
                renderItem={(agent: User) => (
                  <List.Item key={agent._id}>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          icon={<UserOutlined />}
                          style={{ backgroundColor: '#1890ff' }}
                        />
                      }
                      title={
                        <Text strong>
                          {agent.name}
                        </Text>
                      }
                      description={
                        <Space orientation="vertical" size={4}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {agent.email}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                description="Aucun agent de contrôle assigné" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* Section Plats (uniquement pour les restaurants) */}
      {isRestaurant && (
        <>
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Card
                title={
                  <Space>
                    <CoffeeOutlined style={{ fontSize: 20, color: '#ff6b35' }} />
                    <Title level={4} style={{ margin: 0 }}>
                      Plats du Restaurant
                    </Title>
                    <Tag color="orange">{plats?.length || 0}</Tag>
                  </Space>
                }
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleOpenCreatePlat}
                    style={{ background: '#ff6b35', borderColor: '#ff6b35' }}
                  >
                    Ajouter un plat
                  </Button>
                }
                style={{ 
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
                }}
              >
                <Table
                  columns={platColumns}
                  dataSource={plats}
                  rowKey="_id"
                  loading={isLoadingPlats}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total: ${total} plats`,
                  }}
                  locale={{
                    emptyText: <Empty description="Aucun plat pour ce restaurant" />
                  }}
                  bordered
                  scroll={{ x: 1000 }}
                />
              </Card>
            </Col>
          </Row>

          <Divider />

          {/* Section Menus */}
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Card
                title={
                  <Space>
                    <CalendarOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                    <Title level={4} style={{ margin: 0 }}>
                      Menus du Restaurant
                    </Title>
                    <Tag color="blue">{menus?.length || 0}</Tag>
                  </Space>
                }
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleOpenCreateMenu}
                    style={{ background: '#1890ff', borderColor: '#1890ff' }}
                  >
                    Ajouter un menu
                  </Button>
                }
                style={{ 
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
                }}
              >
                <Table
                  columns={menuColumns}
                  dataSource={menus}
                  rowKey="_id"
                  loading={isLoadingMenus}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total: ${total} menus`,
                  }}
                  locale={{
                    emptyText: <Empty description="Aucun menu pour ce restaurant" />
                  }}
                  bordered
                  scroll={{ x: 800 }}
                />
              </Card>
            </Col>
          </Row>

          <Divider />
        </>
      )}

      {/* Actions en bas */}
      <Row justify="center" style={{ marginTop: 24 }}>
        <Space size="large">
          <Button 
            size="large"
            onClick={() => navigate({ to: '/admin/services' })}
          >
            Retour à la liste
          </Button>
          <Button 
            type="primary" 
            size="large"
            onClick={() => navigate({ to: '/admin/services' })}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
          >
            Modifier ce service
          </Button>
        </Space>
      </Row>

      {/* Modal Création/Édition Plat */}
      {isRestaurant && (
        <Modal
          title={
            <Space>
              {editingPlat ? <EditOutlined /> : <PlusOutlined />}
              <span>{editingPlat ? 'Modifier le Plat' : 'Créer un Nouveau Plat'}</span>
            </Space>
          }
          open={isPlatModalOpen}
          onCancel={() => {
            setIsPlatModalOpen(false);
            setEditingPlat(null);
            platForm.resetFields();
          }}
          footer={null}
          width={700}
        >
          <Spin spinning={loadingCreatePlat || loadingUpdatePlat}>
            <Form
              form={platForm}
              layout="vertical"
              onFinish={handleSubmitPlat}
            >
              <Form.Item name="service" hidden>
                <Input />
              </Form.Item>

              <Form.Item
                name="nom"
                label="Nom du Plat"
                rules={[{ required: true, message: 'Le nom est requis' }]}
              >
                <Input 
                  size="large" 
                  prefix={<CoffeeOutlined />} 
                  placeholder="Ex: Riz au poisson, Poulet braisé"
                />
              </Form.Item>

              <Form.Item
                name="ticket"
                label="Ticket"
                rules={[{ required: true, message: 'Le ticket est requis' }]}
              >
                <Select
                  size="large"
                  placeholder="Sélectionner le ticket"
                  options={(service?.ticketsacceptes as Ticket[])?.map((ticket: Ticket) => ({
                    value: typeof ticket === 'object' ? ticket._id : ticket,
                    label: typeof ticket === 'object' ? `${ticket.nom} - ${ticket.prix} FCFA` : ticket
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="image"
                label="URL de l'Image"
                rules={[
                  { type: 'url', message: 'URL invalide' }
                ]}
              >
                <Input 
                  size="large" 
                  prefix={<PictureOutlined />}
                  placeholder="https://exemple.com/image.jpg"
                />
              </Form.Item>

              <Form.Item
                name="description"
                label="Description"
                rules={[{ required: true, message: 'La description est requise' }]}
              >
                <TextArea 
                  rows={4}
                  placeholder="Description du plat..."
                />
              </Form.Item>

              <Form.Item
                name="ingredients"
                label="Ingrédients (optionnel)"
                tooltip="Appuyez sur Entrée pour ajouter un ingrédient"
              >
                <Select
                  mode="tags"
                  size="large"
                  placeholder="Ex: Riz, Poisson, Tomate..."
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                name="allergenes"
                label="Allergènes (optionnel)"
                tooltip="Appuyez sur Entrée pour ajouter un allergène"
              >
                <Select
                  mode="tags"
                  size="large"
                  placeholder="Ex: Gluten, Arachides, Fruits de mer..."
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button 
                    onClick={() => {
                      setIsPlatModalOpen(false);
                      setEditingPlat(null);
                      platForm.resetFields();
                    }}
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit"
                    loading={loadingCreatePlat || loadingUpdatePlat}
                    style={{ background: '#ff6b35', borderColor: '#ff6b35' }}
                  >
                    {editingPlat ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Spin>
        </Modal>
      )}

      {/* Modal Création/Édition Menu */}
      {isRestaurant && (
        <Modal
          title={
            <Space>
              {editingMenu ? <EditOutlined /> : <PlusOutlined />}
              <span>{editingMenu ? 'Modifier le Menu' : 'Créer un Nouveau Menu'}</span>
            </Space>
          }
          open={isMenuModalOpen}
          onCancel={() => {
            setIsMenuModalOpen(false);
            setEditingMenu(null);
            menuForm.resetFields();
          }}
          footer={null}
          width={700}
        >
          <Spin spinning={loadingCreateMenu || loadingUpdateMenu}>
            <Form
              form={menuForm}
              layout="vertical"
              onFinish={handleSubmitMenu}
            >
              <Form.Item name="service" hidden>
                <Input />
              </Form.Item>

              <Form.Item
                name="nom"
                label="Nom du Menu"
                rules={[{ required: true, message: 'Le nom est requis' }]}
              >
                <Input 
                  size="large" 
                  prefix={<CalendarOutlined />} 
                  placeholder="Ex: Menu du 25/11/2024"
                />
              </Form.Item>

              <Form.Item
                name="date"
                label="Date"
                rules={[
                  { required: true, message: 'La date est requise' },
                ]}
              >
               <DatePicker  className="w-full"/>
              </Form.Item>

              <Form.Item
                name="plats"
                label="Plats du Menu"
                rules={[
                  { required: true, message: 'Sélectionnez au moins un plat' },
                  { type: 'array', min: 1, message: 'Au moins un plat est requis' }
                ]}
              >
                <Select
                  mode="multiple"
                  size="large"
                  placeholder="Sélectionner les plats..."
                  loading={isLoadingPlats}
                  showSearch
                  options={plats?.map((plat: any) => ({
                    value: plat._id,
                    label: `${plat.nom} (${typeof plat.ticket === 'object' ? plat.ticket.nom : plat.ticket})`
                  }))}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                name="notes"
                label="Notes (optionnel)"
              >
                <TextArea 
                  rows={4}
                  placeholder="Notes ou description du menu..."
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button 
                    onClick={() => {
                      setIsMenuModalOpen(false);
                      setEditingMenu(null);
                      menuForm.resetFields();
                    }}
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit"
                    loading={loadingCreateMenu || loadingUpdateMenu}
                    style={{ background: '#1890ff', borderColor: '#1890ff' }}
                  >
                    {editingMenu ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Spin>
        </Modal>
      )}
    </div>
  );
}
