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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      community_messages: {
        Row: {
          author: string
          content: string
          created_at: string | null
          downvotes: number | null
          id: string
          msg_type: string | null
          post_type: string | null
          upvotes: number | null
        }
        Insert: {
          author: string
          content: string
          created_at?: string | null
          downvotes?: number | null
          id?: string
          msg_type?: string | null
          post_type?: string | null
          upvotes?: number | null
        }
        Update: {
          author?: string
          content?: string
          created_at?: string | null
          downvotes?: number | null
          id?: string
          msg_type?: string | null
          post_type?: string | null
          upvotes?: number | null
        }
        Relationships: []
      }
      mistake_book: {
        Row: {
          added_at: string
          correct_answer: string
          id: string
          mastered: boolean | null
          mistake_types: string[] | null
          notes: string | null
          question: Json
          question_id: string
          reattempt_count: number | null
          selected_answer: string | null
          test_id: string | null
          test_name: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          correct_answer: string
          id?: string
          mastered?: boolean | null
          mistake_types?: string[] | null
          notes?: string | null
          question: Json
          question_id: string
          reattempt_count?: number | null
          selected_answer?: string | null
          test_id?: string | null
          test_name?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          correct_answer?: string
          id?: string
          mastered?: boolean | null
          mistake_types?: string[] | null
          notes?: string | null
          question?: Json
          question_id?: string
          reattempt_count?: number | null
          selected_answer?: string | null
          test_id?: string | null
          test_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mistake_book_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_tests: {
        Row: {
          attempts_count: number
          created_at: string
          duration: number
          id: string
          name: string
          owner_id: string | null
          owner_name: string | null
          password: string | null
          question_count: number
          subjects: string[]
          test_data: Json
          test_id: string
          total_marks: number
        }
        Insert: {
          attempts_count?: number
          created_at?: string
          duration?: number
          id?: string
          name: string
          owner_id?: string | null
          owner_name?: string | null
          password?: string | null
          question_count?: number
          subjects?: string[]
          test_data: Json
          test_id: string
          total_marks?: number
        }
        Update: {
          attempts_count?: number
          created_at?: string
          duration?: number
          id?: string
          name?: string
          owner_id?: string | null
          owner_name?: string | null
          password?: string | null
          question_count?: number
          subjects?: string[]
          test_data?: Json
          test_id?: string
          total_marks?: number
        }
        Relationships: []
      }
      shared_tests: {
        Row: {
          created_at: string | null
          creator_name: string | null
          id: string
          share_code: string
          test_data: Json
        }
        Insert: {
          created_at?: string | null
          creator_name?: string | null
          id?: string
          share_code: string
          test_data: Json
        }
        Update: {
          created_at?: string | null
          creator_name?: string | null
          id?: string
          share_code?: string
          test_data?: Json
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          created_at: string
          id: string
          plan_data: Json
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_data: Json
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_data?: Json
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      test_attempts: {
        Row: {
          attempts: Json
          completed_at: string | null
          id: string
          result: Json | null
          started_at: string
          test_id: string
          user_id: string
        }
        Insert: {
          attempts?: Json
          completed_at?: string | null
          id?: string
          result?: Json | null
          started_at?: string
          test_id: string
          user_id: string
        }
        Update: {
          attempts?: Json
          completed_at?: string | null
          id?: string
          result?: Json | null
          started_at?: string
          test_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_creation_usage: {
        Row: {
          ai_calls: number
          created_at: string
          display_name: string | null
          id: string
          quota_identity: string
          test_id: string | null
          test_name: string | null
          user_key: string
        }
        Insert: {
          ai_calls?: number
          created_at?: string
          display_name?: string | null
          id?: string
          quota_identity: string
          test_id?: string | null
          test_name?: string | null
          user_key: string
        }
        Update: {
          ai_calls?: number
          created_at?: string
          display_name?: string | null
          id?: string
          quota_identity?: string
          test_id?: string | null
          test_name?: string | null
          user_key?: string
        }
        Relationships: []
      }
      test_leaderboard: {
        Row: {
          accuracy: number
          display_name: string
          id: string
          max_score: number
          score: number
          submitted_at: string
          test_id: string
          time_taken: number
          user_key: string
        }
        Insert: {
          accuracy?: number
          display_name: string
          id?: string
          max_score?: number
          score?: number
          submitted_at?: string
          test_id: string
          time_taken?: number
          user_key: string
        }
        Update: {
          accuracy?: number
          display_name?: string
          id?: string
          max_score?: number
          score?: number
          submitted_at?: string
          test_id?: string
          time_taken?: number
          user_key?: string
        }
        Relationships: []
      }
      tests: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          name: string
          negative_marking: number
          positive_marking: number
          questions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          name: string
          negative_marking?: number
          positive_marking?: number
          questions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          name?: string
          negative_marking?: number
          positive_marking?: number
          questions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_tests_safe: {
        Row: {
          attempts_count: number | null
          created_at: string | null
          duration: number | null
          has_password: boolean | null
          id: string | null
          name: string | null
          owner_id: string | null
          owner_name: string | null
          question_count: number | null
          subjects: string[] | null
          test_id: string | null
          total_marks: number | null
        }
        Insert: {
          attempts_count?: number | null
          created_at?: string | null
          duration?: number | null
          has_password?: never
          id?: string | null
          name?: string | null
          owner_id?: string | null
          owner_name?: string | null
          question_count?: number | null
          subjects?: string[] | null
          test_id?: string | null
          total_marks?: number | null
        }
        Update: {
          attempts_count?: number | null
          created_at?: string | null
          duration?: number | null
          has_password?: never
          id?: string | null
          name?: string | null
          owner_id?: string | null
          owner_name?: string | null
          question_count?: number | null
          subjects?: string[] | null
          test_id?: string | null
          total_marks?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_request_user_key: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
