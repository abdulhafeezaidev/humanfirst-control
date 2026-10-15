import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/layouts/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Mail,
  Search,
  UserPlus,
  RefreshCw,
  Clock,
  Trash2,
  Copy,
  Check,
  UserCheck,
  GraduationCap,
  ShieldCheck,
  Building,
} from 'lucide-react';
import InviteStudentDialog from '@/components/admin/InviteStudentDialog';
import { useToast } from '@/hooks/use-toast';
import { getAppOrigin } from '@/lib/appUrl';

interface Student {
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
  organization_id: string | null;
}

interface StudentInvitation {
  id: string;
  email: string;
  full_name: string;
  token: string;
  expires_at: string;
  created_at: string;
  used_at: string | null;
}

export const StudentsPage = () => {
  const { user, isAdmin, loading: authLoading, organization } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [invitations, setInvitations] = useState<StudentInvitation[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/auth');
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin && organization?.id) {
      fetchAllStudentData();
    }
  }, [user, isAdmin, organization?.id]);

  const fetchAllStudentData = async () => {
    setLoading(true);
    if (!organization?.id) {
      setStudents([]);
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch profiles for this organization
      const { data: orgProfiles, error: orgProfilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, created_at, organization_id')
        .eq('organization_id', organization.id);

      if (orgProfilesError) throw orgProfilesError;

      if (orgProfiles && orgProfiles.length > 0) {
        const ids = orgProfiles.map((p) => p.user_id);
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'student')
          .in('user_id', ids);

        const studentIds = new Set((roles ?? []).map((r) => r.user_id));
        setStudents(orgProfiles.filter((p) => studentIds.has(p.user_id)));
      } else {
        setStudents([]);
      }

      // 2. Fetch pending student invitations
      const { data: invitesData } = await supabase
        .from('student_invitations')
        .select('*')
        .eq('organization_id', organization.id)
        .is('used_at', null)
        .order('created_at', { ascending: false });

      setInvitations(invitesData || []);

      // 3. Fetch unassigned registered students (not yet assigned to any organization)
      const { data: unassignedProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, created_at, organization_id')
        .is('organization_id', null);

      if (unassignedProfiles && unassignedProfiles.length > 0) {
        const unassignedIds = unassignedProfiles.map((p) => p.user_id);
        const { data: studentRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'student')
          .in('user_id', unassignedIds);

        const studentSet = new Set((studentRoles || []).map((r) => r.user_id));
        setUnassignedStudents(unassignedProfiles.filter((p) => studentSet.has(p.user_id)));
      } else {
        setUnassignedStudents([]);
      }
    } catch (err: any) {
      console.error('Error fetching students:', err);
      toast({
        title: 'Error loading students',
        description: err.message || 'Could not fetch student accounts.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllStudentData();
  };

  const handleCopyInviteLink = (inv: StudentInvitation) => {
    const origin = getAppOrigin();
    const link = `${origin}/student/signup?token=${inv.token}&email=${encodeURIComponent(inv.email)}&name=${encodeURIComponent(inv.full_name)}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(inv.token);
    toast({
      title: 'Invite link copied!',
      description: `Link for ${inv.full_name} copied to clipboard.`,
    });
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('student_invitations')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      toast({
        title: 'Invitation cancelled',
        description: 'The student invitation has been removed.',
      });
      setInvitations((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err: any) {
      toast({
        title: 'Revoke failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleEnrollExistingStudent = async (studentUser: Student) => {
    if (!organization?.id) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ organization_id: organization.id })
        .eq('user_id', studentUser.user_id);

      if (error) throw error;

      toast({
        title: 'Student Enrolled!',
        description: `${studentUser.full_name || studentUser.email} is now enrolled in your institution.`,
      });

      fetchAllStudentData();
    } catch (err: any) {
      toast({
        title: 'Enrollment failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleUnenrollStudent = async (studentUserId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to unenroll ${studentName} from ${organization?.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ organization_id: null })
        .eq('user_id', studentUserId);

      if (error) throw error;

      toast({
        title: 'Student Unenrolled',
        description: `${studentName} was removed from your institution.`,
      });

      fetchAllStudentData();
    } catch (err: any) {
      toast({
        title: 'Unenroll failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase())
    );
  }, [students, search]);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Users className="w-5 h-5" />
              </div>
              Student Management
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage enrolled students in {organization?.name || 'your institution'}, add new students, and track invitations.
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
            <Button
              onClick={() => setShowInviteDialog(true)}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Add Student
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card/60 backdrop-blur-sm border-border/60 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Enrolled Students</p>
                <p className="text-3xl font-bold mt-1 text-foreground">{students.length}</p>
                <p className="text-xs text-primary mt-1 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" /> Active in institution
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <GraduationCap className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm border-border/60 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Invites</p>
                <p className="text-3xl font-bold mt-1 text-foreground">{invitations.length}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Awaiting signup
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                <Mail className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm border-border/60 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Institution Plan</p>
                <p className="text-2xl font-bold mt-1 text-foreground capitalize">{organization?.plan_type || 'Pilot'}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" /> {organization?.name || 'HumanFirst'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Enrolled vs Pending vs Unassigned */}
        <Tabs defaultValue="enrolled" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <TabsList className="bg-muted/70 p-1">
              <TabsTrigger value="enrolled" className="gap-2">
                <Users className="w-4 h-4" />
                Enrolled Students ({students.length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2">
                <Mail className="w-4 h-4" />
                Pending Invites ({invitations.length})
              </TabsTrigger>
              {unassignedStudents.length > 0 && (
                <TabsTrigger value="unassigned" className="gap-2 text-primary">
                  <UserPlus className="w-4 h-4" />
                  Registered Unassigned ({unassignedStudents.length})
                </TabsTrigger>
              )}
            </TabsList>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search students by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {/* TAB 1: ENROLLED STUDENTS */}
          <TabsContent value="enrolled" className="space-y-4">
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-36 rounded-xl" />
                ))}
              </div>
            ) : filteredStudents.length === 0 ? (
              <Card className="border-dashed py-14 text-center">
                <CardContent className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Users className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">No students enrolled yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {search
                      ? 'No students match your search filter.'
                      : 'Enroll your first student using the "Add Student" button above.'}
                  </p>
                  <Button onClick={() => setShowInviteDialog(true)} className="gap-2 mt-2">
                    <UserPlus className="w-4 h-4" />
                    Add Student
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredStudents.map((s) => {
                  const initials = s.full_name
                    ? s.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : 'ST';

                  return (
                    <Card
                      key={s.user_id}
                      className="bg-card hover:shadow-md transition-all duration-200 border-border/80 flex flex-col justify-between"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                            {initials}
                          </div>
                          <div className="overflow-hidden flex-1">
                            <CardTitle className="text-base font-bold truncate">
                              {s.full_name || 'Student'}
                            </CardTitle>
                            <CardDescription className="text-xs truncate flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate">{s.email}</span>
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3 pt-0">
                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                            Enrolled Student
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Joined {new Date(s.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-end pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive hover:bg-destructive/10 h-8 gap-1.5"
                            onClick={() => handleUnenrollStudent(s.user_id, s.full_name || s.email)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Unenroll
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: PENDING INVITATIONS */}
          <TabsContent value="pending" className="space-y-4">
            {invitations.length === 0 ? (
              <Card className="border-dashed py-14 text-center">
                <CardContent className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">No pending invitations</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    All student invitations have been accepted or expired.
                  </p>
                  <Button onClick={() => setShowInviteDialog(true)} className="gap-2 mt-2">
                    <UserPlus className="w-4 h-4" />
                    Invite New Student
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {invitations.map((inv) => (
                  <Card key={inv.id} className="bg-card border-border/80 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold truncate">{inv.full_name || inv.email}</CardTitle>
                        <Badge variant="secondary" className="text-xs">Invited</Badge>
                      </div>
                      <CardDescription className="text-xs flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{inv.email}</span>
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
                          className="flex-1 gap-1.5 text-xs"
                          onClick={() => handleCopyInviteLink(inv)}
                        >
                          {copiedToken === inv.token ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-primary" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy Invite Link
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 text-xs px-2"
                          onClick={() => handleRevokeInvite(inv.id)}
                          title="Cancel Invite"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: REGISTERED UNASSIGNED STUDENTS */}
          {unassignedStudents.length > 0 && (
            <TabsContent value="unassigned" className="space-y-4">
              <Card className="border-primary/20 bg-primary/[0.02]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold text-foreground">
                    Registered Students Not In Any Institution
                  </CardTitle>
                  <CardDescription className="text-xs">
                    These students registered on the platform without an institution code. You can enroll them directly with 1 click.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {unassignedStudents.map((us) => (
                      <div
                        key={us.user_id}
                        className="p-3.5 rounded-xl border border-border/70 bg-card flex flex-col justify-between gap-3 shadow-sm"
                      >
                        <div>
                          <p className="font-semibold text-sm text-foreground">{us.full_name || 'Student'}</p>
                          <p className="text-xs text-muted-foreground truncate">{us.email}</p>
                        </div>
                        <Button
                          size="sm"
                          className="w-full text-xs gap-1.5 bg-primary text-primary-foreground"
                          onClick={() => handleEnrollExistingStudent(us)}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Enroll in {organization?.name || 'Institution'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Invite Student Dialog */}
      {showInviteDialog && (
        <InviteStudentDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          onStudentAdded={fetchAllStudentData}
        />
      )}
    </DashboardLayout>
  );
};

export default StudentsPage;
