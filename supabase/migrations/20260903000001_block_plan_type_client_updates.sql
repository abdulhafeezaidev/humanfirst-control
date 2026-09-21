-- ============================================================
-- Migration: Block direct client-side updates to plan_type
-- ============================================================
--
-- CONTEXT
-- -------
-- UpgradeDialog.tsx previously allowed any authenticated browser
-- client to UPDATE organizations.plan_type directly after a
-- client-side regex check. That UI path is now patched, but RLS
-- alone cannot restrict individual *columns* — the existing
-- "Super admins can manage their organization" FOR ALL policy
-- still permits UPDATE on every column including plan_type.
--
-- APPROACH: BEFORE UPDATE trigger (defense-in-depth)
-- ---------------------------------------------------
-- A PostgreSQL trigger fires before every UPDATE on the
-- organizations table. If the plan_type column is changing AND
-- the call has an authenticated JWT (auth.uid() IS NOT NULL),
-- the trigger raises an exception and the update is aborted.
--
-- When called via the SERVICE_ROLE_KEY (e.g., from a server-side
-- Edge Function), auth.uid() returns NULL, so the trigger allows
-- the change through.  This is the standard Supabase pattern for
-- privileged-only column updates.
--
-- WHAT THIS GIVES US
--   Client (anon/user JWT)   → trigger BLOCKS plan_type changes
--   Server (service_role)    → trigger ALLOWS plan_type changes
--   Supabase dashboard       → ALLOWS (runs as service_role)
--
-- ============================================================

-- ── Step 1: Trigger function ─────────────────────────────────
--
-- SECURITY DEFINER so the function itself can call auth.uid()
-- regardless of RLS context.
-- SET search_path prevents search_path injection attacks.

CREATE OR REPLACE FUNCTION public.prevent_client_plan_type_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fast-path: if plan_type is not changing, allow immediately.
  IF OLD.plan_type IS NOT DISTINCT FROM NEW.plan_type THEN
    RETURN NEW;
  END IF;

  -- plan_type IS changing. Only service_role may do this.
  -- auth.uid() returns NULL for service_role calls.
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION
      'Unauthorized: plan_type can only be changed by server-side processes. '
      'Contact admin@humanfirst.edu to upgrade your plan.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Caller is service_role — allow the update.
  RETURN NEW;
END;
$$;

-- Document the function for future maintainers
COMMENT ON FUNCTION public.prevent_client_plan_type_update() IS
  'BEFORE UPDATE trigger on organizations. Blocks direct client-side '
  'changes to plan_type. Only service_role (server-side) calls are '
  'permitted to modify plan_type. See: supabase/functions/ for the '
  'server-side implementation pattern.';

-- ── Step 2: Attach trigger to organizations ──────────────────
--
-- DROP IF EXISTS makes this migration re-runnable (idempotent).

DROP TRIGGER IF EXISTS guard_plan_type_update ON public.organizations;

CREATE TRIGGER guard_plan_type_update
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_client_plan_type_update();

COMMENT ON TRIGGER guard_plan_type_update ON public.organizations IS
  'Defense-in-depth guard: rejects any authenticated client attempt '
  'to change plan_type. Pairs with the UI-level patch in '
  'src/components/license/UpgradeDialog.tsx.';

-- ── Step 3: Smoke-test via a DO block ────────────────────────
--
-- This block verifies the trigger exists and is active before
-- the migration completes. It does NOT run any actual UPDATE,
-- so it is safe and has zero side-effects.

DO $$
DECLARE
  trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM   information_schema.triggers
    WHERE  trigger_name   = 'guard_plan_type_update'
      AND  event_object_table = 'organizations'
      AND  event_object_schema = 'public'
  ) INTO trigger_exists;

  IF NOT trigger_exists THEN
    RAISE EXCEPTION
      'Migration verification failed: guard_plan_type_update trigger '
      'was not created on public.organizations.';
  END IF;

  RAISE NOTICE
    'Migration OK: guard_plan_type_update trigger is active on '
    'public.organizations. plan_type is now server-only.';
END;
$$;
