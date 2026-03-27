drop extension if exists "pg_cron";

drop extension if exists "pg_net";

drop trigger if exists "audit_ai_services" on "public"."ai_services";

drop trigger if exists "update_ai_services_updated_at" on "public"."ai_services";

drop trigger if exists "update_blocked_urls_updated_at" on "public"."blocked_urls";

drop trigger if exists "audit_enforcement_config" on "public"."enforcement_config";

drop trigger if exists "update_enforcement_config_updated_at" on "public"."enforcement_config";

drop trigger if exists "audit_exam_policies" on "public"."exam_policies";

drop trigger if exists "update_exam_policies_updated_at" on "public"."exam_policies";

drop trigger if exists "update_organizations_updated_at" on "public"."organizations";

drop trigger if exists "update_profiles_updated_at" on "public"."profiles";

drop trigger if exists "enforce_role_hierarchy_trigger" on "public"."user_roles";

drop trigger if exists "prevent_last_super_admin_deletion_trigger" on "public"."user_roles";

drop policy "Admins can create admin/viewer invitations" on "public"."admin_invitations";

drop policy "Admins can view org invitations" on "public"."admin_invitations";

drop policy "Super admins can manage all invitations" on "public"."admin_invitations";

drop policy "Admins and super admins can manage AI services" on "public"."ai_services";

drop policy "Viewers and students can view AI services" on "public"."ai_services";

drop policy "Org admin roles can view audit logs" on "public"."audit_logs";

drop policy "Org admins can manage blocked URLs" on "public"."blocked_urls";

drop policy "Students can view blocked URLs for their policies" on "public"."blocked_urls";

drop policy "Viewers can view blocked URLs" on "public"."blocked_urls";

drop policy "Org members can view enforcement config" on "public"."enforcement_config";

drop policy "Org super admins can manage enforcement config" on "public"."enforcement_config";

drop policy "Org admins can manage exam policies" on "public"."exam_policies";

drop policy "Org members can view exam policies" on "public"."exam_policies";

drop policy "Org admins can view daily metrics" on "public"."metrics_daily";

drop policy "Org admins can view monthly metrics" on "public"."metrics_monthly";

drop policy "Allow organization creation via RPC" on "public"."organizations";

drop policy "Super admins can delete their organization" on "public"."organizations";

drop policy "Super admins can update their organization" on "public"."organizations";

drop policy "Users can view their own organization" on "public"."organizations";

drop policy "Org admins can insert assignment logs" on "public"."policy_assignment_logs";

drop policy "Org admins can view assignment logs" on "public"."policy_assignment_logs";

drop policy "Org admins can manage policy assignments" on "public"."policy_assignments";

drop policy "Students can view own assignments" on "public"."policy_assignments";

drop policy "Admins can view org profiles" on "public"."profiles";

drop policy "Super admins can view all org profiles" on "public"."profiles";

drop policy "Users can insert own profile" on "public"."profiles";

drop policy "Users can update own profile" on "public"."profiles";

drop policy "Users can view own profile" on "public"."profiles";

drop policy "Rate limits are system managed" on "public"."rate_limits";

drop policy "Admins can manage student invitations" on "public"."student_invitations";

drop policy "Org admins can manage tamper events" on "public"."tamper_events";

drop policy "Students can insert own tamper events" on "public"."tamper_events";

drop policy "Students can view own tamper events" on "public"."tamper_events";

drop policy "Viewers can view org tamper events" on "public"."tamper_events";

drop policy "Admins can view roles" on "public"."user_roles";

drop policy "Super admins can manage all roles" on "public"."user_roles";

drop policy "Users can view own role" on "public"."user_roles";

alter table "public"."admin_invitations" drop constraint "admin_invitations_token_key";

alter table "public"."admin_invitations" drop constraint "valid_admin_role";

alter table "public"."blocked_urls" drop constraint "blocked_urls_enforcement_mode_check";

alter table "public"."exam_policies" drop constraint "exam_policies_created_by_fkey";

alter table "public"."metrics_daily" drop constraint "metrics_daily_org_date_unique";

alter table "public"."metrics_monthly" drop constraint "metrics_monthly_compliance_trend_check";

alter table "public"."metrics_monthly" drop constraint "metrics_monthly_metric_month_check";

alter table "public"."metrics_monthly" drop constraint "metrics_monthly_org_month_unique";

alter table "public"."policy_assignments" drop constraint "policy_assignments_policy_id_user_id_key";

alter table "public"."profiles" drop constraint "profiles_user_id_fkey";

alter table "public"."rate_limits" drop constraint "rate_limits_identifier_identifier_type_action_window_start_key";

alter table "public"."rate_limits" drop constraint "rate_limits_identifier_type_check";

alter table "public"."student_invitations" drop constraint "student_invitations_token_unique";

alter table "public"."user_roles" drop constraint "user_roles_user_id_fkey";

alter table "public"."user_roles" drop constraint "user_roles_user_id_role_key";

alter table "public"."admin_invitations" drop constraint "admin_invitations_organization_id_fkey";

alter table "public"."blocked_urls" drop constraint "blocked_urls_organization_id_fkey";

alter table "public"."blocked_urls" drop constraint "blocked_urls_policy_id_fkey";

alter table "public"."metrics_daily" drop constraint "metrics_daily_organization_id_fkey";

alter table "public"."metrics_monthly" drop constraint "metrics_monthly_organization_id_fkey";

alter table "public"."policy_assignment_logs" drop constraint "policy_assignment_logs_organization_id_fkey";

alter table "public"."policy_assignment_logs" drop constraint "policy_assignment_logs_policy_id_fkey";

alter table "public"."policy_assignments" drop constraint "policy_assignments_organization_id_fkey";

alter table "public"."policy_assignments" drop constraint "policy_assignments_policy_id_fkey";

alter table "public"."student_invitations" drop constraint "student_invitations_organization_id_fkey";

drop function if exists "public"."aggregate_daily_metrics"(p_org_id uuid, p_date date);

drop function if exists "public"."aggregate_monthly_metrics"(p_org_id uuid, p_year integer, p_month integer);

drop function if exists "public"."audit_ai_service_changes"();

drop function if exists "public"."audit_ai_services"();

drop function if exists "public"."audit_enforcement_changes"();

drop function if exists "public"."audit_enforcement_config"();

drop function if exists "public"."audit_exam_policies"();

drop function if exists "public"."audit_exam_policy_changes"();

drop function if exists "public"."belongs_to_organization"(_user_id uuid, _org_id uuid);

drop function if exists "public"."can_manage_roles"(_user_id uuid);

drop function if exists "public"."can_manage_target_role"(p_actor_id uuid, p_target_role public.app_role);

drop function if exists "public"."change_user_role"(p_target_user_id uuid, p_new_role public.app_role, p_reason text);

drop function if exists "public"."check_policy_conflicts"(p_org_id uuid, p_start_time timestamp with time zone, p_end_time timestamp with time zone, p_exclude_policy_id uuid);

drop function if exists "public"."check_rate_limit"(p_identifier text, p_identifier_type text, p_action text, p_limit integer, p_window_seconds integer);

drop function if exists "public"."cleanup_expired_audit_logs"();

drop function if exists "public"."cleanup_expired_tamper_events"();

drop function if exists "public"."cleanup_rate_limits"();

drop function if exists "public"."count_org_super_admins"(p_org_id uuid);

drop function if exists "public"."create_audit_log"(p_actor_id uuid, p_action text, p_target text, p_target_id uuid, p_metadata jsonb);

drop function if exists "public"."create_audit_log_with_role"(p_actor_id uuid, p_action text, p_target text, p_target_id uuid, p_metadata jsonb);

drop function if exists "public"."create_detailed_audit_log"(p_action text, p_actor_id uuid, p_target text, p_target_id text, p_metadata jsonb, p_severity text);

drop function if exists "public"."create_institution_with_owner"(p_user_id uuid, p_institution_name text, p_institution_slug text);

drop function if exists "public"."delete_user_role"(p_target_user_id uuid, p_reason text);

drop function if exists "public"."enforce_role_hierarchy"();

drop function if exists "public"."get_active_exam_policy"();

drop function if exists "public"."get_audit_log_stats"();

drop function if exists "public"."get_audit_logs_with_details"(p_limit integer, p_offset integer, p_action_filter text, p_start_date timestamp with time zone, p_end_date timestamp with time zone);

drop function if exists "public"."get_effective_policy_for_user"(p_user_id uuid);

drop function if exists "public"."get_enforcement_metrics"(p_org_id uuid, p_period_days integer);

drop function if exists "public"."get_invitation_by_token"(p_token uuid);

drop function if exists "public"."get_organization_health"(p_org_id uuid);

drop function if exists "public"."get_public_policy_summary"(p_share_token uuid);

drop function if exists "public"."get_role_level"(p_role public.app_role);

drop function if exists "public"."get_user_organization"(_user_id uuid);

drop function if exists "public"."get_user_role"(_user_id uuid);

drop trigger if exists "on_auth_user_created" on "auth"."users";

drop function if exists "public"."handle_new_user"();

drop function if exists "public"."has_role"(_user_id uuid, _role public.app_role);

drop function if exists "public"."is_exam_mode_active"();

drop function if exists "public"."is_org_admin"(_user_id uuid);

drop function if exists "public"."is_super_admin"(_user_id uuid);

drop function if exists "public"."log_admin_action"(p_action text, p_target text, p_target_id text, p_metadata jsonb);

drop function if exists "public"."log_policy_assignment"(p_policy_id uuid, p_action text, p_actor_id uuid, p_target_user_id uuid, p_metadata jsonb);

drop function if exists "public"."prevent_last_super_admin_deletion"();

drop function if exists "public"."run_daily_metrics_aggregation"();

drop function if exists "public"."run_data_retention_cleanup"();

drop function if exists "public"."update_updated_at_column"();

drop function if exists "public"."use_admin_invitation"(p_token uuid, p_user_id uuid);

drop index if exists "public"."admin_invitations_token_key";

drop index if exists "public"."idx_audit_logs_organization";

drop index if exists "public"."idx_audit_logs_target";

drop index if exists "public"."idx_blocked_urls_org";

drop index if exists "public"."idx_blocked_urls_policy";

drop index if exists "public"."idx_exam_policies_active_time";

drop index if exists "public"."idx_exam_policies_organization";

drop index if exists "public"."idx_metrics_daily_date";

drop index if exists "public"."idx_metrics_monthly_org_period";

drop index if exists "public"."idx_policy_assignment_logs_policy_id";

drop index if exists "public"."idx_profiles_ethics_accepted";

drop index if exists "public"."idx_profiles_organization";

drop index if exists "public"."idx_rate_limits_cleanup";

drop index if exists "public"."idx_rate_limits_lookup";

drop index if exists "public"."idx_student_invitations_org";

drop index if exists "public"."idx_student_invitations_token";

drop index if exists "public"."idx_tamper_events_organization";

drop index if exists "public"."idx_tamper_events_resolved";

drop index if exists "public"."idx_tamper_events_timestamp";

drop index if exists "public"."idx_tamper_events_user";

drop index if exists "public"."metrics_daily_org_date_unique";

drop index if exists "public"."metrics_monthly_org_month_unique";

drop index if exists "public"."policy_assignments_policy_id_user_id_key";

drop index if exists "public"."rate_limits_identifier_identifier_type_action_window_start_key";

drop index if exists "public"."student_invitations_token_unique";

drop index if exists "public"."user_roles_user_id_role_key";

drop index if exists "public"."idx_audit_logs_timestamp";

drop index if exists "public"."idx_metrics_daily_org_date";

alter table "public"."metrics_daily" alter column "avg_resolution_minutes" set data type numeric using "avg_resolution_minutes"::numeric;

alter table "public"."metrics_daily" alter column "compliance_score" set data type numeric using "compliance_score"::numeric;

alter table "public"."metrics_daily" alter column "sessions_avg_duration_minutes" set data type numeric using "sessions_avg_duration_minutes"::numeric;

alter table "public"."metrics_daily" alter column "sessions_total_hours" set data type numeric using "sessions_total_hours"::numeric;

alter table "public"."metrics_daily" alter column "uptime_percentage" set data type numeric using "uptime_percentage"::numeric;

alter table "public"."metrics_monthly" alter column "avg_compliance_score" set data type numeric using "avg_compliance_score"::numeric;

alter table "public"."metrics_monthly" alter column "avg_policies_active" set data type numeric using "avg_policies_active"::numeric;

alter table "public"."metrics_monthly" alter column "avg_policies_total" set data type numeric using "avg_policies_total"::numeric;

alter table "public"."metrics_monthly" alter column "avg_resolution_minutes" set data type numeric using "avg_resolution_minutes"::numeric;

alter table "public"."metrics_monthly" alter column "avg_session_duration_minutes" set data type numeric using "avg_session_duration_minutes"::numeric;

alter table "public"."metrics_monthly" alter column "avg_uptime_percentage" set data type numeric using "avg_uptime_percentage"::numeric;

alter table "public"."metrics_monthly" alter column "max_compliance_score" set data type numeric using "max_compliance_score"::numeric;

alter table "public"."metrics_monthly" alter column "min_compliance_score" set data type numeric using "min_compliance_score"::numeric;

alter table "public"."metrics_monthly" alter column "resolution_rate" set data type numeric using "resolution_rate"::numeric;

alter table "public"."metrics_monthly" alter column "total_session_hours" set data type numeric using "total_session_hours"::numeric;

alter table "public"."rate_limits" disable row level security;

CREATE INDEX idx_audit_logs_org_id ON public.audit_logs USING btree (organization_id);

CREATE INDEX idx_blocked_urls_policy_id ON public.blocked_urls USING btree (policy_id);

CREATE INDEX idx_exam_policies_org_id ON public.exam_policies USING btree (organization_id);

CREATE INDEX idx_profiles_org_id ON public.profiles USING btree (organization_id);

CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);

CREATE INDEX idx_tamper_events_org_id ON public.tamper_events USING btree (organization_id);

CREATE INDEX idx_tamper_events_user_id ON public.tamper_events USING btree (user_id);

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);

CREATE UNIQUE INDEX metrics_daily_organization_id_metric_date_key ON public.metrics_daily USING btree (organization_id, metric_date);

CREATE UNIQUE INDEX metrics_monthly_organization_id_metric_year_metric_month_key ON public.metrics_monthly USING btree (organization_id, metric_year, metric_month);

CREATE UNIQUE INDEX user_roles_user_id_key ON public.user_roles USING btree (user_id);

CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp");

CREATE INDEX idx_metrics_daily_org_date ON public.metrics_daily USING btree (organization_id, metric_date);

alter table "public"."metrics_daily" add constraint "metrics_daily_organization_id_metric_date_key" UNIQUE using index "metrics_daily_organization_id_metric_date_key";

alter table "public"."metrics_monthly" add constraint "metrics_monthly_organization_id_metric_year_metric_month_key" UNIQUE using index "metrics_monthly_organization_id_metric_year_metric_month_key";

alter table "public"."user_roles" add constraint "user_roles_user_id_key" UNIQUE using index "user_roles_user_id_key";

alter table "public"."admin_invitations" add constraint "admin_invitations_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."admin_invitations" validate constraint "admin_invitations_organization_id_fkey";

alter table "public"."blocked_urls" add constraint "blocked_urls_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."blocked_urls" validate constraint "blocked_urls_organization_id_fkey";

alter table "public"."blocked_urls" add constraint "blocked_urls_policy_id_fkey" FOREIGN KEY (policy_id) REFERENCES public.exam_policies(id) not valid;

alter table "public"."blocked_urls" validate constraint "blocked_urls_policy_id_fkey";

alter table "public"."metrics_daily" add constraint "metrics_daily_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."metrics_daily" validate constraint "metrics_daily_organization_id_fkey";

alter table "public"."metrics_monthly" add constraint "metrics_monthly_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."metrics_monthly" validate constraint "metrics_monthly_organization_id_fkey";

alter table "public"."policy_assignment_logs" add constraint "policy_assignment_logs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."policy_assignment_logs" validate constraint "policy_assignment_logs_organization_id_fkey";

alter table "public"."policy_assignment_logs" add constraint "policy_assignment_logs_policy_id_fkey" FOREIGN KEY (policy_id) REFERENCES public.exam_policies(id) not valid;

alter table "public"."policy_assignment_logs" validate constraint "policy_assignment_logs_policy_id_fkey";

alter table "public"."policy_assignments" add constraint "policy_assignments_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."policy_assignments" validate constraint "policy_assignments_organization_id_fkey";

alter table "public"."policy_assignments" add constraint "policy_assignments_policy_id_fkey" FOREIGN KEY (policy_id) REFERENCES public.exam_policies(id) not valid;

alter table "public"."policy_assignments" validate constraint "policy_assignments_policy_id_fkey";

alter table "public"."student_invitations" add constraint "student_invitations_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."student_invitations" validate constraint "student_invitations_organization_id_fkey";


  create policy "user_roles_select_own"
  on "public"."user_roles"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));


drop trigger if exists "on_auth_user_created" on "auth"."users";


