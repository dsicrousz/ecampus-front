import {
  BookOpen,
  Bot,
  CalendarRange,
  Settings2,
  Split,
  TicketCheck,
  View
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useSession } from "@/auth/auth-client"
import { USER_ROLE } from "@/types/user.roles"
import { FaReact } from "react-icons/fa"

// This is sample data.
const data = {
  teams: [
    {
      name: "E-campus",
      logo: FaReact,
      plan: "Administration Panel",
    },
    {
      name: "Codification",
      logo: FaReact,
      plan: "Administration panel",
    },
    {
      name: "Medical Center",
      logo: FaReact,
      plan: "Administration Center",
    },
  ],
  navMain: [
    {
      title: "Supervision",
      roles: [USER_ROLE.ADMIN,USER_ROLE.SUPERADMIN],
      icon: View,
      isActive: true,
      items: [
        {
          title: "Services",
          url: "/admin",
          roles: [USER_ROLE.ADMIN,USER_ROLE.SUPERADMIN],
        },
      ],
    },
    {
      title: "Sessions",
      roles: [USER_ROLE.ADMIN,USER_ROLE.SUPERADMIN],
      icon: CalendarRange,
      isActive: true,
      items: [
        {
          title: "Gestion des sessions",
          url: "/admin/sessions",
          roles: [USER_ROLE.ADMIN,USER_ROLE.SUPERADMIN],
        },
      ],
    },

    {
      title: "Repreuneurs",
      roles: [USER_ROLE.REPREUNEUR,USER_ROLE.SUPERADMIN],
      icon: CalendarRange,
      isActive: true,
      items: [
        {
          title: "Gestion Repreuneur",
          url: "/admin/repreuneurs",
          roles: [USER_ROLE.REPREUNEUR,USER_ROLE.SUPERADMIN],
        },
      ],
    },
    {
      title: "Tickets",
      roles: [USER_ROLE.ADMIN,USER_ROLE.SUPERADMIN],
      icon: TicketCheck,
      isActive: true,
      items: [
        {
          title: "Gestion des Tickets",
          url: "/admin/tickets",
          roles: [USER_ROLE.ADMIN,USER_ROLE.SUPERADMIN],
        },
      ],
    },
    {
      title: "Controleurs",
      roles: [USER_ROLE.CONTROLEUR,USER_ROLE.SUPERADMIN],
      icon: TicketCheck,
      isActive: true,
      items: [
        {
          title: "Gestion des Controleurs",
          url: "/admin/controleurs",
          roles: [USER_ROLE.CONTROLEUR,USER_ROLE.SUPERADMIN],
        },
      ],
    },
    {
      title: "Services",
      roles: [USER_ROLE.ADMIN,USER_ROLE.SUPERADMIN],
      icon: Split,
      isActive: true,
      items: [
        {
          title: "Gestion des Services",
          url: "/admin/services",
          roles: [USER_ROLE.ADMIN,USER_ROLE.SUPERADMIN],
        },
      ],
    },
    {
      title: "Restaurations",
      roles: [USER_ROLE.SUPERADMIN, USER_ROLE.CHEF_RESTAURANT],
      icon: Bot,
      items: [
        {
          title: "Gestion des restaurants",
          url: "/admin/restaurations",
          roles: [USER_ROLE.CHEF_RESTAURANT, USER_ROLE.SUPERADMIN],
        },
        {
          title: "Supervision des décades",
          url: "/admin/decades",
          roles: [USER_ROLE.CHEF_RESTAURANT, USER_ROLE.SUPERADMIN],
        },
      ],
    },
    {
      title: "Comptabilites",
      roles: [USER_ROLE.ACP,USER_ROLE.CAISSIER,USER_ROLE.RECOUVREUR,USER_ROLE.VENDEUR,USER_ROLE.SUPERADMIN],
      icon: BookOpen,
      items: [
        {
          title: "Rechargements de Tickets",
          url: "/admin/recharge",
          roles: [USER_ROLE.VENDEUR,USER_ROLE.SUPERADMIN],
        },
        {
          title: "Caisse principale",
          url: "/admin/caisse-principale",
          roles: [USER_ROLE.CAISSIER,USER_ROLE.SUPERADMIN],
        },
        {
          title: "Recouvrement",
          url: "/admin/recouvrement",
          roles: [USER_ROLE.RECOUVREUR,USER_ROLE.SUPERADMIN],
        },
        {
          title: "ACP",
          url: "/admin/agent-comptable",
          roles: [USER_ROLE.ACP,USER_ROLE.SUPERADMIN],
        },
      ],
    },
    {
      title: "Etudiants",
      url: "/admin/etudiants",
      roles: [USER_ROLE.ADMIN,USER_ROLE.SUPERADMIN],
      icon: Settings2,
      items: [
        {
          title: "Gestion des étudiants",
          url: "/admin/etudiants",
          roles: [USER_ROLE.ADMIN,USER_ROLE.SUPERADMIN],
        },
        {
          title: "Comptes",
          url: "/admin/comptes",
          roles: [USER_ROLE.ADMIN,USER_ROLE.SUPERADMIN],
        },
      ],
    },
  ],
  // projects: [
  //   {
  //     name: "Design Engineering",
  //     url: "#",
  //     icon: Frame,
  //   },
  //   {
  //     name: "Sales & Marketing",
  //     url: "#",
  //     icon: PieChart,
  //   },
  //   {
  //     name: "Travel",
  //     url: "#",
  //     icon: Map,
  //   },
  // ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: sessionData } = useSession();
  
  // Adapter les données de session au format attendu par NavUser
  const user = sessionData?.user ? {
    name: sessionData.user.name,
    email: sessionData.user.email,
    avatar: sessionData.user.image || '',
  } : undefined;

  // Filtrer les éléments de navigation selon les rôles de l'utilisateur
  const userRoles = sessionData?.user?.role;
  const filteredNavMain = data.navMain
    .filter((item: any) => !item.roles || item.roles.some((role: string) => userRoles === role))
    .map((item: any) => ({
      ...item,
      items: item.items?.filter((subItem: any) => 
        !subItem.roles || subItem.roles.some((role: string) => userRoles === role)
      ),
    }));
  
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} />
      </SidebarContent>
      <SidebarFooter>
        {user && <NavUser user={user} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
