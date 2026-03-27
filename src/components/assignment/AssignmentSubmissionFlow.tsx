/**
 * Assignment Submission Flow Component (Layer 5)
 * 
 * Handles the complete submission sequence:
 * Step 1: File lock
 * Step 2: Browser lock to submission URL
 * Step 3: File upload interception
 * Step 4: Submission confirmation detection
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Lock, FileText, Loader2, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export interface SubmissionState {
  stage: 'ready' | 'file_locked' | 'browser_locked' | 'submitted' | 'error';
  lockedFileName?: string;
  lockedFileSize?: number;
  submissionUrl?: string;
  errorMessage?: string;
}

interface AssignmentSubmissionFlowProps {
  assignmentId?: string;
  policyId?: string;
  submissionUrl?: string; // From policy config
  onSubmissionComplete?: () => void;
  onCancel?: () => void;
}

export function AssignmentSubmissionFlow({
  assignmentId,
  policyId,
  submissionUrl: initialSubmissionUrl,
  onSubmissionComplete,
  onCancel,
}: AssignmentSubmissionFlowProps) {
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState>({
    stage: 'ready',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const lockedFilePathRef = useRef<string | null>(null);

  /**
   * Step 1: Open file picker and lock file
   */
  const handleSelectAndLockFile = useCallback(async () => {
    try {
      setIsProcessing(true);

      const desktopApi = typeof window !== 'undefined' ? window.humanfirstDesktop : undefined;

      if (!desktopApi?.fileDialog?.openFile) {
        setSubmissionState  ({
                                          stage: 'error',
          errorMessage: 'File        dialog not available in web mode',
        });                                                                                                   
        return;
      }

      // Open file picker (single file only)
      const result = await desktopApi.fileDialog.openFile({
        title: 'Select File to Submit',
        properties: ['openFile'],
        filters: [{ name: 'All Files', extensions: ['*'] }],
      });

      if (!result || result.cancelled || !result.filePaths || result.filePaths.length === 0) {
        setIsProcessing(false);
        return;
      }

      const filePath = result.filePaths[0];

      // Get file size (Electron API)
      let fileSize = 0;
      try {
        const fs = require('fs');
        const stats = fs.statSync(filePath);
        fileSize = Math.round(stats.size / 1024); // KB
      } catch {
        // Fallback: estimate based on path
      }

      // Lock file in state
      lockedFilePathRef.current = filePath;
      const fileName = filePath.split('\\').pop() || filePath;

      setSubmissionState({
        stage: 'file_locked',
        lockedFileName: fileName,
        lockedFileSize: fileSize,
      });
    } catch (error: any) {
      setSubmissionState({
        stage: 'error',
        errorMessage: error?.message || 'Failed to select file',
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Step 2: Lock browser to submission URL
   */
  const handleNavigateToSubmissionUrl = useCallback(async () => {
    try {
      setIsProcessing(true);

      if (!initialSubmissionUrl) {
        setSubmissionState({
          stage: 'error',
          errorMessage: 'Submission URL not configured',
        });
        return;
      }

      // Navigate to submission URL in the controlled browser
      // This is handled by the parent component via a callback
      setSubmissionState({
        stage: 'browser_locked',
        lockedFileName: submissionState.lockedFileName,
        lockedFileSize: submissionState.lockedFileSize,
        submissionUrl: initialSubmissionUrl,
      });
    } catch (error: any) {
      setSubmissionState({
        stage: 'error',
        errorMessage: error?.message || 'Failed to navigate to submission',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [initialSubmissionUrl, submissionState.lockedFileName, submissionState.lockedFileSize]);

  /**
   * Complete submission (called by parent when confirmation URL detected)
   */
  const handleSubmissionComplete = useCallback(async () => {
    try {
      setIsProcessing(true);

      // Log submission event via session hook (should be called by parent)
      setSubmissionState({
        stage: 'submitted',
        lockedFileName: submissionState.lockedFileName,
        submissionUrl: submissionState.submissionUrl,
      });

      // Show success overlay
      // Auto-close in 15 seconds or on manual close

      if (onSubmissionComplete) {
        onSubmissionComplete();
      }
    } catch (error: any) {
      setSubmissionState({
        stage: 'error',
        errorMessage: error?.message || 'Submission failed',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [submissionState, onSubmissionComplete]);

  /**
   * Render submission flow dialog
   */
  return (
    <>
      {/* Ready to Submit Button */}
      <Button
        onClick={() => setShowSubmitDialog(true)}
        variant="default"
        className="bg-green-600 hover:bg-green-700"
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Ready to Submit
          </>
        )}
      </Button>

      {/* Submission Flow Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogTitle>Submit Assignment</AlertDialogTitle>

          {submissionState.stage === 'ready' && (
            <>
              <AlertDialogDescription>
                Click "Select File" to choose the file you want to submit. This file will be locked for submission.
              </AlertDialogDescription>
              <div className="space-y-3 py-4">
                <p className="text-sm text-muted-foreground">
                  ⚠️ <strong>Important:</strong> You can only submit ONE file. Choose carefully.
                </p>
              </div>
              <div className="flex gap-2">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button
                  onClick={handleSelectAndLockFile}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Selecting...
                    </>
                  ) : (
                    'Select File'
                  )}
                </Button>
              </div>
            </>
          )}

          {submissionState.stage === 'file_locked' && (
            <>
              <AlertDialogDescription>
                File selected and locked for submission.
              </AlertDialogDescription>
              <div className="space-y-3 py-4">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    <div className="text-sm">
                      <p className="font-semibold text-green-900">
                        📎 {submissionState.lockedFileName}
                      </p>
                      <p className="text-xs text-green-700">
                        {submissionState.lockedFileSize}KB
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ready to submit. Click "Continue to Submission" to proceed.
                </p>
              </div>
              <div className="flex gap-2">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button
                  onClick={handleNavigateToSubmissionUrl}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Proceeding...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Continue to Submission
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {submissionState.stage === 'browser_locked' && (
            <>
              <AlertDialogDescription>
                Browser is now locked to the submission page. Upload your file to complete.
              </AlertDialogDescription>
              <div className="space-y-3 py-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-sm text-blue-900">
                    <strong>File locked:</strong> {submissionState.lockedFileName}
                  </p>
                  <p className="text-xs text-blue-700">
                    Submission URL: {submissionState.submissionUrl}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  The browser is locked to the submission page. You cannot navigate elsewhere until submission completes.
                </p>
              </div>
              <div className="flex gap-2">
                <AlertDialogCancel>Abort</AlertDialogCancel>
                <Button disabled className="flex-1">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Waiting for submission...
                </Button>
              </div>
            </>
          )}

          {submissionState.stage === 'submitted' && (
            <>
              <AlertDialogDescription>
                <div className="space-y-3 py-4 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-900">✅ Assignment Submitted</h3>
                  <p className="text-sm text-muted-foreground">
                    Your assignment has been successfully submitted at {new Date().toLocaleTimeString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Session complete. Your PC is now free.
                  </p>
                </div>
              </AlertDialogDescription>
              <div className="flex gap-2">
                <AlertDialogAction onClick={() => setShowSubmitDialog(false)}>
                  Close
                </AlertDialogAction>
              </div>
            </>
          )}

          {submissionState.stage === 'error' && (
            <>
              <AlertDialogDescription>
                <div className="space-y-3 py-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <p className="text-sm text-red-600">
                      {submissionState.errorMessage || 'An error occurred'}
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
              <div className="flex gap-2">
                <AlertDialogCancel>Close</AlertDialogCancel>
                <Button
                  onClick={() =>
                    setSubmissionState({
                      stage: 'ready',
                    })
                  }
                  variant="outline"
                >
                  Try Again
                </Button>
              </div>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Overlay (shown for 15 seconds) */}
      {submissionState.stage === 'submitted' && (
        <SubmissionSuccessOverlay
          onClose={() => setShowSubmitDialog(false)}
          autoCloseDurationMs={15000}
        />
      )}
    </>
  );
}

/**
 * Full-screen success overlay shown after submission
 */
interface SubmissionSuccessOverlayProps {
  onClose: () => void;
  autoCloseDurationMs?: number;
}

function SubmissionSuccessOverlay({
  onClose,
  autoCloseDurationMs = 15000,
}: SubmissionSuccessOverlayProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, autoCloseDurationMs);
    return () => clearTimeout(timer);
  }, [onClose, autoCloseDurationMs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-xl">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />
        <h2 className="mt-4 text-2xl font-bold text-green-900">Assignment Submitted</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Submitted at {new Date().toLocaleTimeString()}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Session complete. Your PC is now free.
        </p>
        <div className="mt-6 space-y-2">
          <p className="text-xs text-muted-foreground">
            This window will close in 15 seconds...
          </p>
          <Button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700">
            Close Now
          </Button>
        </div>
      </div>
    </div>
  );
}
