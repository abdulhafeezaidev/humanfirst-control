# Reset / Set Admin Role (Supabase)

This app reads the current user's role from `public.user_roles` by `user_id`.

## 1) Get the user's UID

Supabase Dashboard → **Authentication** → **Users** → click the user → copy **User UID**.

## 2) Promote (or change) role

Run in Supabase Dashboard → **SQL Editor**:

```sql
-- Make this user a super admin (or change to 'admin' / 'viewer' / 'student')
insert into public.user_roles (user_id, role)
values ('PASTE_USER_UID_HERE', 'super_admin')
on conflict (user_id)
do update set role = excluded.role;
```

## 3) Ensure the user has a profile (optional but recommended)

```sql
insert into public.profiles (user_id, full_name, email, organization_id)
values ('PASTE_USER_UID_HERE', 'Full Name', 'email@example.com', 'PASTE_ORG_ID_HERE')
on conflict (user_id)
do update set
  full_name = excluded.full_name,
  email = excluded.email,
  organization_id = excluded.organization_id;
```

## 4) If the app still can’t read roles (RLS)

If RLS is enabled but policies are missing, the frontend may not be able to read `user_roles`/`profiles`, so `role` becomes `null`.

To check existing policies:

```sql
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Minimal policies to let a signed-in user read *their own* role and profile:

```sql
-- user_roles: read own role
create policy "user_roles_select_own"
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

-- profiles: read own profile
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());
```

After changing roles/policies, **sign out and sign back in** in the app.
