import React, { useEffect, useState } from 'react';
import { Globe, AlertTriangle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface BlockedUrl {
  id: string;
  url: string;
  description: string | null;
  enforcement_mode: 'log_only' | 'active';
}

interface BlockedUrlsCardProps {
  policyId: string;
  enforcementStatus: 'not_connected' | 'connected_simulated' | 'active';
}

const BlockedUrlsCard: React.FC<BlockedUrlsCardProps> = ({
  policyId,
  enforcementStatus,
}) => {
  const [urls, setUrls] = useState<BlockedUrl[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUrls = async () => {
      try {
        const { data, error } = await supabase
          .from('blocked_urls')
          .select('id, url, description, enforcement_mode')
          .eq('policy_id', policyId);

        if (error) {
          console.error('Error fetching blocked URLs:', error);
          return;
        }

        setUrls((data || []).map(item => ({
          ...item,
          enforcement_mode: item.enforcement_mode as 'log_only' | 'active',
        })));
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (policyId) {
      fetchUrls();
    }
  }, [policyId]);

  if (loading) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="h-5 bg-muted rounded w-1/4 mb-4" />
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (urls.length === 0) {
    return null;
  }

  const activeUrls = urls.filter(u => u.enforcement_mode === 'active');
  const logOnlyUrls = urls.filter(u => u.enforcement_mode === 'log_only');

  return (
    <div className="glass-card p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
          <Globe className="w-5 h-5 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground">Blocked Websites</h3>
          <p className="text-sm text-muted-foreground">
            The following websites are restricted during this policy period.
          </p>
        </div>
        <Badge variant="secondary">{urls.length} sites</Badge>
      </div>

      {/* Actively Blocked */}
      {activeUrls.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-destructive" />
            Blocked
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {activeUrls.map((url) => (
              <div
                key={url.id}
                className="flex items-center gap-2 p-3 bg-destructive/5 border border-destructive/10 rounded-lg"
              >
                <div className="w-2 h-2 bg-destructive rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-mono font-medium text-foreground truncate block">
                    {url.url}
                  </span>
                  {url.description && (
                    <span className="text-xs text-muted-foreground">{url.description}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log Only (Monitored) */}
      {logOnlyUrls.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <Eye className="w-3 h-3 text-amber-500" />
            Monitored (Log Only)
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {logOnlyUrls.map((url) => (
              <div
                key={url.id}
                className="flex items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg"
              >
                <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-mono font-medium text-foreground truncate block">
                    {url.url}
                  </span>
                  {url.description && (
                    <span className="text-xs text-muted-foreground">{url.description}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {enforcementStatus !== 'active' && (
        <p className="text-xs text-muted-foreground/70 mt-4 flex items-center gap-1">
          <Globe className="w-3 h-3" />
          Policy-based restriction (compliance expected)
        </p>
      )}
    </div>
  );
};

export default BlockedUrlsCard;
