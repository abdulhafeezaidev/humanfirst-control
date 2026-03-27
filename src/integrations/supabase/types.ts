export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_services: {
        Row: {
          category: string
          created_at: string
          domains: string[]
          id: string
          is_blocked_during_exam: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          domains?: string[]
          id?: string
          is_blocked_during_exam?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          domains?: string[]
          id?: string
          is_blocked_during_exam?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          target: string
          target_id: string | null
          timestamp: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          target: string
          target_id?: string | null
          timestamp?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          target?: string
          target_id?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_urls: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          enforcement_mode: string
          id: string
          organization_id: string | null
          policy_id: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          enforcement_mode?: string
          id?: string
          organization_id?: string | null
          policy_id: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          enforcement_mode?: string
          id?: string
          organization_id?: string | null
          policy_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_urls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_urls_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "exam_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      enforcement_config: {
        Row: {
          created_at: string
          id: string
          last_updated_by: string | null
          organization_id: string | null
          pilot_mode: boolean
          pilot_mode_enabled_at: string | null
          pilot_mode_enabled_by: string | null
          share_enabled: boolean | null
          share_token: string | null
          status: Database["public"]["Enums"]["enforcement_status"]
          status_message: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_updated_by?: string | null
          organization_id?: string | null
          pilot_mode?: boolean
          pilot_mode_enabled_at?: string | null
          pilot_mode_enabled_by?: string | null
          share_enabled?: boolean | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["enforcement_status"]
          status_message?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_updated_by?: string | null
          organization_id?: string | null
          pilot_mode?: boolean
          pilot_mode_enabled_at?: string | null
          pilot_mode_enabled_by?: string | null
          share_enabled?: boolean | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["enforcement_status"]
          status_message?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enforcement_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_policies: {
        Row: {
          assignment_type: Database["public"]["Enums"]["policy_assignment_type"]
          blocked_categories: string[]
          blocked_services: string[]
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string
          enforcement_level: Database["public"]["Enums"]["enforcement_level"]
          id: string
          is_active: boolean
          organization_id: string | null
          policy_type: Database["public"]["Enums"]["policy_type"]
          priority: number
          start_time: string
          status: Database["public"]["Enums"]["policy_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignment_type?: Database["public"]["Enums"]["policy_assignment_type"]
          blocked_categories?: string[]
          blocked_services?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time: string
          enforcement_level?: Database["public"]["Enums"]["enforcement_level"]
          id?: string
          is_active?: boolean
          organization_id?: string | null
          policy_type?: Database["public"]["Enums"]["policy_type"]
          priority?: number
          start_time: string
          status?: Database["public"]["Enums"]["policy_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignment_type?: Database["public"]["Enums"]["policy_assignment_type"]
          blocked_categories?: string[]
          blocked_services?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string
          enforcement_level?: Database["public"]["Enums"]["enforcement_level"]
          id?: string
          is_active?: boolean
          organization_id?: string | null
          policy_type?: Database["public"]["Enums"]["policy_type"]
          priority?: number
          start_time?: string
          status?: Database["public"]["Enums"]["policy_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics_daily: {
        Row: {
          active_admins_count: number
          admin_actions_by_type: Json
          admin_actions_total: number
          avg_resolution_minutes: number | null
          compliance_factors: Json
          compliance_score: number
          computed_at: string
          created_at: string
          downtime_minutes: number
          events_by_type: Json
          events_resolved: number
          events_total: number
          events_unresolved: number
          id: string
          metric_date: string
          organization_id: string
          policies_active: number
          policies_by_enforcement: Json
          policies_by_type: Json
          policies_total: number
          sessions_avg_duration_minutes: number | null
          sessions_total: number
          sessions_total_hours: number
          uptime_percentage: number
        }
        Insert: {
          active_admins_count?: number
          admin_actions_by_type?: Json
          admin_actions_total?: number
          avg_resolution_minutes?: number | null
          compliance_factors?: Json
          compliance_score?: number
          computed_at?: string
          created_at?: string
          downtime_minutes?: number
          events_by_type?: Json
          events_resolved?: number
          events_total?: number
          events_unresolved?: number
          id?: string
          metric_date: string
          organization_id: string
          policies_active?: number
          policies_by_enforcement?: Json
          policies_by_type?: Json
          policies_total?: number
          sessions_avg_duration_minutes?: number | null
          sessions_total?: number
          sessions_total_hours?: number
          uptime_percentage?: number
        }
        Update: {
          active_admins_count?: number
          admin_actions_by_type?: Json
          admin_actions_total?: number
          avg_resolution_minutes?: number | null
          compliance_factors?: Json
          compliance_score?: number
          computed_at?: string
          created_at?: string
          downtime_minutes?: number
          events_by_type?: Json
          events_resolved?: number
          events_total?: number
          events_unresolved?: number
          id?: string
          metric_date?: string
          organization_id?: string
          policies_active?: number
          policies_by_enforcement?: Json
          policies_by_type?: Json
          policies_total?: number
          sessions_avg_duration_minutes?: number | null
          sessions_total?: number
          sessions_total_hours?: number
          uptime_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "metrics_daily_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics_monthly: {
        Row: {
          avg_compliance_score: number
          avg_policies_active: number
          avg_policies_total: number
          avg_resolution_minutes: number | null
          avg_session_duration_minutes: number | null
          avg_uptime_percentage: number
          compliance_trend: string | null
          computed_at: string
          created_at: string
          days_with_data: number
          events_by_type: Json
          id: string
          max_compliance_score: number | null
          metric_month: number
          metric_year: number
          min_compliance_score: number | null
          organization_id: string
          policies_created: number
          policies_deleted: number
          resolution_rate: number
          top_actions: Json
          total_admin_actions: number
          total_downtime_minutes: number
          total_events: number
          total_resolved: number
          total_session_hours: number
          total_sessions: number
          unique_active_admins: number
        }
        Insert: {
          avg_compliance_score?: number
          avg_policies_active?: number
          avg_policies_total?: number
          avg_resolution_minutes?: number | null
          avg_session_duration_minutes?: number | null
          avg_uptime_percentage?: number
          compliance_trend?: string | null
          computed_at?: string
          created_at?: string
          days_with_data?: number
          events_by_type?: Json
          id?: string
          max_compliance_score?: number | null
          metric_month: number
          metric_year: number
          min_compliance_score?: number | null
          organization_id: string
          policies_created?: number
          policies_deleted?: number
          resolution_rate?: number
          top_actions?: Json
          total_admin_actions?: number
          total_downtime_minutes?: number
          total_events?: number
          total_resolved?: number
          total_session_hours?: number
          total_sessions?: number
          unique_active_admins?: number
        }
        Update: {
          avg_compliance_score?: number
          avg_policies_active?: number
          avg_policies_total?: number
          avg_resolution_minutes?: number | null
          avg_session_duration_minutes?: number | null
          avg_uptime_percentage?: number
          compliance_trend?: string | null
          computed_at?: string
          created_at?: string
          days_with_data?: number
          events_by_type?: Json
          id?: string
          max_compliance_score?: number | null
          metric_month?: number
          metric_year?: number
          min_compliance_score?: number | null
          organization_id?: string
          policies_created?: number
          policies_deleted?: number
          resolution_rate?: number
          top_actions?: Json
          total_admin_actions?: number
          total_downtime_minutes?: number
          total_events?: number
          total_resolved?: number
          total_session_hours?: number
          total_sessions?: number
          unique_active_admins?: number
        }
        Relationships: [
          {
            foreignKeyName: "metrics_monthly_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          audit_log_retention_days: number
          created_at: string
          features_enabled: string[]
          id: string
          is_active: boolean
          max_admins: number
          max_devices: number
          max_students: number
          name: string
          pilot_expires_at: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          slug: string
          tamper_event_retention_days: number
          updated_at: string
        }
        Insert: {
          audit_log_retention_days?: number
          created_at?: string
          features_enabled?: string[]
          id?: string
          is_active?: boolean
          max_admins?: number
          max_devices?: number
          max_students?: number
          name: string
          pilot_expires_at?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          slug: string
          tamper_event_retention_days?: number
          updated_at?: string
        }
        Update: {
          audit_log_retention_days?: number
          created_at?: string
          features_enabled?: string[]
          id?: string
          is_active?: boolean
          max_admins?: number
          max_devices?: number
          max_students?: number
          name?: string
          pilot_expires_at?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          slug?: string
          tamper_event_retention_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      policy_assignment_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          metadata: Json | null
          organization_id: string | null
          policy_id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          policy_id: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          policy_id?: string
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_assignment_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_assignment_logs_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "exam_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          id: string
          notes: string | null
          organization_id: string | null
          policy_id: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          policy_id: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          policy_id?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_assignments_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "exam_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          device_id: string | null
          email: string
          ethics_accepted_at: string | null
          full_name: string
          id: string
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          email: string
          ethics_accepted_at?: string | null
          full_name: string
          id?: string
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          email?: string
          ethics_accepted_at?: string | null
          full_name?: string
          id?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action: string
          created_at: string
          id: string
          identifier: string
          identifier_type: string
          request_count: number
          window_start: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          identifier: string
          identifier_type: string
          request_count?: number
          window_start?: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          identifier?: string
          identifier_type?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      student_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          full_name: string
          id: string
          invited_by: string
          organization_id: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          full_name: string
          id?: string
          invited_by: string
          organization_id?: string | null
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invited_by?: string
          organization_id?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tamper_events: {
        Row: {
          device_id: string
          event_type: string
          exam_policy_id: string | null
          id: string
          notes: string | null
          organization_id: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          device_id: string
          event_type: string
          exam_policy_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          timestamp?: string
          user_id: string
        }
        Update: {
          device_id?: string
          event_type?: string
          exam_policy_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tamper_events_exam_policy_id_fkey"
            columns: ["exam_policy_id"]
            isOneToOne: false
            referencedRelation: "exam_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tamper_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aggregate_daily_metrics: {
        Args: { p_date?: string; p_org_id: string }
        Returns: string
      }
      aggregate_monthly_metrics: {
        Args: { p_month?: number; p_org_id: string; p_year?: number }
        Returns: string
      }
      belongs_to_organization: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_roles: { Args: { _user_id: string }; Returns: boolean }
      can_manage_target_role: {
        Args: {
          p_actor_id: string
          p_target_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      change_user_role: {
        Args: {
          p_new_role: Database["public"]["Enums"]["app_role"]
          p_reason?: string
          p_target_user_id: string
        }
        Returns: Json
      }
      check_policy_conflicts: {
        Args: {
          p_end_time: string
          p_exclude_policy_id?: string
          p_org_id: string
          p_start_time: string
        }
        Returns: {
          conflicting_policy_id: string
          conflicting_policy_name: string
          conflicting_policy_type: Database["public"]["Enums"]["policy_type"]
          conflicting_priority: number
          overlap_end: string
          overlap_start: string
        }[]
      }
      check_rate_limit: {
        Args: {
          p_action: string
          p_identifier: string
          p_identifier_type: string
          p_limit: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      cleanup_expired_audit_logs: { Args: never; Returns: number }
      cleanup_expired_tamper_events: { Args: never; Returns: number }
      cleanup_rate_limits: { Args: never; Returns: number }
      count_org_super_admins: { Args: { p_org_id: string }; Returns: number }
      create_audit_log: {
        Args: {
          p_action: string
          p_actor_id: string
          p_metadata?: Json
          p_target: string
          p_target_id: string
        }
        Returns: undefined
      }
      create_audit_log_with_role: {
        Args: {
          p_action: string
          p_actor_id: string
          p_metadata?: Json
          p_target: string
          p_target_id: string
        }
        Returns: string
      }
      create_detailed_audit_log: {
        Args: {
          p_action: string
          p_actor_id: string
          p_metadata?: Json
          p_severity?: string
          p_target: string
          p_target_id: string
        }
        Returns: string
      }
      create_institution_with_owner: {
        Args: {
          p_institution_name: string
          p_institution_slug: string
          p_user_id: string
        }
        Returns: Json
      }
      delete_user_role: {
        Args: { p_reason?: string; p_target_user_id: string }
        Returns: Json
      }
      get_active_exam_policy: {
        Args: never
        Returns: {
          assignment_type: Database["public"]["Enums"]["policy_assignment_type"]
          blocked_categories: string[]
          blocked_services: string[]
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string
          enforcement_level: Database["public"]["Enums"]["enforcement_level"]
          id: string
          is_active: boolean
          organization_id: string | null
          policy_type: Database["public"]["Enums"]["policy_type"]
          priority: number
          start_time: string
          status: Database["public"]["Enums"]["policy_status"]
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "exam_policies"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_audit_log_stats: {
        Args: never
        Returns: {
          logs_this_week: number
          logs_today: number
          top_actions: Json
          total_logs: number
        }[]
      }
      get_audit_logs_with_details: {
        Args: {
          p_action_filter?: string
          p_end_date?: string
          p_limit?: number
          p_offset?: number
          p_start_date?: string
        }
        Returns: {
          log_action: string
          log_actor_email: string
          log_actor_id: string
          log_actor_name: string
          log_actor_role: string
          log_id: string
          log_metadata: Json
          log_organization_id: string
          log_target: string
          log_target_id: string
          log_timestamp: string
        }[]
      }
      get_effective_policy_for_user: {
        Args: { p_user_id: string }
        Returns: {
          blocked_categories: string[]
          blocked_services: string[]
          end_time: string
          enforcement_level: Database["public"]["Enums"]["enforcement_level"]
          policy_id: string
          policy_name: string
          policy_type: Database["public"]["Enums"]["policy_type"]
          priority: number
          start_time: string
        }[]
      }
      get_enforcement_metrics: {
        Args: { p_org_id: string; p_period_days?: number }
        Returns: Json
      }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          is_valid: boolean
          organization_id: string
          organization_name: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_organization_health: { Args: { p_org_id: string }; Returns: Json }
      get_public_policy_summary: {
        Args: { p_share_token: string }
        Returns: Json
      }
      get_role_level: {
        Args: { p_role: Database["public"]["Enums"]["app_role"] }
        Returns: number
      }
      get_user_organization: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_exam_mode_active: { Args: never; Returns: boolean }
      is_org_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_target: string
          p_target_id: string
        }
        Returns: string
      }
      log_policy_assignment: {
        Args: {
          p_action: string
          p_actor_id: string
          p_metadata?: Json
          p_policy_id: string
          p_target_user_id?: string
        }
        Returns: string
      }
      run_daily_metrics_aggregation: { Args: never; Returns: number }
      run_data_retention_cleanup: { Args: never; Returns: Json }
      use_admin_invitation: {
        Args: { p_token: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "student" | "super_admin" | "viewer"
      enforcement_level: "strict" | "soft"
      enforcement_status: "not_connected" | "connected_simulated" | "active"
      plan_type: "pilot" | "standard" | "institution"
      policy_assignment_type: "institution" | "individual"
      policy_status: "active" | "disabled" | "scheduled"
      policy_type: "exam" | "focus" | "custom"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "student", "super_admin", "viewer"],
      enforcement_level: ["strict", "soft"],
      enforcement_status: ["not_connected", "connected_simulated", "active"],
      plan_type: ["pilot", "standard", "institution"],
      policy_assignment_type: ["institution", "individual"],
      policy_status: ["active", "disabled", "scheduled"],
      policy_type: ["exam", "focus", "custom"],
    },
  },
} as const
