# Manage Supabase from this repo (local CLI)

You *can* manage your Supabase project “from here” by running local scripts using the **service_role** key.

Important:
- Do **not** paste your service_role key into chat.
- Set it as an environment variable in your terminal.

## Set env vars (PowerShell)

```powershell
$env:SUPABASE_URL="https://vhmabzrpanixljbdpjob.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="PASTE_SERVICE_ROLE_KEY_HERE"
```

## Promote a user to admin/super_admin

```powershell
node .\scripts\supabase-admin.mjs set-role --email "someone@example.com" --role super_admin
```

## Fix a wrong Auth email by UID

```powershell
node .\scripts\supabase-admin.mjs update-auth-email --userId "00000000-0000-0000-0000-000000000000" --email "new@example.com"
```

If the UI redirects you to `/student`, it means the user’s `public.user_roles.role` is `student` (or missing).
Set it to `admin` or `super_admin`, then sign out/in.
