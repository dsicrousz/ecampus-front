import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from "@tanstack/react-query";
import { FaServicestack, FaArrowRight, FaMoneyBill } from "react-icons/fa";
import { ServiceService } from "@/services/service.service";
import { useSession } from '@/auth/auth-client';
import { QUERY_KEYS } from '@/constants';
import { Spin, Card, Badge, Space, Typography, Empty } from 'antd';

const { Title, Text, Paragraph } = Typography;

export const Route = createFileRoute('/admin/controleurs/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: sessionData } = useSession();
  const serviceService = new ServiceService();
  const key = [QUERY_KEYS.SERVICES,sessionData?.user?.id];
  const {data:services,isLoading: isLoadingF} = useQuery({ queryKey: key, queryFn:() => serviceService.byagent(sessionData?.user?.id!),enabled: !!sessionData });   
  return (
    <div>
       <Spin spinning={isLoadingF}>
         <Space orientation="vertical" size="large" style={{ width: '100%' }}>
           {/* Header Section */}
           <div className="bg-linear-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
             <Title level={3} style={{ marginBottom: 8, color: '#1677ff' }}>
               🎯 Mes Services de Contrôle
             </Title>
             <Text type="secondary">
               Sélectionnez un service pour gérer les utilisations de tickets
             </Text>
           </div>

           {/* Services Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {services?.map(s => (
               <Link key={s._id} to='/admin/controleurs/$serviceId' params={{serviceId: s._id}} className="block group">
                 <Card 
                   hoverable
                   className="h-full transition-all duration-300 hover:shadow-lg hover:scale-105"
                 >
                   <div className="bg-linear-to-br from-blue-500 to-indigo-600 p-6 -mx-6 -mt-6 mb-4">
                     <div className="flex items-center justify-center">
                       <div className="bg-white/20 p-4 rounded-full">
                         <FaMoneyBill size={32} color="white" />
                       </div>
                     </div>
                   </div>

                   <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                     <div className="flex justify-between items-start">
                       <Title level={5} className="capitalize line-clamp-2 mb-0" style={{ flex: 1 }}>
                         {s.nom}
                       </Title>
                       <Badge color="blue" text="Actif" />
                     </div>
                     
                     {s.description && (
                       <Paragraph type="secondary" className="line-clamp-3 min-h-[60px] mb-0">
                         {s.description}
                       </Paragraph>
                     )}
                     
                     <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                       <Text type="secondary" style={{ fontSize: 12 }}>
                         Cliquez pour gérer
                       </Text>
                       <FaArrowRight 
                         size={12} 
                         className="text-blue-500 group-hover:translate-x-1 transition-transform duration-200" 
                       />
                     </div>
                   </Space>
                 </Card>
               </Link>
             ))}
           </div>

           {/* Empty State */}
           {services?.length === 0 && !isLoadingF && (
             <Card className="text-center">
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
