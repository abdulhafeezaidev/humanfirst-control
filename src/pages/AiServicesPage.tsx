import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/layouts/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, Globe, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface AiService {
  id: string;
  name: string;
  category: string;
  domains: string[];
  is_blocked_during_exam: boolean;
  created_at: string;
}

const AiServicesPage = () => {
  const { user, isAdmin, loading: authLoading, organization, permissions } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [services, setServices] = useState<AiService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/auth');
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) fetchServices();
  }, [user, isAdmin]);

  const fetchServices = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ai_services')
      .select('*')
      .order('category', { ascending: true });
    setServices(data ?? []);
    setLoading(false);
  };

  const toggleBlocked = async (service: AiService) => {
    const { error } = await supabase
      .from('ai_services')
      .update({ is_blocked_during_exam: !service.is_blocked_during_exam })
      .eq('id', service.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setServices((prev) =>
        prev.map((s) =>
          s.id === service.id ? { ...s, is_blocked_during_exam: !s.is_blocked_during_exam } : s
        )
      );
      toast({ title: service.is_blocked_during_exam ? 'Unblocked' : 'Blocked', description: `${service.name} updated.` });
    }
  };

  const filtered = services.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(filtered.map((s) => s.category))];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6" /> AI Services
          </h1>
          <p className="text-muted-foreground">Manage which AI services are blocked during exams</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search services..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : services.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bot className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No AI services configured</p>
              <p className="text-sm">Add AI services from the Supabase dashboard.</p>
            </CardContent>
          </Card>
        ) : (
          categories.map((cat) => (
            <div key={cat} className="space-y-3">
              <h2 className="text-lg font-semibold">{cat}</h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filtered
                  .filter((s) => s.category === cat)
                  .map((service) => (
                    <Card key={service.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{service.name}</CardTitle>
                          <Switch
                            checked={service.is_blocked_during_exam}
                            onCheckedChange={() => toggleBlocked(service)}
                            disabled={!permissions.canManageAiServices}
                          />
                        </div>
                        <CardDescription className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {service.domains.length} domain{service.domains.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          {service.domains.slice(0, 3).map((d) => (
                            <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                          ))}
                          {service.domains.length > 3 && (
                            <Badge variant="secondary" className="text-xs">+{service.domains.length - 3}</Badge>
                          )}
                        </div>
                        <Badge className="mt-2" variant={service.is_blocked_during_exam ? 'destructive' : 'secondary'}>
                          {service.is_blocked_during_exam ? 'Blocked in exams' : 'Allowed'}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
};

export default AiServicesPage;
