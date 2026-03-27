# Quick Integration Examples

## Location 1: Assignment Submission

**File:** `src/components/assignment/AssignmentSubmissionFlow.tsx`

```typescript
import { violationLogger } from '@/lib/violationLogger';

// In handleSubmissionComplete():
const handleSubmissionComplete = useCallback(async () => {
  try {
    setIsProcessing(true);

    // Log assignment submission
    await violationLogger.logAssignmentSubmitted(
      studentId,          // from props or context
      policyId,           // from props
      organizationId,     // from context
      sessionId           // passed from parent
    );

    // ... rest of submission logic
  } catch (error: any) {
    console.error('[Submission] Error:', error);
  } finally {
    setIsProcessing(false);
  }
}, [studentId, policyId, organizationId, sessionId]);
```

---

## Location 2: Session Start/End

**File:** `src/hooks/useAssignmentSession.ts` (or new hook)

```typescript
import { violationLogger } from '@/lib/violationLogger';
import { generateUUID } from '@/lib/utils'; // existing utility

export function useAssignmentSession(assignmentId: string, policyId: string) {
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // On session start
  useEffect(() => {
    const sessionId = generateUUID();
    sessionIdRef.current = sessionId;
    startTimeRef.current = new Date();

    const initSession = async () => {
      try {
        await violationLogger.logSessionStart(
          student.id,
          policyId,
          organization.id,
          sessionId
        );
      } catch (err) {
        console.warn('[Session] Failed to log session start:', err);
      }
    };

    initSession();

    // Cleanup: log session end when component unmounts
    return () => {
      if (sessionIdRef.current && startTimeRef.current) {
        const durationSeconds = Math.round(
          (new Date().getTime() - startTimeRef.current.getTime()) / 1000
        );

        violationLogger.logSessionEnd(
          student.id,
          policyId,
          organization.id,
          sessionIdRef.current,
          durationSeconds
        ).catch(err => console.warn('[Session] Failed to log session end:', err));
      }
    };
  }, [assignmentId, policyId]);

  return {
    sessionId: sessionIdRef.current,
  };
}
```

---

## Location 3: Paste Detection (Rich Text Editor)

**File:** `src/components/assignment/AssignmentRichTextEditor.tsx`

```typescript
import { violationLogger } from '@/lib/violationLogger';

export function AssignmentRichTextEditor({ 
  sessionId, 
  policyId, 
  organizationId 
}: EditorProps) {
  
  // On paste event
  const handlePaste = useCallback(async (event: React.ClipboardEvent) => {
    const pastedText = event.clipboardData.getData('text');
    const charCount = pastedText.length;

    // Log if paste is large (e.g., > 500 chars)
    if (charCount > 500) {
      try {
        await violationLogger.logLargePasteDetected(
          student.id,
          policyId,
          organizationId,
          charCount,
          sessionId
        );
      } catch (err) {
        console.warn('[Editor] Failed to log paste:', err);
      }
    }

    // ... rest of paste handling
  }, [policyId, organizationId, sessionId]);

  return (
    <div
      onPaste={handlePaste}
      contentEditable
      // ... other props
    >
      {/* editor content */}
    </div>
  );
}
```

---

## Location 4: Focus Loss Detection

**File:** `src/hooks/useAssignmentFocusMonitor.ts` (new hook)

```typescript
import { violationLogger } from '@/lib/violationLogger';

export function useAssignmentFocusMonitor({
  sessionId,
  policyId,
  organizationId,
  thresholdSeconds = 120, // log if away > 2 minutes
}: FocusMonitorOptions) {
  const focusLostTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    const handleFocusLost = () => {
      focusLostTimeRef.current = new Date();
    };

    const handleFocusRegained = async () => {
      if (focusLostTimeRef.current) {
        const durationSeconds = Math.round(
          (new Date().getTime() - focusLostTimeRef.current.getTime()) / 1000
        );

        if (durationSeconds >= thresholdSeconds) {
          try {
            await violationLogger.logAppFocusLost(
              student.id,
              policyId,
              organizationId,
              durationSeconds,
              sessionId
            );
          } catch (err) {
            console.warn('[FocusMonitor] Failed to log focus loss:', err);
          }
        }

        focusLostTimeRef.current = null;
      }
    };

    window.addEventListener('blur', handleFocusLost);
    window.addEventListener('focus', handleFocusRegained);

    return () => {
      window.removeEventListener('blur', handleFocusLost);
      window.removeEventListener('focus', handleFocusRegained);
    };
  }, [sessionId, policyId, organizationId]);
}
```

---

## Location 5: Windows Agent (C#)

**File:** `agent/ControlPlane.Agent/Services/EnforcementEngine.cs`

```csharp
// When logging a blocked app event
private async Task KillProcessAndNotifyAsync(
    Process process,
    string policyId,
    string windowTitle)
{
    // ... existing kill logic ...

    // Create violation event
    var evt = new AssignmentRiskLogEvent
    {
        StudentId = Environment.UserName,
        SessionId = _currentSession?.PolicyId ?? "",
        Domain = string.Empty,      // N/A for app blocking
        ProcessName = process.ProcessName,
        TimestampUtc = DateTime.UtcNow,
        SeverityLevel = "HIGH",
        EventType = "blocked_app_killed"
    };

    // Log via Named Pipe to Electron
    try
    {
        var json = JsonSerializer.Serialize(evt);
        await SendToElectronAsync("log_violation", json);
    }
    catch (Exception ex)
    {
        _logger.LogWarning(ex, "Failed to send violation event to Electron: {ProcessName}", 
            process.ProcessName);
    }
}
```

**In Electron (main.cjs):**
```javascript
ipcMain.on('log_violation', async (_event, payload) => {
  try {
    const violation = JSON.parse(payload);
    
    // Filter & log to Supabase
    if (isStorableEvent(violation.event_type)) {
      await supabase
        .from('violation_logs')
        .insert({
          student_id: violation.student_id,
          policy_id: violation.session_id,
          org_id: organizationId, // from context
          event_type: violation.event_type,
          occurred_at: violation.timestamp_utc,
          metadata: {
            process_name: violation.process_name,
          }
        });
    }
  } catch (err) {
    console.error('[Violation Log] Error:', err);
  }
});
```

---

## Location 6: Admin Dashboard Integration

**File:** `src/pages/AdminDashboard.tsx`

```typescript
import { AssignmentReportsDashboard } from '@/components/admin/AssignmentReportsDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AdminDashboard() {
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);

  return (
    <Tabs defaultValue="policies" className="w-full">
      <TabsList>
        <TabsTrigger value="policies">Policies</TabsTrigger>
        <TabsTrigger value="reports">Assignment Reports</TabsTrigger>
        <TabsTrigger value="monitoring">Live Monitoring</TabsTrigger>
      </TabsList>

      {/* ... existing tabs ... */}

      <TabsContent value="reports" className="space-y-4">
        {selectedAssignment ? (
          <div>
            <Button 
              variant="outline" 
              onClick={() => setSelectedAssignment(null)}
              className="mb-4"
            >
              ← Back to Assignments
            </Button>

            <AssignmentReportsDashboard
              assignmentId={selectedAssignment.id}
              assignmentTitle={selectedAssignment.title}
              organizationId={userOrganization.id}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Select Assignment to View Reports</h3>
            <div className="grid gap-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedAssignment(assignment)}
                >
                  <div>
                    <p className="font-semibold">{assignment.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {assignment.student_count} students
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    View Reports
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
```

---

## Location 7: Add Session ID to Context

**File:** `src/contexts/AssignmentContext.tsx` (or create if needed)

```typescript
import { createContext, useContext } from 'react';

interface AssignmentContextType {
  assignmentId: string;
  policyId: string;
  organizationId: string;
  sessionId: string;
  studentId: string;
}

const AssignmentContext = createContext<AssignmentContextType | null>(null);

export function useAssignmentContext() {
  const context = useContext(AssignmentContext);
  if (!context) {
    throw new Error('useAssignmentContext must be used within AssignmentContextProvider');
  }
  return context;
}

export function AssignmentContextProvider({ children, value }: any) {
  return (
    <AssignmentContext.Provider value={value}>
      {children}
    </AssignmentContext.Provider>
  );
}
```

Then wrap the assignment component:
```typescript
// In AssignmentModeFullPage or parent
<AssignmentContextProvider value={{
  assignmentId,
  policyId,
  organizationId,
  sessionId: generateUUID(),
  studentId: user.id
}}>
  <AssignmentModeWorkspace {...props} />
</AssignmentContextProvider>
```

---

## Testing Checklist

- [ ] Event filtering: `isStorableEvent('blocked_app_killed')` returns true
- [ ] Event filtering: `isStorableEvent('domain_visit')` returns false
- [ ] Violation insert: Check `violation_logs` table has data
- [ ] RLS: Student can't read own logs: `SELECT * FROM violation_logs` returns 0
- [ ] RLS: Teacher sees org violations only
- [ ] Report generation: Call function, get plain English summary
- [ ] Verdict scoring: 0 = Clean, 1-5 = Suspicious, 6+ = High Risk
- [ ] Dashboard: All students shown with verdicts
- [ ] Dashboard: Click row opens detailed report with violations list
- [ ] Cleanup: Old violations deleted, session anchors kept

---

## Production Checklist

- [ ] Apply database migrations
- [ ] Deploy `generate-integrity-report` Edge Function
- [ ] Deploy `data-retention-cleanup` Edge Function
- [ ] Enable RLS on `violation_logs` table
- [ ] Test all integration points
- [ ] Enable scheduled cleanup (cron)
- [ ] Monitor database growth
- [ ] Verify RLS policies are working
- [ ] Train admins on report interpretation
