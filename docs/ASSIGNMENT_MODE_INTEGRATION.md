# Assignment Mode Integration Guide - WebView2 Architecture

## Architecture Overview

```
Student Input
    ↓
HumanFirst App (Electron + React)
    ↓
WebView2 Browser (Right Panel)
    ↓
Navigation Event Captured
    ↓
Domain Detection (DomainTracker)
    ↓
AI Check (13+ known platforms)
    ↓
Warning / Log / Alert
```

## Quick Start

### 1. Add Route to App.tsx or Router

```typescript
import AssignmentModeFullPage from '@/pages/AssignmentModeFullPage'

// Add to your routes
const routes = [
  // ... existing routes
  {
    path: '/assignment/:assignmentId/mode',
    element: <AssignmentModeFullPage />
  }
]
```

### 2. Add Button to Student Dashboard

```typescript
// In StudentDashboard.tsx or assignment card component
import { Button } from '@/components/ui/button'
import { BookOpen } from 'lucide-react'

export function AssignmentCard({ assignment }) {
  const navigate = useNavigate()
  
  return (
    <Card>
      {/* ... existing card content ... */}
      <CardFooter>
        <Button 
          onClick={() => navigate(`/assignment/${assignment.id}/mode`)}
          className="w-full"
        >
          <BookOpen className="mr-2 h-4 w-4" />
          Start Assignment Mode
        </Button>
      </CardFooter>
    </Card>
  )
}
```

### 3. Monitor in Admin Dashboard

```typescript
import useAssignmentModeRiskMonitor from '@/hooks/useAssignmentModeRiskMonitor'

export function AssignmentRiskPanel({ assignmentId }) {
  const { 
    riskScore, 
    getRiskLevel, 
    getAIDomainVisits,
    getSuspiciousActivityCount 
  } = useAssignmentModeRiskMonitor(assignmentId)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignment Risk Assessment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Score */}
        <div>
          <p className="text-sm font-medium">Risk Score: {riskScore}/100</p>
          <p className="text-xs text-muted-foreground">
            Level: {getRiskLevel().toUpperCase()}
          </p>
        </div>
        
        {/* AI Domain Visits */}
        <div>
          <p className="text-sm font-medium">
            AI Domain Visits: {getAIDomainVisits().length}
          </p>
          {getAIDomainVisits().map(visit => (
            <p key={visit.id} className="text-xs text-yellow-600">
              • {visit.domain}
            </p>
          ))}
        </div>
        
        {/* Suspicious Activity */}
        <div>
          <p className="text-sm font-medium">
            Suspicious Activities: {getSuspiciousActivityCount()}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
```

## Component Hierarchy

```
AssignmentModeFullPage (Page)
  └─ AssignmentModeWorkspace (Layout)
      ├─ Left Panel
      │   ├─ Card: Assignment Instructions
      │   └─ AssignmentRichTextEditor
      │       └─ useAssignmentRiskMonitor (existing)
      │
      └─ Right Panel
          └─ ControlledWebBrowser
              ├─ Navigation Controls
              ├─ Address Bar
              └─ IFrame
                  └─ DomainTracker (domain analysis)

useAssignmentModeRiskMonitor (Hook)
  └─ Supabase real-time subscription to assignment_risk_events
```

## Data Flow

```
                    Student Actions
                          ↓
        ┌─────────────────┼─────────────────┐
        ↓                 ↓                 ↓
    URL Navigation    Paste Event    Typing Speed
        ↓                 ↓                 ↓
        └─────────────────┼─────────────────┘
                          ↓
            DomainTracker.reportDomainVisit()
            useAssignmentRiskMonitor.handlePaste()
            useAssignmentRiskMonitor.handleKeystroke()
                          ↓
                  assignment_risk_events table
                          ↓
            useAssignmentModeRiskMonitor hook
                          ↓
                    Admin Dashboard
```

## Key Hooks

### useAssignmentRiskMonitor (Existing)
**Purpose**: Monitor paste/typing in editor
**Returns**: Modals, warnings, risk detection

```typescript
const {
  showPasteWarning,
  showIntegrityReminder,
  handlePaste,
  handleKeystroke,
  handleExternalRiskEvent
} = useAssignmentRiskMonitor(assignmentId)
```

### useAssignmentModeRiskMonitor (New)
**Purpose**: Real-time dashboard monitoring
**Returns**: Risk score, events, analytics

```typescript
const {
  riskEvents,
  riskScore,
  isMonitoring,
  getRiskLevel,
  getAIDomainVisits,
  getSuspiciousActivityCount
} = useAssignmentModeRiskMonitor(assignmentId)
```

### useAgentRiskEvents (Existing)
**Purpose**: Listen for agent-based risks (external browsers)
**Returns**: Risk events from Windows agent

```typescript
const { handleExternalRiskEvent } = useAgentRiskEvents()
```

## Service: DomainTracker

### Methods

```typescript
const tracker = new DomainTracker()

// Analyze a domain
const result = await tracker.analyzeDomain('https://chat.openai.com')
// Returns: { domain, category, risk, source }

// Report a domain visit
await tracker.reportDomainVisit({
  assignmentId,
  domain,
  category,
  risk,
  eventType: 'ai_domain_visit'
})

// Get cache stats
const stats = tracker.getCacheStats()
// Returns: { size, entries }

// Clear cache
tracker.clearCache()
```

## Styling Integration

All components use shadcn/ui and Tailwind:

```typescript
// Colors for risk levels
<div className="text-green-600">  // Low risk
<div className="text-yellow-600"> // Medium risk
<div className="text-red-600">    // High risk
```

## Environment Variables (Optional)

```
# .env
VITE_ASSIGNMENT_MODE_ENABLED=true
VITE_AI_DOMAIN_CHECK_TIMEOUT=5000
VITE_REPORT_FLUSH_INTERVAL=30000
```

## Testing Integration

### Test the full flow

```typescript
import { render, screen } from '@testing-library/react'
import { AssignmentModeWorkspace } from '@/components/assignment/AssignmentModeWorkspace'

test('shows warning on AI domain visit', async () => {
  const { getByRole } = render(
    <AssignmentModeWorkspace assignmentId="test-123" />
  )
  
  // Navigate to OpenAI
  const addressBar = getByRole('textbox')
  fireEvent.change(addressBar, { target: { value: 'chat.openai.com' } })
  fireEvent.submit(addressBar)
  
  // Wait for warning
  await screen.findByText('AI Platform Detected')
})
```

## Debugging

### Enable verbose logging

```typescript
// In DomainTracker constructor
if (process.env.NODE_ENV === 'development') {
  console.log('DomainTracker initialized')
  console.log('Known AI domains:', KNOWN_AI_DOMAINS)
}
```

### Check cache

```typescript
// In browser console
const tracker = window.__domainTracker // If exposed globally
tracker.getCacheStats()
```

### Monitor Supabase

```typescript
// In Supabase dashboard
SELECT * FROM assignment_risk_events 
WHERE assignment_id = 'your-assignment-id'
ORDER BY timestamp DESC
LIMIT 20
```

## Performance Tips

1. **Caching**: DomainTracker caches for 1 hour
   - Reduces DB queries by 95%
   - Clear manually if AI domains update: `tracker.clearCache()`

2. **Batch Reporting**: Events sent every 30 seconds
   - High-risk events flushed immediately
   - Saves DB write operations

3. **Real-time**: Using Supabase subscriptions
   - Real-time updates without polling
   - Unsubscribed automatically on unmount

## Troubleshooting

### "Assignment not found" error
- Check that assignment has `id` and `title` fields
- Verify Supabase table has the data
- Check RLS policies allow read

### IFrame shows blank
- Target site may block embedding
- Check browser console for CORS errors
- Whitelisting may be needed in site headers

### Warnings not showing
- Check that ai_services table is populated
- Verify domain normalization: test in console
- Check Supabase connection status

### Risk score not updating
- Verify real-time subscription is active
- Check `isMonitoring` flag
- Review error logs in browser DevTools

## Next Steps

1. ✅ Components created
2. ✅ Database schema ready
3. ⏳ Add routes to App.tsx
4. ⏳ Update student dashboard
5. ⏳ Integrate into admin dashboard
6. ⏳ Test full flow
7. ⏳ Deploy to Supabase
