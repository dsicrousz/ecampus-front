import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from "@tanstack/react-query";
import { FaArrowRight, FaArrowLeft, FaTicketAlt, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { Spin, Card, Badge, Space, Typography, Empty, Button, Divider } from 'antd';
import { ServiceService } from "@/services/service.service";
import { QUERY_KEYS } from '@/constants';
import type { Ticket } from '@/types/ticket';
import {useMedia} from 'react-use';

const { Title, Text, Paragraph } = Typography;

export const Route = createFileRoute('/admin/controleurs/$serviceId/')({
  component: RouteComponent,
})

function RouteComponent() {
  const {serviceId} = Route.useParams();
  const navigate = useNavigate();
  const serviceService = new ServiceService();
  const isMobile = useMedia('(max-width: 768px)');
  
  const { data: service, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.SERVICES, serviceId],
    queryFn: () => serviceService.getOne(serviceId),
    enabled: !!serviceId
  });

  return (
    <div>
      <Spin spinning={isLoading}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          {/* Header Section */}
          <div className="bg-linear-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
            <div className="flex justify-between items-center">
              <div>
                <Space size="middle" style={{ marginBottom: 8 }}>
                  <Button
                    icon={<FaArrowLeft />}
                    onClick={() => navigate({to: '/admin/controleurs'})}
                    type="text"
                  >
                    Retour
                  </Button>
                  <Title level={3} style={{ margin: 0, color: '#1677ff' }}>
                    🎫 Tickets Acceptés
                  </Title>
                </Space>
                <Title level={4} style={{ marginTop: 8, marginBottom: 0 }}>
                  {service?.nom}
                </Title>
                {service?.description && (
                  <Text type="secondary" style={{ marginTop: 4, display: 'block' }}>
                    {service.description}
                  </Text>
                )}
              </div>
              <Badge color={service?.active ? 'green' : 'red'} count={service?.active ? 'Actif' : 'Inactif'} />
            </div>
          </div>

          {/* Service Info */}
          <Card>
            <Title level={5} style={{ marginBottom: 16 }}>
              📋 Informations du Service
            </Title>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-md">
                <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>Type de Service</Text>
                <Text strong style={{ color: '#1677ff' }} className="capitalize">
                  {service?.typeService || '-'}
                </Text>
              </div>
              <div className="bg-green-50 p-4 rounded-md">
                <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>Localisation</Text>
                <Text strong style={{ color: '#52c41a' }}>
                  {service?.localisation || '-'}
                </Text>
              </div>
              <div className="bg-purple-50 p-4 rounded-md">
                <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>Nombre de Places</Text>
                <Text strong style={{ color: '#722ed1' }}>
                  {service?.nombre_de_places || '-'}
                </Text>
              </div>
            </div>
          </Card>

          <Divider />

          {/* Tickets Section */}
          <div>
            <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
              <div>
                <Title level={4} style={{ marginBottom: 0 }}>
                  Tickets Acceptés dans ce Service
                </Title>
                <Text type="secondary" style={{ marginTop: 4, display: 'block' }}>
                  {service?.ticketsacceptes?.length || 0} ticket(s) disponible(s)
                </Text>
              </div>
            </div>

            {/* Tickets Grid */}
            {service?.ticketsacceptes && service.ticketsacceptes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {service.ticketsacceptes.map((ticket:Ticket) => (
                  <Link 
                    key={ticket._id} 
                    to={isMobile ? '/admin/controleurs/$serviceId/ticket/$ticketId/mobile' : '/admin/controleurs/$serviceId/ticket/$ticketId'}
                    params={{serviceId, ticketId: ticket._id}}
                    className="block group"
                  >
                    <Card
                      hoverable
                      className="h-full transition-all duration-300 hover:shadow-xl hover:scale-105 border-green-200 group-hover:border-green-400"
                    >
                      <div className="bg-linear-to-br from-green-500 to-emerald-600 p-6 -mx-6 -mt-6 mb-4">
                        <div className="flex items-center justify-center">
                          <div className="bg-white/20 p-4 rounded-full">
                            <FaTicketAlt size={32} color="white" />
                          </div>
                        </div>
                      </div>

                      <Space orientation="vertical" size="small" style={{ width: '100%', marginTop: 16 }}>
                        <div className="flex justify-between items-start">
                          <Title level={5} className="line-clamp-2 flex-1 mb-0">
                            {ticket.nom}
                          </Title>
                          <Badge 
                            color={ticket.active ? 'green' : 'red'} 
                            count={ticket.active ? <FaCheckCircle /> : <FaTimesCircle />}
                          />
                        </div>

                        {ticket.description && (
                          <Paragraph type="secondary" className="line-clamp-3 min-h-[60px] mb-0">
                            {ticket.description}
                          </Paragraph>
                        )}

                        <Divider style={{ margin: '8px 0' }} />

                        <div className="flex justify-between items-center">
                          <Text type="secondary" style={{ fontSize: 12 }} strong>
                            Prix
                          </Text>
                          <Badge color="green" count={`${ticket.prix?.toLocaleString()} FCFA`} />
                        </div>

                        <div className="bg-green-50 p-2 rounded-md">
                          <div className="flex justify-between items-center">
                            <Text style={{ fontSize: 12, color: '#52c41a' }} strong>
                              ✓ Ticket Valide
                            </Text>
                            <FaArrowRight 
                              size={12} 
                              className="text-green-600 group-hover:translate-x-1 transition-transform duration-200" 
                            />
                          </div>
                        </div>
                      </Space>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="text-center">
                <Empty
                  image={<div className="bg-gray-100 p-6 rounded-full inline-block"><FaTicketAlt size={48} className="text-gray-400" /></div>}
                  description={
                    <Space orientation="vertical" size="small">
                      <Title level={4} style={{ marginBottom: 4 }}>
                        Aucun ticket accepté
                      </Title>
                      <Text type="secondary">
                        Ce service n'a actuellement aucun ticket accepté configuré.
                      </Text>
                    </Space>
                  }
                />
              </Card>
            )}
          </div>

          {/* Action Button */}
          <div className="flex justify-center" style={{ marginTop: 32 }}>
            <Button
              size="large"
              onClick={() => navigate({to:'/admin/controleurs'})}
              icon={<FaArrowLeft />}
            >
              Retour aux Services
            </Button>
          </div>
        </Space>
      </Spin>
    </div>
  );
}
