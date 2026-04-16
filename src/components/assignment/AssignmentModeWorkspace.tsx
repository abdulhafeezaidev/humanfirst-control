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
  onQuitAssignment,
  quitting = false,
}: AssignmentModeWorkspaceProps) {
  const [showAIAlert, setShowAIAlert] = useState(false);
  const [aiAlert, setAiAlert] = useState<AIDomainAlert | null>(null);
  const [browserUrl, setBrowserUrl] = useState('https://www.google.com');
  const [domainTracker] = useState(() => new DomainTracker());

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
                    placeholder="Start writing your research essay here..."
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
    </div>
  );
}

export default AssignmentModeWorkspace;
