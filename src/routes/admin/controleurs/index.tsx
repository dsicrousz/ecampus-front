import { createFileRoute, Link } from '@tanstack/react-router'
import { requireRole } from '@/lib/route-protection';
import { useQuery } from "@tanstack/react-query";
import { FaServicestack, FaArrowRight, FaMoneyBill } from "react-icons/fa";
import { ServiceService } from "@/services/service.service";
import { PlanningService } from "@/services/planning.service";
import { useSession } from '@/auth/auth-client';
import { Spin, Card, Space, Typography, Empty, Tag } from 'antd';
import { USER_ROLE } from '@/types/user.roles';
import { useMemo } from 'react';
import type { Planning } from '@/types/planning';

const { Title, Text } = Typography;

export const Route = createFileRoute('/admin/controleurs/')({
  beforeLoad: () => requireRole([USER_ROLE.CONTROLEUR, USER_ROLE.CHEF_DIV_RESTAURANT, USER_ROLE.SUPERADMIN]),
  component: RouteComponent,
})

function RouteComponent() {
  const { data: sessionData } = useSession();
  const serviceService = new ServiceService();
  const planningService = new PlanningService();

  // Services assignés à l'agent (pour récupérer le ticket lié au service).
  // NB: l'endpoint by-agent-controle est rétro-compatible mais ne renvoie
  // plus le planning (géré via la collection Planning dédiée).
  const key = ['services', 'by-agent', sessionData?.user?.id];
  const {data: services, isLoading: isLoadingF} = useQuery({ queryKey: key, queryFn:() => serviceService.byagent(sessionData?.user?.id!), enabled: !!sessionData });

  // Plannings actifs pour l'agent maintenant (filtre jour + horaire en cours côté backend).
  // GET /planning/by-agent/:agentId — renvoie Planning[] avec restaurant + service populés.
  const { data: plannings, isLoading: isLoadingPlannings } = useQuery<Planning[]>({
    queryKey: ['planning', 'by-agent', sessionData?.user?.id],
    queryFn: () => planningService.findByAgentControle(sessionData?.user?.id!),
    enabled: !!sessionData?.user?.id,
  });

  // Fusionne les plannings actifs avec le ticket du service correspondant.
  // Le Planning ne contient pas l'info ticket, on la récupère depuis `services`.
  const activeServices = useMemo(() => {
    if (!plannings || !services) return [];
    return plannings.map(p => {
      const svc = services.find(s => s._id === p.service._id);
      return {
        ...p,
        _id: p.service._id,
        nom: p.service.nom,
        ticket: svc?.ticket,
      };
    });
  }, [plannings, services]);

  const isLoading = isLoadingF || isLoadingPlannings;

  return (
    <div className="controller-page">
       <Spin spinning={isLoading}>
         <Space direction="vertical" size="large" className="controller-stack">
           {/* Header Section */}
           <Card className="controller-hero controller-hero-soft">
             <Title level={3} className="controller-hero-title" style={{ marginBottom: 8 }}>
               🎯 Mes Services de Contrôle
             </Title>
             <Text className="controller-hero-copy">
               Sélectionnez un service pour gérer les utilisations de tickets
             </Text>
             <div className="flex items-center gap-2 mt-2">
               <Tag color="green">🟢 {activeServices.length} service(s) actif(s) maintenant</Tag>
             </div>
           </Card>

           {/* Active Services Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {activeServices.map(s => {
               const ticketId = typeof s.ticket === 'object' && s.ticket?._id ? s.ticket._id : s.ticket as string;
               return (
               <Link key={s._id} to='/admin/controleurs/$serviceId/ticket/$ticketId' params={{serviceId: s._id, ticketId}} className="block group">
                 <Card
                   hoverable
                   className="controller-ticket-card h-full transition-all duration-300"
                 >
                   <div className="controller-ticket-top p-6 -mx-6 -mt-6 mb-4">
                     <div className="flex items-center justify-center">
                       <div className="bg-slate-100 p-4 rounded-full">
                         <FaMoneyBill size={32} color="#0f172a" />
                       </div>
                     </div>
                   </div>

                   <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                     <div className="flex justify-between items-start">
                       <Title level={5} className="capitalize line-clamp-2 mb-0" style={{ flex: 1 }}>
                         {s.nom}
                       </Title>
                       <span className="controller-ticket-chip">En cours</span>
                     </div>

                     <div className="flex justify-between items-center pt-4 border-t border-border">
                       <Text type="secondary" style={{ fontSize: 12 }}>
                         Cliquez pour gérer
                       </Text>
                       <FaArrowRight
                         size={12}
                         className="text-foreground group-hover:translate-x-1 transition-transform duration-200"
                       />
                     </div>
                   </Space>
                 </Card>
               </Link>
               );
             })}
           </div>

           {/* Empty State */}
           {activeServices.length === 0 && !isLoading && (
              <Card className="controller-panel text-center">
               <Empty
                 image={<div className="bg-gray-100 p-6 rounded-full inline-block"><FaServicestack size={48} className="text-gray-400" /></div>}
                 description={
                   <Space orientation="vertical" size="small">
                     <Title level={4} style={{ marginBottom: 4 }}>
                       Aucun service disponible
                     </Title>
                     <Text type="secondary">
                       Vous n'avez actuellement aucun service assigné pour le contrôle.
                     </Text>
                   </Space>
                 }
               />
             </Card>
           )}
         </Space>
       </Spin>
    </div>
  )
}
