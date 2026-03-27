import React, { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAssignmentRiskMonitor } from "@/hooks/useAssignmentRiskMonitor";
import { useAgentRiskEvents } from "@/hooks/useAgentRiskEvents";
import { LargePasteWarningModal } from "@/components/assignment/LargePasteWarningModal";
import { IntegrityReminderModal } from "@/components/assignment/IntegrityReminderModal";

interface AssignmentRichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  assignmentId?: string;
}

/**
 * Rich text editor with built-in AI-risk detection.
 *
 * - Monitors paste events for large external content (> 400 chars)
 * - Tracks typing speed to flag suspicious bulk inserts (> 300 chars in < 2 s)
 * - Never blocks input — only adds friction (confirmation modal) and logging
 */
export function AssignmentRichTextEditor({
  value,
  onChange,
  placeholder = "Start typing your assignment…",
  className,
  assignmentId,
}: AssignmentRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const {
    showPasteWarning,
    lastPasteLength,
    showIntegrityReminder,
    integrityTrigger,
    handlePaste,
    handleKeystroke,
    handleExternalRiskEvent,
    dismissPasteWarning,
    dismissIntegrityReminder,
  } = useAssignmentRiskMonitor(assignmentId);

  // Listen for risk alerts forwarded from the Windows agent via Electron IPC
  useAgentRiskEvents(handleExternalRiskEvent);

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const text = e.clipboardData.getData("text/plain");
      // Detect but never block — let the paste proceed
      handlePaste(text);
    },
    [handlePaste],
  );

  const onInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const target = e.nativeEvent as InputEvent;
      const inserted = target.data?.length ?? 1;
      handleKeystroke(inserted);
      onChange?.(editorRef.current?.innerHTML ?? "");
    },
    [handleKeystroke, onChange],
  );

  const onKeyDown = useCallback(
    (_e: React.KeyboardEvent<HTMLDivElement>) => {
      // Single character keystrokes are also tracked via onInput;
      // onKeyDown is kept for potential future key-combo detection.
    },
    [],
  );

  return (
    <>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Assignment editor"
        suppressContentEditableWarning
        spellCheck
        data-placeholder={placeholder}
        onPaste={onPaste}
        onInput={onInput}
        onKeyDown={onKeyDown}
        className={cn(
          "min-h-[300px] w-full rounded-md border border-input bg-background px-4 py-3",
          "text-sm leading-relaxed ring-offset-background",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "overflow-y-auto [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground",
          className,
        )}
        dangerouslySetInnerHTML={value ? { __html: value } : undefined}
      />

      <LargePasteWarningModal
        open={showPasteWarning}
        characterCount={lastPasteLength}
        onConfirm={dismissPasteWarning}
      />

      <IntegrityReminderModal
        open={showIntegrityReminder}
        trigger={integrityTrigger}
        assignmentId={assignmentId}
        onClose={dismissIntegrityReminder}
      />
    </>
  );
}
