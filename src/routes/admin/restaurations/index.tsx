import { Link, createFileRoute } from '@tanstack/react-router'
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
  message
} from 'antd';
import { 
  SearchOutlined,
  ShopOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { useState } from "react";
import { ServiceService } from "@/services/service.service";
import { useDebounce } from "react-use";


const { Title, Text } = Typography;

export const Route = createFileRoute('/admin/restaurations/')({
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
    <div className="min-h-screen from-slate-50 via-green-50 to-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <ShopOutlined className="text-3xl text-white" />
            </div>
            <div>
              <Title level={2} className="text-slate-800">
                Services de Restauration
              </Title>
              <Text className="text-slate-600 text-base">
                Gérez vos services et supervisez les consommations en temps réel
              </Text>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="mb-6 shadow-md border-0">
          <Input
            placeholder="Rechercher par nom, description ou restaurant..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            size="large"
            allowClear
            className="shadow-sm"
          />
        </Card>

        {/* Content Section */}
        <Spin spinning={isLoading} size="large">
          {restaurantServices.length === 0 ? (
            <Card className="shadow-md border-0">
              <Empty 
                description={
                  <span className="text-slate-500">
                    {debouncedSearchText 
                      ? "Aucun résultat pour votre recherche" 
                      : "Aucun service de restauration disponible"}
                  </span>
                }
                className="py-12"
              />
            </Card>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <Text className="text-slate-600 font-medium">
                  {restaurantServices.length} service{restaurantServices.length > 1 ? 's' : ''} trouvé{restaurantServices.length > 1 ? 's' : ''}
                </Text>
              </div>
              
              <Row gutter={[20, 20]}>
                {restaurantServices.map((service) => (
                  <Col xs={24} sm={12} lg={8} xl={6} key={service._id}>
                    <Link to="/admin/restaurations/$restaurantId" params={{ restaurantId: service._id }}>
                      <Card
                        hoverable
                        className="h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 shadow-md overflow-hidden group"
                      >
                        {/* Status Badge */}
                        <div className="absolute top-3 right-3 z-10" onClick={(e) => handleToggleStatus(e, service._id, service.active)}>
                          <Switch
                            checked={service.active}
                            size="small"
                            checkedChildren="ON"
                            unCheckedChildren="OFF"
                            className={service.active ? 'bg-green-500' : ''}
                          />
                        </div>

                        {/* Icon Header with Gradient */}
                        <div className="from-green-500 to-emerald-600 p-6 -mx-6 -mt-6 mb-4 relative overflow-hidden">
                          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                          <ShopOutlined className="text-5xl text-white relative z-10 drop-shadow-lg" />
                          {!service.active && (
                            <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                              Inactif
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          {/* Service Name */}
                          <div>
                            <Title level={4} className="mb-1 text-slate-800 line-clamp-1 group-hover:text-green-600 transition-colors">
                              {service.nom}
                            </Title>
                            {service.description && (
                              <Text className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                                {service.description}
                              </Text>
                            )}
                          </div>

                          {/* Restaurant Location */}
                          {service && (
                            <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
                              <EnvironmentOutlined className="text-blue-500 text-base" />
                              <Text className="text-sm text-slate-700 font-medium line-clamp-1">
                                {service.nom}
                              </Text>
                            </div>
                          )}

                          {/* Tickets Info */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <Text className="text-xs text-slate-600 font-medium">
                                {service.ticketsacceptes?.length || 0} ticket{(service.ticketsacceptes?.length || 0) > 1 ? 's' : ''}
                              </Text>
                            </div>
                            <Text className="text-xs text-green-600 font-semibold group-hover:translate-x-1 transition-transform">
                              Voir détails →
                            </Text>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </Col>
                ))}
              </Row>
            </>
          )}
        </Spin>
      </div>
    </div>
  );
}
