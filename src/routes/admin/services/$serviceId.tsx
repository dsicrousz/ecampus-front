import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requireRole, canModify } from '@/lib/route-protection';
import type { Service, TypeService } from '@/types/service';
import { useMemo } from 'react';
import { useSession } from '@/auth/auth-client';
import { USER_ROLE } from '@/types/user.roles';
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
  Empty,
  Switch,
  message,
} from 'antd';
import { 
  ArrowLeftOutlined, 
  ShopOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { ServiceService } from '@/services/service.service';
import { UserService } from '@/services/user.service';
import { QUERY_KEYS } from '@/constants';

const { Title, Text } = Typography;

const TypeServiceLabels: Record<TypeService, string> = {
  restaurant: 'Restaurant',
  sport: 'Sport',
  medical: 'Médical',
  culture: 'Culture',
  logement: 'Logement',
  autre: 'Autre'
};

const TypeServiceColors: Record<TypeService, string> = {
  restaurant: 'orange',
  sport: 'green',
  medical: 'red',
  culture: 'purple',
  logement: 'blue',
  autre: 'default'
};

const DayLabels = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const Route = createFileRoute('/admin/services/$serviceId')({
  beforeLoad: () => requireRole([USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN]),
  component: RouteComponent,
})

function RouteComponent() {
  const { data: session } = useSession();
  const canEdit = canModify(session?.user?.role);
  const { serviceId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const serviceService = new ServiceService();
  const userService = new UserService();

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => serviceService.getOne(serviceId),
    enabled: !!serviceId
  });

  // Fetch controleurs to resolve agent IDs to names
  const { data: controleurs } = useQuery({
    queryKey: ['users', USER_ROLE.CONTROLEUR],
    queryFn: () => userService.byRole(USER_ROLE.CONTROLEUR),
  });

  const agentNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    (controleurs || []).forEach((u: any) => {
      map[u._id] = u.name || u.email || u._id;
    });
    return map;
  }, [controleurs]);

  const { mutate: toggleActive } = useMutation({
    mutationFn: (data: { id: string; data: Partial<Service> }) => serviceService.update(data.id, data.data),
    onSuccess: () => {
      message.success('Statut modifié avec succès!');
      qc.invalidateQueries({ queryKey: ['service', serviceId] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.SERVICES] });
    },
    onError: (error: any) => {
      message.error(error?.message || 'Erreur lors de la modification');
    }
  });

  const handleToggleActive = (checked: boolean) => {
    toggleActive({ id: serviceId, data: { active: checked } });
  };

  if (isLoading) {
    return (
      <div className="controller-page">
        <div className="flex items-center justify-center min-h-[400px]">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="controller-page">
        <Card className="controller-panel">
          <Empty description="Service introuvable" />
          <div className="text-center mt-4">
            <Button 
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate({ to: '/admin/services' })}
            >
              Retour à la liste
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const ticketInfo = typeof service.ticket === 'object' ? service.ticket : null;

  return (
    <div className="controller-page">
      <Spin spinning={isLoading}>
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
                  Détails du Service
                </Text>
                <Title level={3} className="mb-1! mt-1! text-foreground!">
                  {service.nom}
                </Title>
                <Space size={8}>
                  <Tag color={TypeServiceColors[service.type]} icon={<ShopOutlined />}>
                    {TypeServiceLabels[service.type]}
                  </Tag>
                  {service.active ? (
                    <Tag icon={<CheckCircleOutlined />} color="success">Actif</Tag>
                  ) : (
                    <Tag icon={<CloseCircleOutlined />} color="error">Inactif</Tag>
                  )}
                </Space>
              </Col>
              <Col flex="none">
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <Text type="secondary">Statut:</Text>
                    <Switch
                      checked={service.active}
                      onChange={handleToggleActive}
                      checkedChildren="Actif"
                      unCheckedChildren="Inactif"
                    />
                  </div>
                )}
              </Col>
            </Row>
          </Card>

          {/* Informations générales */}
          <Card className="controller-panel" title={<span className="text-foreground font-semibold">Informations du Service</span>}>
            <Descriptions column={{ xs: 1, sm: 2 }} bordered>
              <Descriptions.Item label="Nom" span={2}>
                <Text strong>{service.nom}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Type">
                <Tag color={TypeServiceColors[service.type]} icon={<ShopOutlined />}>
                  {TypeServiceLabels[service.type]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Statut">
                {service.active ? (
                  <Tag icon={<CheckCircleOutlined />} color="success">Actif</Tag>
                ) : (
                  <Tag icon={<CloseCircleOutlined />} color="error">Inactif</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Ticket" span={2}>
                {ticketInfo ? (
                  <Space>
                    <ShopOutlined />
                    <Text strong>{ticketInfo.nom}</Text>
                    {ticketInfo.prix != null && (
                      <Tag color="orange">{ticketInfo.prix} FCFA</Tag>
                    )}
                  </Space>
                ) : (
                  <Text type="secondary">Non assigné</Text>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Planning de contrôle */}
          {service.planning && service.planning.length > 0 && (
            <Card className="controller-panel" title={<span className="text-foreground font-semibold">Planning de Contrôle</span>}>
              <Row gutter={[16, 16]}>
                {service.planning.map((entry, idx) => (
                  <Col xs={24} sm={12} md={8} key={idx}>
                    <Card className="controller-stat-card" size="small">
                      <Space direction="vertical" className="w-full">
                        <div className="flex items-center gap-2">
                          <ClockCircleOutlined className="text-primary" />
                          <Text strong>{DayLabels[entry.jour] || `Jour ${entry.jour}`}</Text>
                        </div>
                        <Text type="secondary">
                          {entry.heureDebut} - {entry.heureFin}
                        </Text>
                        <div>
                          <Text type="secondary" className="text-xs">Agents:</Text>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {entry.agents.map((agentId: string, i: number) => (
                              <Tag key={i} color="blue">{agentNameMap[agentId] || agentId}</Tag>
                            ))}
                          </div>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          )}

          {/* Actions */}
          <Row justify="center">
            <Button
              icon={<ArrowLeftOutlined />}
              size="large"
              onClick={() => navigate({ to: '/admin/services' })}
            >
              Retour à la liste
            </Button>
          </Row>
        </Space>
      </Spin>
    </div>
  );
}
