/**
 * Assignment Mode Workspace - WebView2 Split Layout
 *
 * Architecture Flow:
 * Student Input → HumanFirst App (Electron + React) → WebView2 Browser
 * → Navigation Event → Domain Detection → AI Check → Warning/Log/Alert
 *
 * Layout: 50/50 Split
 * - Left Panel: Assignment content (editor, instructions, PDF)
 * - Right Panel: Controlled WebView2 browser for research
 *
 * Features:
 * - Real-time domain tracking across browser navigation
 * - AI platform detection with non-blocking warnings
 * - Synchronized monitoring hook for admin dashboard  
 * - Zero external browser dependency
 * - Seamless secure research experience
 */

import React, { useState, useCallback } from 'react';
import { AlertTriangle, Chrome, BookOpen, GripVertical, LogOut } from 'lucide-react';
import { ControlledWebBrowser } from './ControlledWebBrowser';
import { AssignmentRichTextEditor } from './AssignmentRichTextEditor';
import { DomainTracker } from '@/services/DomainTracker';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface AssignmentModeWorkspaceProps {
  assignmentId?: string;
  assignmentTitle?: string;
  instruction?: string;
  lockedFolderPath?: string;
  onQuitAssignment?: () => void;
  quitting?: boolean;
}

interface AIDomainAlert {
  domain: string;
  category: string;
  severity: 'warning' | 'info';
  timestamp: Date;
}

export function AssignmentModeWorkspace({
  assignmentId,
  assignmentTitle = 'Assignment Work',
  instruction = 'Complete your assignment. Use the browser on the right to research. AI tools will be monitored.',
  lockedFolderPath,
  onQuitAssignment,
  quitting = false,
}: AssignmentModeWorkspaceProps) {
  const { toast } = useToast();
  const [showAIAlert, setShowAIAlert] = useState(false);
  const [aiAlert, setAiAlert] = useState<AIDomainAlert | null>(null);
  const [browserUrl, setBrowserUrl] = useState('https://www.google.com');
  const [submissionMode, setSubmissionMode] = useState(false);
  const [submissionUrl, setSubmissionUrl] = useState<string>();
  const [successOverlay, setSuccessOverlay] = useState(false);
  const [domainTracker] = useState(() => new DomainTracker());

  const [studentContext, setStudentContext] = useState<{
    studentId: string;
    orgId: string;
    policyId: string;
    sessionId: string;
    submissionUrl: string;
  } | null>(null);

  const loadContext = useCallback(async () => {
    if (!assignmentId || studentContext) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const studentId = auth.user.id;

    const { data: profile } = await (supabase
      .from('profiles' as any)
      .select('organization_id')
      .eq('id', studentId)
      .maybeSingle() as any);

    const { data: policy } = await (supabase
      .from('exam_policies' as any)
      .select('id,submission_url')
      .eq('assignment_id', assignmentId)
      .eq('is_active', true)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle() as any);

    const { data: session } = await (supabase
      .from('assignment_sessions' as any)
      .select('id')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle() as any);

    if (!policy?.id || !profile?.organization_id || !session?.id) return;
    setStudentContext({
      studentId,
      orgId: profile.organization_id,
      policyId: policy.id,
      sessionId: session.id,
      submissionUrl: policy.submission_url || '',
    });
    if (policy.submission_url) {
      setSubmissionUrl(policy.submission_url);
    }
  }, [assignmentId, studentContext]);

  /**
   * Handle domain navigation events from the browser
   */
  const handleBrowserNavigation = useCallback(
    async (url: string) => {
      setBrowserUrl(url);

      // Extract and track domain
      const domain = new URL(url).hostname;
      const result = await domainTracker.analyzeDomain(domain);

      // If AI tool detected, show warning
      if (result.category === 'ai') {
        setAiAlert({
          domain,
          category: result.category,
          severity: 'warning',
          timestamp: new Date(),
        });
        setShowAIAlert(true);

        // Log to backend
        await domainTracker.reportDomainVisit({
          assignmentId,
          domain,
          category: result.category,
          risk: result.risk,
          eventType: 'ai_domain_visit',
        });
      }
    },
    [assignmentId, domainTracker],
  );

  /**
   * Handle AI warning acknowledgement
   */
  const handleAcknowledgeAIWarning = useCallback(() => {
    setShowAIAlert(false);
  }, []);

  const onExportedForSubmission = useCallback(async (payload: {
    fileName: string;
    filePath: string;
    fileSizeKb: number;
    exportId: string;
  }) => {
    if (!studentContext) return;
    setSubmissionMode(true);
    if (submissionUrl) {
      setBrowserUrl(submissionUrl);
    }
    toast({
      title: '✅ Assignment exported as PDF',
      description: `Saved to: ${lockedFolderPath?.split('\\').pop() || 'locked folder'}\nNow submit it to your LMS below.`,
    });
    await (supabase.from('assignment_exports' as any)
      .update({ file_name: payload.fileName, file_size_kb: payload.fileSizeKb })
      .eq('export_id', payload.exportId) as any);
  }, [lockedFolderPath, studentContext, submissionUrl, toast]);

  const onSubmissionDetected = useCallback(async () => {
    if (!studentContext) return;
    const { data: latestExport } = await (supabase
      .from('assignment_exports' as any)
      .select('export_id')
      .eq('session_id', studentContext.sessionId)
      .order('exported_at', { ascending: false })
      .limit(1)
      .maybeSingle() as any);

    if (latestExport?.export_id) {
      await (supabase
        .from('assignment_exports' as any)
        .update({ verified: true, submitted_at: new Date().toISOString() })
        .eq('export_id', latestExport.export_id) as any);
    }

    await (supabase.from('violation_logs' as any).insert({
      student_id: studentContext.studentId,
      policy_id: studentContext.policyId,
      org_id: studentContext.orgId,
      event_type: 'assignment_submitted',
      session_id: studentContext.sessionId,
      metadata: {
        submitted_at: new Date().toISOString(),
      },
    }) as any);

    setSuccessOverlay(true);
    await window.humanfirstDesktop?.clearSubmissionLock?.();
    await window.humanfirstDesktop?.quitAfterDelay?.(15000);
  }, [studentContext]);

  React.useEffect(() => {
    void loadContext();
  }, [loadContext]);

  return (
    <div className="flex h-screen w-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#0f172a]">
      {/* Header */}
      <div className="shrink-0 border-b border-[#334155] bg-[#111827] px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-cyan-400" />
            <div>
              <h1 className="leading-tight text-slate-100">
                {assignmentTitle}
              </h1>
              <p className="text-xs text-slate-400">
                Assignment Mode - Monitored Environment
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Chrome className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-400">
              Built-in research browser
            </span>
            {onQuitAssignment && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onQuitAssignment}
                disabled={quitting}
                className="ml-3 h-8 gap-1"
              >
                <LogOut className="h-3.5 w-3.5" />
                {quitting ? 'Quitting...' : 'Quit Assignment'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Resizable Split Layout */}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Assignment Content */}
          <Panel defaultSize={50} minSize={20} maxSize={80}>
            <div className="flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden border-r border-[#334155] bg-[#111827]">
              <div className="shrink-0 border-b border-[#334155] px-4 py-3">
                <h2 className="text-xl text-slate-100">Assignment Instructions</h2>
                <p className="mt-2 text-lg text-slate-300">{instruction}</p>
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="shrink-0 border-b border-[#334155] px-4 py-2">
                  <span className="text-xs text-slate-400">Essay Editor</span>
                </div>
                <div className="min-h-0 flex-1">
                  <AssignmentRichTextEditor
                    assignmentId={assignmentId}
                    assignmentTitle={assignmentTitle}
                    placeholder="Start writing your research essay here..."
                    lockedFolderPath={lockedFolderPath}
                    sessionId={studentContext?.sessionId}
                    policyId={studentContext?.policyId}
                    orgId={studentContext?.orgId}
                    studentId={studentContext?.studentId}
                    submissionUrl={studentContext?.submissionUrl}
                    onExportedForSubmission={onExportedForSubmission}
                  />
                </div>
              </div>

              <div className="shrink-0 border-t border-[#334155] bg-[#1e293b] px-4 py-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-xs text-slate-400">Monitoring active</span>
                </div>
              </div>
            </div>
          </Panel>

          {/* Draggable Divider */}
          <PanelResizeHandle className="group flex w-[6px] cursor-col-resize items-center justify-center border-x border-[#334155] bg-[#1e293b] transition-colors hover:bg-cyan-600/40 active:bg-cyan-500/50">
            <GripVertical className="h-4 w-4 text-slate-500 transition-colors group-hover:text-cyan-300" />
          </PanelResizeHandle>

          {/* Right Panel - Controlled Browser */}
          <Panel minSize={20}>
            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#111827]">
              <ControlledWebBrowser
                initialUrl={browserUrl}
                onNavigate={handleBrowserNavigation}
                assignmentId={assignmentId}
                submissionMode={submissionMode}
                submissionUrl={submissionUrl}
                onSubmissionDetected={onSubmissionDetected}
              />
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* AI Domain Warning Dialog */}
      <AlertDialog open={showAIAlert} onOpenChange={setShowAIAlert}>
        <AlertDialogContent>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            AI Platform Detected
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              You're visiting{' '}
              <strong className="text-foreground">{aiAlert?.domain}</strong>, an
              AI-based content generation platform.
            </p>
            <p>
              <strong>During Assignment Mode:</strong> Using AI tools to generate
              answers violates academic integrity policies. You are encouraged to
              complete your work using your own understanding.
            </p>
            <p className="text-xs text-muted-foreground">
              ℹ️ This visit has been logged. Refer to your institution's academic
              integrity policy for guidance.
            </p>
          </AlertDialogDescription>
          <div className="flex gap-2">
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcknowledgeAIWarning}>
              Continue Anyway
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {successOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="rounded-xl border border-emerald-500/30 bg-[#0f172a] p-8 text-center text-emerald-200">
            <p className="text-2xl font-semibold">✅ Submission Confirmed</p>
            <p className="mt-2 text-sm">Session complete. App will close in 15 seconds.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssignmentModeWorkspace;
