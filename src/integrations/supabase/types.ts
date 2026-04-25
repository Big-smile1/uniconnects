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
      announcements: {
        Row: {
          audience: string
          body: string
          created_at: string
          id: string
          posted_by: string | null
          title: string
        }
        Insert: {
          audience?: string
          body: string
          created_at?: string
          id?: string
          posted_by?: string | null
          title: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          id?: string
          posted_by?: string | null
          title?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          created_at: string
          credit_units: number
          department_id: string | null
          id: string
          lecturer_id: string | null
          level: number
          semester: string
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          credit_units?: number
          department_id?: string | null
          id?: string
          lecturer_id?: string | null
          level: number
          semester: string
          title: string
        }
        Update: {
          code?: string
          created_at?: string
          credit_units?: number
          department_id?: string | null
          id?: string
          lecturer_id?: string | null
          level?: number
          semester?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          faculty: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          faculty?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          faculty?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          session: string
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          session: string
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          session?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          channel: string
          created_at: string
          id: string
          message: string
          parent_link_id: string | null
          provider_response: Json | null
          recipient: string
          semester: string | null
          session: string | null
          status: string
          student_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          message: string
          parent_link_id?: string | null
          provider_response?: Json | null
          recipient: string
          semester?: string | null
          session?: string | null
          status: string
          student_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          message?: string
          parent_link_id?: string | null
          provider_response?: Json | null
          recipient?: string
          semester?: string | null
          session?: string | null
          status?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_parent_link_id_fkey"
            columns: ["parent_link_id"]
            isOneToOne: false
            referencedRelation: "parent_links"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_links: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          parent_email: string | null
          parent_name: string
          parent_phone: string
          parent_user_id: string | null
          relationship: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_email?: string | null
          parent_name: string
          parent_phone: string
          parent_user_id?: string | null
          relationship?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_email?: string | null
          parent_name?: string
          parent_phone?: string
          parent_user_id?: string | null
          relationship?: string
          student_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department_id: string | null
          full_name: string
          id: string
          level: number | null
          matric_number: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          full_name: string
          id: string
          level?: number | null
          matric_number?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          full_name?: string
          id?: string
          level?: number | null
          matric_number?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          admin_approved_by: string | null
          approved_at: string | null
          ca_score: number
          course_id: string
          created_at: string
          enrollment_id: string
          exam_score: number
          grade: string | null
          grade_point: number | null
          hod_approved_by: string | null
          id: string
          rejection_reason: string | null
          semester: string
          session: string
          status: Database["public"]["Enums"]["result_status"]
          student_id: string
          total: number | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          admin_approved_by?: string | null
          approved_at?: string | null
          ca_score?: number
          course_id: string
          created_at?: string
          enrollment_id: string
          exam_score?: number
          grade?: string | null
          grade_point?: number | null
          hod_approved_by?: string | null
          id?: string
          rejection_reason?: string | null
          semester: string
          session: string
          status?: Database["public"]["Enums"]["result_status"]
          student_id: string
          total?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          admin_approved_by?: string | null
          approved_at?: string | null
          ca_score?: number
          course_id?: string
          created_at?: string
          enrollment_id?: string
          exam_score?: number
          grade?: string | null
          grade_point?: number | null
          hod_approved_by?: string | null
          id?: string
          rejection_reason?: string | null
          semester?: string
          session?: string
          status?: Database["public"]["Enums"]["result_status"]
          student_id?: string
          total?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "results_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
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
          role: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "lecturer" | "student" | "parent"
      result_status:
        | "draft"
        | "submitted"
        | "hod_approved"
        | "admin_approved"
        | "rejected"
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
      app_role: ["admin", "lecturer", "student", "parent"],
      result_status: [
        "draft",
        "submitted",
        "hod_approved",
        "admin_approved",
        "rejected",
      ],
    },
  },
} as const
