import { createFileRoute, Link } from '@tanstack/react-router'
import { requireRole } from '@/lib/route-protection';
import { useQuery } from "@tanstack/react-query";
import { FaServicestack, FaArrowRight, FaMoneyBill } from "react-icons/fa";
import { ServiceService } from "@/services/service.service";
import { useSession } from '@/auth/auth-client';
import { QUERY_KEYS } from '@/constants';
import { Spin, Card, Space, Typography, Empty } from 'antd';
import { USER_ROLE } from '@/types/user.roles';

const { Title, Text, Paragraph } = Typography;

export const Route = createFileRoute('/admin/controleurs/')({
  beforeLoad: () => requireRole([USER_ROLE.CONTROLEUR, USER_ROLE.SUPERADMIN]),
  component: RouteComponent,
})

function RouteComponent() {
  const { data: sessionData } = useSession();
  const serviceService = new ServiceService();
  const key = [QUERY_KEYS.SERVICES,sessionData?.user?.id];
  const {data:services,isLoading: isLoadingF} = useQuery({ queryKey: key, queryFn:() => serviceService.byagent(sessionData?.user?.id!),enabled: !!sessionData });   
  return (
    <div className="controller-page">
       <Spin spinning={isLoadingF}>
         <Space direction="vertical" size="large" className="controller-stack">
           {/* Header Section */}
           <Card className="controller-hero controller-hero-soft">
             <Title level={3} className="controller-hero-title" style={{ marginBottom: 8 }}>
               🎯 Mes Services de Contrôle
             </Title>
             <Text className="controller-hero-copy">
               Sélectionnez un service pour gérer les utilisations de tickets
             </Text>
           </Card>

           {/* Services Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {services?.map(s => (
               <Link key={s._id} to='/admin/controleurs/$serviceId' params={{serviceId: s._id}} className="block group">
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
                       <span className="controller-ticket-chip">Actif</span>
                     </div>
                     
                     {s.description && (
                       <Paragraph type="secondary" className="line-clamp-3 min-h-[60px] mb-0">
                         {s.description}
                       </Paragraph>
                     )}
                     
                     <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                       <Text type="secondary" style={{ fontSize: 12 }}>
                         Cliquez pour gérer
                       </Text>
                       <FaArrowRight 
                         size={12} 
                         className="text-slate-700 group-hover:translate-x-1 transition-transform duration-200" 
                       />
                     </div>
                   </Space>
                 </Card>
               </Link>
             ))}
           </div>

           {/* Empty State */}
           {services?.length === 0 && !isLoadingF && (
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
