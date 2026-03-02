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
      bls_competency_signoffs: {
        Row: {
          action_plan: string | null
          aed_use: boolean | null
          aed_use_comments: string | null
          assessed_at: string | null
          assessor_id: string
          assessor_notes: string | null
          attempt_number: number
          breathing_check: boolean | null
          breathing_check_comments: string | null
          chest_compressions: boolean | null
          chest_compressions_comments: string | null
          choking_response: boolean | null
          choking_response_comments: string | null
          course_id: string
          created_at: string | null
          handover_reporting: boolean | null
          handover_reporting_comments: string | null
          id: string
          location: string | null
          outcome: string | null
          reassessment_date: string | null
          recovery_position: boolean | null
          recovery_position_comments: string | null
          rescue_breaths: boolean | null
          rescue_breaths_comments: string | null
          scene_safety: boolean | null
          scene_safety_comments: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_plan?: string | null
          aed_use?: boolean | null
          aed_use_comments?: string | null
          assessed_at?: string | null
          assessor_id: string
          assessor_notes?: string | null
          attempt_number?: number
          breathing_check?: boolean | null
          breathing_check_comments?: string | null
          chest_compressions?: boolean | null
          chest_compressions_comments?: string | null
          choking_response?: boolean | null
          choking_response_comments?: string | null
          course_id: string
          created_at?: string | null
          handover_reporting?: boolean | null
          handover_reporting_comments?: string | null
          id?: string
          location?: string | null
          outcome?: string | null
          reassessment_date?: string | null
          recovery_position?: boolean | null
          recovery_position_comments?: string | null
          rescue_breaths?: boolean | null
          rescue_breaths_comments?: string | null
          scene_safety?: boolean | null
          scene_safety_comments?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_plan?: string | null
          aed_use?: boolean | null
          aed_use_comments?: string | null
          assessed_at?: string | null
          assessor_id?: string
          assessor_notes?: string | null
          attempt_number?: number
          breathing_check?: boolean | null
          breathing_check_comments?: string | null
          chest_compressions?: boolean | null
          chest_compressions_comments?: string | null
          choking_response?: boolean | null
          choking_response_comments?: string | null
          course_id?: string
          created_at?: string | null
          handover_reporting?: boolean | null
          handover_reporting_comments?: string | null
          id?: string
          location?: string | null
          outcome?: string | null
          reassessment_date?: string | null
          recovery_position?: boolean | null
          recovery_position_comments?: string | null
          rescue_breaths?: boolean | null
          rescue_breaths_comments?: string | null
          scene_safety?: boolean | null
          scene_safety_comments?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bls_competency_signoffs_assessor_id_fkey"
            columns: ["assessor_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bls_competency_signoffs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
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
      career_applications: {
        Row: {
          created_at: string | null
          cv_file_url: string | null
          email: string
          full_name: string
          id: string
          message: string | null
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role_applied_for: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          cv_file_url?: string | null
          email: string
          full_name: string
          id?: string
          message?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_applied_for: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          cv_file_url?: string | null
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_applied_for?: string
          status?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          course_id: string
          created_at: string
          id: string
          offering_id: string
          participants_count: number
          regulated_certification: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          offering_id: string
          participants_count?: number
          regulated_certification?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          offering_id?: string
          participants_count?: number
          regulated_certification?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_offering_id_fkey"
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
          certificate_type: string | null
          competency_signed_at: string | null
          competency_signed_by: string | null
          course_id: string
          id: string
          issued_at: string
          pdf_path: string | null
          user_id: string
        }
        Insert: {
          certificate_number: string
          certificate_type?: string | null
          competency_signed_at?: string | null
          competency_signed_by?: string | null
          course_id: string
          id?: string
          issued_at?: string
          pdf_path?: string | null
          user_id: string
        }
        Update: {
          certificate_number?: string
          certificate_type?: string | null
          competency_signed_at?: string | null
          competency_signed_by?: string | null
          course_id?: string
          id?: string
          issued_at?: string
          pdf_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_competency_signed_by_fkey"
            columns: ["competency_signed_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_signoffs: {
        Row: {
          assessor_id: string
          assessor_notes: string | null
          bolus_method: boolean | null
          course_id: string
          created_at: string | null
          documentation_standard: boolean | null
          flushing_medication: boolean | null
          id: string
          outcome: string | null
          pump_setup: boolean | null
          routine_care: boolean | null
          signed_off_at: string | null
          troubleshooting: boolean | null
          tube_identification: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assessor_id: string
          assessor_notes?: string | null
          bolus_method?: boolean | null
          course_id: string
          created_at?: string | null
          documentation_standard?: boolean | null
          flushing_medication?: boolean | null
          id?: string
          outcome?: string | null
          pump_setup?: boolean | null
          routine_care?: boolean | null
          signed_off_at?: string | null
          troubleshooting?: boolean | null
          tube_identification?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assessor_id?: string
          assessor_notes?: string | null
          bolus_method?: boolean | null
          course_id?: string
          created_at?: string | null
          documentation_standard?: boolean | null
          flushing_medication?: boolean | null
          id?: string
          outcome?: string | null
          pump_setup?: boolean | null
          routine_care?: boolean | null
          signed_off_at?: string | null
          troubleshooting?: boolean | null
          tube_identification?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competency_signoffs_assessor_id_fkey"
            columns: ["assessor_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competency_signoffs_course_id_fkey"
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
      course_trainers: {
        Row: {
          can_sign_off: boolean | null
          course_id: string
          created_at: string | null
          id: string
          staff_id: string
        }
        Insert: {
          can_sign_off?: boolean | null
          course_id: string
          created_at?: string | null
          id?: string
          staff_id: string
        }
        Update: {
          can_sign_off?: boolean | null
          course_id?: string
          created_at?: string | null
          id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_trainers_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_trainers_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          assessment_details: string | null
          available_delivery_types: string[] | null
          category: string
          certificate_details: string | null
          certificate_expiry_months: number | null
          cpd_certified: boolean | null
          cpd_eligible: boolean | null
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
          is_public_purchase: boolean | null
          is_published: boolean | null
          language: string | null
          last_updated: string | null
          learning_outcomes: Json | null
          level: string | null
          overview: string | null
          pass_mark: number | null
          practical_details: string | null
          prerequisite_course_id: string | null
          prerequisite_required: boolean
          price: number | null
          price_face_to_face: number | null
          price_group: number | null
          price_online: number | null
          regulated_cert_available: boolean | null
          regulated_cert_fee: number | null
          requirements: Json | null
          requires_practical_signoff: boolean | null
          scope_notes: string | null
          slug: string | null
          status: string | null
          subtitle: string | null
          target_audience: Json | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assessment_details?: string | null
          available_delivery_types?: string[] | null
          category: string
          certificate_details?: string | null
          certificate_expiry_months?: number | null
          cpd_certified?: boolean | null
          cpd_eligible?: boolean | null
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
          is_public_purchase?: boolean | null
          is_published?: boolean | null
          language?: string | null
          last_updated?: string | null
          learning_outcomes?: Json | null
          level?: string | null
          overview?: string | null
          pass_mark?: number | null
          practical_details?: string | null
          prerequisite_course_id?: string | null
          prerequisite_required?: boolean
          price?: number | null
          price_face_to_face?: number | null
          price_group?: number | null
          price_online?: number | null
          regulated_cert_available?: boolean | null
          regulated_cert_fee?: number | null
          requirements?: Json | null
          requires_practical_signoff?: boolean | null
          scope_notes?: string | null
          slug?: string | null
          status?: string | null
          subtitle?: string | null
          target_audience?: Json | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assessment_details?: string | null
          available_delivery_types?: string[] | null
          category?: string
          certificate_details?: string | null
          certificate_expiry_months?: number | null
          cpd_certified?: boolean | null
          cpd_eligible?: boolean | null
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
          is_public_purchase?: boolean | null
          is_published?: boolean | null
          language?: string | null
          last_updated?: string | null
          learning_outcomes?: Json | null
          level?: string | null
          overview?: string | null
          pass_mark?: number | null
          practical_details?: string | null
          prerequisite_course_id?: string | null
          prerequisite_required?: boolean
          price?: number | null
          price_face_to_face?: number | null
          price_group?: number | null
          price_online?: number | null
          regulated_cert_available?: boolean | null
          regulated_cert_fee?: number | null
          requirements?: Json | null
          requires_practical_signoff?: boolean | null
          scope_notes?: string | null
          slug?: string | null
          status?: string | null
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
          {
            foreignKeyName: "courses_prerequisite_course_id_fkey"
            columns: ["prerequisite_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
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
      lesson_resources: {
        Row: {
          created_at: string | null
          file_type: string
          file_url: string
          id: string
          lesson_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          file_type: string
          file_url: string
          id?: string
          lesson_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          file_type?: string
          file_url?: string
          id?: string
          lesson_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_steps: {
        Row: {
          created_at: string | null
          id: string
          instruction: string | null
          lesson_id: string
          order_index: number
          safety_note: string | null
          step_title: string
          what_to_record: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instruction?: string | null
          lesson_id: string
          order_index?: number
          safety_note?: string | null
          step_title: string
          what_to_record?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instruction?: string | null
          lesson_id?: string
          order_index?: number
          safety_note?: string | null
          step_title?: string
          what_to_record?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_steps_lesson_id_fkey"
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
          scorm_package_id: string | null
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
          scorm_package_id?: string | null
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
          scorm_package_id?: string | null
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
          {
            foreignKeyName: "lessons_scorm_package_id_fkey"
            columns: ["scorm_package_id"]
            isOneToOne: false
            referencedRelation: "scorm_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_competency_signoffs: {
        Row: {
          action_plan: string | null
          admin_process: boolean | null
          admin_process_comments: string | null
          assessed_at: string | null
          assessor_id: string
          assessor_notes: string | null
          attempt_number: number | null
          communication: boolean | null
          communication_comments: string | null
          course_id: string
          created_at: string | null
          id: string
          incident_escalation: boolean | null
          incident_escalation_comments: string | null
          location: string | null
          mar_documentation: boolean | null
          mar_documentation_comments: string | null
          outcome: string | null
          pre_admin_checks: boolean | null
          pre_admin_checks_comments: string | null
          prn_handling: boolean | null
          prn_handling_comments: string | null
          reassessment_date: string | null
          refusal_handling: boolean | null
          refusal_handling_comments: string | null
          storage_awareness: boolean | null
          storage_awareness_comments: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_plan?: string | null
          admin_process?: boolean | null
          admin_process_comments?: string | null
          assessed_at?: string | null
          assessor_id: string
          assessor_notes?: string | null
          attempt_number?: number | null
          communication?: boolean | null
          communication_comments?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          incident_escalation?: boolean | null
          incident_escalation_comments?: string | null
          location?: string | null
          mar_documentation?: boolean | null
          mar_documentation_comments?: string | null
          outcome?: string | null
          pre_admin_checks?: boolean | null
          pre_admin_checks_comments?: string | null
          prn_handling?: boolean | null
          prn_handling_comments?: string | null
          reassessment_date?: string | null
          refusal_handling?: boolean | null
          refusal_handling_comments?: string | null
          storage_awareness?: boolean | null
          storage_awareness_comments?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_plan?: string | null
          admin_process?: boolean | null
          admin_process_comments?: string | null
          assessed_at?: string | null
          assessor_id?: string
          assessor_notes?: string | null
          attempt_number?: number | null
          communication?: boolean | null
          communication_comments?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          incident_escalation?: boolean | null
          incident_escalation_comments?: string | null
          location?: string | null
          mar_documentation?: boolean | null
          mar_documentation_comments?: string | null
          outcome?: string | null
          pre_admin_checks?: boolean | null
          pre_admin_checks_comments?: string | null
          prn_handling?: boolean | null
          prn_handling_comments?: string | null
          reassessment_date?: string | null
          refusal_handling?: boolean | null
          refusal_handling_comments?: string | null
          storage_awareness?: boolean | null
          storage_awareness_comments?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_competency_signoffs_assessor_id_fkey"
            columns: ["assessor_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_competency_signoffs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
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
      orders: {
        Row: {
          amount_total: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          plan: string | null
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_total: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          plan?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_total?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          plan?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          failure_message: string | null
          id: string
          order_id: string | null
          payment_method_type: string | null
          receipt_url: string | null
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          failure_message?: string | null
          id?: string
          order_id?: string | null
          payment_method_type?: string | null
          receipt_url?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          failure_message?: string | null
          id?: string
          order_id?: string | null
          payment_method_type?: string | null
          receipt_url?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          section: string
          settings: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          section: string
          settings?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          section?: string
          settings?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
          calendar_last_error: string | null
          calendar_sync_status: string | null
          course_id: string
          created_at: string
          id: string
          last_synced_at: string | null
          location: string | null
          max_attendees: number | null
          notes: string | null
          outlook_calendar_owner: string | null
          outlook_event_id: string | null
          session_date: string | null
          trainer_id: string | null
        }
        Insert: {
          calendar_last_error?: string | null
          calendar_sync_status?: string | null
          course_id: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          location?: string | null
          max_attendees?: number | null
          notes?: string | null
          outlook_calendar_owner?: string | null
          outlook_event_id?: string | null
          session_date?: string | null
          trainer_id?: string | null
        }
        Update: {
          calendar_last_error?: string | null
          calendar_sync_status?: string | null
          course_id?: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          location?: string | null
          max_attendees?: number | null
          notes?: string | null
          outlook_calendar_owner?: string | null
          outlook_event_id?: string | null
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
          explanation: string | null
          id: string
          options: Json
          order_index: number
          question: string
          question_type: string | null
          quiz_id: string
        }
        Insert: {
          correct_answer: number
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          order_index?: number
          question: string
          question_type?: string | null
          quiz_id: string
        }
        Update: {
          correct_answer?: number
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          order_index?: number
          question?: string
          question_type?: string | null
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
          attempts_allowed: number | null
          created_at: string
          id: string
          lesson_id: string
          passing_score: number | null
          title: string
        }
        Insert: {
          attempts_allowed?: number | null
          created_at?: string
          id?: string
          lesson_id: string
          passing_score?: number | null
          title: string
        }
        Update: {
          attempts_allowed?: number | null
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
      respiratory_competency_signoffs: {
        Row: {
          action_plan: string | null
          assessed_at: string | null
          assessor_id: string
          assessor_notes: string | null
          attempt_number: number
          course_id: string
          created_at: string | null
          documentation_handover: boolean | null
          documentation_handover_comments: string | null
          equipment_checks: boolean | null
          equipment_checks_comments: string | null
          id: string
          infection_prevention: boolean | null
          infection_prevention_comments: string | null
          location: string | null
          oral_suction: boolean | null
          oral_suction_comments: string | null
          outcome: string | null
          oxygen_safety: boolean | null
          oxygen_safety_comments: string | null
          oxygen_support: boolean | null
          oxygen_support_comments: string | null
          pulse_oximetry: boolean | null
          pulse_oximetry_comments: string | null
          reassessment_date: string | null
          respiratory_red_flags: boolean | null
          respiratory_red_flags_comments: string | null
          scope_boundaries: boolean | null
          scope_boundaries_comments: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_plan?: string | null
          assessed_at?: string | null
          assessor_id: string
          assessor_notes?: string | null
          attempt_number?: number
          course_id: string
          created_at?: string | null
          documentation_handover?: boolean | null
          documentation_handover_comments?: string | null
          equipment_checks?: boolean | null
          equipment_checks_comments?: string | null
          id?: string
          infection_prevention?: boolean | null
          infection_prevention_comments?: string | null
          location?: string | null
          oral_suction?: boolean | null
          oral_suction_comments?: string | null
          outcome?: string | null
          oxygen_safety?: boolean | null
          oxygen_safety_comments?: string | null
          oxygen_support?: boolean | null
          oxygen_support_comments?: string | null
          pulse_oximetry?: boolean | null
          pulse_oximetry_comments?: string | null
          reassessment_date?: string | null
          respiratory_red_flags?: boolean | null
          respiratory_red_flags_comments?: string | null
          scope_boundaries?: boolean | null
          scope_boundaries_comments?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_plan?: string | null
          assessed_at?: string | null
          assessor_id?: string
          assessor_notes?: string | null
          attempt_number?: number
          course_id?: string
          created_at?: string | null
          documentation_handover?: boolean | null
          documentation_handover_comments?: string | null
          equipment_checks?: boolean | null
          equipment_checks_comments?: string | null
          id?: string
          infection_prevention?: boolean | null
          infection_prevention_comments?: string | null
          location?: string | null
          oral_suction?: boolean | null
          oral_suction_comments?: string | null
          outcome?: string | null
          oxygen_safety?: boolean | null
          oxygen_safety_comments?: string | null
          oxygen_support?: boolean | null
          oxygen_support_comments?: string | null
          pulse_oximetry?: boolean | null
          pulse_oximetry_comments?: string | null
          reassessment_date?: string | null
          respiratory_red_flags?: boolean | null
          respiratory_red_flags_comments?: string | null
          scope_boundaries?: boolean | null
          scope_boundaries_comments?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "respiratory_competency_signoffs_assessor_id_fkey"
            columns: ["assessor_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respiratory_competency_signoffs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      scorm_packages: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          launch_path: string
          manifest_json: Json | null
          storage_extracted_path: string
          storage_zip_path: string
          title: string
          version: Database["public"]["Enums"]["scorm_version"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          launch_path: string
          manifest_json?: Json | null
          storage_extracted_path: string
          storage_zip_path: string
          title: string
          version?: Database["public"]["Enums"]["scorm_version"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          launch_path?: string
          manifest_json?: Json | null
          storage_extracted_path?: string
          storage_zip_path?: string
          title?: string
          version?: Database["public"]["Enums"]["scorm_version"]
        }
        Relationships: []
      }
      scorm_registrations: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          last_commit_at: string | null
          lesson_id: string | null
          lesson_location: string | null
          score: number | null
          scorm_package_id: string
          status: Database["public"]["Enums"]["scorm_status"]
          suspend_data: string | null
          total_time_seconds: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          last_commit_at?: string | null
          lesson_id?: string | null
          lesson_location?: string | null
          score?: number | null
          scorm_package_id: string
          status?: Database["public"]["Enums"]["scorm_status"]
          suspend_data?: string | null
          total_time_seconds?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          last_commit_at?: string | null
          lesson_id?: string | null
          lesson_location?: string | null
          score?: number | null
          scorm_package_id?: string
          status?: Database["public"]["Enums"]["scorm_status"]
          suspend_data?: string | null
          total_time_seconds?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scorm_registrations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorm_registrations_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorm_registrations_scorm_package_id_fkey"
            columns: ["scorm_package_id"]
            isOneToOne: false
            referencedRelation: "scorm_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      scorm_runtime_kv: {
        Row: {
          id: string
          key: string
          registration_id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          registration_id: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          registration_id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorm_runtime_kv_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "scorm_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_audit_log: {
        Row: {
          change_summary: string | null
          changed_at: string
          changed_by: string | null
          id: string
          new_value: Json | null
          previous_value: Json | null
          section: string
        }
        Insert: {
          change_summary?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          section: string
        }
        Update: {
          change_summary?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          section?: string
        }
        Relationships: []
      }
      staff_profiles: {
        Row: {
          can_sign_off_competency: boolean | null
          created_at: string | null
          delivery_types: string[] | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          job_title: string | null
          notes: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          can_sign_off_competency?: boolean | null
          created_at?: string | null
          delivery_types?: string[] | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          can_sign_off_competency?: boolean | null
          created_at?: string | null
          delivery_types?: string[] | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      stripe_webhook_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json | null
          processed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          status?: string
        }
        Relationships: []
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
      is_ops_training_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "learner"
        | "trainer"
        | "super_admin"
        | "ops_training_admin"
      booking_offering_type:
        | "individual_online"
        | "individual_face_to_face"
        | "individual_blended"
        | "group_face_to_face"
      booking_status: "draft" | "pending_payment" | "confirmed" | "cancelled"
      booking_type: "individual" | "group"
      course_delivery_type:
        | "online_self_paced"
        | "live_online"
        | "in_person_practical"
        | "blended"
      scorm_status:
        | "not_attempted"
        | "in_progress"
        | "completed"
        | "passed"
        | "failed"
      scorm_version: "1.2" | "2004"
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
      app_role: [
        "admin",
        "learner",
        "trainer",
        "super_admin",
        "ops_training_admin",
      ],
      booking_offering_type: [
        "individual_online",
        "individual_face_to_face",
        "individual_blended",
        "group_face_to_face",
      ],
      booking_status: ["draft", "pending_payment", "confirmed", "cancelled"],
      booking_type: ["individual", "group"],
      course_delivery_type: [
        "online_self_paced",
        "live_online",
        "in_person_practical",
        "blended",
      ],
      scorm_status: [
        "not_attempted",
        "in_progress",
        "completed",
        "passed",
        "failed",
      ],
      scorm_version: ["1.2", "2004"],
    },
  },
} as const
