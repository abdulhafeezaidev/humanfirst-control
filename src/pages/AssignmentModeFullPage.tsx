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
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AssignmentRecord {
  id: string;
  title?: string | null;
  description?: string | null;
  instruction?: string | null;
}

interface PolicyRecord {
  id: string;
}

export default function AssignmentModeFullPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [assignment, setAssignment] = useState<AssignmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quitting, setQuitting] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  const ensureSession = useCallback(async () => {
    if (!assignmentId || !userIdRef.current) return;
    if (sessionIdRef.current) return;

    try {
      const { data: existing } = await (supabase
        .from('assignment_sessions' as any)
        .select('id')
        .eq('assignment_id', assignmentId)
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
        .eq('assignment_id', assignmentId)
        .eq('is_active', true)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle() as any);

      if (!policy?.id) return;

      const { data: created } = await (supabase
        .from('assignment_sessions' as any)
        .insert({
          assignment_id: assignmentId,
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
          assignment_id: assignmentId,
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

  useEffect(() => {
    const fetchAssignment = async () => {
      if (!assignmentId) {
        setError('No assignment ID provided');
        setLoading(false);
        return;
      }

      try {
        // Verify user is authenticated
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
          navigate('/login');
          return;
        }
        userIdRef.current = user.user.id;

        // Fetch assignment details
        // Type cast for assignments table - update after Supabase types are generated
        const { data, error: fetchError } = await (supabase
          .from('assignments' as any)
          .select(
            `
            id,
            title,
            description,
            instruction,
            content,
            status,
            created_by,
            created_at,
            due_date
          `,
          )
          .eq('id', assignmentId)
          .single() as any);

        if (fetchError) {
          setError(`Failed to load assignment: ${fetchError.message}`);
          setAssignment(null);
        } else if (data) {
          setAssignment(data as AssignmentRecord);
          setError(null);
          await ensureSession();
        } else {
          setError('Assignment not found');
        }
      } catch (err: any) {
        setError(err?.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [assignmentId, navigate, ensureSession]);

  // Enable assignment mode when assignment is loaded (desktop app only)
  useEffect(() => {
    const api = window.humanfirstDesktop;
    if (!api?.isDesktop || !assignment) return;

    api.setAssignmentMode(true).catch((err) => {
      console.warn('[Desktop] Failed to enable assignment mode', err);
    });

    // Cleanup: disable assignment mode when leaving assignment page
    return () => {
      api.setAssignmentMode(false).catch((err) => {
        console.warn('[Desktop] Failed to disable assignment mode', err);
      });
    };
  }, [assignment]);

  useEffect(() => {
    return () => {
      // Best-effort telemetry for accidental navigation/window close.
      void logQuitAndNotifyAdmin('window_close');
    };
  }, [logQuitAndNotifyAdmin]);

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

  if (error || !assignment) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="max-w-md space-y-4 rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Error</h2>
          <p className="text-sm text-destructive">{error || 'Assignment not found'}</p>
          <button
            onClick={() => navigate('/student')}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <AssignmentModeWorkspace
      assignmentId={assignment.id}
      assignmentTitle={assignment.title || 'Assignment'}
      onQuitAssignment={handleQuitAssignment}
      quitting={quitting}
      instruction={
        assignment.instruction ||
        assignment.description ||
        'Complete your assignment using the browser on the right for research.'
      }
    />
  );
}
