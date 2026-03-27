import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/layouts/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollText, Search, Filter, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  actor_id: string | null;
  target: string;
  target_id: string | null;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

const AuditLogsPage = () => {
  const { user, isAdmin, loading: authLoading, organization } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/auth');
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin && organization?.id) fetchLogs();
  }, [user, isAdmin, organization?.id]);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('organization_id', organization!.id)
      .order('timestamp', { ascending: false })
      .limit(200);
    setLogs((data as AuditLog[]) ?? []);
    setLoading(false);
  };

  const actions = [...new Set(logs.map((l) => l.action))].sort();

  const filtered = logs.filter((l) => {
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.action.toLowerCase().includes(q) ||
        l.target.toLowerCase().includes(q) ||
        (l.target_id ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getActionColor = (action: string): string => {
    if (action.includes('created') || action.includes('enabled')) return 'bg-green-600';
    if (action.includes('deleted') || action.includes('removed')) return 'bg-red-600';
    if (action.includes('updated') || action.includes('changed')) return 'bg-blue-600';
    return 'bg-gray-600';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScrollText className="w-6 h-6" /> Audit Logs
          </h1>
          <p className="text-muted-foreground">Immutable record of all admin actions</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actions.map((a) => (
                <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="self-center">{filtered.length} entries</Badge>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ScrollText className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No audit logs found</p>
              <p className="text-sm">Logs will appear as admin actions are performed.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((log) => (
              <Card key={log.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className={`${getActionColor(log.action)} text-xs`}>
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-sm text-muted-foreground">? {log.target}</span>
                      </div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {JSON.stringify(log.metadata).slice(0, 120)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                    </div>
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

export default AuditLogsPage;
