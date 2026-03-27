# QA Test Checklist: Policy Enforcement Flow

## Test Scenario: End-to-End Policy Enforcement

---

## Step 1: Admin Creates Exam Policy

### API Called
```typescript
// POST to exam_policies table
supabase.from('exam_policies').insert({
  title: "Math 101 Midterm",
  description: "No AI tools allowed",
  policy_type: "exam",
  enforcement_level: "strict",
  status: "active",
  assignment_type: "institution",
  start_time: "2026-01-26T09:00:00Z",
  end_time: "2026-01-26T11:00:00Z",
  blocked_categories: ["AI Tools", "Social Media"],
  blocked_services: ["ChatGPT", "Claude"],
  priority: 100,
  is_active: true,
  organization_id: "<org_uuid>",
  created_by: "<admin_user_id>"
}).select().single()
```

### Expected Response
```json
{
  "id": "policy-uuid",
  "title": "Math 101 Midterm",
  "policy_type": "exam",
  "enforcement_level": "strict",
  "priority": 100,
  "organization_id": "<org_uuid>",
  "created_at": "2026-01-26T08:00:00Z"
}
```

### Possible Failure Points
| Failure | Cause | Status |
|---------|-------|--------|
| RLS denies insert | User not admin or wrong organization | ✅ Protected |
| Missing organization_id | User profile has no organization | ⚠️ BUG FOUND |
| Invalid policy_type enum | Typo in frontend constant | ✅ Protected by enum |
| start_time > end_time | No validation | ⚠️ BUG FOUND |

### Audit Logging
```typescript
// Called after successful insert
supabase.rpc('log_policy_assignment', {
  p_policy_id: "policy-uuid",
  p_action: "created",
  p_actor_id: "<admin_user_id>",
  p_metadata: { title: "Math 101 Midterm", policy_type: "exam" }
})
```

---

## Step 2: Policy is Assigned to Students

### For Institution-Wide Policies
**No explicit assignment needed** - Policies with `assignment_type: 'institution'` automatically apply to all students in the organization.

### For Individual Assignment
```typescript
// POST to policy_assignments table
supabase.from('policy_assignments').insert({
  policy_id: "policy-uuid",
  user_id: "<student_user_id>",
  organization_id: "<org_uuid>",
  assigned_by: "<admin_user_id>",
  notes: "Special accommodation"
}).select().single()
```

### Expected Response
```json
{
  "id": "assignment-uuid",
  "policy_id": "policy-uuid",
  "user_id": "<student_user_id>",
  "assigned_at": "2026-01-26T08:30:00Z",
  "revoked_at": null
}
```

### Possible Failure Points
| Failure | Cause | Status |
|---------|-------|--------|
| Duplicate assignment | Same user assigned twice | ✅ Protected (unique constraint) |
| Cross-org assignment | Admin assigns student from different org | ⚠️ NEEDS CHECK |
| Invalid user_id | User doesn't exist | ✅ Will fail silently |
| Student can't see assignment | RLS policy too restrictive | ✅ RLS allows student SELECT |

---

## Step 3: Student Logs In

### Authentication Flow
```typescript
// POST to auth.signInWithPassword
supabase.auth.signInWithPassword({
  email: "student@school.edu",
  password: "********"
})
```

### Expected Response
```json
{
  "user": {
    "id": "<student_user_id>",
    "email": "student@school.edu"
  },
  "session": {
    "access_token": "jwt...",
    "refresh_token": "..."
  }
}
```

### Role Verification
```typescript
// GET from user_roles table
supabase.from('user_roles')
  .select('role')
  .eq('user_id', "<student_user_id>")
  .single()
```

### Expected Response
```json
{
  "role": "student"
}
```

### Possible Failure Points
| Failure | Cause | Status |
|---------|-------|--------|
| No role found | User signup didn't create role | ⚠️ BUG FOUND |
| Wrong role returned | Multiple roles for user | ⚠️ NEEDS CHECK |
| Session expired | Token not refreshed | ✅ Auto-refresh enabled |

---

## Step 4: Policy is Enforced and Displayed

### API Called (Student Dashboard)
```typescript
// RPC call to get active policy
supabase.rpc('get_active_exam_policy')
```

### Expected Response (Active Policy)
```json
[{
  "id": "policy-uuid",
  "title": "Math 101 Midterm",
  "description": "No AI tools allowed",
  "policy_type": "exam",
  "enforcement_level": "strict",
  "start_time": "2026-01-26T09:00:00Z",
  "end_time": "2026-01-26T11:00:00Z",
  "blocked_categories": ["AI Tools", "Social Media"],
  "blocked_services": ["ChatGPT", "Claude"],
  "is_active": true,
  "organization_id": "<org_uuid>"
}]
```

### Expected Response (No Active Policy)
```json
[]
```

### Blocked Services Query
```typescript
supabase.from('ai_services')
  .select('id, name, category, is_blocked_during_exam')
  .eq('is_blocked_during_exam', true)
  .order('category', { ascending: true })
```

### Possible Failure Points
| Failure | Cause | Status |
|---------|-------|--------|
| No policy returned | Student has no organization_id in profile | ⚠️ BUG FOUND |
| Wrong policy priority | Multiple overlapping policies | ✅ Handled in SQL |
| Policy not visible | RLS blocking student view | ✅ RLS allows org students |
| Stale policy shown | Real-time subscription not working | ✅ Subscribed to changes |
| Empty blocked_services | ai_services table empty | ⚠️ NEEDS SEED DATA |

---

## BUGS FOUND

### 🔴 Critical Bugs

1. **No validation for start_time > end_time**
   - **File**: `src/components/policy/PolicyForm.tsx`
   - **Issue**: Form accepts end_time before start_time
   - **Impact**: Policy will never be active
   - **Fix**: Add validation in handleSubmit

2. **Student without organization sees no policies**
   - **File**: Database function `get_active_exam_policy`
   - **Issue**: Returns empty if user has no organization_id in profiles
   - **Impact**: New students see "No Active Restrictions" incorrectly
   - **Fix**: Show explicit error message, not empty state

3. **User signup may not create role**
   - **File**: Trigger on auth.users or signup flow
   - **Issue**: If role creation fails silently, user has no role
   - **Impact**: User gets stuck in auth loop
   - **Fix**: Verify trigger exists and add error handling

### 🟡 Medium Bugs

4. **Cross-organization assignment possible**
   - **File**: `src/hooks/usePolicies.ts` (assignStudent)
   - **Issue**: No frontend validation that student belongs to same org
   - **Impact**: RLS will reject, but poor UX
   - **Fix**: Pre-filter student list by organization

5. **ai_services table may be empty**
   - **Issue**: No seed data for blocked services
   - **Impact**: "Blocked Services" section never shows
   - **Fix**: Add migration with default AI services

### 🟢 Low Priority

6. **Multiple roles per user not handled**
   - **File**: `src/contexts/AuthContext.tsx`
   - **Issue**: Query returns first role only
   - **Impact**: User with admin+student roles may get wrong one
   - **Fix**: Define role precedence or prevent multiple roles

---

## Empty State UI Behavior

### No Active Policy
```
┌─────────────────────────────────────────────────┐
│ ✓ No Active Restrictions                        │
│                                                 │
│ You currently have full access to all services. │
│ No policies are being enforced at this time.    │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ What this means: There are no exam, focus,  │ │
│ │ or custom policies currently active...      │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### API Error State
```
┌─────────────────────────────────────────────────┐
│ ⚠ Unable to Load Policy Status                 │
│                                                 │
│ Failed to load policy status: [error message]   │
│                                                 │
│ Please refresh the page or contact your         │
│ administrator if this persists.                 │
└─────────────────────────────────────────────────┘
```

### Loading State
```
┌─────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░ (skeleton animation)        │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░          │
│ ░░░░░░░░░░░░░░░░                                │
└─────────────────────────────────────────────────┘
```

---

## Test Matrix

| Test Case | Expected | Actual | Pass? |
|-----------|----------|--------|-------|
| Admin creates policy | Policy saved with correct priority | TBD | ⬜ |
| Policy visible in list | Shows in PolicyManagement | TBD | ⬜ |
| Institution-wide applies to all | All org students see policy | TBD | ⬜ |
| Individual assignment works | Only assigned student sees | TBD | ⬜ |
| Student sees active policy | ActivePolicyCard shows details | TBD | ⬜ |
| Blocked services display | BlockedServicesCard renders | TBD | ⬜ |
| Exam > Focus priority | Exam wins when both active | TBD | ⬜ |
| Policy ends correctly | Disappears after end_time | TBD | ⬜ |
| Real-time updates | Policy appears without refresh | TBD | ⬜ |
| Error handling | Error card shown on API failure | TBD | ⬜ |
| Empty state | Green card when no policy | TBD | ⬜ |
| Cross-org isolation | Student can't see other org policies | TBD | ⬜ |

---

## API Response Schema Summary

### exam_policies table
```typescript
interface ExamPolicy {
  id: string;                    // UUID
  title: string;                 // Required
  description: string | null;    
  policy_type: 'exam' | 'focus' | 'custom';
  enforcement_level: 'strict' | 'soft';
  status: 'active' | 'disabled' | 'scheduled';
  assignment_type: 'institution' | 'individual';
  start_time: string;            // ISO timestamp
  end_time: string;              // ISO timestamp
  blocked_categories: string[];  
  blocked_services: string[];    
  priority: number;              // 100=exam, 50=focus, 10=custom
  is_active: boolean;
  organization_id: string;       // Required for RLS
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
```

### get_active_exam_policy RPC
```typescript
// Returns: ExamPolicy[] (0 or 1 element)
// Empty array = no active policy
// Single element = the enforced policy (highest priority)
```
