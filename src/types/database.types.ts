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
      accompany_requests: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string
          meeting_date: string
          meeting_location: string | null
          receiver_id: string
          reject_reason: string | null
          request_reason: string | null
          requester_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["accompany_status"] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id: string
          meeting_date: string
          meeting_location?: string | null
          receiver_id: string
          reject_reason?: string | null
          request_reason?: string | null
          requester_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["accompany_status"] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string
          meeting_date?: string
          meeting_location?: string | null
          receiver_id?: string
          reject_reason?: string | null
          request_reason?: string | null
          requester_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["accompany_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "accompany_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accompany_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accompany_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      csv_mappings: {
        Row: {
          created_at: string | null
          csv_column: string
          display_order: number | null
          field_description: string | null
          field_label: string | null
          field_type: string | null
          id: string
          is_core_field: boolean | null
          is_required: boolean | null
          is_visible_in_list: boolean | null
          system_field: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          csv_column: string
          display_order?: number | null
          field_description?: string | null
          field_label?: string | null
          field_type?: string | null
          id?: string
          is_core_field?: boolean | null
          is_required?: boolean | null
          is_visible_in_list?: boolean | null
          system_field: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          csv_column?: string
          display_order?: number | null
          field_description?: string | null
          field_label?: string | null
          field_type?: string | null
          id?: string
          is_core_field?: boolean | null
          is_required?: boolean | null
          is_visible_in_list?: boolean | null
          system_field?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      distribution_rules: {
        Row: {
          conditions: Json
          created_at: string | null
          description: string | null
          exclusion_rules: Json | null
          grade_id: string
          id: string
          is_active: boolean | null
          logic_operator: string | null
          name: string | null
          priority: number | null
          updated_at: string | null
        }
        Insert: {
          conditions?: Json
          created_at?: string | null
          description?: string | null
          exclusion_rules?: Json | null
          grade_id: string
          id?: string
          is_active?: boolean | null
          logic_operator?: string | null
          name?: string | null
          priority?: number | null
          updated_at?: string | null
        }
        Update: {
          conditions?: Json
          created_at?: string | null
          description?: string | null
          exclusion_rules?: Json | null
          grade_id?: string
          id?: string
          is_active?: boolean | null
          logic_operator?: string | null
          name?: string | null
          priority?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_rules_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "lead_grades"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_rules: {
        Row: {
          conditions: Json
          created_at: string | null
          grade_id: string
          id: string
          is_active: boolean | null
          logic_operator: string | null
          updated_at: string | null
        }
        Insert: {
          conditions: Json
          created_at?: string | null
          grade_id: string
          id?: string
          is_active?: boolean | null
          logic_operator?: string | null
          updated_at?: string | null
        }
        Update: {
          conditions?: Json
          created_at?: string | null
          grade_id?: string
          id?: string
          is_active?: boolean | null
          logic_operator?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grade_rules_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "lead_grades"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_products: {
        Row: {
          adjustment_rate: number
          company: string | null
          created_at: string | null
          description: string | null
          id: string
          insurer_commission_rate: number
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          adjustment_rate?: number
          company?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          insurer_commission_rate: number
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          adjustment_rate?: number
          company?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          insurer_commission_rate?: number
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lead_column_settings: {
        Row: {
          column_key: string
          column_label: string
          column_width: number | null
          created_at: string | null
          display_order: number | null
          id: string
          is_system: boolean | null
          is_visible: boolean | null
          updated_at: string | null
        }
        Insert: {
          column_key: string
          column_label: string
          column_width?: number | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_system?: boolean | null
          is_visible?: boolean | null
          updated_at?: string | null
        }
        Update: {
          column_key?: string
          column_label?: string
          column_width?: number | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_system?: boolean | null
          is_visible?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lead_grades: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          priority: number
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          priority?: number
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          priority?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      lead_histories: {
        Row: {
          change_type: string
          changed_by: string | null
          created_at: string | null
          id: string
          lead_id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          lead_id: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_histories_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_histories_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_statuses: {
        Row: {
          category: Database["public"]["Enums"]["status_category"]
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_final: boolean | null
          name: string
        }
        Insert: {
          category: Database["public"]["Enums"]["status_category"]
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_final?: boolean | null
          name: string
        }
        Update: {
          category?: Database["public"]["Enums"]["status_category"]
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_final?: boolean | null
          name?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          ad_id: string | null
          ad_name: string | null
          ad_set_name: string | null
          adset_id: string | null
          annual_revenue: number | null
          annual_revenue_max: number | null
          annual_revenue_min: number | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_member_id: string | null
          available_time: string | null
          business_type: string | null
          campaign_name: string | null
          company_name: string | null
          contact_status_id: string | null
          contract_amount: number | null
          contract_status_id: string | null
          created_at: string | null
          employee_count: number | null
          employee_count_max: number | null
          employee_count_min: number | null
          extra_fields: Json | null
          form_id: string | null
          form_name: string | null
          grade_id: string | null
          grade_source: Database["public"]["Enums"]["grade_source"] | null
          id: string
          industry: string | null
          is_organic: boolean | null
          meeting_date: string | null
          meeting_location: string | null
          meeting_status_id: string | null
          memo: string | null
          meta_id: string | null
          next_contact_date: string | null
          phone: string
          platform: string | null
          region: string | null
          representative_name: string | null
          source_date: string | null
          tax_delinquency: boolean | null
          updated_at: string | null
          upload_batch_id: string | null
        }
        Insert: {
          ad_id?: string | null
          ad_name?: string | null
          ad_set_name?: string | null
          adset_id?: string | null
          annual_revenue?: number | null
          annual_revenue_max?: number | null
          annual_revenue_min?: number | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_member_id?: string | null
          available_time?: string | null
          business_type?: string | null
          campaign_name?: string | null
          company_name?: string | null
          contact_status_id?: string | null
          contract_amount?: number | null
          contract_status_id?: string | null
          created_at?: string | null
          employee_count?: number | null
          employee_count_max?: number | null
          employee_count_min?: number | null
          extra_fields?: Json | null
          form_id?: string | null
          form_name?: string | null
          grade_id?: string | null
          grade_source?: Database["public"]["Enums"]["grade_source"] | null
          id?: string
          industry?: string | null
          is_organic?: boolean | null
          meeting_date?: string | null
          meeting_location?: string | null
          meeting_status_id?: string | null
          memo?: string | null
          meta_id?: string | null
          next_contact_date?: string | null
          phone: string
          platform?: string | null
          region?: string | null
          representative_name?: string | null
          source_date?: string | null
          tax_delinquency?: boolean | null
          updated_at?: string | null
          upload_batch_id?: string | null
        }
        Update: {
          ad_id?: string | null
          ad_name?: string | null
          ad_set_name?: string | null
          adset_id?: string | null
          annual_revenue?: number | null
          annual_revenue_max?: number | null
          annual_revenue_min?: number | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_member_id?: string | null
          available_time?: string | null
          business_type?: string | null
          campaign_name?: string | null
          company_name?: string | null
          contact_status_id?: string | null
          contract_amount?: number | null
          contract_status_id?: string | null
          created_at?: string | null
          employee_count?: number | null
          employee_count_max?: number | null
          employee_count_min?: number | null
          extra_fields?: Json | null
          form_id?: string | null
          form_name?: string | null
          grade_id?: string | null
          grade_source?: Database["public"]["Enums"]["grade_source"] | null
          id?: string
          industry?: string | null
          is_organic?: boolean | null
          meeting_date?: string | null
          meeting_location?: string | null
          meeting_status_id?: string | null
          memo?: string | null
          meta_id?: string | null
          next_contact_date?: string | null
          phone?: string
          platform?: string | null
          region?: string | null
          representative_name?: string | null
          source_date?: string | null
          tax_delinquency?: boolean | null
          updated_at?: string | null
          upload_batch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_contact_status_id_fkey"
            columns: ["contact_status_id"]
            isOneToOne: false
            referencedRelation: "lead_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_contract_status_id_fkey"
            columns: ["contract_status_id"]
            isOneToOne: false
            referencedRelation: "lead_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "lead_grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_meeting_status_id_fkey"
            columns: ["meeting_status_id"]
            isOneToOne: false
            referencedRelation: "lead_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_upload_batch_id_fkey"
            columns: ["upload_batch_id"]
            isOneToOne: false
            referencedRelation: "upload_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_teams: {
        Row: {
          created_at: string | null
          id: string
          member_id: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          member_id: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          member_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_teams_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      member_monthly_performance: {
        Row: {
          contract_count: number | null
          created_at: string | null
          id: string
          lead_count: number | null
          member_id: string
          month: number
          notes: string | null
          total_commission: number | null
          total_monthly_payment: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          contract_count?: number | null
          created_at?: string | null
          id?: string
          lead_count?: number | null
          member_id: string
          month: number
          notes?: string | null
          total_commission?: number | null
          total_monthly_payment?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          contract_count?: number | null
          created_at?: string | null
          id?: string
          lead_count?: number | null
          member_id?: string
          month?: number
          notes?: string | null
          total_commission?: number | null
          total_monthly_payment?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "member_monthly_performance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_performance_details: {
        Row: {
          client_name: string | null
          commission_amount: number
          contract_date: string | null
          created_at: string | null
          id: string
          memo: string | null
          monthly_payment: number
          performance_id: string
          product_id: string | null
        }
        Insert: {
          client_name?: string | null
          commission_amount: number
          contract_date?: string | null
          created_at?: string | null
          id?: string
          memo?: string | null
          monthly_payment: number
          performance_id: string
          product_id?: string | null
        }
        Update: {
          client_name?: string | null
          commission_amount?: number
          contract_date?: string | null
          created_at?: string | null
          id?: string
          memo?: string | null
          monthly_payment?: number
          performance_id?: string
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_performance_details_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "member_monthly_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_performance_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "insurance_products"
            referencedColumns: ["id"]
          },
        ]
      }
      member_qualifications: {
        Row: {
          created_at: string | null
          id: string
          level: Database["public"]["Enums"]["member_level"] | null
          member_id: string
          newbie_test_passed: boolean | null
          newbie_test_passed_at: string | null
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          level?: Database["public"]["Enums"]["member_level"] | null
          member_id: string
          newbie_test_passed?: boolean | null
          newbie_test_passed_at?: string | null
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: Database["public"]["Enums"]["member_level"] | null
          member_id?: string
          newbie_test_passed?: boolean | null
          newbie_test_passed_at?: string | null
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_qualifications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["member_role"]
          team_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          role: Database["public"]["Enums"]["member_role"]
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      upload_batches: {
        Row: {
          created_at: string | null
          duplicate_count: number | null
          error_count: number | null
          file_name: string | null
          grade_summary: Json | null
          id: string
          success_count: number | null
          total_count: number | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          duplicate_count?: number | null
          error_count?: number | null
          file_name?: string | null
          grade_summary?: Json | null
          id?: string
          success_count?: number | null
          total_count?: number | null
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          duplicate_count?: number | null
          error_count?: number | null
          file_name?: string | null
          grade_summary?: Json | null
          id?: string
          success_count?: number | null
          total_count?: number | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_batches_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_member_id: { Args: never; Returns: string }
      get_current_member_role: {
        Args: never
        Returns: Database["public"]["Enums"]["member_role"]
      }
      get_current_member_team_id: { Args: never; Returns: string }
      get_manager_team_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      accompany_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "completed"
        | "cancelled"
      grade_source: "auto" | "manual"
      member_level: "trainee" | "regular" | "senior"
      member_role: "system_admin" | "sales_manager" | "team_leader"
      status_category: "contact" | "meeting" | "contract"
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
      accompany_status: [
        "pending",
        "accepted",
        "rejected",
        "completed",
        "cancelled",
      ],
      grade_source: ["auto", "manual"],
      member_level: ["trainee", "regular", "senior"],
      member_role: ["system_admin", "sales_manager", "team_leader"],
      status_category: ["contact", "meeting", "contract"],
    },
  },
} as const

// Custom type exports for convenience
export type LeadGrade = Tables<"lead_grades">
export type GradeRule = Tables<"grade_rules">
export type InsuranceProduct = Tables<"insurance_products">
export type MemberQualification = Tables<"member_qualifications">
export type MemberMonthlyPerformance = Tables<"member_monthly_performance">
export type MemberPerformanceDetail = Tables<"member_performance_details">
export type DistributionRule = Tables<"distribution_rules">
export type Member = Tables<"members">
export type Team = Tables<"teams">
