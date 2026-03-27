import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/layouts/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserCog, Mail, Shield, Crown } from 'lucide-react';
import InviteAdminDialog from '@/components/admin/InviteAdminDialog';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

const TeamManagementPage = () => {
  const { user, isAdmin, loading: authLoading, organization, permissions, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || role !== 'super_admin')) navigate('/admin');
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user && role === 'super_admin' && organization?.id) fetchTeam();
  }, [user, role, organization?.id]);

  const fetchTeam = async () => {
    setLoading(true);
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['super_admin', 'admin', 'viewer']);

    if (roles && roles.length > 0) {
      const ids = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, created_at')
        .in('user_id', ids);

      const merged = (profiles ?? []).map((p) => ({
        ...p,
        role: roles.find((r) => r.user_id === p.user_id)?.role ?? 'unknown',
      }));
      setMembers(merged);
    } else {
      setMembers([]);
    }
    setLoading(false);
  };

  const getRoleBadge = (r: string) => {
    switch (r) {
      case 'super_admin':
        return <Badge className="bg-amber-600"><Crown className="w-3 h-3 mr-1" />Owner</Badge>;
      case 'admin':
        return <Badge className="bg-blue-600"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      case 'viewer':
        return <Badge variant="secondary">Viewer</Badge>;
      default:
        return <Badge variant="outline">{r}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserCog className="w-6 h-6" /> Admin Management
            </h1>
            <p className="text-muted-foreground">Manage your admin team</p>
          </div>
          <Button onClick={() => setShowInvite(true)}>Invite Admin</Button>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : members.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <UserCog className="w-12 h-12 mb-4 opacity-50" />
              <p>No team members found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <Card key={m.user_id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{m.full_name}</CardTitle>
                    {getRoleBadge(m.role)}
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {m.email}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-xs text-muted-foreground">
                    Joined {new Date(m.created_at).toLocaleDateString()}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showInvite && organization?.id && (
        <InviteAdminDialog
          open={showInvite}
          onOpenChange={setShowInvite}
          onInviteSent={() => {
            fetchTeam();
            toast({ title: 'Invitation sent' });
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default TeamManagementPage;
