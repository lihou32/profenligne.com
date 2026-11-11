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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          amount_paid_eur: number | null
          created_at: string
          description: string | null
          id: string
          lesson_id: string | null
          stripe_payment_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          amount_paid_eur?: number | null
          created_at?: string
          description?: string | null
          id?: string
          lesson_id?: string | null
          stripe_payment_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          amount_paid_eur?: number | null
          created_at?: string
          description?: string | null
          id?: string
          lesson_id?: string | null
          stripe_payment_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          credits_cost: number
          duration_minutes: number
          id: string
          notes: string | null
          rating: number | null
          room_id: string | null
          scheduled_at: string
          started_at: string | null
          status: string
          student_id: string
          subject: string
          topic: string | null
          tutor_id: string
          updated_at: string
        }
        Insert: {
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          credits_cost?: number
          duration_minutes?: number
          id?: string
          notes?: string | null
          rating?: number | null
          room_id?: string | null
          scheduled_at: string
          started_at?: string | null
          status?: string
          student_id: string
          subject: string
          topic?: string | null
          tutor_id: string
          updated_at?: string
        }
        Update: {
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          credits_cost?: number
          duration_minutes?: number
          id?: string
          notes?: string | null
          rating?: number | null
          room_id?: string | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
          student_id?: string
          subject?: string
          topic?: string | null
          tutor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      preregistrations: {
        Row: {
          created_at: string
          email: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_year: number | null
          created_at: string
          first_name: string | null
          grade_level: string | null
          id: string
          last_name: string | null
          notify_lesson_cancelled: boolean
          notify_lesson_reminder: boolean
          notify_new_message: boolean
          school_type: string | null
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_year?: number | null
          created_at?: string
          first_name?: string | null
          grade_level?: string | null
          id?: string
          last_name?: string | null
          notify_lesson_cancelled?: boolean
          notify_lesson_reminder?: boolean
          notify_new_message?: boolean
          school_type?: string | null
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_year?: number | null
          created_at?: string
          first_name?: string | null
          grade_level?: string | null
          id?: string
          last_name?: string | null
          notify_lesson_cancelled?: boolean
          notify_lesson_reminder?: boolean
          notify_new_message?: boolean
          school_type?: string | null
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          credits_awarded: number
          id: string
          referral_code: string
          referred_user_id: string | null
          referrer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_awarded?: number
          id?: string
          referral_code: string
          referred_user_id?: string | null
          referrer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_awarded?: number
          id?: string
          referral_code?: string
          referred_user_id?: string | null
          referrer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          lesson_id: string | null
          rating: number
          student_id: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          rating: number
          student_id: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          rating?: number
          student_id?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      room_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          room_id: string
          sender_name: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          room_id: string
          sender_name: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          room_id?: string
          sender_name?: string
          user_id?: string
        }
        Relationships: []
      }
      tutor_earnings: {
        Row: {
          amount: number
          created_at: string
          id: string
          lesson_id: string | null
          status: string
          tutor_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          lesson_id?: string | null
          status?: string
          tutor_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          lesson_id?: string | null
          status?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_earnings_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          student_id: string
          tutor_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          student_id: string
          tutor_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          student_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_reviews_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      tutors: {
        Row: {
          created_at: string
          hourly_rate: number | null
          id: string
          is_suspended: boolean
          rating: number | null
          status: string
          subjects: string[]
          total_reviews: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hourly_rate?: number | null
          id?: string
          is_suspended?: boolean
          rating?: number | null
          status?: string
          subjects?: string[]
          total_reviews?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hourly_rate?: number | null
          id?: string
          is_suspended?: boolean
          rating?: number | null
          status?: string
          subjects?: string[]
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_xp: {
        Row: {
          created_at: string
          id: string
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webrtc_signals: {
        Row: {
          created_at: string
          id: string
          room_id: string
          sender_id: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          room_id: string
          sender_id: string
          signal_data: Json
          signal_type: string
        }
        Update: {
          created_at?: string
          id?: string
          room_id?: string
          sender_id?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          status: string
          stripe_transfer_id: string | null
          tutor_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          status?: string
          stripe_transfer_id?: string | null
          tutor_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          status?: string
          stripe_transfer_id?: string | null
          tutor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          lesson_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          lesson_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          lesson_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_lessons: {
        Args: {
          p_status?: string
        }
        Returns: {
          id: string
          tutor_id: string
          student_id: string
          tutor_name: string
          student_name: string
          subject: string
          status: string
          created_at: string
          scheduled_at: string
          duration_minutes: number
          credits_cost: number
          price_eur: number
        }[]
      }
      admin_list_tutors: {
        Args: never
        Returns: {
          user_id: string
          email: string
          first_name: string
          last_name: string
          status: string
          hourly_rate: number
          rating: number
          total_reviews: number
          is_suspended: boolean
          lessons_completed: number
          created_at: string
        }[]
      }
      admin_set_tutor_suspended: {
        Args: {
          p_user_id: string
          p_suspended: boolean
        }
        Returns: undefined
      }
      admin_stats: {
        Args: never
        Returns: {
          total_users: number
          total_tutors: number
          lessons_this_month: number
          lessons_last_month: number
          revenue_this_month: number
          revenue_last_month: number
          avg_rating: number
          preregistrations: number
        }[]
      }
      app_setting: {
        Args: {
          _key: string
        }
        Returns: number
      }
      become_tutor: {
        Args: {
          p_subjects: string[]
          p_hourly_rate: number
        }
        Returns: string
      }
      book_lesson: {
        Args: {
          p_tutor_id: string
          p_subject: string
          p_topic: string
          p_scheduled_at: string
          p_duration_minutes: number
        }
        Returns: {
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          credits_cost: number
          duration_minutes: number
          id: string
          notes: string | null
          rating: number | null
          room_id: string | null
          scheduled_at: string
          started_at: string | null
          status: string
          student_id: string
          subject: string
          topic: string | null
          tutor_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "lessons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_lesson: {
        Args: {
          p_lesson_id: string
        }
        Returns: {
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          credits_cost: number
          duration_minutes: number
          id: string
          notes: string | null
          rating: number | null
          room_id: string | null
          scheduled_at: string
          started_at: string | null
          status: string
          student_id: string
          subject: string
          topic: string | null
          tutor_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "lessons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_lesson: {
        Args: {
          p_lesson_id: string
        }
        Returns: {
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          credits_cost: number
          duration_minutes: number
          id: string
          notes: string | null
          rating: number | null
          room_id: string | null
          scheduled_at: string
          started_at: string | null
          status: string
          student_id: string
          subject: string
          topic: string | null
          tutor_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "lessons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_lesson: {
        Args: {
          p_lesson_id: string
        }
        Returns: {
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          credits_cost: number
          duration_minutes: number
          id: string
          notes: string | null
          rating: number | null
          room_id: string | null
          scheduled_at: string
          started_at: string | null
          status: string
          student_id: string
          subject: string
          topic: string | null
          tutor_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "lessons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      lesson_credit_cost: {
        Args: {
          _tutor_id: string
          _duration: number
        }
        Returns: number
      }
      lesson_price_eur: {
        Args: {
          _tutor_id: string
          _duration: number
        }
        Returns: number
      }
      referral_code_for: {
        Args: {
          _user_id: string
        }
        Returns: string
      }
      request_withdrawal: {
        Args: {
          p_amount: number
        }
        Returns: {
          amount: number
          created_at: string
          id: string
          status: string
          stripe_transfer_id: string | null
          tutor_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawal_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_lesson: {
        Args: {
          p_lesson_id: string
        }
        Returns: {
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          credits_cost: number
          duration_minutes: number
          id: string
          notes: string | null
          rating: number | null
          room_id: string | null
          scheduled_at: string
          started_at: string | null
          status: string
          student_id: string
          subject: string
          topic: string | null
          tutor_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "lessons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_review: {
        Args: {
          p_lesson_id: string
          p_rating: number
          p_comment: string
        }
        Returns: {
          comment: string | null
          created_at: string
          id: string
          lesson_id: string | null
          rating: number
          student_id: string
          tutor_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reviews"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      tutor_available_balance: {
        Args: {
          _tutor_id: string
        }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "student" | "tutor"
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
      app_role: ["admin", "student", "tutor"],
    },
  },
} as const
