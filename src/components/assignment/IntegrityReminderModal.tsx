import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ShieldAlert } from "lucide-react";
import { sendRiskEvent } from "@/lib/assignmentRiskApi";

const AUTO_CLOSE_MS = 5_000;
const PROGRESS_INTERVAL_MS = 50;

interface IntegrityReminderModalProps {
  open: boolean;
  trigger: string;
  assignmentId?: string;
  onClose: () => void;
}

/**
 * Non-blocking integrity reminder that auto-closes after 5 seconds.
 * Shown when risk events are detected. Logs acknowledgement but never
 * prevents submission — this is friction, not enforcement.
 */
export function IntegrityReminderModal({
  open,
  trigger,
  assignmentId,
  onClose,
}: IntegrityReminderModalProps) {
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setProgress(100);
      return;
    }

    // Start countdown
    const startTime = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / AUTO_CLOSE_MS) * 100);
      setProgress(remaining);
    }, PROGRESS_INTERVAL_MS);

    closeTimerRef.current = setTimeout(() => {
      handleClose();
    }, AUTO_CLOSE_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

    // Log acknowledgement event (fire-and-forget)
    sendRiskEvent({
      type: trigger as "editor_large_paste",
      assignment_id: assignmentId,
      timestamp: Date.now(),
    }).catch(() => {});

    onClose();
  };

  const message = (() => {
    if (trigger === "ai_domain_visit") {
      return "AI-based content generation platforms are restricted during assignments. Please complete your work using your own understanding.";
    }

    if (trigger === "editor_large_paste") {
      return "Large external content detected. Please confirm this is your own work.";
    }

    return "Your recent activity suggests external content usage. Please ensure your submission reflects your own understanding.";
  })();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-yellow-500" />
            Integrity Reminder
          </DialogTitle>
          <DialogDescription className="pt-2 text-sm leading-relaxed">
            {message}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-right">
            Auto-closing in {Math.max(0, Math.ceil((progress / 100) * (AUTO_CLOSE_MS / 1000)))}s
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
