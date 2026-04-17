/**
 * Assignment Mode Full Page
 *
 * Complete Assignment Mode experience with:
 * - Split layout (assignment + controlled browser)
 * - Domain tracking
 * - AI platform detection
 * - Real-time monitoring dashboard
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AssignmentModeWorkspace } from '@/components/assignment/AssignmentModeWorkspace';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FolderLock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface PolicyRecord {
  id: string;
  title?: string | null;
  description?: string | null;
  instruction?: string | null;
  submission_url?: string | null;
}

export default function AssignmentModeFullPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [policy, setPolicy] = useState<PolicyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quitting, setQuitting] = useState(false);
  const [sessionFolderPath, setSessionFolderPath] = useState<string>('');
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderSelecting, setFolderSelecting] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  const ensureSession = useCallback(async () => {
    if (!assignmentId || !userIdRef.current) return;
    if (sessionIdRef.current) return;

    try {
      const { data: existing } = await (supabase
        .from('assignment_sessions' as any)
        .select('id')
        .eq('policy_id', assignmentId)
        .eq('student_id', userIdRef.current)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle() as any);

      if (existing?.id) {
        sessionIdRef.current = existing.id;
        return;
      }

      const { data: policy } = await (supabase
        .from('exam_policies' as any)
        .select('id')
        .eq('id', assignmentId)
        .eq('is_active', true)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle() as any);

      if (!policy?.id) return;

      const { data: created } = await (supabase
        .from('assignment_sessions' as any)
        .insert({
          assignment_id: null,
          student_id: userIdRef.current,
          policy_id: policy.id,
          status: 'active',
          environment: typeof window !== 'undefined' && window.humanfirstDesktop ? 'desktop' : 'web',
          user_agent: navigator.userAgent,
        })
        .select('id')
        .single() as any);

      if (created?.id) {
        sessionIdRef.current = created.id;
      }
    } catch (err) {
      console.warn('[AssignmentMode] Failed to ensure session', err);
    }
  }, [assignmentId]);

  const logQuitAndNotifyAdmin = useCallback(async (reason: 'student_quit' | 'window_close' = 'student_quit') => {
    if (!assignmentId || !userIdRef.current) return;

    const sessionId = sessionIdRef.current;
    try {
      if (sessionId) {
        await (supabase
          .from('assignment_sessions' as any)
          .update({ status: 'abandoned' })
          .eq('id', sessionId) as any);
      }

      await (supabase
        .from('assignment_risk_events' as any)
        .insert({
          user_id: userIdRef.current,
          assignment_id: null,
          session_id: sessionId,
          event_type: 'student_quit_assignment',
          severity_level: 'MEDIUM',
          metadata: {
            reason,
            reported_to_admin: true,
            timestamp: new Date().toISOString(),
          },
        }) as any);
    } catch (err) {
      console.warn('[AssignmentMode] Failed to log quit event', err);
    }
  }, [assignmentId]);

  const handleQuitAssignment = useCallback(async () => {
    if (!assignmentId) return;
    setQuitting(true);
    await logQuitAndNotifyAdmin('student_quit');

    const api = window.humanfirstDesktop;
    if (api?.isDesktop) {
      await api.setAssignmentMode(false).catch((err) => {
        console.warn('[Desktop] Failed to disable assignment mode on quit', err);
      });
    }

    toast({
      title: 'Assignment exited',
      description: 'Your quit action was logged and reported to your administrator.',
    });
    navigate('/student');
  }, [assignmentId, logQuitAndNotifyAdmin, navigate, toast]);

  const ensureLockedSessionFolder = useCallback(async () => {
    const api = window.humanfirstDesktop;
    if (!api?.isDesktop || !api.getSessionFolder || !api.setSessionFolder || !api.fileDialog?.openFolder) {
      return true;
    }

    try {
      const current = await api.getSessionFolder();
      if (current?.locked && current.path) {
        setSessionFolderPath(current.path);
        return true;
      }
      setFolderDialogOpen(true);
      return false;
    } catch {
      setFolderDialogOpen(true);
      return false;
    }
  }, []);

  useEffect(() => {
    const fetchAssignment = async () => {
      if (!assignmentId) {
        setError('No assignment ID provided');
        setLoading(false);
        return;
      }

      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
          navigate('/login');
          return;
        }
        userIdRef.current = user.user.id;

        const folderReady = await ensureLockedSessionFolder();
        if (!folderReady) {
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await (supabase
          .from('exam_policies' as any)
          .select(
            `
            id,
            title,
            description,
            instruction,
            submission_url,
            status,
            created_by,
            created_at,
            due_date
          `,
          )
          .eq('id', assignmentId)
          .single() as any);

        if (fetchError) {
          console.warn('[AssignmentMode] Assignment lookup failed, using fallback record', fetchError);
        }

        if (data) {
          setPolicy(data as PolicyRecord);
        } else {
          setPolicy({
            id: assignmentId,
            title: 'Assignment',
            description: null,
            instruction: null,
          });
        }

        setError(null);
        await ensureSession();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [assignmentId, navigate, ensureSession, ensureLockedSessionFolder]);

  const handleChooseFolder = useCallback(async () => {
    const api = window.humanfirstDesktop;
    if (!api?.isDesktop || !api.fileDialog?.openFolder || !api.setSessionFolder) {
      setFolderDialogOpen(false);
      return;
    }

    try {
      setFolderSelecting(true);
      const result = await api.fileDialog.openFolder({
        title: 'Choose Your Assignment Folder',
      });
      if (result?.cancelled || !result.filePaths || result.filePaths.length === 0) {
        return;
      }

      const selectedPath = result.filePaths[0];
      const lockResult = await api.setSessionFolder(selectedPath);
      if (!lockResult?.ok || !lockResult.path) {
        toast({
          title: 'Could not lock folder',
          description: lockResult?.error || 'Please try selecting the folder again.',
          variant: 'destructive',
        });
        return;
      }

      setSessionFolderPath(lockResult.path);
      setFolderDialogOpen(false);
      const folderName = lockResult.path.split('\\').pop() || lockResult.path;
      toast({
        title: 'Folder locked',
        description: `📁 ${folderName} — locked for this session`,
      });
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        userIdRef.current = user.user.id;
        await ensureSession();
      }
      setLoading(false);
    } finally {
      setFolderSelecting(false);
    }
  }, [ensureSession, toast]);

  useEffect(() => {
    const api = window.humanfirstDesktop;
    if (!api?.isDesktop || !policy) return;

    api.setAssignmentMode(true).catch((err) => {
      console.warn('[Desktop] Failed to enable assignment mode', err);
    });

    return () => {
      api.setAssignmentMode(false).catch((err) => {
        console.warn('[Desktop] Failed to disable assignment mode', err);
      });
    };
  }, [policy]);

  useEffect(() => {
    return () => {
      void logQuitAndNotifyAdmin('window_close');
    };
  }, [logQuitAndNotifyAdmin]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'q')) return;
      event.preventDefault();
      void handleQuitAssignment();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleQuitAssignment]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="space-y-3 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading assignment...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={folderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FolderLock className="h-5 w-5 text-primary" />
              Choose Your Assignment Folder
            </AlertDialogTitle>
            <AlertDialogDescription>
              Select a folder where your assignment will be saved. You will only be able to access this folder during submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <Button onClick={handleChooseFolder} disabled={folderSelecting}>
                {folderSelecting ? 'Choosing...' : 'Choose Folder'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!folderDialogOpen && (
        <AssignmentModeWorkspace
          assignmentId={policy?.id || assignmentId}
          assignmentTitle={policy?.title || 'Assignment'}
          onQuitAssignment={handleQuitAssignment}
          quitting={quitting}
          lockedFolderPath={sessionFolderPath}
          instruction={
            policy?.instruction ||
            policy?.description ||
            'Complete your assignment using the browser on the right for research.'
          }
        />
      )}
    </>
  );
}
