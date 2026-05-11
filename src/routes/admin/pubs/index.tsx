import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  Table, 
  Button, 
  Drawer, 
  Form, 
  Input, 
  Space, 
  Spin,
  Typography,
  Divider,
  Row,
  Col,
  message,
  DatePicker,
  Popconfirm,
  Upload,
  Tag
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  SearchOutlined,
  SoundOutlined,
  CalendarOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { useState, useMemo } from "react";
import { PubService } from '@/services/pub.service';
import { getSession } from '@/auth/auth-client';
import type { ColumnsType } from 'antd/es/table';
import type { Pub, CreatePubDto } from '@/types/pub';
import { USER_ROLE } from '@/types/user.roles';
import dayjs from 'dayjs';
import { env } from '@/env';

const { Title, Text } = Typography;
const { TextArea } = Input;

export const Route = createFileRoute('/admin/pubs/')({
   beforeLoad: async () => {
    const session = await getSession();
    if (session.data?.user?.role !== USER_ROLE.SUPERADMIN && session.data?.user?.role !== USER_ROLE.ADMIN) {
      throw redirect({ to: '/admin/unauthorized' });
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const [opened, setOpened] = useState(false);
  const [openedU, setOpenedU] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  const [form] = Form.useForm();
  const [formU] = Form.useForm();
  
  const qc = useQueryClient();
  const pubService = new PubService();

  const { data: pubs, isLoading } = useQuery({ 
    queryKey: ['pubs'], 
    queryFn: () => pubService.getAll() 
  });
  // Create mutation
  const { mutate: createPub, isPending: loadingCreate } = useMutation({
    mutationFn: (data: CreatePubDto) => pubService.create(data),
    onSuccess: () => {
      message.success('Publicité créée avec succès!');
      setOpened(false);
      qc.invalidateQueries({queryKey:['pubs']});
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.message || 'Erreur lors de la création de la publicité');
    }
  });

  // Update mutation
  const { mutate: updatePub, isPending: loadingUpdate } = useMutation({
    mutationFn: (data: { id: string; data: Partial<CreatePubDto> }) => pubService.update(data.id, data.data),
    onSuccess: () => {
      message.success('Publicité modifiée avec succès!');
      setOpenedU(false);
      qc.invalidateQueries({ queryKey: ['pubs'] });
    },
    onError: (error: any) => {
      message.error(error?.message || 'Erreur lors de la modification de la publicité');
    }
  });

  // Delete mutation
  const { mutate: deletePub } = useMutation({
    mutationFn: (id: string) => pubService.delete(id),
    onSuccess: () => {
      message.success('Publicité supprimée avec succès!');
      qc.invalidateQueries({ queryKey: ['pubs'] });
    },
    onError: (error: any) => {
      message.error(error?.message || 'Erreur lors de la suppression de la publicité');
    }
  });

  const onCreate = (values: any) => {
    const data = {
      titre: values.titre,
      description: values.description,
      debut: values.debut.format('YYYY-MM-DDTHH:mm:ss'),
      fin: values.fin.format('YYYY-MM-DDTHH:mm:ss'),
      image: values.image,
    };
    createPub(data);
  };

  const onUpdate = (values: any) => {
    const data = {
      titre: values.titre,
      description: values.description,
      debut: values.debut.format('YYYY-MM-DDTHH:mm:ss'),
      fin: values.fin.format('YYYY-MM-DDTHH:mm:ss'),
      image: values.image,
      existingImage: values.existingImage,
    };
    updatePub({ id: values._id, data });
  };

  const handleUpdate = (record: Pub) => {
    formU.setFieldsValue({
      ...record,
      debut: dayjs(record.debut),
      fin: dayjs(record.fin),
      existingImage: record.image,
      image: [],
    });
    setOpenedU(true);
  };

  const handleDelete = (id: string) => {
    deletePub(id);
  };

  const handleOpenCreate = () => {
    form.resetFields();
    setOpened(true);
  };

  const columns: ColumnsType<Pub> = [
    {
      title: 'Titre',
      dataIndex: 'titre',
      key: 'titre',
      sorter: (a: any, b: any) => a.titre.localeCompare(b.titre),
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => <Text>{text}</Text>,
    },
    {
      title: 'Date de Début',
      dataIndex: 'debut',
      key: 'debut',
      render: (date: string) => (
        <Space>
          <CalendarOutlined style={{ color: '#52c41a' }} />
          <Text>{dayjs(date).format('DD/MM/YYYY HH:mm')}</Text>
        </Space>
      ),
    },
    {
      title: 'Date de Fin',
      dataIndex: 'fin',
      key: 'fin',
      render: (date: string) => (
        <Space>
          <CalendarOutlined style={{ color: '#ff4d4f' }} />
          <Text>{dayjs(date).format('DD/MM/YYYY HH:mm')}</Text>
        </Space>
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'isExpired',
      key: 'isExpired',
      align: 'center' as const,
      render: (isExpired: boolean) => (
        <Tag color={isExpired ? 'red' : 'green'}>
          {isExpired ? 'Expiré' : 'Actif'}
        </Tag>
      ),
    },
    {
      title: 'Image',
      dataIndex: 'image',
      key: 'image',
      render: (image: string) => image ? (
        <img src={image} alt="pub" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      fixed: 'right' as const,
      width: 150,
      render: (_: any, record: Pub) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleUpdate(record)}
            style={{ color: '#52c41a' }}
            title="Modifier"
          />
          <Popconfirm
            title="Supprimer cette publicité?"
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

  const filteredPubs = useMemo(() => {
    if (!pubs) return [];
    if (!searchText) return pubs;
    
    const searchLower = searchText.toLowerCase();
    return pubs.filter(pub => 
      pub.titre?.toLowerCase().includes(searchLower) ||
      pub.description?.toLowerCase().includes(searchLower)
    );
  }, [pubs, searchText]);

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
                <SoundOutlined /> Gestion des Publicités
              </Title>
              <Text type="secondary">
                {filteredPubs?.length || 0} publicité(s) au total
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
                Ajouter une publicité
              </Button>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />

          {/* Search */}
          <Row gutter={16}>
            <Col xs={24} sm={12} md={10}>
              <Input.Search
                prefix={<SearchOutlined />}
                placeholder="Rechercher par titre, description..."
                allowClear
                size="large"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </Col>
          </Row>

          {/* Table */}
          <Table
            columns={columns}
            dataSource={filteredPubs}
            rowKey="_id"
            loading={isLoading}
            scroll={{ x: 1000 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total: ${total} publicité(s)`,
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
            <span>Créer une Nouvelle Publicité</span>
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
        <Spin spinning={loadingCreate}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onCreate}
          >
            <Form.Item
              name="titre"
              label="Titre"
              rules={[{ required: true, message: 'Le titre est requis' }]}
            >
              <Input 
                size="large" 
                placeholder="Ex: Promotion Spéciale"
              />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
              rules={[{ required: true, message: 'La description est requise' }]}
            >
              <TextArea 
                rows={4}
                placeholder="Description de la publicité..."
              />
            </Form.Item>

            <Form.Item
              name="debut"
              label="Date de Début"
              rules={[{ required: true, message: 'La date de début est requise' }]}
            >
              <DatePicker 
                showTime 
                size="large" 
                style={{ width: '100%' }}
                format="DD/MM/YYYY HH:mm"
              />
            </Form.Item>

            <Form.Item
              name="fin"
              label="Date de Fin"
              rules={[{ required: true, message: 'La date de fin est requise' }]}
            >
              <DatePicker 
                showTime 
                size="large" 
                style={{ width: '100%' }}
                format="DD/MM/YYYY HH:mm"
              />
            </Form.Item>

            <Form.Item
              name="image"
              label="Image"
              valuePropName="fileList"
              getValueFromEvent={(e) => e?.fileList}
            >
              <Upload.Dragger
                name="image"
                listType="picture"
                maxCount={1}
                accept="image/*"
                beforeUpload={() => false}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Cliquez ou glissez l'image ici</p>
                <p className="ant-upload-hint">Supporte JPG, PNG, GIF</p>
              </Upload.Dragger>
            </Form.Item>
          </Form>
        </Spin>
      </Drawer>

      {/* Update Drawer */}
      <Drawer
        title={
          <Space>
            <EditOutlined />
            <span>Modifier la Publicité</span>
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
        <Spin spinning={loadingUpdate}>
          <Form
            form={formU}
            layout="vertical"
            onFinish={onUpdate}
          >
            <Form.Item name="_id" hidden>
              <Input />
            </Form.Item>
            <Form.Item name="existingImage" hidden>
              <Input />
            </Form.Item>

            <Form.Item
              name="titre"
              label="Titre"
              rules={[{ required: true, message: 'Le titre est requis' }]}
            >
              <Input 
                size="large" 
                placeholder="Ex: Promotion Spéciale"
              />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
              rules={[{ required: true, message: 'La description est requise' }]}
            >
              <TextArea 
                rows={4}
                placeholder="Description de la publicité..."
              />
            </Form.Item>

            <Form.Item
              name="debut"
              label="Date de Début"
              rules={[{ required: true, message: 'La date de début est requise' }]}
            >
              <DatePicker 
                showTime 
                size="large" 
                style={{ width: '100%' }}
                format="DD/MM/YYYY HH:mm"
              />
            </Form.Item>

            <Form.Item
              name="fin"
              label="Date de Fin"
              rules={[{ required: true, message: 'La date de fin est requise' }]}
            >
              <DatePicker 
                showTime 
                size="large" 
                style={{ width: '100%' }}
                format="DD/MM/YYYY HH:mm"
              />
            </Form.Item>

            <Form.Item
              name="image"
              label="Image"
              valuePropName="fileList"
              getValueFromEvent={(e) => e?.fileList}
            >
              <Upload.Dragger
                name="image"
                listType="picture"
                maxCount={1}
                accept="image/*"
                beforeUpload={() => false}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Cliquez ou glissez l'image ici</p>
                <p className="ant-upload-hint">Supporte JPG, PNG, GIF</p>
              </Upload.Dragger>
            </Form.Item>
          </Form>
        </Spin>
      </Drawer>
    </div>
  );
}
