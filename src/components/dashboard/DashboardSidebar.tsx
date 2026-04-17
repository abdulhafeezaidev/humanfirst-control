import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  UserCog,
  ScrollText,
  ShieldCheck,
  Settings,
  Shield,
  Heart,
  Bot,
  Download,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import humanfirstLogo from '@/assets/humanfirst-logo.png';

interface DashboardSidebarProps {
  role: 'super_admin' | 'admin' | 'viewer' | 'student' | null;
  organizationName?: string;
}

export const DashboardSidebar = ({ role, organizationName }: DashboardSidebarProps) => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  const isOwner = role === 'super_admin';
  const isAdmin = role === 'super_admin' || role === 'admin';

  const mainNavItems = [
    {
      title: 'Overview',
      url: '/admin',
      icon: LayoutDashboard,
      roles: ['super_admin', 'admin', 'viewer'],
    },
    {
      title: 'Policies',
      url: '/admin/policies',
      icon: FileText,
      roles: ['super_admin', 'admin', 'viewer'],
    },
    {
      title: 'Students',
      url: '/admin/students',
      icon: Users,
      roles: ['super_admin', 'admin', 'viewer'],
    },
    {
      title: 'AI Services',
      url: '/admin/ai-services',
      icon: Bot,
      roles: ['super_admin', 'admin'],
    },
  ];

  const ownerNavItems = [
    {
      title: 'Admin Management',
      url: '/admin/team',
      icon: UserCog,
      roles: ['super_admin'],
    },
    {
      title: 'Enforcement',
      url: '/admin/enforcement',
      icon: Shield,
      roles: ['super_admin'],
    },
    {
      title: 'Settings',
      url: '/admin/settings',
      icon: Settings,
      roles: ['super_admin'],
    },
    {
      title: 'Data Export',
      url: '/admin/data-export',
      icon: Download,
      roles: ['super_admin', 'admin'],
    },
  ];

  const reportNavItems = [
    {
      title: 'Audit Logs',
      url: '/admin/logs',
      icon: ScrollText,
      roles: ['super_admin', 'admin', 'viewer'],
    },
    {
      title: 'Verify Submission',
      url: '/admin/verify-submission',
      icon: ShieldCheck,
      roles: ['super_admin', 'admin', 'viewer'],
    },
    {
      title: 'Trust & Ethics',
      url: '/trust',
      icon: Heart,
      roles: ['super_admin', 'admin', 'viewer'],
    },
  ];

  const filterByRole = (items: typeof mainNavItems) =>
    items.filter((item) => role && item.roles.includes(role));

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <img 
            src={humanfirstLogo} 
            alt="HumanFirst" 
            className="w-8 h-8 rounded-lg object-contain flex-shrink-0" 
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-foreground truncate">HumanFirst</span>
              {organizationName && (
                <span className="text-xs text-muted-foreground truncate">{organizationName}</span>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByRole(mainNavItems).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Owner-Only Section */}
        {isOwner && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterByRole(ownerNavItems).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.url)}
                      tooltip={collapsed ? item.title : undefined}
                    >
                      <NavLink 
                        to={item.url} 
                        className="flex items-center gap-3"
                        activeClassName="bg-primary/10 text-primary font-medium"
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Reports Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Reports</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByRole(reportNavItems).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto p-2 border-t border-border">
        <SidebarTrigger className="w-full" />
      </div>
    </Sidebar>
  );
};

export default DashboardSidebar;
