import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from "@tanstack/react-query";
import { FaArrowRight, FaArrowLeft, FaTicketAlt, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { Spin, Card, Badge, Space, Typography, Empty, Button, Divider } from 'antd';
import { ServiceService } from "@/services/service.service";
import { requireRole } from '@/lib/route-protection';
import { USER_ROLE } from '@/types/user.roles';

const { Title, Text, Paragraph } = Typography;

export const Route = createFileRoute('/admin/controleurs/$serviceId/')({
  beforeLoad: () => requireRole([USER_ROLE.CONTROLEUR, USER_ROLE.CHEF_DIV_RESTAURANT, USER_ROLE.SUPERADMIN]),
  component: RouteComponent,
})

function RouteComponent() {
  const {serviceId} = Route.useParams();
  const navigate = useNavigate();
  const serviceService = new ServiceService();
  
  const { data: service, isLoading } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => serviceService.getOne(serviceId),
    enabled: !!serviceId
  });

  const ticket = service && typeof service.ticket === 'object' ? service.ticket : null;
  const ticketId = ticket?._id || (typeof service?.ticket === 'string' ? service.ticket : null);

  return (
    <div className="controller-page">
      <Spin spinning={isLoading}>
        <Space direction="vertical" size="large" className="controller-stack">
          {/* Header Section */}
          <Card className="controller-hero controller-hero-soft">
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
                  <Title level={3} className="controller-hero-title" style={{ margin: 0 }}>
                    🎫 Tickets Acceptés
                  </Title>
                </Space>
                <Title level={4} style={{ marginTop: 8, marginBottom: 0 }}>
                  {service?.nom}
                </Title>
              </div>
              <Badge color={service?.active ? 'green' : 'red'} count={service?.active ? 'Actif' : 'Inactif'} />
            </div>
          </Card>

          {/* Service Info */}
          <Card className="controller-panel">
            <Title level={5} style={{ marginBottom: 16 }}>
              📋 Informations du Service
            </Title>
            <div className="controller-info-grid">
              <div className="controller-info-card p-4">
                <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>Type</Text>
                <Text strong style={{ color: '#0ea5e9' }} className="capitalize">
                  {service?.type || '-'}
                </Text>
              </div>
              <div className="controller-info-card p-4">
                <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>Statut</Text>
                <Text strong style={{ color: service?.active ? '#16a34a' : '#ef4444' }}>
                  {service?.active ? 'Actif' : 'Inactif'}
                </Text>
              </div>
              <div className="controller-info-card p-4">
                <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>Ticket lié</Text>
                <Text strong style={{ color: '#0f172a' }}>
                  {ticket?.nom || '-'}
                </Text>
              </div>
            </div>
          </Card>

          <Divider />

          {/* Ticket Section */}
          <div>
            <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
              <div>
                <Title level={4} style={{ marginBottom: 0 }}>
                  Ticket à consommer
                </Title>
                <Text type="secondary" style={{ marginTop: 4, display: 'block' }}>
                  Cliquez sur le ticket pour accéder au contrôle
                </Text>
              </div>
            </div>

            {ticket && ticketId ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <Link
                  key={ticket._id}
                  to='/admin/controleurs/$serviceId/ticket/$ticketId'
                  params={{serviceId, ticketId}}
                  className="block group"
                >
                  <Card
                    hoverable
                    className="controller-ticket-card h-full transition-all duration-300"
                  >
                    <div className="controller-ticket-top p-6 -mx-6 -mt-6 mb-4">
                      <div className="flex items-center justify-center">
                        <div className="bg-slate-100 p-4 rounded-full">
                          <FaTicketAlt size={32} color="#0f172a" />
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

                      <div className="rounded-md bg-slate-100 p-2">
                        <div className="flex justify-between items-center">
                          <Text style={{ fontSize: 12, color: '#0f172a' }} strong>
                            ✓ Ticket Valide
                          </Text>
                          <FaArrowRight
                            size={12}
                            className="text-foreground group-hover:translate-x-1 transition-transform duration-200"
                          />
                        </div>
                      </div>
                    </Space>
                  </Card>
                </Link>
              </div>
            ) : (
              <Card className="controller-panel text-center">
                <Empty
                  image={<div className="bg-gray-100 p-6 rounded-full inline-block"><FaTicketAlt size={48} className="text-gray-400" /></div>}
                  description={
                    <Space orientation="vertical" size="small">
                      <Title level={4} style={{ marginBottom: 4 }}>
                        Aucun ticket
                      </Title>
                      <Text type="secondary">
                        Ce service n'a pas de ticket configuré.
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
