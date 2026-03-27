/**
 * Assignment Mode Full Page
 *
 * Complete Assignment Mode experience with:
 * - Split layout (assignment + controlled browser)
 * - Domain tracking
 * - AI platform detection
 * - Real-time monitoring dashboard
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AssignmentModeWorkspace } from '@/components/assignment/AssignmentModeWorkspace';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AssignmentModeFullPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          setAssignment(data);
          setError(null);
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
  }, [assignmentId, navigate]);

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
      instruction={
        assignment.instruction ||
        assignment.description ||
        'Complete your assignment using the browser on the right for research.'
      }
    />
  );
}
