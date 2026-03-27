# HumanFirst v1.0 Enforcement Scope & Ethics Compliance

**Version**: 1.0.0  
**Status**: LOCKED  
**Last Review**: 2026-01-19  
**Ethical Validation**: PASSED ✓

---

## Executive Summary

This document defines the complete enforcement boundary for HumanFirst v1.0. All mechanisms have been validated against our core ethical constraints. No feature in this release collects content, logs keystrokes, records screens, or makes cheating accusations.

---

## Core Ethical Constraints (Non-Negotiable)

| Constraint | Status | Implementation |
|------------|--------|----------------|
| No content reading | ✅ COMPLIANT | No APIs or functions access document/message content |
| No keystroke logging | ✅ COMPLIANT | No keyboard event listeners for input capture |
| No screen recording | ✅ COMPLIANT | No MediaStream, getDisplayMedia, or canvas capture |
| No camera/microphone | ✅ COMPLIANT | No getUserMedia calls; permissions never requested |
| No cheating accusations | ✅ COMPLIANT | All events are "focus signals," not integrity verdicts |
| No behavioral profiling | ✅ COMPLIANT | No ML models; deterministic scoring only |

---

## v1.0 Enforcement Mechanisms

### 1. Tamper Detection (`useTamperDetection`)

**Purpose**: Detect focus loss during active exam policies

**What it detects**:
- `app_backgrounded` - Browser tab hidden (with 3s grace period)
- `app_closed_during_exam` - Tab/browser closed during active policy
- `network_disconnected` - Network lost (with 10s grace period)
- `network_reconnected` - Connectivity restored (neutral event)
- `connectivity_issue_detected` - Failed health check to backend
- `extended_focus_loss` - Window unfocused for >12 seconds

**What it NEVER detects**:
- What user switched to
- What content was viewed
- Keyboard input
- Screen content
- Browser history

**Grace Period System**:
| Type | Duration | Purpose |
|------|----------|---------|
| Visibility | 3,000ms | Prevent false positives from quick tab switches |
| Connectivity | 10,000ms | Allow temporary network hiccups |
| Focus | 2,000ms + 10s threshold | Ignore brief focus loss |
| Reboot | 30,000ms | Allow browser restart recovery |

**Ethical Notes**:
- Events are logged with timestamps only, no context
- sendBeacon used for reliability, not stealth
- All events visible to students in UI

---

### 2. Policy Resilience (`usePolicyResilience`, `policyCache.ts`)

**Purpose**: Ensure policies survive network issues and browser restarts

**Mechanisms**:
- SHA-256 checksum validation for cache integrity
- Local storage with versioning and TTL
- Auto-sync every 60 seconds
- Realtime Supabase subscription for instant updates

**What it stores locally**:
```typescript
{
  policies: [...], // Policy metadata only
  checksum: "...", // Integrity hash
  cached_at: 1234567890,
  version: 1,
  organization_id: "..."
}
```

**What it NEVER stores**:
- Student activity data
- Browsing history
- Content or keystrokes

**Enforcement State Recovery**:
- Tracks whether enforcement was active before browser restart
- Auto-reapplies policy on reboot (within grace period)
- Increments reboot counter for transparency

---

### 3. Network Enforcement (`useNetworkEnforcement`, `networkEnforcement.ts`)

**Purpose**: Detect DNS manipulation that could bypass domain blocking

**Mechanisms**:
- DNS pinning for known AI service domains
- DoH (DNS-over-HTTPS) detection via endpoint probing
- Comparative DNS resolution (direct vs DoH fallback)
- Timing analysis for blocked domain detection

**Pinned Domains (v1.0)**:
| Domain | Category | Purpose |
|--------|----------|---------|
| openai.com | AI Assistant | ChatGPT access |
| anthropic.com | AI Assistant | Claude access |
| bard.google.com | AI Assistant | Bard access |
| bing.com/chat | AI Assistant | Copilot access |
| perplexity.ai | AI Search | AI search access |
| claude.ai | AI Assistant | Claude access |
| gemini.google.com | AI Assistant | Gemini access |
| copilot.microsoft.com | AI Assistant | Copilot access |
| you.com | AI Search | AI search access |
| phind.com | AI Developer | AI coding access |
| writesonic.com | AI Writing | AI writing access |
| jasper.ai | AI Writing | AI writing access |

**Privacy-Safe Logging**:
```typescript
// NEVER logs:
// - IP addresses
// - Full URLs
// - Request content

// ONLY logs:
// - Domain name (sanitized)
// - Anomaly type
// - Timestamp
```

**What it CANNOT detect**:
- VPN usage (only DNS-level checks)
- Browser extension behavior
- Actual content accessed

---

### 4. Device Trust Scoring (`deviceTrust.ts`, `useDeviceTrust`)

**Purpose**: Provide administrators with device reliability signals

**Scoring Categories**:
| Category | Max Points | Signals |
|----------|------------|---------|
| Tamper | 30 | Event frequency, severity, resolution |
| Stability | 25 | Session completion, interruptions, consistency |
| Compliance | 25 | Policy adherence, violation rate |
| Network | 10 | DNS anomalies detected |
| History | 10 | Device age, recent activity |

**Trust Levels**:
| Level | Score Range | Meaning |
|-------|-------------|---------|
| High | 80-100 | Reliable device, normal usage |
| Medium | 60-79 | Minor concerns, continue monitoring |
| Low | 40-59 | Frequent issues, needs attention |
| Critical | 0-39 | Significant concerns, investigate |

**Ethical Design**:
- ❌ NOT a "cheating score"
- ❌ NOT used to accuse students
- ✅ Device reliability indicator only
- ✅ Time decay reduces historical impact (30-day half-life)
- ✅ Resolved events count 50% less
- ✅ Full admin explanation with recommendations

**What it NEVER measures**:
- Academic performance
- Content quality
- Behavioral patterns (beyond focus events)
- Comparison to other students

---

## Data Collection Boundary

### Collected (Minimal)
- Focus loss events (type + timestamp only)
- Network connectivity status
- Policy sync status
- Device identifier (generated, not hardware-based)
- Admin actions (audit log)

### Never Collected
- Screen content
- Keyboard input
- File contents
- Browser history
- Camera/microphone
- Location data
- Biometric data
- Other application data

---

## Retention Policies

| Data Type | Default Retention | Configurable Range |
|-----------|------------------|-------------------|
| Tamper Events | 30 days | 7-90 days |
| Audit Logs | 90 days | 30-365 days |
| Policy Cache | 30 minutes max | Not configurable |

Automatic cleanup via `data-retention-cleanup` edge function.

---

## Language Guidelines

### DO Use
- "Focus signal detected"
- "Device trust level"
- "Policy active"
- "Focus window"
- "Integrity check"

### NEVER Use
- "Cheating detected"
- "Suspicious activity"
- "Violation caught"
- "Student monitored"
- "Behavior tracked"

---

## v1.0 Feature Lock

The following features are **OUT OF SCOPE** for v1.0:

| Feature | Status | Rationale |
|---------|--------|-----------|
| Browser extension control | EXCLUDED | Too invasive |
| Deep packet inspection | EXCLUDED | Privacy violation |
| Content analysis | EXCLUDED | Core ethical constraint |
| ML-based detection | EXCLUDED | Non-deterministic, bias risk |
| Eye tracking | EXCLUDED | Biometric data |
| Room scanning | EXCLUDED | Environmental surveillance |
| Proctoring integration | EXCLUDED | Conflicts with ethics |
| Cross-student comparison | EXCLUDED | Creates suspicion culture |

---

## Compliance Alignment

### GDPR
- ✅ Data minimization (minimal collection)
- ✅ Purpose limitation (exam integrity only)
- ✅ Storage limitation (configurable retention)
- ✅ Right to access (export available)
- ✅ Right to erasure (deletion supported)

### FERPA
- ✅ Minimal educational records created
- ✅ Legitimate educational interest basis
- ✅ Transparent data practices
- ✅ No third-party sharing

---

## Sign-Off

This scope document represents the complete enforcement boundary for HumanFirst v1.0. Any new enforcement mechanism MUST:

1. Pass ethical constraint validation
2. Be added to this document
3. Include privacy-preserving implementation details
4. Provide clear language guidelines
5. Define what it NEVER does

**v1.0 Scope: LOCKED**

---

*Last validated by automated ethics check: 2026-01-19*
