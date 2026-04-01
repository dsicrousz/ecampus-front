import { createFileRoute, redirect } from '@tanstack/react-router';
import { Card, Table, Button, Input, Space, Tag, Popconfirm, message, Spin, Drawer, Form, InputNumber, Switch, Typography } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TicketService } from '@/services/ticket.service';
import type { Ticket, TicketFormValues } from '@/types/ticket';
import type { ColumnsType } from 'antd/es/table';
import { USER_ROLE } from '@/types/user.roles';
import { getSession } from '@/auth/auth-client';

const { Title } = Typography;

export const Route = createFileRoute('/admin/tickets/')({
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
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [searchText, setSearchText] = useState('');

  const [form] = Form.useForm<TicketFormValues>();
  const qc = useQueryClient();
  const ticketService = new TicketService();
  const key = ['tickets'];

  const { data: tickets, isLoading: isLoadingTickets } = useQuery<Ticket[]>({
    queryKey: key,
    queryFn: () => ticketService.getAll()
  });

  const { mutate: createTicket, isPending: loadingCreate } = useMutation({
    mutationFn: (data: Partial<Ticket>) => ticketService.create(data),
    onSuccess: () => {
      message.success('Ticket créé avec succès!');
      setOpened(false);
      qc.invalidateQueries({queryKey:key});
      form.resetFields();
    },
    onError: () => {
      message.error('Erreur lors de la création du ticket');
    }
  });

  const { mutate: updateTicket, isPending: loadingUpdate } = useMutation({
    mutationFn: (data: { id: string; data: Partial<Ticket> }) => ticketService.update(data.id, data.data),
    onSuccess: () => {
      message.success('Ticket modifié avec succès!');
      setOpened(false);
      qc.invalidateQueries({ queryKey: key });
      setEditingTicket(null);
    },
    onError: () => {
      message.error('Erreur lors de la modification du ticket');
    }
  });

  const { mutate: deleteTicket } = useMutation({
    mutationFn: (id: string) => ticketService.delete(id),
    onSuccess: () => {
      message.success('Ticket supprimé avec succès!');
      qc.invalidateQueries({ queryKey: key });
    },
    onError: () => {
      message.error('Erreur lors de la suppression du ticket');
    }
  });

  const handleChangeState = (checked: boolean, _id: string) => {
    updateTicket({ id: _id, data: { active: checked } });
  };

  const onCreate = (values: TicketFormValues) => {
    createTicket(values);
  };

  const onUpdate = (values: TicketFormValues) => {
    const { _id, ...rest } = values;
    if (_id) {
      updateTicket({ id: _id, data: rest });
    }
  };

  const handleUpdate = (record: Ticket) => {
    setEditingTicket(record);
    form.setFieldsValue(record);
    setOpened(true);
  };

  const handleOpenCreate = () => {
    form.resetFields();
    form.setFieldsValue({
      active: true,
      prix: 0
    });
    setEditingTicket(null);
    setOpened(true);
  };

  const handleCloseDrawer = () => {
    setOpened(false);
    setEditingTicket(null);
    form.resetFields();
  };

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    if (!searchText) return tickets;

    return tickets.filter((ticket: Ticket) =>
      ticket.nom?.toLowerCase().includes(searchText.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [tickets, searchText]);

  const columns: ColumnsType<Ticket> = [
    {
      title: 'Nom',
      dataIndex: 'nom',
      key: 'nom',
      sorter: (a: Ticket, b: Ticket) => a.nom.localeCompare(b.nom),
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Prix',
      dataIndex: 'prix',
      key: 'prix',
      align: 'right',
      sorter: (a: Ticket, b: Ticket) => a.prix - b.prix,
      render: (prix: number) => (
        <Tag color="green" style={{ fontWeight: 600 }}>
          {prix.toLocaleString()} FCFA
        </Tag>
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'active',
      key: 'active',
      align: 'center',
      filters: [
        { text: 'Actif', value: true },
        { text: 'Inactif', value: false },
      ],
      onFilter: (value: any, record: Ticket) => record.active === value,
      render: (active: boolean, record: Ticket) => (
        <Switch
          checked={active}
          onChange={(checked) => handleChangeState(checked, record._id)}
          checkedChildren={<CheckCircleOutlined />}
          unCheckedChildren={<CloseCircleOutlined />}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_: any, record: Ticket) => (
        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => handleUpdate(record)}
            size="small"
          >
            Modifier
          </Button>
          <Popconfirm
            title="Supprimer le ticket"
            description="Êtes-vous sûr de vouloir supprimer ce ticket ?"
            onConfirm={() => deleteTicket(record._id)}
            okText="Oui"
            cancelText="Non"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              Supprimer
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Spin spinning={isLoadingTickets || loadingCreate || loadingUpdate}>
        <Card
          title={
            <Space>
              <span style={{ fontSize: '20px' }}>🎫</span>
              <Title level={3} style={{ margin: 0, color: '#1890ff' }}>Gestion des Tickets</Title>
            </Space>
          }
          extra={
            <Space>
              <Input
                placeholder="Rechercher un ticket..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ width: 250 }}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenCreate}
              >
                Nouveau Ticket
              </Button>
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={filteredTickets}
            rowKey="_id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total: ${total} ticket(s)`,
            }}
          />
        </Card>
      </Spin>

      <Drawer
        title={editingTicket ? 'Modifier le ticket' : 'Nouveau ticket'}
        open={opened}
        onClose={handleCloseDrawer}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingTicket ? onUpdate : onCreate}
        >
          {editingTicket && (
            <Form.Item name="_id" hidden>
              <Input />
            </Form.Item>
          )}

          <Form.Item
            label="Nom du ticket"
            name="nom"
            rules={[{ required: true, message: 'Le nom est requis' }]}
          >
            <Input placeholder="Ex: Ticket Restaurant" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: 'La description est requise' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Description du ticket..."
            />
          </Form.Item>

          <Form.Item
            label="Prix (FCFA)"
            name="prix"
            rules={[
              { required: true, message: 'Le prix est requis' },
              { type: 'number', min: 0, message: 'Le prix doit être positif' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="0"
              min={0}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
            />
          </Form.Item>

          <Form.Item
            label="Actif"
            name="active"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="Oui"
              unCheckedChildren="Non"
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={handleCloseDrawer}>
                Annuler
              </Button>
              <Button type="primary" htmlType="submit">
                {editingTicket ? 'Modifier' : 'Créer'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
