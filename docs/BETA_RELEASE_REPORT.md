# HumanFirst Control — Beta Release Readiness & Security Audit Report

**Date:** August 2026  
**Project:** HumanFirst Control (Ethical AI Usage Control for Education)  
**Target Release:** Multi-User Institutional Beta v0.9 (Pilot Release)

---

## 1. Executive Summary & Readiness Assessment

HumanFirst Control is built upon a strong architectural vision: **policy-based exam and focus enforcement without invasive surveillance**. The codebase spans three distinct tiers:
1. **Frontend / Web App:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui.
2. **Backend & Security:** Supabase (PostgreSQL, Row Level Security, Edge Functions, Auth).
3. **Desktop Agent:** .NET 8 C# Windows Worker Service (`ControlPlane.Agent`) + Electron 33 wrapper.

### Overall Beta Readiness Score: **72 / 100** (Requires Hardening Before External Rollout)
While the core web dashboards, assignment mode UI, Supabase RLS migrations, and process-killing enforcement are well-designed, **critical security vulnerabilities and incomplete enforcement features must be resolved** before releasing a Beta version to real users (teachers, administrators, and students).

---

## 2. Security Vulnerabilities & Bugs to Fix Before Beta

Below are the key security vulnerabilities and technical defects identified across the codebase that must be remediated prior to public or multi-user deployment:

### 🚨 Critical Vulnerability 1: Client-Side License Validation & Unrestricted DB Plan Upgrades
* **File Location:** `src/components/license/UpgradeDialog.tsx` (Lines 50–94)
* **Issue:** License key validation is conducted purely client-side using regex (`/^HF-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i`). Immediately after passing regex validation, the browser executes a direct Supabase update query on the `organizations` table:
  ```ts
  const { error } = await supabase.from('organizations').update({ plan_type: targetPlan, ... })
  ```
* **Impact:** Any user can enter any string matching `HF-AAAA-BBBB-CCCC` and upgrade their institution to an unlimited tier without payment or server verification.
* **Remediation:** 
  1. Remove client-side database updates for organization plans.
  2. Implement a server-side Edge Function `verify-license-key` using the Supabase Service Role Key.
  3. Restrict DB UPDATE policies on `organizations.plan_type` via Supabase RLS so clients cannot modify their own plan tier directly.

---

### 🚨 Critical Vulnerability 2: Gateway JWT Verification Bypass in Supabase Config
* **File Location:** `supabase/config.toml` (Lines 22–26)
* **Issue:** `metrics-aggregator` and `data-export` functions are explicitly configured with `verify_jwt = false`.
* **Impact:** While `data-export/index.ts` contains code-level token checks, leaving `verify_jwt = false` at the Supabase gateway level exposes high-privilege administrative endpoints to direct unauthenticated HTTP requests, creating bypass risk if code-level checks ever regress.
* **Remediation:** Set `verify_jwt = true` in `supabase/config.toml` for all production edge functions except public webhooks, enforcing JWT validation at the API Gateway layer.

---

### 🚨 Critical Vulnerability 3: Incomplete NamedPipe IPC & Agent Event Pipeline
* **File Location:** `agent/ControlPlane.Agent/Services/EnforcementEngine.cs` (Lines 453–475)
* **Issue:** The agent contains a stubbed method for notifying Electron when an application is killed:
  ```csharp
  // TODO: Implement proper Named Pipe communication to send this event back to Electron
  ```
* **Impact:** Electron desktop client is unaware when processes are killed in real time, leading to missed audit telemetry and UI sync delays.
* **Remediation:** Complete the NamedPipe JSON serialization protocol between `ControlPlane.Agent` and `electron/main.cjs` to emit live `blocked_app_killed` IPC events.

---

### 🚨 High Risk Bug 4: Missing Domain Enforcement Engine (WFP Placeholder)
* **File Location:** `agent/ControlPlane.Agent/Services/EnforcementEngine.cs` (Lines 728–745)
* **Issue:** Process termination is functional, but network-level domain blocking is not implemented. `ApplyDomainAllowlistViaWfp` contains a placeholder `TODO`:
  ```csharp
  // TODO: Implement WFP-based domain filtering
  ```
* **Impact:** Students can still access restricted AI domains (e.g., ChatGPT, Claude) via standard browsers unless process blocking kills the entire browser.
* **Remediation:** Complete WFP driver/filter rules or introduce a managed browser sandbox boundary for Beta assignment execution.

---

### ⚠️ Moderate Security Risk 5: Permissive CORS Headers on Shared Auth Middleware
* **File Location:** `supabase/functions/_shared/auth.ts` (Line 8)
* **Issue:** `corsHeaders` uses wildcards: `'Access-Control-Allow-Origin': '*'`.
* **Impact:** Cross-origin request exploitation risk for institutional admin sessions.
* **Remediation:** Replace wildcard CORS with configured institution domain origins in production environments.

---

## 3. Top 3 Essential Features Missing for Beta

To ensure educators and students can adopt HumanFirst Control **without hesitation**, the following 3 features are mandatory additions:

```
+-----------------------------------------------------------------------------------+
|                            3 MUST-HAVE BETA FEATURES                              |
+------------------------------------+----------------------------------------------+
| 1. Class Code / Invite Link        | Eliminates friction in student onboarding.   |
|    Self-Onboarding                 | No manual email invites required.            |
+------------------------------------+----------------------------------------------+
| 2. Live Proctoring & Control Panel | Real-time active student session monitoring, |
|    with Emergency Overrides        | 1-click pause, and extension capabilities.   |
+------------------------------------+----------------------------------------------+
| 3. Controlled Browser Sandbox      | Enforces domain allowlists without needing   |
|    (WebView2 / Fallback Guard)     | deep kernel-level WFP drivers on web mode.   |
+------------------------------------+----------------------------------------------+
```

### Feature 1: Class Code / Magic Link Self-Onboarding Flow
* **Why it's needed:** Currently, onboarding students requires admins to create individual invitations or execute scripts. Teachers will hesitate to adopt software if adding 30 students to an exam takes 20 minutes of manual email entry.
* **Specification:**
  - Admins generate a 6-digit Join Code (e.g. `MATH-8021`) or QR code / link.
  - Students sign up / sign in, enter `MATH-8021`, and are automatically attached to the organization & exam policy.

### Feature 2: Real-time Live Proctoring Panel with Emergency Overrides
* **Why it's needed:** Teachers need visibility into active exams. If a student's system freezes or an unexpected technical issue occurs, teachers currently have no way to grant a 5-minute extension or clear a false-positive violation.
* **Specification:**
  - Real-time grid showing connected students, active assignment timer, and current risk indicator (Low/Med/High).
  - Quick action controls: **[Extend 10 Mins]**, **[Pause Student Session]**, **[Clear Active Violation]**, **[Force Submit]**.

### Feature 3: Controlled Web Sandbox / Domain Enforcement Fallback
* **Why it's needed:** Since native WFP domain blocking in C# requires Administrator privileges and complex Windows driver installation, web-only users need a reliable domain barrier.
* **Specification:**
  - Utilize Electron WebView2 with navigation hooks (`will-navigate`, `onBeforeRequest`) to restrict browser traffic exclusively to the policy domain allowlist.

---

## 4. Comprehensive Beta Release Roadmap

### Phase 1: Security & Core Infrastructure Hardening (Week 1)
1. **Remediation of `UpgradeDialog.tsx`:** Move license activation logic into a Supabase Edge Function (`activate-license`). Block direct client SQL updates to `organizations.plan_type`.
2. **Gateway Authorization Audit:** Enable `verify_jwt = true` in `supabase/config.toml` across all functions.
3. **IPC Pipeline Completion:** Finalize NamedPipe event communication between C# Agent service and Electron desktop wrapper.

### Phase 2: Core Feature Implementation (Weeks 2–3)
1. **Student Onboarding Engine:** Create `join_codes` table, generate short codes per organization/class, build `/join` student view.
2. **Live Proctoring Control Panel:** Add real-time Supabase webhooks / channels to `src/pages/AdminDashboardV2.tsx` showing active student exam sessions and emergency action buttons.
3. **WebView2 Domain Sandbox:** Implement strict URL interception inside `electron/main.cjs` to enforce domain allowlists during exam sessions.

### Phase 3: Multi-Tenant Operational Readiness (Week 4)
1. **Sentry & Centralized Telemetry:** Integrate error monitoring across React UI and Supabase Edge Functions.
2. **Database Maintenance:** Verify scheduled retention functions (`data-retention-cleanup`) purge audit and tamper logs properly.
3. **Packaging Automation:** Build installer binaries (`.exe` NSIS installer via `electron-builder`) and verify silent agent background installation (`install-service.ps1`).

### Phase 4: Pilot Release Launch & Feedback Cadence (Post-Launch)
1. Onboard initial cohort of 3–5 partner institutions (<500 active students).
2. Monitor daily compliance scores, telemetry ingest rates, and agent stability metrics.

---

## 5. Pre-Beta Deployment Checklist

Before announcing the Beta release, verify that all checklist items below are completed:

- [ ] **License Security:** Server-validated license key system active; RLS prevents client updates to plan tiers.
- [ ] **API Security:** All Supabase Edge Functions enforce gateway JWT and origin-restricted CORS headers.
- [ ] **Data Isolation:** RLS tested across multi-tenant boundaries (org A cannot view org B's policies or logs).
- [ ] **Agent Reliability:** Windows Agent auto-starts as a background service and recovers from unexpected restarts.
- [ ] **IPC Communication:** Process kill events properly logged to DB and displayed in student/admin UI.
- [ ] **Error Tracking:** Sentry initialized on client and server.
- [ ] **Build Validation:** `npm run build`, `npm run typecheck`, and `npm run test` pass with 0 errors.

---
*Report compiled for HumanFirst Control Beta Engineering Team.*
