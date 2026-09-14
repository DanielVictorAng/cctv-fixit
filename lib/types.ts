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
      change_orders: {
        Row: {
          additional_labour: number
          additional_materials: Json
          created_at: string
          id: string
          new_description: string
          requested_by: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["change_order_status"]
          ticket_id: string
        }
        Insert: {
          additional_labour?: number
          additional_materials?: Json
          created_at?: string
          id?: string
          new_description: string
          requested_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["change_order_status"]
          ticket_id: string
        }
        Update: {
          additional_labour?: number
          additional_materials?: Json
          created_at?: string
          id?: string
          new_description?: string
          requested_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["change_order_status"]
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          default_address: string | null
          fb_messenger_id: string | null
          full_name: string
          id: string
          phone_number: string | null
          viber_id: string | null
          zone: Database["public"]["Enums"]["baguio_zone"] | null
        }
        Insert: {
          created_at?: string
          default_address?: string | null
          fb_messenger_id?: string | null
          full_name: string
          id?: string
          phone_number?: string | null
          viber_id?: string | null
          zone?: Database["public"]["Enums"]["baguio_zone"] | null
        }
        Update: {
          created_at?: string
          default_address?: string | null
          fb_messenger_id?: string | null
          full_name?: string
          id?: string
          phone_number?: string | null
          viber_id?: string | null
          zone?: Database["public"]["Enums"]["baguio_zone"] | null
        }
        Relationships: []
      }
      materials: {
        Row: {
          category: string | null
          cost_price: number
          id: string
          name: string
          sell_price: number
          sku: string
          stock_qty: number
        }
        Insert: {
          category?: string | null
          cost_price: number
          id?: string
          name: string
          sell_price: number
          sku: string
          stock_qty?: number
        }
        Update: {
          category?: string | null
          cost_price?: number
          id?: string
          name?: string
          sell_price?: number
          sku?: string
          stock_qty?: number
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
          skills: string[]
        }
        Insert: {
          full_name: string
          id: string
          is_active?: boolean
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          skills?: string[]
        }
        Update: {
          full_name?: string
          id?: string
          is_active?: boolean
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          skills?: string[]
        }
        Relationships: []
      }
      services: {
        Row: {
          base_labour_price: number
          category: string
          est_duration_min: number
          id: string
          name: string
        }
        Insert: {
          base_labour_price: number
          category: string
          est_duration_min?: number
          id?: string
          name: string
        }
        Update: {
          base_labour_price?: number
          category?: string
          est_duration_min?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      ticket_materials: {
        Row: {
          material_id: string
          quantity_used: number
          ticket_id: string
        }
        Insert: {
          material_id: string
          quantity_used?: number
          ticket_id: string
        }
        Update: {
          material_id?: string
          quantity_used?: number
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_materials_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_tech_id: string | null
          cancellation_fee: number
          change_order_pending: boolean
          completed_at: string | null
          created_at: string
          customer_id: string
          downpayment_amount: number | null
          downpayment_paid_at: string | null
          final_total: number
          id: string
          is_paid: boolean
          issue_description: string
          parent_ticket_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          photo_urls: string[]
          quoted_labour: number
          quoted_materials: number
          scheduled_end: string | null
          scheduled_start: string | null
          service_category: string
          status: Database["public"]["Enums"]["ticket_status"]
          updated_at: string
          warranty_expires_at: string | null
          zone: Database["public"]["Enums"]["baguio_zone"]
        }
        Insert: {
          assigned_tech_id?: string | null
          cancellation_fee?: number
          change_order_pending?: boolean
          completed_at?: string | null
          created_at?: string
          customer_id: string
          downpayment_amount?: number | null
          downpayment_paid_at?: string | null
          final_total?: number
          id?: string
          is_paid?: boolean
          issue_description: string
          parent_ticket_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          photo_urls?: string[]
          quoted_labour?: number
          quoted_materials?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_category: string
          status?: Database["public"]["Enums"]["ticket_status"]
          updated_at?: string
          warranty_expires_at?: string | null
          zone: Database["public"]["Enums"]["baguio_zone"]
        }
        Update: {
          assigned_tech_id?: string | null
          cancellation_fee?: number
          change_order_pending?: boolean
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          downpayment_amount?: number | null
          downpayment_paid_at?: string | null
          final_total?: number
          id?: string
          is_paid?: boolean
          issue_description?: string
          parent_ticket_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          photo_urls?: string[]
          quoted_labour?: number
          quoted_materials?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_category?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          updated_at?: string
          warranty_expires_at?: string | null
          zone?: Database["public"]["Enums"]["baguio_zone"]
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_tech_id_fkey"
            columns: ["assigned_tech_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_parent_ticket_id_fkey"
            columns: ["parent_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
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
      is_assigned_tech: { Args: { t: string }; Returns: boolean }
      is_assigned_tech_of_customer: { Args: { c: string }; Returns: boolean }
    }
    Enums: {
      baguio_zone:
        | "ZONE_1_CENTER"
        | "ZONE_2_EAST"
        | "ZONE_3_WEST"
        | "ZONE_4_SOUTH"
        | "ZONE_5_NORTH"
        | "ZONE_6_PERIPHERAL"
      change_order_status: "PENDING" | "APPROVED" | "REJECTED"
      payment_method: "GCASH" | "CASH" | "BANK_TRANSFER" | "MAYA"
      ticket_status:
        | "NEW"
        | "QUOTED"
        | "SCHEDULED"
        | "DISPATCHED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "PAID"
        | "CLOSED"
        | "CANCELLED"
      user_role: "ADMIN" | "COORDINATOR" | "TECHNICIAN" | "STORE_STAFF"
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
      change_order_status: ["PENDING", "APPROVED", "REJECTED"],
      payment_method: ["GCASH", "CASH", "BANK_TRANSFER", "MAYA"],
      ticket_status: [
        "NEW",
        "QUOTED",
        "SCHEDULED",
        "DISPATCHED",
        "IN_PROGRESS",
        "COMPLETED",
        "PAID",
        "CLOSED",
        "CANCELLED",
      ],
      user_role: ["ADMIN", "COORDINATOR", "TECHNICIAN", "STORE_STAFF"],
    },
  },
} as const