import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/layouts/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  UserCog,
  Mail,
  Shield,
  Crown,
  Eye,
  Plus,
  Search,
  RefreshCw,
  Clock,
  Copy,
  Check,
  Trash2,
  Users,
  ShieldAlert,
  Info,
} from 'lucide-react';
import InviteAdminDialog from '@/components/admin/InviteAdminDialog';
import { useToast } from '@/hooks/use-toast';
import { ROLE_DESCRIPTIONS, type AppRole } from '@/lib/adminHierarchy';
import { getAppOrigin } from '@/lib/appUrl';

interface TeamMember {
  user_id: string;
  full_name: string;
  email: string;
  role: AppRole | string;
  created_at: string;
  organization_id?: string | null;
}

interface AdminInvitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  created_at: string;
  used_at: string | null;
}

export const TeamManagementPage = () => {
  const { user, isAdmin, loading: authLoading, organization, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'admin' | 'viewer'>('all');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading, navigate]);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user roles for admin types
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['super_admin', 'admin', 'viewer']);

      if (rolesError) throw rolesError;

      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map((r) => r.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, created_at, organization_id')
          .in('user_id', userIds);

        const merged: TeamMember[] = rolesData.map((r) => {
          const profile = profilesData?.find((p) => p.user_id === r.user_id);
          return {
            user_id: r.user_id,
            role: r.role as AppRole,
            full_name: profile?.full_name || 'Admin User',
            email: profile?.email || 'No email',
            created_at: profile?.created_at || new Date().toISOString(),
            organization_id: profile?.organization_id,
          };
        });

        // Sort: Current user first, then super_admin, then admin, then viewer
        merged.sort((a, b) => {
          if (a.user_id === user?.id) return -1;
          if (b.user_id === user?.id) return 1;
          const rolePriority: Record<string, number> = { super_admin: 3, admin: 2, viewer: 1 };
          return (rolePriority[b.role] || 0) - (rolePriority[a.role] || 0);
        });

        setMembers(merged);
      } else {
        setMembers([]);
      }

      // 2. Fetch pending invitations
      const { data: invitesData } = await supabase
        .from('admin_invitations')
        .select('*')
        .is('used_at', null)
        .order('created_at', { ascending: false });

      setInvitations(invitesData || []);
    } catch (err: any) {
      console.error('Error fetching admin team:', err);
      toast({
        title: 'Error loading team',
        description: err.message || 'Could not load administrator accounts.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchTeamData();
    }
  }, [user, isAdmin]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTeamData();
  };

  const handleCopyInviteLink = (token: string) => {
    const origin = getAppOrigin();
    const link = `${origin}/admin/signup?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    toast({
      title: 'Invite link copied!',
      description: 'The invitation link has been copied to your clipboard.',
    });
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('admin_invitations')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      toast({
        title: 'Invitation revoked',
        description: 'The admin invitation has been cancelled.',
      });
      setInvitations((prev) => prev.filter((inv) => inv.id !== inviteId));
    } catch (err: any) {
      toast({
        title: 'Revoke failed',
        description: err.message || 'Could not revoke invitation.',
        variant: 'destructive',
      });
    }
  };

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || m.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [members, searchQuery, roleFilter]);

  const getRoleBadge = (r: string) => {
    switch (r) {
      case 'super_admin':
        return (
          <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/30 font-semibold px-2.5 py-1">
            <Crown className="w-3.5 h-3.5 mr-1 text-amber-500" />
            Super Admin (Owner)
          </Badge>
        );
      case 'admin':
        return (
          <Badge className="bg-primary/15 text-primary border border-primary/30 font-semibold px-2.5 py-1">
            <Shield className="w-3.5 h-3.5 mr-1 text-primary" />
            Admin
          </Badge>
        );
      case 'viewer':
        return (
          <Badge className="bg-muted text-muted-foreground border border-border font-medium px-2.5 py-1">
            <Eye className="w-3.5 h-3.5 mr-1" />
            Viewer
          </Badge>
        );
      default:
        return <Badge variant="outline">{r}</Badge>;
    }
  };

  const superAdminCount = members.filter((m) => m.role === 'super_admin').length;
  const adminCount = members.filter((m) => m.role === 'admin').length;
  const viewerCount = members.filter((m) => m.role === 'viewer').length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <UserCog className="w-5 h-5" />
              </div>
              Admin Management
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage your administrator team, invite administrators, and oversee access levels.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {role === 'super_admin' && (
              <Button
                onClick={() => setShowInvite(true)}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Invite Admin
              </Button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card/60 backdrop-blur-sm border-border/60 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Administrators</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{members.length}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Users className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm border-border/60 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Super Admins</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{superAdminCount}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Crown className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm border-border/60 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Admins</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{adminCount}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Shield className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm border-border/60 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Invites</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{invitations.length}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                <Mail className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Active Team vs Invitations */}
        <Tabs defaultValue="active" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <TabsList className="bg-muted/70 p-1">
              <TabsTrigger value="active" className="gap-2">
                <Shield className="w-4 h-4" />
                Active Admins ({members.length})
              </TabsTrigger>
              <TabsTrigger value="invitations" className="gap-2">
                <Mail className="w-4 h-4" />
                Pending Invites ({invitations.length})
              </TabsTrigger>
            </TabsList>

            {/* Search and Role Filter */}
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <select
                aria-label="Filter administrators by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admins</option>
                <option value="admin">Admins</option>
                <option value="viewer">Viewers</option>
              </select>
            </div>
          </div>

          {/* ACTIVE TEAM TAB */}
          <TabsContent value="active" className="space-y-4">
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6 space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </Card>
                ))}
              </div>
            ) : filteredMembers.length === 0 ? (
              <Card className="border-dashed py-12 text-center">
                <CardContent className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <UserCog className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">No administrators found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {searchQuery
                      ? 'No administrator accounts match your search filter.'
                      : 'No administrators currently in this list.'}
                  </p>
                  {searchQuery && (
                    <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                      Clear Search
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredMembers.map((m) => {
                  const isCurrentUser = m.user_id === user?.id;
                  const initials = m.full_name
                    ? m.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : 'AD';

                  return (
                    <Card
                      key={m.user_id}
                      className={`relative overflow-hidden transition-all duration-200 hover:shadow-md border-border/80 ${
                        isCurrentUser ? 'ring-2 ring-primary/40 bg-primary/[0.02]' : 'bg-card'
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                              {initials}
                            </div>
                            <div className="overflow-hidden">
                              <CardTitle className="text-base font-bold truncate flex items-center gap-2">
                                <span className="truncate">{m.full_name}</span>
                                {isCurrentUser && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/50 text-primary">
                                    You
                                  </Badge>
                                )}
                              </CardTitle>
                              <CardDescription className="text-xs truncate flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate">{m.email}</span>
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3 pt-0">
                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <span className="text-xs text-muted-foreground font-medium">Role:</span>
                          <div>{getRoleBadge(m.role)}</div>
                        </div>

                        <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg leading-relaxed border border-border/40">
                          {ROLE_DESCRIPTIONS[m.role as AppRole] || 'System administrator'}
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Joined {new Date(m.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* INVITATIONS TAB */}
          <TabsContent value="invitations" className="space-y-4">
            {invitations.length === 0 ? (
              <Card className="border-dashed py-12 text-center">
                <CardContent className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">No pending invitations</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    All sent admin invitations have been accepted or expired.
                  </p>
                  {role === 'super_admin' && (
                    <Button onClick={() => setShowInvite(true)} className="gap-2 mt-2">
                      <Plus className="w-4 h-4" />
                      Invite New Admin
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {invitations.map((inv) => (
                  <Card key={inv.id} className="relative bg-card border-border/80 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold truncate">{inv.email}</CardTitle>
                        {getRoleBadge(inv.role)}
                      </div>
                      <CardDescription className="text-xs">
                        Sent {new Date(inv.created_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-xs text-muted-foreground flex items-center justify-between">
                        <span>Expires:</span>
                        <span>{new Date(inv.expires_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1 gap-1 text-xs"
                          onClick={() => handleCopyInviteLink(inv.token)}
                        >
                          {copiedToken === inv.token ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-primary" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy Link
                            </>
                          )}
                        </Button>
                        {role === 'super_admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 text-xs px-2"
                            onClick={() => handleRevokeInvite(inv.id)}
                            title="Revoke Invitation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Roles & Security Guide Card */}
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Info className="w-4 h-4 text-primary" />
              Role Permissions Hierarchy
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
            <div className="p-3 rounded-lg bg-background/50 border border-border/40 space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                Super Admin (Owner)
              </p>
              <p>Full control over the organization. Can invite/remove any admin, configure billing, and manage policies.</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border/40 space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary" />
                Admin
              </p>
              <p>Can create and schedule exam policies, monitor students, view audit logs, and enforce focus mode.</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border/40 space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                Viewer
              </p>
              <p>Read-only access to view active exam policies, reports, transparency records, and compliance metrics.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Admin Dialog */}
      {showInvite && (
        <InviteAdminDialog
          open={showInvite}
          onOpenChange={setShowInvite}
          onInviteSent={() => {
            fetchTeamData();
            setShowInvite(false);
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default TeamManagementPage;
