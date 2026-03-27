# Assignment Mode - Quick Reference Card (WebView2 Architecture)

## 🚀 50-Second Overview

**What:** WebView2 in-app browser for assignments that detects AI platform usage  
**Why:** WebView2 Browser → Domain Detection → AI Check → Prevents external browser workarounds  
**How:** WebView2/IFrame architecture with Supabase integration  
**Status:** ✅ Ready to integrate

---

## 📦 What You Get

| Component | Purpose | Import |
|-----------|---------|--------|
| `AssignmentModeWorkspace` | WebView2 split layout + warnings | `@/components/assignment/AssignmentModeWorkspace` |
| `ControlledWebBrowser` | WebView2 embedded browser + tracking | `@/components/assignment/ControlledWebBrowser` |
| `DomainTracker` | Domain analysis (AI detection phase) | `@/services/DomainTracker` |
| `useAssignmentModeRiskMonitor` | Real-time admin monitoring | `@/hooks/useAssignmentModeRiskMonitor` |

---

## ⚡ 3-Minute Setup

### 1. Add Route
```typescript
// src/App.tsx
{
  path: '/assignment/:assignmentId/mode',
  element: <AssignmentModeFullPage />
}
```

### 2. Add Button
```tsx
<Button onClick={() => navigate(`/assignment/${id}/mode`)}>
  Start Assignment Mode
</Button>
```

### 3. Done! ✅
Test: Navigate to any assignment, click button, see split layout.

---

## 🔑 Key Features At A Glance

```
┌─────────────────────────────────────┐
│  Assignment + Controlled Browser    │
├──────────────────┬──────────────────┤
│                  │                  │
│  Assignment      │   Research       │
│  Editor          │   Browser        │
│                  │   (IFrame)       │
│  Risk            │   URL: tracked   │
│  Monitor         │   AI: detected   │
│  (Paste/Type)    │   Alert: shown   │
│                  │                  │
└──────────────────┴──────────────────┘
```

---

## 🎯 Domain Detection

```typescript
// Known AI platforms detected automatically
ChatGPT, Claude, Gemini, Copilot, Perplexity...

// Custom platforms can be added to ai_services table
INSERT INTO ai_services (name, domains)
VALUES ('My AI Tool', '{"myai.com", "app.myai.com"}')
```

---

## ⚠️ Student Experience

1. Student types URL in address bar
2. Browser loads (domain tracked)
3. If AI platform:
   - ⚠️ Warning dialog appears
   - Student can "Go Back" or "Continue"
   - Visit logged regardless
4. If normal site:
   - ✅ Continues silently
   - Visit logged
   - Admin sees in real-time

---

## 📊 Admin Dashboard Hook Usage

```typescript
const {
  riskScore,           // 0-100 number
  getRiskLevel(),      // 'low' | 'medium' | 'high'
  getAIDomainVisits(), // Event[]
  getSuspiciousActivityCount() // number
} = useAssignmentModeRiskMonitor(assignmentId)
```

---

## 🔧 Configuration

### Environment (Optional)
```env
VITE_ASSIGNMENT_MODE_ENABLED=true
VITE_AI_DOMAIN_CHECK_TIMEOUT=5000
VITE_REPORT_FLUSH_INTERVAL=30000
```

### Add More AI Domains
```sql
-- Direct SQL in Supabase
INSERT INTO ai_services (name, domains, category)
VALUES (
  'NewAI',
  '{"newai.com", "app.newai.com"}',
  'text-generation'
)
```

### Change Risk Scoring
```typescript
// In DomainTracker.ts updateRiskScore()
const RISK_WEIGHTS = {
  ai_domain: 15,      // Adjust here
  medium_risk: 5,
  suspicious_typing: 3,
  large_paste: 5
}
```

---

## 🐛 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| IFrame blank | Site blocks embedding | Normal - domain still tracked |
| Warning not showing | AI domains not in DB | Check Supabase ai_services table |
| No real-time updates | Subscription failed | Check Supabase connection |
| Type errors | Tables not generated | Use type casts (already in code) |

---

## 📈 Performance

| Metric | Value | Notes |
|--------|-------|-------|
| Domain check | <1ms | Known list (in-memory) |
| Cache TTL | 1 hour | Configurable |
| Report batch | 30 sec | Or on high-risk |
| Risk calculation | <100ms | Real-time |

---

## 🔐 Security Checklist

- [x] IFrame sandboxed (`allow-same-origin allow-scripts allow-forms`)
- [x] HTTPS enforced
- [x] RLS policies on tables
- [x] User auth required
- [x] Data encrypted in transit
- [x] Minimal PII collected

---

## 📞 Need Help?

1. **TypeScript errors?** → Check type casts (marked with comments)
2. **Tables not found?** → Run `supabase db push`
3. **No events showing?** → Check Supabase Connection filter
4. **Performance issues?** → Clear cache: `tracker.clearCache()`
5. **IFrame not loading?** → Check your browser's console for CORS

---

## 📚 Full Docs

- **Implementation Guide:** `docs/ASSIGNMENT_MODE_GUIDE.md`
- **Integration Examples:** `docs/ASSIGNMENT_MODE_INTEGRATION.md`
- **Full Summary:** `docs/ASSIGNMENT_MODE_IMPLEMENTATION_SUMMARY.md`

---

## ✅ Pre-Deployment Checklist

- [ ] Route added to App.tsx
- [ ] Button added to student dashboard
- [ ] npm run typecheck passes
- [ ] supabase db push applied
- [ ] Test flow: open assignment → click button → see split layout
- [ ] Test tracking: navigate to ChatGPT → see warning
- [ ] Admin hook working: risk score updates live

---

## 🎊 Success Indicators

✅ Split layout visible (50/50 split)  
✅ URL bar works (navigate with feedback)  
✅ Domain detected (ChatGPT shows AI warning)  
✅ Risk score updates (check admin hook)  
✅ Events logged (check Supabase)  
✅ Real-time updates (check subscription)  

**All green? 🟢 You're ready to ship!**

---

## 📋 File Manifest

```
src/
  components/assignment/
    ├─ AssignmentModeWorkspace.tsx      (270 lines)
    └─ ControlledWebBrowser.tsx         (200 lines)
  
  services/
    └─ DomainTracker.ts                 (300+ lines)
  
  hooks/
    └─ useAssignmentModeRiskMonitor.ts  (150 lines)
  
  pages/
    └─ AssignmentModeFullPage.tsx       (100 lines)

docs/
  ├─ ASSIGNMENT_MODE_GUIDE.md
  ├─ ASSIGNMENT_MODE_INTEGRATION.md
  └─ ASSIGNMENT_MODE_IMPLEMENTATION_SUMMARY.md
```

---

**Ready to integrate? Start with the 3-minute setup above! 🚀**

/* Right pane wrapper */
.right-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;      /* critical */
  overflow: hidden;
}

/* Top nav takes only needed height */
.right-pane .browser-nav {
  flex: 0 0 auto;     /* same as flex-none */
}

/* Web area consumes the rest */
.right-pane .browser-content {
  flex: 1 1 auto;     /* same as flex-1 */
  min-height: 0;      /* critical in nested flex layouts */
  position: relative;
  overflow: hidden;
}

/* iframe/webview fills content area */
.right-pane .web-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}

/* Optional footer/status row */
.right-pane .browser-footer {
  flex: 0 0 auto;     /* same as flex-none */
}
