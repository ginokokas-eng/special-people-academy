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
      booking_participants: {
        Row: {
          booking_id: string
          created_at: string | null
          email: string
          full_name: string
          id: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_participants_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_type: Database["public"]["Enums"]["booking_type"]
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          course_id: string
          created_at: string | null
          id: string
          notes: string | null
          offering_id: string
          organization_name: string | null
          participants_count: number
          regulated_certification: boolean | null
          regulated_fee_per_person_gbp: number | null
          regulated_fee_total_gbp: number | null
          status: Database["public"]["Enums"]["booking_status"] | null
          subtotal_gbp: number
          total_gbp: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          booking_type: Database["public"]["Enums"]["booking_type"]
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          offering_id: string
          organization_name?: string | null
          participants_count?: number
          regulated_certification?: boolean | null
          regulated_fee_per_person_gbp?: number | null
          regulated_fee_total_gbp?: number | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          subtotal_gbp: number
          total_gbp: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          booking_type?: Database["public"]["Enums"]["booking_type"]
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          offering_id?: string
          organization_name?: string | null
          participants_count?: number
          regulated_certification?: boolean | null
          regulated_fee_per_person_gbp?: number | null
          regulated_fee_total_gbp?: number | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          subtotal_gbp?: number
          total_gbp?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          course_id: string
          id: string
          issued_at: string
          pdf_path: string | null
          user_id: string
        }
        Insert: {
          certificate_number: string
          course_id: string
          id?: string
          issued_at?: string
          pdf_path?: string | null
          user_id: string
        }
        Update: {
          certificate_number?: string
          course_id?: string
          id?: string
          issued_at?: string
          pdf_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_offerings: {
        Row: {
          active: boolean | null
          base_price_gbp: number
          course_id: string
          created_at: string | null
          id: string
          max_participants: number | null
          offering_type: Database["public"]["Enums"]["booking_offering_type"]
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          base_price_gbp: number
          course_id: string
          created_at?: string | null
          id?: string
          max_participants?: number | null
          offering_type: Database["public"]["Enums"]["booking_offering_type"]
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          base_price_gbp?: number
          course_id?: string
          created_at?: string | null
          id?: string
          max_participants?: number | null
          offering_type?: Database["public"]["Enums"]["booking_offering_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_offerings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_resources: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          resource_type: string
          title: string
          url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          resource_type: string
          title: string
          url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          resource_type?: string
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_resources_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_approved: boolean | null
          rating: number
          review_text: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          rating: number
          review_text?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          rating?: number
          review_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          assessment_details: string | null
          category: string
          certificate_details: string | null
          cpd_hours: number | null
          created_at: string
          created_by: string | null
          delivery_type: string | null
          description: string | null
          duration_minutes: number | null
          faqs: Json | null
          featured_rank: number | null
          group_max_participants: number | null
          has_certificate: boolean | null
          id: string
          instructor_id: string | null
          is_featured: boolean | null
          is_internal: boolean | null
          is_mandatory: boolean | null
          is_published: boolean | null
          language: string | null
          last_updated: string | null
          learning_outcomes: Json | null
          level: string | null
          overview: string | null
          pass_mark: number | null
          practical_details: string | null
          price: number | null
          price_face_to_face: number | null
          price_group: number | null
          price_online: number | null
          regulated_cert_available: boolean | null
          regulated_cert_fee: number | null
          requirements: Json | null
          requires_practical_signoff: boolean | null
          subtitle: string | null
          target_audience: Json | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assessment_details?: string | null
          category: string
          certificate_details?: string | null
          cpd_hours?: number | null
          created_at?: string
          created_by?: string | null
          delivery_type?: string | null
          description?: string | null
          duration_minutes?: number | null
          faqs?: Json | null
          featured_rank?: number | null
          group_max_participants?: number | null
          has_certificate?: boolean | null
          id?: string
          instructor_id?: string | null
          is_featured?: boolean | null
          is_internal?: boolean | null
          is_mandatory?: boolean | null
          is_published?: boolean | null
          language?: string | null
          last_updated?: string | null
          learning_outcomes?: Json | null
          level?: string | null
          overview?: string | null
          pass_mark?: number | null
          practical_details?: string | null
          price?: number | null
          price_face_to_face?: number | null
          price_group?: number | null
          price_online?: number | null
          regulated_cert_available?: boolean | null
          regulated_cert_fee?: number | null
          requirements?: Json | null
          requires_practical_signoff?: boolean | null
          subtitle?: string | null
          target_audience?: Json | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assessment_details?: string | null
          category?: string
          certificate_details?: string | null
          cpd_hours?: number | null
          created_at?: string
          created_by?: string | null
          delivery_type?: string | null
          description?: string | null
          duration_minutes?: number | null
          faqs?: Json | null
          featured_rank?: number | null
          group_max_participants?: number | null
          has_certificate?: boolean | null
          id?: string
          instructor_id?: string | null
          is_featured?: boolean | null
          is_internal?: boolean | null
          is_mandatory?: boolean | null
          is_published?: boolean | null
          language?: string | null
          last_updated?: string | null
          learning_outcomes?: Json | null
          level?: string | null
          overview?: string | null
          pass_mark?: number | null
          practical_details?: string | null
          price?: number | null
          price_face_to_face?: number | null
          price_group?: number | null
          price_online?: number | null
          regulated_cert_available?: boolean | null
          regulated_cert_fee?: number | null
          requirements?: Json | null
          requires_practical_signoff?: boolean | null
          subtitle?: string | null
          target_audience?: Json | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          user_id?: string
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
      instructors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          credentials: string | null
          full_name: string
          id: string
          job_title: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          credentials?: string | null
          full_name: string
          id?: string
          job_title?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          credentials?: string | null
          full_name?: string
          id?: string
          job_title?: string | null
        }
        Relationships: []
      }
      learner_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          related_course_id: string | null
          related_session_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          related_course_id?: string | null
          related_session_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          related_course_id?: string | null
          related_session_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_notifications_related_course_id_fkey"
            columns: ["related_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_notifications_related_session_id_fkey"
            columns: ["related_session_id"]
            isOneToOne: false
            referencedRelation: "practical_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          lesson_type: string | null
          module_id: string | null
          order_index: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lesson_type?: string | null
          module_id?: string | null
          order_index?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lesson_type?: string | null
          module_id?: string | null
          order_index?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      practical_attendance: {
        Row: {
          attended: boolean | null
          competency_outcome: string | null
          created_at: string
          id: string
          marked_at: string | null
          marked_by: string | null
          notes: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          attended?: boolean | null
          competency_outcome?: string | null
          created_at?: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          attended?: boolean | null
          competency_outcome?: string | null
          created_at?: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practical_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practical_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      practical_sessions: {
        Row: {
          course_id: string
          created_at: string
          id: string
          location: string | null
          max_attendees: number | null
          notes: string | null
          session_date: string | null
          trainer_id: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          location?: string | null
          max_attendees?: number | null
          notes?: string | null
          session_date?: string | null
          trainer_id?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          location?: string | null
          max_attendees?: number | null
          notes?: string | null
          session_date?: string | null
          trainer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practical_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          job_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          attempted_at: string
          id: string
          passed: boolean
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          attempted_at?: string
          id?: string
          passed: boolean
          quiz_id: string
          score: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          attempted_at?: string
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: number
          created_at: string
          id: string
          options: Json
          order_index: number
          question: string
          quiz_id: string
        }
        Insert: {
          correct_answer: number
          created_at?: string
          id?: string
          options?: Json
          order_index?: number
          question: string
          quiz_id: string
        }
        Update: {
          correct_answer?: number
          created_at?: string
          id?: string
          options?: Json
          order_index?: number
          question?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          passing_score: number | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          passing_score?: number | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          passing_score?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
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
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
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
      app_role: "admin" | "learner" | "trainer"
      booking_offering_type:
        | "individual_online"
        | "individual_face_to_face"
        | "individual_blended"
        | "group_face_to_face"
      booking_status: "draft" | "pending_payment" | "confirmed" | "cancelled"
      booking_type: "individual" | "group"
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
      app_role: ["admin", "learner", "trainer"],
      booking_offering_type: [
        "individual_online",
        "individual_face_to_face",
        "individual_blended",
        "group_face_to_face",
      ],
      booking_status: ["draft", "pending_payment", "confirmed", "cancelled"],
      booking_type: ["individual", "group"],
    },
  },
} as const
