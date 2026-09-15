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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          fb_messenger_id: string | null
          full_name: string
          id: string
          phone_number: string | null
          viber_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          fb_messenger_id?: string | null
          full_name: string
          id?: string
          phone_number?: string | null
          viber_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          fb_messenger_id?: string | null
          full_name?: string
          id?: string
          phone_number?: string | null
          viber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          category: string
          channels: number | null
          id: string
          is_active: boolean
          name: string
          sell_price: number
          sku: string
          stock_qty: number
        }
        Insert: {
          category: string
          channels?: number | null
          id?: string
          is_active?: boolean
          name: string
          sell_price: number
          sku: string
          stock_qty?: number
        }
        Update: {
          category?: string
          channels?: number | null
          id?: string
          is_active?: boolean
          name?: string
          sell_price?: number
          sku?: string
          stock_qty?: number
        }
        Relationships: []
      }
      job_lines: {
        Row: {
          billed_units: number
          description: string
          dispensed_at: string | null
          dispensed_by: string | null
          dispensed_qty: number
          equipment_id: string | null
          id: string
          job_id: string
          line_total: number
          line_type: Database["public"]["Enums"]["line_type"]
          override_decided_at: string | null
          override_decided_by: string | null
          override_price: number | null
          override_reason: string | null
          override_requested_by: string | null
          override_status: Database["public"]["Enums"]["override_status"] | null
          quantity: number
          rate_card_item_id: string | null
          sort_order: number
          unit_price: number
          unit_size: number
        }
        Insert: {
          billed_units: number
          description: string
          dispensed_at?: string | null
          dispensed_by?: string | null
          dispensed_qty?: number
          equipment_id?: string | null
          id?: string
          job_id: string
          line_total?: number
          line_type: Database["public"]["Enums"]["line_type"]
          override_decided_at?: string | null
          override_decided_by?: string | null
          override_price?: number | null
          override_reason?: string | null
          override_requested_by?: string | null
          override_status?:
            | Database["public"]["Enums"]["override_status"]
            | null
          quantity: number
          rate_card_item_id?: string | null
          sort_order?: number
          unit_price: number
          unit_size?: number
        }
        Update: {
          billed_units?: number
          description?: string
          dispensed_at?: string | null
          dispensed_by?: string | null
          dispensed_qty?: number
          equipment_id?: string | null
          id?: string
          job_id?: string
          line_total?: number
          line_type?: Database["public"]["Enums"]["line_type"]
          override_decided_at?: string | null
          override_decided_by?: string | null
          override_price?: number | null
          override_reason?: string | null
          override_requested_by?: string | null
          override_status?:
            | Database["public"]["Enums"]["override_status"]
            | null
          quantity?: number
          rate_card_item_id?: string | null
          sort_order?: number
          unit_price?: number
          unit_size?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_lines_dispensed_by_fkey"
            columns: ["dispensed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_lines_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_lines_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_lines_override_decided_by_fkey"
            columns: ["override_decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_lines_override_requested_by_fkey"
            columns: ["override_requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_lines_rate_card_item_id_fkey"
            columns: ["rate_card_item_id"]
            isOneToOne: false
            referencedRelation: "rate_card_items"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          after_hours: boolean
          cancel_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          customer_id: string
          downpayment_required: number
          equipment_total: number
          grand_total: number
          id: string
          job_number: number
          job_order_at: string | null
          notes: string | null
          priced_at: string | null
          quoted_at: string | null
          rainy_season_applied: boolean
          scheduled_end: string | null
          scheduled_start: string | null
          service_multiplier: number
          service_subtotal: number
          service_total: number
          site_address: string | null
          status: Database["public"]["Enums"]["job_status"]
          survey_required: boolean
          updated_at: string
          zone: Database["public"]["Enums"]["baguio_zone"] | null
        }
        Insert: {
          after_hours?: boolean
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          customer_id: string
          downpayment_required?: number
          equipment_total?: number
          grand_total?: number
          id?: string
          job_number?: never
          job_order_at?: string | null
          notes?: string | null
          priced_at?: string | null
          quoted_at?: string | null
          rainy_season_applied?: boolean
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_multiplier?: number
          service_subtotal?: number
          service_total?: number
          site_address?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          survey_required?: boolean
          updated_at?: string
          zone?: Database["public"]["Enums"]["baguio_zone"] | null
        }
        Update: {
          after_hours?: boolean
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string
          downpayment_required?: number
          equipment_total?: number
          grand_total?: number
          id?: string
          job_number?: never
          job_order_at?: string | null
          notes?: string | null
          priced_at?: string | null
          quoted_at?: string | null
          rainy_season_applied?: boolean
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_multiplier?: number
          service_subtotal?: number
          service_total?: number
          site_address?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          survey_required?: boolean
          updated_at?: string
          zone?: Database["public"]["Enums"]["baguio_zone"] | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_queue: {
        Row: {
          attempts: number
          body: string
          channel: string
          created_at: string
          id: string
          job_id: string | null
          last_error: string | null
          next_attempt_at: string
          recipient_id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          body: string
          channel: string
          created_at?: string
          id?: string
          job_id?: string | null
          last_error?: string | null
          next_attempt_at?: string
          recipient_id: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          body?: string
          channel?: string
          created_at?: string
          id?: string
          job_id?: string | null
          last_error?: string | null
          next_attempt_at?: string
          recipient_id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_queue_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          id: string
          job_id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          method: Database["public"]["Enums"]["payment_method"]
          received_at: string
          received_by: string
          reference: string | null
        }
        Insert: {
          amount: number
          id?: string
          job_id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          method: Database["public"]["Enums"]["payment_method"]
          received_at?: string
          received_by: string
          reference?: string | null
        }
        Update: {
          amount?: number
          id?: string
          job_id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          method?: Database["public"]["Enums"]["payment_method"]
          received_at?: string
          received_by?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          code: string
          end_month: number | null
          is_active: boolean
          multiplier: number
          name: string
          start_month: number | null
          updated_at: string
        }
        Insert: {
          code: string
          end_month?: number | null
          is_active?: boolean
          multiplier: number
          name: string
          start_month?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          end_month?: number | null
          is_active?: boolean
          multiplier?: number
          name?: string
          start_month?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          full_name: string
          id: string
          is_active: boolean
          phone_number: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          full_name: string
          id: string
          is_active?: boolean
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          full_name?: string
          id?: string
          is_active?: boolean
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      quote_template_lines: {
        Row: {
          equipment_id: string | null
          id: string
          line_type: Database["public"]["Enums"]["line_type"]
          quantity: number
          rate_card_item_id: string | null
          sort_order: number
          template_id: string
        }
        Insert: {
          equipment_id?: string | null
          id?: string
          line_type: Database["public"]["Enums"]["line_type"]
          quantity: number
          rate_card_item_id?: string | null
          sort_order?: number
          template_id: string
        }
        Update: {
          equipment_id?: string | null
          id?: string
          line_type?: Database["public"]["Enums"]["line_type"]
          quantity?: number
          rate_card_item_id?: string | null
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_template_lines_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_template_lines_rate_card_item_id_fkey"
            columns: ["rate_card_item_id"]
            isOneToOne: false
            referencedRelation: "rate_card_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_template_lines_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "quote_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      rate_card_items: {
        Row: {
          code: string
          id: string
          is_active: boolean
          is_camera_point: boolean
          is_outdoor: boolean
          name: string
          rate: number
          sort_order: number
          unit_label: string
          unit_size: number
          updated_at: string
        }
        Insert: {
          code: string
          id?: string
          is_active?: boolean
          is_camera_point?: boolean
          is_outdoor?: boolean
          name: string
          rate: number
          sort_order?: number
          unit_label: string
          unit_size?: number
          updated_at?: string
        }
        Update: {
          code?: string
          id?: string
          is_active?: boolean
          is_camera_point?: boolean
          is_outdoor?: boolean
          name?: string
          rate?: number
          sort_order?: number
          unit_label?: string
          unit_size?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: { r: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
    }
    Enums: {
      baguio_zone:
        | "ZONE_1_CENTER"
        | "ZONE_2_EAST"
        | "ZONE_3_WEST"
        | "ZONE_4_SOUTH"
        | "ZONE_5_NORTH"
        | "ZONE_6_PERIPHERAL"
      job_status:
        | "DRAFT"
        | "QUOTED"
        | "JOB_ORDER"
        | "SURVEY"
        | "SURVEY_REVIEW"
        | "SCHEDULED"
        | "DISPATCHED"
        | "IN_PROGRESS"
        | "ON_HOLD"
        | "COMPLETED"
        | "PAID"
        | "CANCELLED"
      line_type: "EQUIPMENT" | "SERVICE"
      override_status: "PENDING" | "APPROVED" | "REJECTED"
      payment_kind: "DOWNPAYMENT" | "BALANCE"
      payment_method: "CASH" | "GCASH" | "MAYA"
      user_role: "ADMIN" | "STORE_STAFF" | "TECHNICIAN"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      baguio_zone: [
        "ZONE_1_CENTER",
        "ZONE_2_EAST",
        "ZONE_3_WEST",
        "ZONE_4_SOUTH",
        "ZONE_5_NORTH",
        "ZONE_6_PERIPHERAL",
      ],
      job_status: [
        "DRAFT",
        "QUOTED",
        "JOB_ORDER",
        "SURVEY",
        "SURVEY_REVIEW",
        "SCHEDULED",
        "DISPATCHED",
        "IN_PROGRESS",
        "ON_HOLD",
        "COMPLETED",
        "PAID",
        "CANCELLED",
      ],
      line_type: ["EQUIPMENT", "SERVICE"],
      override_status: ["PENDING", "APPROVED", "REJECTED"],
      payment_kind: ["DOWNPAYMENT", "BALANCE"],
      payment_method: ["CASH", "GCASH", "MAYA"],
      user_role: ["ADMIN", "STORE_STAFF", "TECHNICIAN"],
    },
  },
} as const
