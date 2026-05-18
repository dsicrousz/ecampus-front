import { Link, createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/route-protection';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  Row,
  Col,
  Spin,
  Typography,
  Input,
  Empty,
  Switch,
  message,
  Space,
  Statistic
} from 'antd';
import { 
  SearchOutlined,
  ShopOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { useState } from "react";
import { ServiceService } from "@/services/service.service";
import { useDebounce } from "react-use";
import { USER_ROLE } from '@/types/user.roles';

const { Title, Text } = Typography;

export const Route = createFileRoute('/admin/restaurations/')({
  beforeLoad: () => requireRole([USER_ROLE.CHEF_RESTAURANT, USER_ROLE.SUPERADMIN]),
  component: RouteComponent,
})

function RouteComponent() {
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  
  useDebounce(() => setDebouncedSearchText(searchText), 300, [searchText]);

  const serviceService = new ServiceService();
  const queryClient = useQueryClient();

  const { data: services, isLoading } = useQuery({
    queryKey: ['restaurants'],
    queryFn: () => serviceService.getByType('restaurant')
  });

  // Mutation pour activer/désactiver un service
  const { mutate: toggleServiceStatus } = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => serviceService.update(id, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      message.success('Statut du service modifié avec succès');
    },
    onError: () => {
      message.error('Erreur lors de la modification du statut');
    }
  });

  // Handler pour le switch
  const handleToggleStatus = (e: React.MouseEvent, serviceId: string, currentStatus: boolean) => {
    e.preventDefault(); // Empêcher la navigation
    e.stopPropagation();
    toggleServiceStatus({ id: serviceId, active: !currentStatus });
  };

  // Filtrer uniquement les services de type "restaurant"
  const restaurantServices = services?.filter(service => 
    service.typeService === 'restaurant' &&
    (!debouncedSearchText || 
      service.nom?.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
      service.description?.toLowerCase().includes(debouncedSearchText.toLowerCase())
    )
  ) || [];

  return (
    <div className="controller-page">
      <div className="max-w-7xl mx-auto">
        <Spin spinning={isLoading} size="large">
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            {/* Hero Header */}
            <Card className="controller-hero controller-hero-soft border-0 shadow-xl">
              <Row gutter={[24, 16]} align="middle" wrap>
                <Col flex="none">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <ShopOutlined style={{ fontSize: 28 }} />
                  </div>
                </Col>
                <Col flex="auto">
                  <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Services
                  </Text>
                  <Title level={3} className="mb-1! mt-1! text-slate-900!">
                    Restaurations
                  </Title>
                  <Text type="secondary">
                    Gérez vos services de restauration
                  </Text>
                </Col>
                <Col flex="none">
                  <Input
                    placeholder="Rechercher..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    style={{ width: 300 }}
                  />
                </Col>
              </Row>
            </Card>

            {/* Statistiques */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card className="controller-stat-card" size="small">
                  <Statistic
                    title={<span className="text-blue-700 font-medium">Total Services</span>}
                    value={restaurantServices.length}
                    prefix={<ShopOutlined />}
                    valueStyle={{ color: '#0ea5e9', fontSize: '1.75rem', fontWeight: 800 }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card className="controller-stat-card" size="small">
                  <Statistic
                    title={<span className="text-emerald-700 font-medium">Actifs</span>}
                    value={restaurantServices.filter(s => s.active).length}
                    valueStyle={{ color: '#16a34a', fontSize: '1.75rem', fontWeight: 800 }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card className="controller-stat-card" size="small">
                  <Statistic
                    title={<span className="text-orange-700 font-medium">Tickets</span>}
                    value={restaurantServices.reduce((acc, s) => acc + (s.ticketsacceptes?.length || 0), 0)}
                    valueStyle={{ color: '#f97316', fontSize: '1.75rem', fontWeight: 800 }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Content Section */}
            {restaurantServices.length === 0 ? (
              <Card className="controller-panel">
                <Empty 
                  description={
                    debouncedSearchText 
                      ? "Aucun résultat pour votre recherche" 
                      : "Aucun service de restauration disponible"
                  }
                />
              </Card>
            ) : (
              <Row gutter={[20, 20]}>
                {restaurantServices.map((service) => (
                  <Col xs={24} sm={12} lg={8} xl={6} key={service._id}>
                    <Link to="/admin/restaurations/$restaurantId" params={{ restaurantId: service._id }}>
                      <Card
                        hoverable
                        className="h-full controller-panel transition-all duration-300 hover:shadow-xl"
                      >
                        {/* Status Badge */}
                        <div className="flex justify-end mb-3" onClick={(e) => handleToggleStatus(e, service._id, service.active)}>
                          <Switch
                            checked={service.active}
                            size="small"
                            checkedChildren="ON"
                            unCheckedChildren="OFF"
                          />
                        </div>

                        {/* Icon Header */}
                        <div className="bg-slate-900 p-4 -mx-6 -mt-6 mb-4 rounded-t-2xl relative">
                          <ShopOutlined className="text-4xl text-white" />
                          {!service.active && (
                            <div className="absolute top-2 right-2 bg-slate-700 text-white text-xs px-2 py-1 rounded-full font-semibold">
                              Inactif
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          {/* Service Name */}
                          <div>
                            <Title level={4} className="mb-1 text-slate-900">
                              {service.nom}
                            </Title>
                            {service.description && (
                              <Text className="text-sm text-slate-600 line-clamp-2">
                                {service.description}
                              </Text>
                            )}
                          </div>

                          {/* Restaurant Location */}
                          {service && (
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                              <EnvironmentOutlined className="text-slate-500" />
                              <Text className="text-sm text-slate-700">
                                {service.nom}
                              </Text>
                            </div>
                          )}

                          {/* Tickets Info */}
                          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                            <Text className="text-xs text-slate-600 font-medium">
                              {service.ticketsacceptes?.length || 0} ticket{(service.ticketsacceptes?.length || 0) > 1 ? 's' : ''}
                            </Text>
                            <Text className="text-xs text-blue-600 font-semibold">
                              Voir détails →
                            </Text>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </Col>
                ))}
              </Row>
            )}
          </Space>
        </Spin>
      </div>
    </div>
  );
}
