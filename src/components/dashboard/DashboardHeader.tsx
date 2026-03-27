import { LogOut, Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getRoleLabel, getRoleBadgeColor } from '@/lib/permissions';

type AppRole = 'super_admin' | 'admin' | 'viewer' | 'student' | null;

interface DashboardHeaderProps {
  userEmail?: string;
  role: AppRole;
  unresolvedAlerts: number;
  onSignOut: () => void;
  onViewAlerts?: () => void;
}

export const DashboardHeader = ({
  userEmail,
  role,
  unresolvedAlerts,
  onSignOut,
  onViewAlerts,
}: DashboardHeaderProps) => {
  return (
    <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div className="hidden sm:block">
          <h1 className="text-lg font-semibold text-foreground">Admin Dashboard</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Alerts Button */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={onViewAlerts}
          title="View Alerts"
        >
          <Bell className="w-5 h-5" />
          {unresolvedAlerts > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
              {unresolvedAlerts > 9 ? '9+' : unresolvedAlerts}
            </span>
          )}
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden md:inline max-w-[150px] truncate">
                {userEmail}
              </span>
              <Badge variant="outline" className={getRoleBadgeColor(role)}>
                {getRoleLabel(role)}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium">My Account</span>
                <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default DashboardHeader;
