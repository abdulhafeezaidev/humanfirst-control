import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAssignmentRiskMonitor } from "@/hooks/useAssignmentRiskMonitor";
import { useAgentRiskEvents } from "@/hooks/useAgentRiskEvents";
import { IntegrityReminderModal } from "@/components/assignment/IntegrityReminderModal";
import { supabase } from "@/integrations/supabase/client";
import { violationLogger } from "@/lib/violationLogger";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  IndentIncrease,
  IndentDecrease,
  Minus,
  Undo2,
  Redo2,
  Table2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AssignmentRichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  assignmentId?: string;
  lockedFolderPath?: string;
  sessionId?: string;
  policyId?: string;
  orgId?: string;
  studentId?: string;
  assignmentTitle?: string;
  studentName?: string;
  submissionUrl?: string;
  onExportedForSubmission?: (payload: {
    fileName: string;
    filePath: string;
    fileSizeKb: number;
    exportId: string;
    format: 'pdf' | 'docx';
  }) => void;
}

const FONT_FAMILIES = ["Arial", "Times New Roman", "Calibri", "Courier New"];
const FONT_SIZES = Array.from({ length: 65 }, (_, i) => i + 8);

function formatTimeAgo(ts: number | null): string {
  if (!ts) return "Never";
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

function normalizeFontSizeForExecCommand(sizePt: number): string {
  if (sizePt <= 10) return "1";
  if (sizePt <= 12) return "2";
  if (sizePt <= 16) return "3";
  if (sizePt <= 24) return "4";
  if (sizePt <= 36) return "5";
  if (sizePt <= 48) return "6";
  return "7";
}

export function AssignmentRichTextEditor({
  value,
  onChange,
  placeholder = "Start typing your assignment…",
  className,
  assignmentId,
  lockedFolderPath,
  sessionId,
  policyId,
  orgId,
  studentId,
  assignmentTitle,
  studentName,
  submissionUrl,
  onExportedForSubmission,
}: AssignmentRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<number | null>(null);
  const [rows, setRows] = useState("2");
  const [cols, setCols] = useState("2");
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const {
    pendingPasteAcknowledgement,
    lastPasteMeta,
    showIntegrityReminder,
    integrityTrigger,
    lastTypingAnomalyMeta,
    handlePaste,
    handleContentLength,
    handleExternalRiskEvent,
    acknowledgePasteWarning,
    dismissIntegrityReminder,
  } = useAssignmentRiskMonitor(assignmentId);

  useAgentRiskEvents(handleExternalRiskEvent);

  const execute = useCallback((command: string, valueArg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, valueArg);
    onChange?.(editorRef.current?.innerHTML ?? "");
  }, [onChange]);

  const onPaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData("text/plain");
    handlePaste(text);
  }, [handlePaste]);

  const onInput = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? "";
    const textLength = (editorRef.current?.innerText || "").length;
    handleContentLength(textLength);
    onChange?.(html);
  }, [handleContentLength, onChange]);

  const autoSaveLabel = useMemo(() => `Auto-saved ${formatTimeAgo(lastAutoSavedAt)}`, [lastAutoSavedAt]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const api = window.humanfirstDesktop;
      if (!api?.isDesktop || !api.saveAssignmentDraft || !lockedFolderPath || !editorRef.current) return;
      const html = editorRef.current.innerHTML;
      const savedAt = new Date().toISOString();
      const result = await api.saveAssignmentDraft({ html, savedAt });
      if (result?.ok) {
        setLastAutoSavedAt(Date.now());
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [lockedFolderPath]);

  useEffect(() => {
    if (!lastPasteMeta || !studentId || !policyId || !orgId) return;
    if (lastPasteMeta.characterCount < 50) return;
    const eventType = lastPasteMeta.isLarge ? "large_paste_detected" : "paste_detected";
    void violationLogger.logViolation({
      student_id: studentId,
      policy_id: policyId,
      org_id: orgId,
      event_type: eventType,
      session_id: sessionId,
      metadata: {
        character_count: lastPasteMeta.characterCount,
        paste_index: lastPasteMeta.pasteIndex,
        acknowledged: lastPasteMeta.isLarge ? false : undefined,
        occurred_at: lastPasteMeta.occurredAt,
      },
    });
  }, [lastPasteMeta, orgId, policyId, sessionId, studentId]);

  useEffect(() => {
    if (!lastTypingAnomalyMeta || !studentId || !policyId || !orgId) return;
    void violationLogger.logViolation({
      student_id: studentId,
      policy_id: policyId,
      org_id: orgId,
      event_type: "typing_anomaly",
      session_id: sessionId,
      metadata: {
        characters_added: lastTypingAnomalyMeta.charactersAdded,
        time_seconds: Number(lastTypingAnomalyMeta.timeSeconds.toFixed(3)),
        occurred_at: lastTypingAnomalyMeta.occurredAt,
      },
    });
  }, [lastTypingAnomalyMeta, orgId, policyId, sessionId, studentId]);

  const onConfirmLargePaste = useCallback(async () => {
    const pending = pendingPasteAcknowledgement;
    acknowledgePasteWarning();
    if (!pending || !studentId || !policyId || !orgId) return;
    await violationLogger.logViolation({
      student_id: studentId,
      policy_id: policyId,
      org_id: orgId,
      event_type: "paste_acknowledged",
      metadata: {
        character_count: pending.characterCount,
        paste_index: pending.pasteIndex,
        acknowledged: true,
        occurred_at: pending.occurredAt,
      },
      session_id: sessionId,
    });
  }, [acknowledgePasteWarning, orgId, pendingPasteAcknowledgement, policyId, sessionId, studentId]);

  const handleInsertTable = useCallback(() => {
    const r = Math.max(1, Number(rows) || 1);
    const c = Math.max(1, Number(cols) || 1);
    let html = "<table style='width:100%; border-collapse: collapse;'><tbody>";
    for (let i = 0; i < r; i++) {
      html += "<tr>";
      for (let j = 0; j < c; j++) {
        html += "<td style='border:1px solid #9CA3AF; padding:8px;'>&nbsp;</td>";
      }
      html += "</tr>";
    }
    html += "</tbody></table><p><br/></p>";
    execute("insertHTML", html);
    setShowTableDialog(false);
  }, [cols, execute, rows]);

  const handleExportAndSubmit = useCallback(async (format: 'pdf' | 'docx') => {
    const api = window.humanfirstDesktop;
    const exportApi = api?.exportAssignmentDocument || api?.exportAssignmentPdf;
    if (!api?.isDesktop || !exportApi || !editorRef.current) {
      toast({
        title: "Export unavailable",
        description: "The desktop export bridge is not ready.",
        variant: "destructive",
      });
      return;
    }
    if (!sessionId || !studentId || !policyId || !orgId) {
      toast({
        title: "Export unavailable",
        description: "Assignment context is still loading.",
        variant: "destructive",
      });
      return;
    }
    setIsExporting(true);
    try {
      const { data: auth } = await supabase.auth.getSession();
      const accessToken = auth.session?.access_token || "";
      const result = await exportApi({
        htmlContent: editorRef.current.innerHTML,
        studentName: studentName || "Student",
        assignmentName: assignmentTitle || "Assignment",
        format,
        sessionId,
        studentId,
        policyId,
        orgId,
        accessToken,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
        supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      });
      if (!result?.ok || !result.metadata?.export_id) {
        toast({
          title: "Export failed",
          description: result?.error || "The assignment file could not be created.",
          variant: "destructive",
        });
        return;
      }

      if (submissionUrl && api.setSubmissionLock) {
        await api.setSubmissionLock(submissionUrl);
      }

      onExportedForSubmission?.({
        fileName: result.fileName || "",
        filePath: result.filePath || "",
        fileSizeKb: Number(result.fileSizeKb || 0),
        exportId: String(result.metadata.export_id || ""),
        format,
      });
      setShowExportDialog(false);
    } finally {
      setIsExporting(false);
    }
  }, [assignmentTitle, onExportedForSubmission, orgId, policyId, sessionId, studentId, studentName, submissionUrl, toast]);

  return (
    <>
      <div className="flex flex-col gap-2 p-2">
        {pendingPasteAcknowledgement && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            <p className="font-semibold">⚠️ Large Content Pasted</p>
            <p className="mt-1">
              You pasted {pendingPasteAcknowledgement.characterCount} characters.
              Please confirm this is your own work and not AI generated content.
            </p>
            <Button className="mt-2" size="sm" onClick={onConfirmLargePaste}>
              ✅ Yes, this is my own work
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 rounded-md border border-input/50 bg-background/50 p-2">
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            onChange={(e) => execute("fontName", e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>Font</option>
            {FONT_FAMILIES.map((font) => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>

          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            onChange={(e) => {
              const pt = Number(e.target.value);
              execute("fontSize", normalizeFontSizeForExecCommand(pt));
            }}
            defaultValue=""
          >
            <option value="" disabled>Size</option>
            {FONT_SIZES.map((size) => (
              <option key={size} value={String(size)}>{size}pt</option>
            ))}
          </select>

          <Separator orientation="vertical" className="h-6" />

          <Toggle size="sm" onPressedChange={() => execute("bold")}><Bold className="h-4 w-4" /></Toggle>
          <Toggle size="sm" onPressedChange={() => execute("italic")}><Italic className="h-4 w-4" /></Toggle>
          <Toggle size="sm" onPressedChange={() => execute("underline")}><Underline className="h-4 w-4" /></Toggle>
          <Toggle size="sm" onPressedChange={() => execute("strikeThrough")}><Strikethrough className="h-4 w-4" /></Toggle>

          <Separator orientation="vertical" className="h-6" />

          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            A
            <Input type="color" className="h-8 w-10 p-1" onChange={(e) => execute("foreColor", e.target.value)} />
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            H
            <Input type="color" className="h-8 w-10 p-1" onChange={(e) => execute("hiliteColor", e.target.value)} />
          </label>

          <Separator orientation="vertical" className="h-6" />

          <ToggleGroup type="single" onValueChange={(v) => v && execute(v)}>
            <ToggleGroupItem value="justifyLeft" size="sm"><AlignLeft className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="justifyCenter" size="sm"><AlignCenter className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="justifyRight" size="sm"><AlignRight className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="justifyFull" size="sm"><AlignJustify className="h-4 w-4" /></ToggleGroupItem>
          </ToggleGroup>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="outline" size="sm" onClick={() => execute("insertUnorderedList")}><List className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => execute("insertOrderedList")}><ListOrdered className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => execute("indent")}><IndentIncrease className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => execute("outdent")}><IndentDecrease className="h-4 w-4" /></Button>

          <Separator orientation="vertical" className="h-6" />

          <Popover open={showTableDialog} onOpenChange={setShowTableDialog}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm"><Table2 className="h-4 w-4" /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-2">
              <p className="text-sm font-medium">Insert table</p>
              <div className="grid grid-cols-2 gap-2">
                <Input value={rows} onChange={(e) => setRows(e.target.value)} placeholder="Rows" />
                <Input value={cols} onChange={(e) => setCols(e.target.value)} placeholder="Columns" />
              </div>
              <Button className="w-full" onClick={handleInsertTable}>Insert</Button>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={() => execute("insertHorizontalRule")}><Minus className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => execute("undo")}><Undo2 className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => execute("redo")}><Redo2 className="h-4 w-4" /></Button>
        </div>

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

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{autoSaveLabel}</span>
          <Button
            variant="default"
            size="sm"
            disabled={isExporting || !lockedFolderPath}
            onClick={() => setShowExportDialog(true)}
          >
            {isExporting ? "Exporting..." : "Export & Submit"}
          </Button>
        </div>
      </div>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose export format</DialogTitle>
            <DialogDescription>
              Export your assignment as a PDF or DOCX file into the locked folder.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleExportAndSubmit("docx")}
              disabled={isExporting}
            >
              DOCX
            </Button>
            <Button
              type="button"
              onClick={() => void handleExportAndSubmit("pdf")}
              disabled={isExporting}
            >
              PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <IntegrityReminderModal
        open={showIntegrityReminder}
        trigger={integrityTrigger}
        assignmentId={assignmentId}
        onClose={dismissIntegrityReminder}
      />
    </>
  );
}
