import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Globe, AlertTriangle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface BlockedUrl {
  id: string;
  url: string;
  description: string | null;
  enforcement_mode: 'log_only' | 'active';
  created_at: string;
}

interface BlockedUrlsManagerProps {
  policyId: string;
  organizationId: string;
  readOnly?: boolean;
}

export const BlockedUrlsManager: React.FC<BlockedUrlsManagerProps> = ({
  policyId,
  organizationId,
  readOnly = false,
}) => {
  const { user } = useAuth();
  const [urls, setUrls] = useState<BlockedUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEnforcementMode, setNewEnforcementMode] = useState<'log_only' | 'active'>('active');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchBlockedUrls();
  }, [policyId]);

  const fetchBlockedUrls = async () => {
    try {
      const { data, error } = await supabase
        .from('blocked_urls')
        .select('*')
        .eq('policy_id', policyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUrls((data || []).map(item => ({
        ...item,
        enforcement_mode: item.enforcement_mode as 'log_only' | 'active',
      })));
    } catch (error) {
      console.error('Error fetching blocked URLs:', error);
      toast.error('Failed to load blocked URLs');
    } finally {
      setLoading(false);
    }
  };

  const normalizeUrl = (url: string): string => {
    let normalized = url.trim().toLowerCase();
    // Remove protocol if present
    normalized = normalized.replace(/^(https?:\/\/)?(www\.)?/, '');
    // Remove trailing slash
    normalized = normalized.replace(/\/$/, '');
    return normalized;
  };

  const handleAddUrl = async () => {
    if (!newUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    const normalizedUrl = normalizeUrl(newUrl);
    
    // Check for duplicates
    if (urls.some(u => normalizeUrl(u.url) === normalizedUrl)) {
      toast.error('This URL is already blocked');
      return;
    }

    setAdding(true);
    try {
      const { data, error } = await supabase
        .from('blocked_urls')
        .insert({
          policy_id: policyId,
          organization_id: organizationId,
          url: normalizedUrl,
          description: newDescription.trim() || null,
          enforcement_mode: newEnforcementMode,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      const typedData = {
        ...data,
        enforcement_mode: data.enforcement_mode as 'log_only' | 'active',
      };
      setUrls([typedData, ...urls]);
      setNewUrl('');
      setNewDescription('');
      setNewEnforcementMode('active');
      toast.success('URL blocked successfully');
    } catch (error) {
      console.error('Error adding blocked URL:', error);
      toast.error('Failed to block URL');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteUrl = async (id: string) => {
    try {
      const { error } = await supabase
        .from('blocked_urls')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setUrls(urls.filter(u => u.id !== id));
      toast.success('URL unblocked');
    } catch (error) {
      console.error('Error deleting blocked URL:', error);
      toast.error('Failed to unblock URL');
    }
  };

  const handleToggleEnforcement = async (id: string, currentMode: 'log_only' | 'active') => {
    const newMode = currentMode === 'active' ? 'log_only' : 'active';
    try {
      const { error } = await supabase
        .from('blocked_urls')
        .update({ enforcement_mode: newMode })
        .eq('id', id);

      if (error) throw error;

      setUrls(urls.map(u => u.id === id ? { ...u, enforcement_mode: newMode } : u));
      toast.success(`Enforcement mode changed to ${newMode === 'active' ? 'Active' : 'Log Only'}`);
    } catch (error) {
      console.error('Error updating enforcement mode:', error);
      toast.error('Failed to update enforcement mode');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-muted rounded" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Blocked Websites</h3>
        <Badge variant="secondary" className="ml-auto">
          {urls.length} blocked
        </Badge>
      </div>

      {!readOnly && (
        <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                placeholder="e.g., chatgpt.com or openai.com"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="e.g., AI assistant"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-2 flex-1">
              <Label htmlFor="enforcement">Enforcement Mode</Label>
              <Select value={newEnforcementMode} onValueChange={(v: 'log_only' | 'active') => setNewEnforcementMode(v)}>
                <SelectTrigger id="enforcement">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      Active Blocking
                    </span>
                  </SelectItem>
                  <SelectItem value="log_only">
                    <span className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-amber-500" />
                      Log Only (Pilot)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddUrl} disabled={adding} className="gap-2">
              <Plus className="w-4 h-4" />
              Add URL
            </Button>
          </div>
        </div>
      )}

      {urls.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Globe className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No websites blocked for this policy</p>
          {!readOnly && <p className="text-sm">Add URLs above to block specific websites</p>}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Mode</TableHead>
                {!readOnly && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {urls.map((url) => (
                <TableRow key={url.id}>
                  <TableCell className="font-mono text-sm">{url.url}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {url.description || '—'}
                  </TableCell>
                  <TableCell>
                    {readOnly ? (
                      <Badge variant={url.enforcement_mode === 'active' ? 'destructive' : 'secondary'}>
                        {url.enforcement_mode === 'active' ? 'Blocked' : 'Logged'}
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleEnforcement(url.id, url.enforcement_mode)}
                        className="gap-1 h-7"
                      >
                        {url.enforcement_mode === 'active' ? (
                          <>
                            <AlertTriangle className="w-3 h-3 text-destructive" />
                            Active
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3 text-amber-500" />
                            Log Only
                          </>
                        )}
                      </Button>
                    )}
                  </TableCell>
                  {!readOnly && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUrl(url.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
