import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar, DashboardHeader } from '@/components/dashboard';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface DashboardLayoutProps {
  children: ReactNode;
  unresolvedAlerts?: number;
  onViewAlerts?: () => void;
}

export const DashboardLayout = ({ 
  children, 
  unresolvedAlerts = 0,
  onViewAlerts 
}: DashboardLayoutProps) => {
  const { user, role, organization, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar 
          role={role} 
          organizationName={organization?.name} 
        />
        <SidebarInset className="flex-1">
          <DashboardHeader
            userEmail={user?.email}
            role={role}
            unresolvedAlerts={unresolvedAlerts}
            onSignOut={handleSignOut}
            onViewAlerts={onViewAlerts}
          />
          <main className="p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
