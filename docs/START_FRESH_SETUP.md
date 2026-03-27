# Start Fresh (No Institution / No Admin)

Goal: wipe imported data and start again from the **"set up your institution"** flow.

This app’s first-time institution setup is the **Admin Signup** flow:
- URL route: `/admin/signup`

## Option A (cleanest): create a brand‑new Supabase project
1) Create a new Supabase project.
2) Apply the schema/migrations.
3) Update `.env` with the new `VITE_SUPABASE_URL` + anon key.
4) Open the app → go to `/admin/signup` and create the first institution + owner.

## Option B: reset the current Supabase project (DELETES DATA)

### 1) Wipe public app tables
Run this in Supabase Dashboard → SQL Editor:

```sql
-- DANGER: This deletes ALL app data.
-- It keeps schema, functions, triggers.

truncate table
  public.policy_assignments,
  public.blocked_urls,
  public.policy_assignment_logs,
  public.tamper_events,
  public.audit_logs,
  public.admin_invitations,
  public.student_invitations,
  public.metrics_daily,
  public.metrics_monthly,
  public.enforcement_config,
  public.exam_policies,
  public.rate_limits,
  public.user_roles,
  public.profiles,
  public.organizations,
  public.ai_services
restart identity cascade;
```

### 2) Delete Auth users
Supabase Dashboard → Authentication → Users → select all → Delete.

(This removes existing admins/students accounts. Truncating the tables above removes any orphaned profiles/roles.)

### 3) Start setup flow
Open the app and go to:
- `/admin/signup`

Create your account, then the UI will guide you through **"Now let's set up your institution"**.
