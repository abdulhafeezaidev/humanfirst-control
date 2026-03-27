import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/layouts/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Mail, Search, UserMinus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface Student {
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
  organization_id: string | null;
}

const StudentsPage = () => {
  const { user, isAdmin, loading: authLoading, organization } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/auth');
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin && organization?.id) fetchStudents();
  }, [user, isAdmin, organization?.id]);

  const fetchStudents = async () => {
    setLoading(true);
    if (!organization?.id) {
      setStudents([]);
      setLoading(false);
      return;
    }

    // Get profiles in this organization that have the student role
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, created_at, organization_id')
      .eq('organization_id', organization.id);

    if (profiles && profiles.length > 0) {
      const ids = profiles.map((p) => p.user_id);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student')
        .in('user_id', ids);

      const studentIds = new Set((roles ?? []).map((r) => r.user_id));
      setStudents(profiles.filter((p) => studentIds.has(p.user_id)));
    } else {
      setStudents([]);
    }
    setLoading(false);
  };

  const filtered = students.filter(
    (s) =>
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6" /> Students
            </h1>
            <p className="text-muted-foreground">Manage enrolled students</p>
          </div>
          <Badge variant="secondary">{students.length} total</Badge>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No students found</p>
              <p className="text-sm">Students will appear here once they sign up.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <Card key={s.user_id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{s.full_name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {s.email}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Student</Badge>
                    <span className="text-xs text-muted-foreground">
                      Joined {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentsPage;
