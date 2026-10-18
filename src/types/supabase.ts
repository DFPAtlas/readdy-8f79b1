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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      app_versions: {
        Row: {
          created_at: string | null
          id: string
          min_required: boolean | null
          release_notes: string | null
          released_at: string | null
          version: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          min_required?: boolean | null
          release_notes?: string | null
          released_at?: string | null
          version: string
        }
        Update: {
          created_at?: string | null
          id?: string
          min_required?: boolean | null
          release_notes?: string | null
          released_at?: string | null
          version?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          change_summary: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          new_status: string | null
          note: string | null
          old_status: string | null
          organisation_id: string
          reference: string | null
          source: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          change_summary?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          new_status?: string | null
          note?: string | null
          old_status?: string | null
          organisation_id: string
          reference?: string | null
          source?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          change_summary?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_status?: string | null
          note?: string | null
          old_status?: string | null
          organisation_id?: string
          reference?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_checkout_attempts: {
        Row: {
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          cancel_url: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string
          organisation_id: string
          plan_id: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_price_id: string | null
          success_url: string
          user_id: string
        }
        Insert: {
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          cancel_url: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          organisation_id: string
          plan_id?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_price_id?: string | null
          success_url: string
          user_id: string
        }
        Update: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          cancel_url?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          organisation_id?: string
          plan_id?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_price_id?: string | null
          success_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_checkout_attempts_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_checkout_attempts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_discount_references: {
        Row: {
          applied_by: string | null
          approval_reason: string | null
          created_at: string
          discount_name: string | null
          discount_type: string | null
          id: string
          organisation_id: string
          stripe_coupon_id: string | null
          stripe_promotion_code_id: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applied_by?: string | null
          approval_reason?: string | null
          created_at?: string
          discount_name?: string | null
          discount_type?: string | null
          id?: string
          organisation_id: string
          stripe_coupon_id?: string | null
          stripe_promotion_code_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applied_by?: string | null
          approval_reason?: string | null
          created_at?: string
          discount_name?: string | null
          discount_type?: string | null
          id?: string
          organisation_id?: string
          stripe_coupon_id?: string | null
          stripe_promotion_code_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_discount_references_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_features: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_name: string
          feature_key: string
          id: string
          sort_order: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_name: string
          feature_key: string
          id?: string
          sort_order?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_name?: string
          feature_key?: string
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      billing_invoices: {
        Row: {
          created_at: string
          currency: string
          hosted_invoice_url: string | null
          id: string
          invoice_number: string | null
          invoice_pdf_url: string | null
          invoice_period_end: string | null
          invoice_period_start: string | null
          organisation_id: string
          paid_at: string | null
          status: string
          stripe_customer_id: string
          stripe_invoice_id: string
          stripe_subscription_id: string | null
          subtotal_amount: number
          tax_amount: number
          tax_rate: number | null
          total_amount: number
        }
        Insert: {
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_number?: string | null
          invoice_pdf_url?: string | null
          invoice_period_end?: string | null
          invoice_period_start?: string | null
          organisation_id: string
          paid_at?: string | null
          status: string
          stripe_customer_id: string
          stripe_invoice_id: string
          stripe_subscription_id?: string | null
          subtotal_amount?: number
          tax_amount?: number
          tax_rate?: number | null
          total_amount?: number
        }
        Update: {
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_number?: string | null
          invoice_pdf_url?: string | null
          invoice_period_end?: string | null
          invoice_period_start?: string | null
          organisation_id?: string
          paid_at?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_invoice_id?: string
          stripe_subscription_id?: string | null
          subtotal_amount?: number
          tax_amount?: number
          tax_rate?: number | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plan_entitlements: {
        Row: {
          created_at: string
          feature_id: string
          id: string
          is_enabled: boolean
          limit_unit: string | null
          limit_value: number | null
          plan_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature_id: string
          id?: string
          is_enabled?: boolean
          limit_unit?: string | null
          limit_value?: number | null
          plan_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature_id?: string
          id?: string
          is_enabled?: boolean
          limit_unit?: string | null
          limit_value?: number | null
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_plan_entitlements_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "billing_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_plan_entitlements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plan_prices: {
        Row: {
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          created_at: string
          currency: string
          id: string
          is_active: boolean
          plan_id: string
          stripe_price_id: string
          stripe_product_id: string | null
          unit_amount: number | null
          updated_at: string
        }
        Insert: {
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          plan_id: string
          stripe_price_id: string
          stripe_product_id?: string | null
          unit_amount?: number | null
          updated_at?: string
        }
        Update: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          plan_id?: string
          stripe_price_id?: string
          stripe_product_id?: string | null
          unit_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_plan_prices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plans: {
        Row: {
          archived_date: string | null
          created_at: string
          description: string | null
          display_name: string
          effective_date: string | null
          id: string
          is_active: boolean
          is_public: boolean
          is_recommended: boolean
          plan_key: string
          require_payment_method_for_trial: boolean
          sort_order: number
          support_level: string | null
          trial_days: number | null
          updated_at: string
        }
        Insert: {
          archived_date?: string | null
          created_at?: string
          description?: string | null
          display_name: string
          effective_date?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          is_recommended?: boolean
          plan_key: string
          require_payment_method_for_trial?: boolean
          sort_order?: number
          support_level?: string | null
          trial_days?: number | null
          updated_at?: string
        }
        Update: {
          archived_date?: string | null
          created_at?: string
          description?: string | null
          display_name?: string
          effective_date?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          is_recommended?: boolean
          plan_key?: string
          require_payment_method_for_trial?: boolean
          sort_order?: number
          support_level?: string | null
          trial_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      billing_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_access_state:
            | Database["public"]["Enums"]["billing_access_state"]
            | null
          new_status: Database["public"]["Enums"]["subscription_status"]
          organisation_id: string
          previous_access_state:
            | Database["public"]["Enums"]["billing_access_state"]
            | null
          previous_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          provider_event_id: string | null
          reason: string | null
          subscription_id: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_access_state?:
            | Database["public"]["Enums"]["billing_access_state"]
            | null
          new_status: Database["public"]["Enums"]["subscription_status"]
          organisation_id: string
          previous_access_state?:
            | Database["public"]["Enums"]["billing_access_state"]
            | null
          previous_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          provider_event_id?: string | null
          reason?: string | null
          subscription_id?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_access_state?:
            | Database["public"]["Enums"]["billing_access_state"]
            | null
          new_status?: Database["public"]["Enums"]["subscription_status"]
          organisation_id?: string
          previous_access_state?:
            | Database["public"]["Enums"]["billing_access_state"]
            | null
          previous_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          provider_event_id?: string | null
          reason?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_status_history_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_status_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "organisation_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_trial_history: {
        Row: {
          conversion_plan_id: string | null
          converted: boolean
          converted_at: string | null
          created_at: string
          id: string
          organisation_id: string
          payment_method_required: boolean
          plan_id: string | null
          reminder_status: string | null
          trial_end: string
          trial_start: string
        }
        Insert: {
          conversion_plan_id?: string | null
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          id?: string
          organisation_id: string
          payment_method_required?: boolean
          plan_id?: string | null
          reminder_status?: string | null
          trial_end: string
          trial_start: string
        }
        Update: {
          conversion_plan_id?: string | null
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          id?: string
          organisation_id?: string
          payment_method_required?: boolean
          plan_id?: string | null
          reminder_status?: string | null
          trial_end?: string
          trial_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_trial_history_conversion_plan_id_fkey"
            columns: ["conversion_plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_trial_history_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_trial_history_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_webhook_events: {
        Row: {
          attempt_count: number
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          processed_at: string | null
          processing_status: Database["public"]["Enums"]["webhook_event_status"]
          stripe_customer_id: string | null
          stripe_event_id: string
          stripe_object_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          event_type: string
          id?: string
          last_error?: string | null
          processed_at?: string | null
          processing_status?: Database["public"]["Enums"]["webhook_event_status"]
          stripe_customer_id?: string | null
          stripe_event_id: string
          stripe_object_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          event_type?: string
          id?: string
          last_error?: string | null
          processed_at?: string | null
          processing_status?: Database["public"]["Enums"]["webhook_event_status"]
          stripe_customer_id?: string | null
          stripe_event_id?: string
          stripe_object_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: []
      }
      cdm_duty_holders: {
        Row: {
          appointed_at: string | null
          archived_at: string | null
          created_at: string | null
          id: string
          job_id: string | null
          organisation_id: string
          person_or_org_name: string
          role: string
          updated_at: string | null
        }
        Insert: {
          appointed_at?: string | null
          archived_at?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          organisation_id: string
          person_or_org_name: string
          role: string
          updated_at?: string | null
        }
        Update: {
          appointed_at?: string | null
          archived_at?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          organisation_id?: string
          person_or_org_name?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cdm_duty_holders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cdm_duty_holders_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      cis_records: {
        Row: {
          checked_by: string | null
          created_at: string
          deduction_rate: number | null
          gross_payment_status: boolean | null
          id: string
          last_checked: string | null
          note: string | null
          organisation_id: string
          person_id: string
          updated_at: string
          utr_recorded: boolean
          verification_ref: string | null
        }
        Insert: {
          checked_by?: string | null
          created_at?: string
          deduction_rate?: number | null
          gross_payment_status?: boolean | null
          id?: string
          last_checked?: string | null
          note?: string | null
          organisation_id: string
          person_id: string
          updated_at?: string
          utr_recorded?: boolean
          verification_ref?: string | null
        }
        Update: {
          checked_by?: string | null
          created_at?: string
          deduction_rate?: number | null
          gross_payment_status?: boolean | null
          id?: string
          last_checked?: string | null
          note?: string | null
          organisation_id?: string
          person_id?: string
          updated_at?: string
          utr_recorded?: boolean
          verification_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cis_records_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cis_records_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "workforce_people"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_primary: boolean
          organisation_id: string
          phone: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean
          organisation_id: string
          phone?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean
          organisation_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          account_status: string
          archived_at: string | null
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_county: string | null
          billing_postcode: string | null
          billing_town_city: string | null
          client_type: string
          company_name: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          organisation_id: string
          phone: string | null
          portal_status: string
          preferred_contact: string | null
          site_address_line1: string | null
          site_address_line2: string | null
          site_county: string | null
          site_postcode: string | null
          site_town_city: string | null
          updated_at: string
        }
        Insert: {
          account_status?: string
          archived_at?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_county?: string | null
          billing_postcode?: string | null
          billing_town_city?: string | null
          client_type: string
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          organisation_id: string
          phone?: string | null
          portal_status?: string
          preferred_contact?: string | null
          site_address_line1?: string | null
          site_address_line2?: string | null
          site_county?: string | null
          site_postcode?: string | null
          site_town_city?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: string
          archived_at?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_county?: string | null
          billing_postcode?: string | null
          billing_town_city?: string | null
          client_type?: string
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          organisation_id?: string
          phone?: string | null
          portal_status?: string
          preferred_contact?: string | null
          site_address_line1?: string | null
          site_address_line2?: string | null
          site_county?: string | null
          site_postcode?: string | null
          site_town_city?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_documents: {
        Row: {
          archived_at: string | null
          contract_type: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          extraction_status: string
          file_name: string
          file_size_bytes: number | null
          id: string
          job_id: string | null
          mime_type: string | null
          organisation_id: string
          storage_path: string
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          extraction_status?: string
          file_name: string
          file_size_bytes?: number | null
          id?: string
          job_id?: string | null
          mime_type?: string | null
          organisation_id: string
          storage_path: string
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          extraction_status?: string
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          job_id?: string | null
          mime_type?: string | null
          organisation_id?: string
          storage_path?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_documents_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_extracted_terms: {
        Row: {
          confidence_score: number | null
          confirmed_by_user: boolean
          confirmed_value: string | null
          contract_document_id: string
          created_at: string | null
          extracted_value: string | null
          field_label: string | null
          field_name: string
          id: string
          organisation_id: string
          updated_at: string | null
        }
        Insert: {
          confidence_score?: number | null
          confirmed_by_user?: boolean
          confirmed_value?: string | null
          contract_document_id: string
          created_at?: string | null
          extracted_value?: string | null
          field_label?: string | null
          field_name: string
          id?: string
          organisation_id: string
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number | null
          confirmed_by_user?: boolean
          confirmed_value?: string | null
          contract_document_id?: string
          created_at?: string | null
          extracted_value?: string | null
          field_label?: string | null
          field_name?: string
          id?: string
          organisation_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_extracted_terms_contract_document_id_fkey"
            columns: ["contract_document_id"]
            isOneToOne: false
            referencedRelation: "contract_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_extracted_terms_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          added_at: string
          added_by: string | null
          conversation_id: string
          id: string
          last_read_at: string | null
          muted: boolean
          participant_type: string
          portal_identity: string | null
          removed_at: string | null
          user_id: string | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          conversation_id: string
          id?: string
          last_read_at?: string | null
          muted?: boolean
          participant_type: string
          portal_identity?: string | null
          removed_at?: string | null
          user_id?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          conversation_id?: string
          id?: string
          last_read_at?: string | null
          muted?: boolean
          participant_type?: string
          portal_identity?: string | null
          removed_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          archived_at: string | null
          client_id: string | null
          conversation_type: string
          created_at: string
          created_by: string | null
          id: string
          job_id: string | null
          last_message_at: string | null
          organisation_id: string
          payment_application_id: string | null
          title: string
          updated_at: string
          variation_id: string | null
          workforce_business_id: string | null
        }
        Insert: {
          archived_at?: string | null
          client_id?: string | null
          conversation_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string | null
          last_message_at?: string | null
          organisation_id: string
          payment_application_id?: string | null
          title: string
          updated_at?: string
          variation_id?: string | null
          workforce_business_id?: string | null
        }
        Update: {
          archived_at?: string | null
          client_id?: string | null
          conversation_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string | null
          last_message_at?: string | null
          organisation_id?: string
          payment_application_id?: string | null
          title?: string
          updated_at?: string
          variation_id?: string | null
          workforce_business_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_payment_application_id_fkey"
            columns: ["payment_application_id"]
            isOneToOne: false
            referencedRelation: "payment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "variations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_workforce_business_id_fkey"
            columns: ["workforce_business_id"]
            isOneToOne: false
            referencedRelation: "workforce_people"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_log_deliveries: {
        Row: {
          accepted_by: string | null
          condition: string | null
          created_at: string
          daily_log_id: string
          delivery_ref: string | null
          id: string
          items: string | null
          organisation_id: string
          supplier: string | null
        }
        Insert: {
          accepted_by?: string | null
          condition?: string | null
          created_at?: string
          daily_log_id: string
          delivery_ref?: string | null
          id?: string
          items?: string | null
          organisation_id: string
          supplier?: string | null
        }
        Update: {
          accepted_by?: string | null
          condition?: string | null
          created_at?: string
          daily_log_id?: string
          delivery_ref?: string | null
          id?: string
          items?: string | null
          organisation_id?: string
          supplier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_log_deliveries_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_log_deliveries_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_log_labour: {
        Row: {
          created_at: string
          daily_log_id: string
          hours: number | null
          id: string
          organisation_id: string
          overtime_hours: number | null
          person_id: string | null
          work_completed: string | null
        }
        Insert: {
          created_at?: string
          daily_log_id: string
          hours?: number | null
          id?: string
          organisation_id: string
          overtime_hours?: number | null
          person_id?: string | null
          work_completed?: string | null
        }
        Update: {
          created_at?: string
          daily_log_id?: string
          hours?: number | null
          id?: string
          organisation_id?: string
          overtime_hours?: number | null
          person_id?: string | null
          work_completed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_log_labour_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_log_labour_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_log_labour_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "workforce_people"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logs: {
        Row: {
          access_issues: string | null
          archived_at: string | null
          client_summary_published: boolean
          created_at: string
          created_by: string | null
          id: string
          job_id: string
          log_date: string
          organisation_id: string
          planned_work_tomorrow: string | null
          progress_estimate: number | null
          site_close_time: string | null
          site_conditions: string | null
          site_open_time: string | null
          status: string
          supervisor_id: string | null
          temperature: string | null
          updated_at: string
          version: number
          weather_desc: string | null
          welfare_status: string | null
          work_completed: string | null
        }
        Insert: {
          access_issues?: string | null
          archived_at?: string | null
          client_summary_published?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          job_id: string
          log_date: string
          organisation_id: string
          planned_work_tomorrow?: string | null
          progress_estimate?: number | null
          site_close_time?: string | null
          site_conditions?: string | null
          site_open_time?: string | null
          status?: string
          supervisor_id?: string | null
          temperature?: string | null
          updated_at?: string
          version?: number
          weather_desc?: string | null
          welfare_status?: string | null
          work_completed?: string | null
        }
        Update: {
          access_issues?: string | null
          archived_at?: string | null
          client_summary_published?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string
          log_date?: string
          organisation_id?: string
          planned_work_tomorrow?: string | null
          progress_estimate?: number | null
          site_close_time?: string | null
          site_conditions?: string | null
          site_open_time?: string | null
          status?: string
          supervisor_id?: string | null
          temperature?: string | null
          updated_at?: string
          version?: number
          weather_desc?: string | null
          welfare_status?: string | null
          work_completed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      deadline_rules: {
        Row: {
          contract_type: string
          created_at: string | null
          deadline_type: Database["public"]["Enums"]["statutory_deadline_type"]
          enabled: boolean
          id: string
          notice_days: number
          organisation_id: string
          reminder_days: number[]
          updated_at: string | null
        }
        Insert: {
          contract_type: string
          created_at?: string | null
          deadline_type: Database["public"]["Enums"]["statutory_deadline_type"]
          enabled?: boolean
          id?: string
          notice_days?: number
          organisation_id: string
          reminder_days?: number[]
          updated_at?: string | null
        }
        Update: {
          contract_type?: string
          created_at?: string | null
          deadline_type?: Database["public"]["Enums"]["statutory_deadline_type"]
          enabled?: boolean
          id?: string
          notice_days?: number
          organisation_id?: string
          reminder_days?: number[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deadline_rules_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_issues: {
        Row: {
          affected_task: string | null
          assigned_to: string | null
          created_at: string
          credit_amount_pence: number | null
          credit_expected: boolean
          description: string
          evidence_urls: Json | null
          goods_receipt_id: string | null
          id: string
          issue_type: string
          organisation_id: string
          purchase_order_id: string
          replacement_date: string | null
          reported_by: string
          resolution: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["delivery_issue_status"]
          supplier_notified: boolean
          supplier_notified_at: string | null
          updated_at: string
        }
        Insert: {
          affected_task?: string | null
          assigned_to?: string | null
          created_at?: string
          credit_amount_pence?: number | null
          credit_expected?: boolean
          description: string
          evidence_urls?: Json | null
          goods_receipt_id?: string | null
          id?: string
          issue_type: string
          organisation_id: string
          purchase_order_id: string
          replacement_date?: string | null
          reported_by: string
          resolution?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["delivery_issue_status"]
          supplier_notified?: boolean
          supplier_notified_at?: string | null
          updated_at?: string
        }
        Update: {
          affected_task?: string | null
          assigned_to?: string | null
          created_at?: string
          credit_amount_pence?: number | null
          credit_expected?: boolean
          description?: string
          evidence_urls?: Json | null
          goods_receipt_id?: string | null
          id?: string
          issue_type?: string
          organisation_id?: string
          purchase_order_id?: string
          replacement_date?: string | null
          reported_by?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["delivery_issue_status"]
          supplier_notified?: boolean
          supplier_notified_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_issues_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_issues_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_issues_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      device_organisation_grants: {
        Row: {
          created_at: string | null
          device_id: string
          granted_at: string | null
          id: string
          organisation_id: string
          revoked_at: string | null
          revoked_by: string | null
          status: Database["public"]["Enums"]["device_grant_status"] | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          granted_at?: string | null
          id?: string
          organisation_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          status?: Database["public"]["Enums"]["device_grant_status"] | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          granted_at?: string | null
          id?: string
          organisation_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          status?: Database["public"]["Enums"]["device_grant_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "device_organisation_grants_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "registered_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_organisation_grants_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      device_sync_state: {
        Row: {
          blocked_count: number | null
          conflict_count: number | null
          created_at: string | null
          device_id: string
          id: string
          last_attempted_sync: string | null
          last_success_sync: string | null
          last_sync_status: string | null
          organisation_id: string
          queued_count: number | null
          updated_at: string | null
        }
        Insert: {
          blocked_count?: number | null
          conflict_count?: number | null
          created_at?: string | null
          device_id: string
          id?: string
          last_attempted_sync?: string | null
          last_success_sync?: string | null
          last_sync_status?: string | null
          organisation_id: string
          queued_count?: number | null
          updated_at?: string | null
        }
        Update: {
          blocked_count?: number | null
          conflict_count?: number | null
          created_at?: string | null
          device_id?: string
          id?: string
          last_attempted_sync?: string | null
          last_success_sync?: string | null
          last_sync_status?: string | null
          organisation_id?: string
          queued_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_sync_state_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "registered_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_sync_state_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_admin_access_log: {
        Row: {
          access_reason: string | null
          action_taken: string | null
          admin_user_id: string
          created_at: string
          dispute_id: string
          evidence_previewed: string[] | null
          files_downloaded: string[] | null
          id: string
          sections_viewed: string[] | null
        }
        Insert: {
          access_reason?: string | null
          action_taken?: string | null
          admin_user_id: string
          created_at?: string
          dispute_id: string
          evidence_previewed?: string[] | null
          files_downloaded?: string[] | null
          id?: string
          sections_viewed?: string[] | null
        }
        Update: {
          access_reason?: string | null
          action_taken?: string | null
          admin_user_id?: string
          created_at?: string
          dispute_id?: string
          evidence_previewed?: string[] | null
          files_downloaded?: string[] | null
          id?: string
          sections_viewed?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_admin_access_log_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_admin_notes: {
        Row: {
          author_user_id: string | null
          body: string
          created_at: string
          dispute_id: string
          id: string
          note_scope: string
        }
        Insert: {
          author_user_id?: string | null
          body: string
          created_at?: string
          dispute_id: string
          id?: string
          note_scope: string
        }
        Update: {
          author_user_id?: string | null
          body?: string
          created_at?: string
          dispute_id?: string
          id?: string
          note_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_admin_notes_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          dispute_id: string
          id: string
          new_value: Json | null
          previous_value: Json | null
          request_metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          dispute_id: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          request_metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          dispute_id?: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          request_metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_audit_log_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_claims: {
        Row: {
          amount_accepted_pence: number | null
          amount_pence: number | null
          calculation_breakdown: Json | null
          claim_type: string
          counterclaim_category: string | null
          dispute_id: string
          facts_accepted: Json | null
          facts_disputed: Json | null
          id: string
          linked_records: Json | null
          position: string | null
          proposed_resolution: string | null
          requested_remedy: string | null
          statement: string | null
          status: string
          submitted_at: string
          submitted_by_user_id: string
          supersedes_claim_id: string | null
        }
        Insert: {
          amount_accepted_pence?: number | null
          amount_pence?: number | null
          calculation_breakdown?: Json | null
          claim_type: string
          counterclaim_category?: string | null
          dispute_id: string
          facts_accepted?: Json | null
          facts_disputed?: Json | null
          id?: string
          linked_records?: Json | null
          position?: string | null
          proposed_resolution?: string | null
          requested_remedy?: string | null
          statement?: string | null
          status?: string
          submitted_at?: string
          submitted_by_user_id: string
          supersedes_claim_id?: string | null
        }
        Update: {
          amount_accepted_pence?: number | null
          amount_pence?: number | null
          calculation_breakdown?: Json | null
          claim_type?: string
          counterclaim_category?: string | null
          dispute_id?: string
          facts_accepted?: Json | null
          facts_disputed?: Json | null
          id?: string
          linked_records?: Json | null
          position?: string | null
          proposed_resolution?: string | null
          requested_remedy?: string | null
          statement?: string | null
          status?: string
          submitted_at?: string
          submitted_by_user_id?: string
          supersedes_claim_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_claims_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_claims_supersedes_claim_id_fkey"
            columns: ["supersedes_claim_id"]
            isOneToOne: false
            referencedRelation: "dispute_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_clarifications: {
        Row: {
          answered_at: string | null
          answered_by_user_id: string | null
          created_at: string
          dispute_id: string
          id: string
          point: string
          relevance: string
          requested_by_user_id: string | null
          response: string | null
          response_due_at: string
          status: string
          target_claim_id: string | null
          target_offer_id: string | null
        }
        Insert: {
          answered_at?: string | null
          answered_by_user_id?: string | null
          created_at?: string
          dispute_id: string
          id?: string
          point: string
          relevance: string
          requested_by_user_id?: string | null
          response?: string | null
          response_due_at: string
          status?: string
          target_claim_id?: string | null
          target_offer_id?: string | null
        }
        Update: {
          answered_at?: string | null
          answered_by_user_id?: string | null
          created_at?: string
          dispute_id?: string
          id?: string
          point?: string
          relevance?: string
          requested_by_user_id?: string | null
          response?: string | null
          response_due_at?: string
          status?: string
          target_claim_id?: string | null
          target_offer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_clarifications_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_clarifications_target_claim_id_fkey"
            columns: ["target_claim_id"]
            isOneToOne: false
            referencedRelation: "dispute_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_content_restrictions: {
        Row: {
          dispute_id: string
          id: string
          reason: string
          restored_at: string | null
          restored_by_user_id: string | null
          restricted_at: string
          restricted_by_user_id: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          dispute_id: string
          id?: string
          reason: string
          restored_at?: string | null
          restored_by_user_id?: string | null
          restricted_at?: string
          restricted_by_user_id?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          dispute_id?: string
          id?: string
          reason?: string
          restored_at?: string | null
          restored_by_user_id?: string | null
          restricted_at?: string
          restricted_by_user_id?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_content_restrictions_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_deadlines: {
        Row: {
          actor_role: string | null
          actor_user_id: string | null
          completed_at: string | null
          created_at: string
          deadline_type: string
          dispute_id: string
          due_at: string
          id: string
          is_platform_deadline: boolean
          related_record_id: string | null
          related_record_type: string | null
          status: string
          superseded_by: string | null
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          actor_role?: string | null
          actor_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          deadline_type: string
          dispute_id: string
          due_at: string
          id?: string
          is_platform_deadline?: boolean
          related_record_id?: string | null
          related_record_type?: string | null
          status?: string
          superseded_by?: string | null
          timezone?: string
          title: string
          updated_at?: string
        }
        Update: {
          actor_role?: string | null
          actor_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          deadline_type?: string
          dispute_id?: string
          due_at?: string
          id?: string
          is_platform_deadline?: boolean
          related_record_id?: string | null
          related_record_type?: string | null
          status?: string
          superseded_by?: string | null
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_deadlines_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_deadlines_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "dispute_deadlines"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_events: {
        Row: {
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          description: string | null
          dispute_id: string
          event_type: string
          id: string
          metadata: Json | null
          related_record_id: string | null
          related_record_type: string | null
          title: string
          visibility: string
        }
        Insert: {
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          description?: string | null
          dispute_id: string
          event_type: string
          id?: string
          metadata?: Json | null
          related_record_id?: string | null
          related_record_type?: string | null
          title: string
          visibility?: string
        }
        Update: {
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          description?: string | null
          dispute_id?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          related_record_id?: string | null
          related_record_type?: string | null
          title?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_events_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_evidence: {
        Row: {
          captured_metadata: Json | null
          created_at: string
          description: string | null
          dispute_id: string
          event_date: string | null
          evidence_category: string
          evidence_reference: string
          file_hash: string | null
          file_size: number | null
          id: string
          linked_project_record_id: string | null
          linked_project_record_type: string | null
          mime_type: string | null
          original_filename: string | null
          safe_display_filename: string | null
          source_type: string
          storage_path: string | null
          submission_status: string
          submitted_at: string
          submitted_by_user_id: string
          supersedes_evidence_id: string | null
          title: string
          visibility: string
        }
        Insert: {
          captured_metadata?: Json | null
          created_at?: string
          description?: string | null
          dispute_id: string
          event_date?: string | null
          evidence_category: string
          evidence_reference: string
          file_hash?: string | null
          file_size?: number | null
          id?: string
          linked_project_record_id?: string | null
          linked_project_record_type?: string | null
          mime_type?: string | null
          original_filename?: string | null
          safe_display_filename?: string | null
          source_type: string
          storage_path?: string | null
          submission_status?: string
          submitted_at?: string
          submitted_by_user_id: string
          supersedes_evidence_id?: string | null
          title: string
          visibility?: string
        }
        Update: {
          captured_metadata?: Json | null
          created_at?: string
          description?: string | null
          dispute_id?: string
          event_date?: string | null
          evidence_category?: string
          evidence_reference?: string
          file_hash?: string | null
          file_size?: number | null
          id?: string
          linked_project_record_id?: string | null
          linked_project_record_type?: string | null
          mime_type?: string | null
          original_filename?: string | null
          safe_display_filename?: string | null
          source_type?: string
          storage_path?: string | null
          submission_status?: string
          submitted_at?: string
          submitted_by_user_id?: string
          supersedes_evidence_id?: string | null
          title?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_evidence_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_evidence_supersedes_evidence_id_fkey"
            columns: ["supersedes_evidence_id"]
            isOneToOne: false
            referencedRelation: "dispute_evidence"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_exports: {
        Row: {
          configuration: Json | null
          created_at: string
          created_by_user_id: string
          declared_at: string | null
          deleted_at: string | null
          dispute_id: string
          downloaded_at: string | null
          expires_at: string | null
          file_count: number
          generated_at: string | null
          id: string
          item_count: number
          missing_items: Json | null
          pdf_storage_path: string | null
          perspective: string
          purpose: string
          retention_status: string
          status: string
          supersedes_export_id: string | null
          title: string
          version: number
          zip_storage_path: string | null
        }
        Insert: {
          configuration?: Json | null
          created_at?: string
          created_by_user_id: string
          declared_at?: string | null
          deleted_at?: string | null
          dispute_id: string
          downloaded_at?: string | null
          expires_at?: string | null
          file_count?: number
          generated_at?: string | null
          id?: string
          item_count?: number
          missing_items?: Json | null
          pdf_storage_path?: string | null
          perspective: string
          purpose: string
          retention_status?: string
          status?: string
          supersedes_export_id?: string | null
          title: string
          version?: number
          zip_storage_path?: string | null
        }
        Update: {
          configuration?: Json | null
          created_at?: string
          created_by_user_id?: string
          declared_at?: string | null
          deleted_at?: string | null
          dispute_id?: string
          downloaded_at?: string | null
          expires_at?: string | null
          file_count?: number
          generated_at?: string | null
          id?: string
          item_count?: number
          missing_items?: Json | null
          pdf_storage_path?: string | null
          perspective?: string
          purpose?: string
          retention_status?: string
          status?: string
          supersedes_export_id?: string | null
          title?: string
          version?: number
          zip_storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_exports_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_exports_supersedes_export_id_fkey"
            columns: ["supersedes_export_id"]
            isOneToOne: false
            referencedRelation: "dispute_exports"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_guidance_versions: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          published_at: string | null
          published_by_user_id: string | null
          review_due: string | null
          section_id: string
          status: string
          summary: string | null
          supersedes_version_id: string | null
          title: string
          version: number
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          published_at?: string | null
          published_by_user_id?: string | null
          review_due?: string | null
          section_id: string
          status?: string
          summary?: string | null
          supersedes_version_id?: string | null
          title: string
          version: number
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          published_at?: string | null
          published_by_user_id?: string | null
          review_due?: string | null
          section_id?: string
          status?: string
          summary?: string | null
          supersedes_version_id?: string | null
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispute_guidance_versions_supersedes_version_id_fkey"
            columns: ["supersedes_version_id"]
            isOneToOne: false
            referencedRelation: "dispute_guidance_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_launch_gate_approvals: {
        Row: {
          approved_at: string
          approved_by_user_id: string | null
          created_at: string
          gate_key: string
          id: string
          note: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string
          approved_by_user_id?: string | null
          created_at?: string
          gate_key: string
          id?: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string
          approved_by_user_id?: string | null
          created_at?: string
          gate_key?: string
          id?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dispute_letters: {
        Row: {
          adr_invitation: string | null
          alleged_work: string | null
          amount_pence: number | null
          calculation_breakdown: string | null
          chronology: string | null
          claim_basis: string | null
          claimant_address: string | null
          claimant_name: string | null
          contract_basis: string | null
          created_at: string
          created_by_user_id: string
          defendant_address: string | null
          defendant_name: string | null
          dispute_id: string
          downloaded_at: string | null
          enclosures: Json | null
          evidence_references: Json | null
          finalised_at: string | null
          id: string
          legal_provisions: Json | null
          letter_body: string | null
          other_basis: string | null
          recipient: string | null
          requested_remedy: string | null
          resolution_attempts: string | null
          response_date: string | null
          sent_date: string | null
          sent_method: string | null
          status: string
          supersedes_letter_id: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          adr_invitation?: string | null
          alleged_work?: string | null
          amount_pence?: number | null
          calculation_breakdown?: string | null
          chronology?: string | null
          claim_basis?: string | null
          claimant_address?: string | null
          claimant_name?: string | null
          contract_basis?: string | null
          created_at?: string
          created_by_user_id: string
          defendant_address?: string | null
          defendant_name?: string | null
          dispute_id: string
          downloaded_at?: string | null
          enclosures?: Json | null
          evidence_references?: Json | null
          finalised_at?: string | null
          id?: string
          legal_provisions?: Json | null
          letter_body?: string | null
          other_basis?: string | null
          recipient?: string | null
          requested_remedy?: string | null
          resolution_attempts?: string | null
          response_date?: string | null
          sent_date?: string | null
          sent_method?: string | null
          status?: string
          supersedes_letter_id?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          adr_invitation?: string | null
          alleged_work?: string | null
          amount_pence?: number | null
          calculation_breakdown?: string | null
          chronology?: string | null
          claim_basis?: string | null
          claimant_address?: string | null
          claimant_name?: string | null
          contract_basis?: string | null
          created_at?: string
          created_by_user_id?: string
          defendant_address?: string | null
          defendant_name?: string | null
          dispute_id?: string
          downloaded_at?: string | null
          enclosures?: Json | null
          evidence_references?: Json | null
          finalised_at?: string | null
          id?: string
          legal_provisions?: Json | null
          letter_body?: string | null
          other_basis?: string | null
          recipient?: string | null
          requested_remedy?: string | null
          resolution_attempts?: string | null
          response_date?: string | null
          sent_date?: string | null
          sent_method?: string | null
          status?: string
          supersedes_letter_id?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispute_letters_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_letters_supersedes_letter_id_fkey"
            columns: ["supersedes_letter_id"]
            isOneToOne: false
            referencedRelation: "dispute_letters"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_notification_preferences: {
        Row: {
          created_at: string
          email_reminders_enabled: boolean
          id: string
          organisation_id: string
          overdue_reminder_enabled: boolean
          reminder_days: number[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_reminders_enabled?: boolean
          id?: string
          organisation_id: string
          overdue_reminder_enabled?: boolean
          reminder_days?: number[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_reminders_enabled?: boolean
          id?: string
          organisation_id?: string
          overdue_reminder_enabled?: boolean
          reminder_days?: number[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_notification_preferences_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_parties: {
        Row: {
          access_status: string
          business_name_snapshot: string | null
          display_name_snapshot: string | null
          dispute_id: string
          email_snapshot: string | null
          id: string
          joined_at: string
          party_role: string
          service_address_snapshot: string | null
          user_id: string
        }
        Insert: {
          access_status?: string
          business_name_snapshot?: string | null
          display_name_snapshot?: string | null
          dispute_id: string
          email_snapshot?: string | null
          id?: string
          joined_at?: string
          party_role: string
          service_address_snapshot?: string | null
          user_id: string
        }
        Update: {
          access_status?: string
          business_name_snapshot?: string | null
          display_name_snapshot?: string | null
          dispute_id?: string
          email_snapshot?: string | null
          id?: string
          joined_at?: string
          party_role?: string
          service_address_snapshot?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_parties_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_preaction_checklist: {
        Row: {
          dispute_id: string
          id: string
          item_key: string
          note: string | null
          status: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          dispute_id: string
          id?: string
          item_key: string
          note?: string | null
          status?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          dispute_id?: string
          id?: string
          item_key?: string
          note?: string | null
          status?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_preaction_checklist_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_preaction_issues: {
        Row: {
          agreed_facts: string | null
          amount_pence: number | null
          claimant_position: string | null
          claimant_position_updated_at: string | null
          claimant_position_updated_by: string | null
          created_at: string
          created_by_user_id: string | null
          dispute_id: string
          disputed_facts: string | null
          evidence_references: Json | null
          id: string
          issue_reference: string
          resolution_status: string
          respondent_position: string | null
          respondent_position_updated_at: string | null
          respondent_position_updated_by: string | null
          title: string
        }
        Insert: {
          agreed_facts?: string | null
          amount_pence?: number | null
          claimant_position?: string | null
          claimant_position_updated_at?: string | null
          claimant_position_updated_by?: string | null
          created_at?: string
          created_by_user_id?: string | null
          dispute_id: string
          disputed_facts?: string | null
          evidence_references?: Json | null
          id?: string
          issue_reference: string
          resolution_status?: string
          respondent_position?: string | null
          respondent_position_updated_at?: string | null
          respondent_position_updated_by?: string | null
          title: string
        }
        Update: {
          agreed_facts?: string | null
          amount_pence?: number | null
          claimant_position?: string | null
          claimant_position_updated_at?: string | null
          claimant_position_updated_by?: string | null
          created_at?: string
          created_by_user_id?: string | null
          dispute_id?: string
          disputed_facts?: string | null
          evidence_references?: Json | null
          id?: string
          issue_reference?: string
          resolution_status?: string
          respondent_position?: string | null
          respondent_position_updated_at?: string | null
          respondent_position_updated_by?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_preaction_issues_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_safety_reports: {
        Row: {
          assigned_reviewer_user_id: string | null
          created_at: string
          decision: string | null
          decision_reason: string | null
          description: string | null
          dispute_id: string
          id: string
          priority: string
          report_category: string
          reporting_user_id: string | null
          resolved_at: string | null
          status: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          assigned_reviewer_user_id?: string | null
          created_at?: string
          decision?: string | null
          decision_reason?: string | null
          description?: string | null
          dispute_id: string
          id?: string
          priority?: string
          report_category: string
          reporting_user_id?: string | null
          resolved_at?: string | null
          status?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          assigned_reviewer_user_id?: string | null
          created_at?: string
          decision?: string | null
          decision_reason?: string | null
          description?: string | null
          dispute_id?: string
          id?: string
          priority?: string
          report_category?: string
          reporting_user_id?: string | null
          resolved_at?: string | null
          status?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_safety_reports_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_settlement_obligations: {
        Row: {
          amount_pence: number | null
          confirmed_at: string | null
          confirmed_by_user_id: string | null
          created_at: string
          dispute_id: string
          dispute_reason: string | null
          due_date: string | null
          id: string
          kind: string
          offer_id: string | null
          status: string
          submitted_at: string | null
          submitted_by_user_id: string | null
          title: string
        }
        Insert: {
          amount_pence?: number | null
          confirmed_at?: string | null
          confirmed_by_user_id?: string | null
          created_at?: string
          dispute_id: string
          dispute_reason?: string | null
          due_date?: string | null
          id?: string
          kind: string
          offer_id?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by_user_id?: string | null
          title: string
        }
        Update: {
          amount_pence?: number | null
          confirmed_at?: string | null
          confirmed_by_user_id?: string | null
          created_at?: string
          dispute_id?: string
          dispute_reason?: string | null
          due_date?: string | null
          id?: string
          kind?: string
          offer_id?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by_user_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_settlement_obligations_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_settlement_obligations_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "dispute_settlement_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_settlement_offers: {
        Row: {
          conditions: string | null
          created_at: string
          currency: string
          dispute_id: string
          id: string
          offer_type: string
          offered_by_user_id: string
          payment_amount_pence: number | null
          payment_due_date: string | null
          proposed_completion_date: string | null
          referenced_evidence: string | null
          responded_at: string | null
          responded_by_user_id: string | null
          response_deadline: string | null
          status: string
          summary: string
          supersedes_offer_id: string | null
          withdrawn_at: string | null
          work_description: string | null
        }
        Insert: {
          conditions?: string | null
          created_at?: string
          currency?: string
          dispute_id: string
          id?: string
          offer_type: string
          offered_by_user_id: string
          payment_amount_pence?: number | null
          payment_due_date?: string | null
          proposed_completion_date?: string | null
          referenced_evidence?: string | null
          responded_at?: string | null
          responded_by_user_id?: string | null
          response_deadline?: string | null
          status?: string
          summary: string
          supersedes_offer_id?: string | null
          withdrawn_at?: string | null
          work_description?: string | null
        }
        Update: {
          conditions?: string | null
          created_at?: string
          currency?: string
          dispute_id?: string
          id?: string
          offer_type?: string
          offered_by_user_id?: string
          payment_amount_pence?: number | null
          payment_due_date?: string | null
          proposed_completion_date?: string | null
          referenced_evidence?: string | null
          responded_at?: string | null
          responded_by_user_id?: string | null
          response_deadline?: string | null
          status?: string
          summary?: string
          supersedes_offer_id?: string | null
          withdrawn_at?: string | null
          work_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_settlement_offers_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_settlement_offers_supersedes_offer_id_fkey"
            columns: ["supersedes_offer_id"]
            isOneToOne: false
            referencedRelation: "dispute_settlement_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          amount_disputed_pence: number | null
          case_reference: string
          claimant_role: string
          claimant_user_id: string
          closed_at: string | null
          created_at: string
          currency: string
          current_stage: string
          desired_resolution: string | null
          dispute_category: string
          id: string
          jurisdiction: string
          opened_at: string | null
          organisation_id: string
          project_id: string
          raised_by_user_id: string | null
          relationship_type: string
          resolved_at: string | null
          respondent_role: string | null
          respondent_user_id: string | null
          response_due_at: string | null
          safety_flag: boolean
          safety_flag_reason: string | null
          status: string
          summary: string | null
          support_owner_user_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount_disputed_pence?: number | null
          case_reference: string
          claimant_role: string
          claimant_user_id: string
          closed_at?: string | null
          created_at?: string
          currency?: string
          current_stage?: string
          desired_resolution?: string | null
          dispute_category: string
          id?: string
          jurisdiction?: string
          opened_at?: string | null
          organisation_id: string
          project_id: string
          raised_by_user_id?: string | null
          relationship_type: string
          resolved_at?: string | null
          respondent_role?: string | null
          respondent_user_id?: string | null
          response_due_at?: string | null
          safety_flag?: boolean
          safety_flag_reason?: string | null
          status?: string
          summary?: string | null
          support_owner_user_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount_disputed_pence?: number | null
          case_reference?: string
          claimant_role?: string
          claimant_user_id?: string
          closed_at?: string | null
          created_at?: string
          currency?: string
          current_stage?: string
          desired_resolution?: string | null
          dispute_category?: string
          id?: string
          jurisdiction?: string
          opened_at?: string | null
          organisation_id?: string
          project_id?: string
          raised_by_user_id?: string | null
          relationship_type?: string
          resolved_at?: string | null
          respondent_role?: string | null
          respondent_user_id?: string | null
          response_due_at?: string | null
          safety_flag?: boolean
          safety_flag_reason?: string | null
          status?: string
          summary?: string | null
          support_owner_user_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_files: {
        Row: {
          archived_at: string | null
          bucket: string
          evidence_id: string
          id: string
          mime_type: string
          object_path: string
          organisation_id: string
          original_filename: string
          size_bytes: number
          uploaded_at: string
          uploaded_by: string | null
          visibility: string
        }
        Insert: {
          archived_at?: string | null
          bucket: string
          evidence_id: string
          id?: string
          mime_type: string
          object_path: string
          organisation_id: string
          original_filename: string
          size_bytes?: number
          uploaded_at?: string
          uploaded_by?: string | null
          visibility?: string
        }
        Update: {
          archived_at?: string | null
          bucket?: string
          evidence_id?: string
          id?: string
          mime_type?: string
          object_path?: string
          organisation_id?: string
          original_filename?: string
          size_bytes?: number
          uploaded_at?: string
          uploaded_by?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_files_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_files_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_records: {
        Row: {
          archived_at: string | null
          caption: string | null
          captured_at: string | null
          captured_by: string | null
          created_at: string
          evidence_type: string
          id: string
          internal_note: string | null
          job_id: string | null
          location_label: string | null
          metadata: Json | null
          offline_status: string | null
          organisation_id: string
          project_stage: string | null
          related_record_id: string | null
          related_record_type: string | null
          review_status: string
          updated_at: string
          visibility: string
        }
        Insert: {
          archived_at?: string | null
          caption?: string | null
          captured_at?: string | null
          captured_by?: string | null
          created_at?: string
          evidence_type: string
          id?: string
          internal_note?: string | null
          job_id?: string | null
          location_label?: string | null
          metadata?: Json | null
          offline_status?: string | null
          organisation_id: string
          project_stage?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          review_status?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          archived_at?: string | null
          caption?: string | null
          captured_at?: string | null
          captured_by?: string | null
          created_at?: string
          evidence_type?: string
          id?: string
          internal_note?: string | null
          job_id?: string | null
          location_label?: string | null
          metadata?: Json | null
          offline_status?: string | null
          organisation_id?: string
          project_stage?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          review_status?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_records_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_records_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipt_lines: {
        Row: {
          accepted_quantity: number
          created_at: string
          damaged_quantity: number | null
          goods_receipt_id: string
          id: string
          missing_quantity: number | null
          notes: string | null
          ordered_quantity: number
          previously_received: number | null
          purchase_order_line_id: string | null
          received_now: number
          rejected_quantity: number | null
        }
        Insert: {
          accepted_quantity?: number
          created_at?: string
          damaged_quantity?: number | null
          goods_receipt_id: string
          id?: string
          missing_quantity?: number | null
          notes?: string | null
          ordered_quantity?: number
          previously_received?: number | null
          purchase_order_line_id?: string | null
          received_now?: number
          rejected_quantity?: number | null
        }
        Update: {
          accepted_quantity?: number
          created_at?: string
          damaged_quantity?: number | null
          goods_receipt_id?: string
          id?: string
          missing_quantity?: number | null
          notes?: string | null
          ordered_quantity?: number
          previously_received?: number | null
          purchase_order_line_id?: string | null
          received_now?: number
          rejected_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_lines_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_lines_purchase_order_line_id_fkey"
            columns: ["purchase_order_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipts: {
        Row: {
          arrival_date: string | null
          arrival_time: string | null
          created_at: string
          delivery_note_number: string | null
          id: string
          job_id: string | null
          location: string | null
          notes: string | null
          organisation_id: string
          photographs: Json | null
          purchase_order_id: string
          received_by: string
          status: Database["public"]["Enums"]["goods_receipt_status"]
          supplier_id: string
        }
        Insert: {
          arrival_date?: string | null
          arrival_time?: string | null
          created_at?: string
          delivery_note_number?: string | null
          id?: string
          job_id?: string | null
          location?: string | null
          notes?: string | null
          organisation_id: string
          photographs?: Json | null
          purchase_order_id: string
          received_by: string
          status?: Database["public"]["Enums"]["goods_receipt_status"]
          supplier_id: string
        }
        Update: {
          arrival_date?: string | null
          arrival_time?: string | null
          created_at?: string
          delivery_note_number?: string | null
          id?: string
          job_id?: string | null
          location?: string | null
          notes?: string | null
          organisation_id?: string
          photographs?: Json | null
          purchase_order_id?: string
          received_by?: string
          status?: Database["public"]["Enums"]["goods_receipt_status"]
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_policies: {
        Row: {
          cover_amount_pence: number | null
          created_at: string
          evidence_path: string | null
          expiry_date: string
          id: string
          organisation_id: string
          person_id: string
          policy_type: string
          provider: string
          reference: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          cover_amount_pence?: number | null
          created_at?: string
          evidence_path?: string | null
          expiry_date: string
          id?: string
          organisation_id: string
          person_id: string
          policy_type: string
          provider: string
          reference?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          cover_amount_pence?: number | null
          created_at?: string
          evidence_path?: string | null
          expiry_date?: string
          id?: string
          organisation_id?: string
          person_id?: string
          policy_type?: string
          provider?: string
          reference?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policies_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "workforce_people"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_account_mappings: {
        Row: {
          account_type: string | null
          connection_id: string
          cost_code: string
          cost_description: string | null
          created_at: string
          external_account_code: string | null
          external_account_id: string | null
          external_account_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          connection_id: string
          cost_code: string
          cost_description?: string | null
          created_at?: string
          external_account_code?: string | null
          external_account_id?: string | null
          external_account_name?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          connection_id?: string
          cost_code?: string
          cost_description?: string | null
          created_at?: string
          external_account_code?: string | null
          external_account_id?: string | null
          external_account_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_account_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_companies_house_cache: {
        Row: {
          cached_at: string
          company_name: string | null
          company_number: string
          company_status: string | null
          data_json: Json | null
          expires_at: string
          id: string
          incorporation_date: string | null
          registered_address: Json | null
          sic_codes: string[] | null
        }
        Insert: {
          cached_at?: string
          company_name?: string | null
          company_number: string
          company_status?: string | null
          data_json?: Json | null
          expires_at?: string
          id?: string
          incorporation_date?: string | null
          registered_address?: Json | null
          sic_codes?: string[] | null
        }
        Update: {
          cached_at?: string
          company_name?: string | null
          company_number?: string
          company_status?: string | null
          data_json?: Json | null
          expires_at?: string
          id?: string
          incorporation_date?: string | null
          registered_address?: Json | null
          sic_codes?: string[] | null
        }
        Relationships: []
      }
      integration_connection_tokens: {
        Row: {
          connection_id: string
          created_at: string
          encrypted_access_token: string | null
          encrypted_refresh_token: string | null
          id: string
          last_refreshed_at: string | null
          oauth_client_id: string | null
          oauth_client_secret: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          id?: string
          last_refreshed_at?: string | null
          oauth_client_id?: string | null
          oauth_client_secret?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          id?: string
          last_refreshed_at?: string | null
          oauth_client_id?: string | null
          oauth_client_secret?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connection_tokens_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          base_currency: string | null
          config: Json | null
          connected_at: string | null
          created_at: string
          created_by: string
          disconnected_at: string | null
          error_message: string | null
          external_tenant_id: string | null
          external_tenant_name: string | null
          granted_scopes: string[] | null
          id: string
          last_sync_at: string | null
          last_sync_status: string | null
          organisation_id: string
          provider_id: string
          records_awaiting_sync: number | null
          records_needing_attention: number | null
          status: Database["public"]["Enums"]["connection_status"]
          updated_at: string
        }
        Insert: {
          base_currency?: string | null
          config?: Json | null
          connected_at?: string | null
          created_at?: string
          created_by: string
          disconnected_at?: string | null
          error_message?: string | null
          external_tenant_id?: string | null
          external_tenant_name?: string | null
          granted_scopes?: string[] | null
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          organisation_id: string
          provider_id: string
          records_awaiting_sync?: number | null
          records_needing_attention?: number | null
          status?: Database["public"]["Enums"]["connection_status"]
          updated_at?: string
        }
        Update: {
          base_currency?: string | null
          config?: Json | null
          connected_at?: string | null
          created_at?: string
          created_by?: string
          disconnected_at?: string | null
          error_message?: string | null
          external_tenant_id?: string | null
          external_tenant_name?: string | null
          granted_scopes?: string[] | null
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          organisation_id?: string
          provider_id?: string
          records_awaiting_sync?: number | null
          records_needing_attention?: number | null
          status?: Database["public"]["Enums"]["connection_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_connections_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "integration_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_entity_mappings: {
        Row: {
          connection_id: string
          created_at: string
          entity_type: Database["public"]["Enums"]["sync_entity_type"]
          external_id: string
          external_name: string | null
          external_version: string | null
          id: string
          last_synced_at: string | null
          local_id: string
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          entity_type: Database["public"]["Enums"]["sync_entity_type"]
          external_id: string
          external_name?: string | null
          external_version?: string | null
          id?: string
          last_synced_at?: string | null
          local_id: string
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          entity_type?: Database["public"]["Enums"]["sync_entity_type"]
          external_id?: string
          external_name?: string | null
          external_version?: string | null
          id?: string
          last_synced_at?: string | null
          local_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_entity_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_import_batches: {
        Row: {
          batch_reference: string
          column_mappings: Json | null
          created_at: string
          created_by: string
          created_rows: number | null
          error_report_url: string | null
          error_rows: number | null
          file_name: string | null
          id: string
          import_type: string
          organisation_id: string
          skipped_rows: number | null
          status: Database["public"]["Enums"]["import_batch_status"]
          total_rows: number | null
          updated_at: string
          updated_rows: number | null
        }
        Insert: {
          batch_reference: string
          column_mappings?: Json | null
          created_at?: string
          created_by: string
          created_rows?: number | null
          error_report_url?: string | null
          error_rows?: number | null
          file_name?: string | null
          id?: string
          import_type: string
          organisation_id: string
          skipped_rows?: number | null
          status?: Database["public"]["Enums"]["import_batch_status"]
          total_rows?: number | null
          updated_at?: string
          updated_rows?: number | null
        }
        Update: {
          batch_reference?: string
          column_mappings?: Json | null
          created_at?: string
          created_by?: string
          created_rows?: number | null
          error_report_url?: string | null
          error_rows?: number | null
          file_name?: string | null
          id?: string
          import_type?: string
          organisation_id?: string
          skipped_rows?: number | null
          status?: Database["public"]["Enums"]["import_batch_status"]
          total_rows?: number | null
          updated_at?: string
          updated_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_import_batches_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_import_records: {
        Row: {
          batch_id: string
          created_at: string
          error_message: string | null
          id: string
          mapped_data: Json | null
          raw_data: Json | null
          row_number: number
          status: string
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          mapped_data?: Json | null
          raw_data?: Json | null
          row_number: number
          status?: string
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          mapped_data?: Json | null
          raw_data?: Json | null
          row_number?: number
          status?: string
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_import_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "integration_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_providers: {
        Row: {
          api_version: string | null
          created_at: string
          description: string | null
          display_name: string
          display_order: number
          documentation_url: string | null
          id: string
          logo_url: string | null
          oauth_auth_url: string | null
          oauth_scopes: string[] | null
          oauth_token_url: string | null
          provider_key: string
          requires_webhook: boolean
          status: Database["public"]["Enums"]["integration_provider_status"]
          supported_entities: string[] | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          api_version?: string | null
          created_at?: string
          description?: string | null
          display_name: string
          display_order?: number
          documentation_url?: string | null
          id?: string
          logo_url?: string | null
          oauth_auth_url?: string | null
          oauth_scopes?: string[] | null
          oauth_token_url?: string | null
          provider_key: string
          requires_webhook?: boolean
          status?: Database["public"]["Enums"]["integration_provider_status"]
          supported_entities?: string[] | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          api_version?: string | null
          created_at?: string
          description?: string | null
          display_name?: string
          display_order?: number
          documentation_url?: string | null
          id?: string
          logo_url?: string | null
          oauth_auth_url?: string | null
          oauth_scopes?: string[] | null
          oauth_token_url?: string | null
          provider_key?: string
          requires_webhook?: boolean
          status?: Database["public"]["Enums"]["integration_provider_status"]
          supported_entities?: string[] | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      integration_reconciliation_items: {
        Row: {
          category: string
          connection_id: string
          created_at: string
          difference_amount_pence: number | null
          difference_description: string | null
          entity_type: Database["public"]["Enums"]["sync_entity_type"] | null
          external_id: string | null
          external_reference: string | null
          external_value: Json | null
          id: string
          local_id: string | null
          local_reference: string | null
          local_value: Json | null
          notes: string | null
          organisation_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["reconciliation_status"]
          updated_at: string
        }
        Insert: {
          category: string
          connection_id: string
          created_at?: string
          difference_amount_pence?: number | null
          difference_description?: string | null
          entity_type?: Database["public"]["Enums"]["sync_entity_type"] | null
          external_id?: string | null
          external_reference?: string | null
          external_value?: Json | null
          id?: string
          local_id?: string | null
          local_reference?: string | null
          local_value?: Json | null
          notes?: string | null
          organisation_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["reconciliation_status"]
          updated_at?: string
        }
        Update: {
          category?: string
          connection_id?: string
          created_at?: string
          difference_amount_pence?: number | null
          difference_description?: string | null
          entity_type?: Database["public"]["Enums"]["sync_entity_type"] | null
          external_id?: string | null
          external_reference?: string | null
          external_value?: Json | null
          id?: string
          local_id?: string | null
          local_reference?: string | null
          local_value?: Json | null
          notes?: string | null
          organisation_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["reconciliation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_reconciliation_items_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_reconciliation_items_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_config: {
        Row: {
          conflict_rule: string | null
          connection_id: string
          created_at: string
          direction: Database["public"]["Enums"]["sync_direction"]
          entity_type: Database["public"]["Enums"]["sync_entity_type"]
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          conflict_rule?: string | null
          connection_id: string
          created_at?: string
          direction?: Database["public"]["Enums"]["sync_direction"]
          entity_type: Database["public"]["Enums"]["sync_entity_type"]
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          conflict_rule?: string | null
          connection_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["sync_direction"]
          entity_type?: Database["public"]["Enums"]["sync_entity_type"]
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_config_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_history: {
        Row: {
          attempts: number
          completed_at: string | null
          connection_id: string
          created_at: string
          details: Json | null
          direction: Database["public"]["Enums"]["sync_direction"]
          entity_type: Database["public"]["Enums"]["sync_entity_type"]
          error_summary: string | null
          external_reference: string | null
          id: string
          local_reference: string | null
          operation: Database["public"]["Enums"]["sync_operation"]
          organisation_id: string
          started_at: string
          status: Database["public"]["Enums"]["sync_job_status"]
          sync_job_id: string | null
          triggered_by: string | null
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          connection_id: string
          created_at?: string
          details?: Json | null
          direction: Database["public"]["Enums"]["sync_direction"]
          entity_type: Database["public"]["Enums"]["sync_entity_type"]
          error_summary?: string | null
          external_reference?: string | null
          id?: string
          local_reference?: string | null
          operation: Database["public"]["Enums"]["sync_operation"]
          organisation_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["sync_job_status"]
          sync_job_id?: string | null
          triggered_by?: string | null
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          connection_id?: string
          created_at?: string
          details?: Json | null
          direction?: Database["public"]["Enums"]["sync_direction"]
          entity_type?: Database["public"]["Enums"]["sync_entity_type"]
          error_summary?: string | null
          external_reference?: string | null
          id?: string
          local_reference?: string | null
          operation?: Database["public"]["Enums"]["sync_operation"]
          organisation_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["sync_job_status"]
          sync_job_id?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_history_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_history_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_history_sync_job_id_fkey"
            columns: ["sync_job_id"]
            isOneToOne: false
            referencedRelation: "integration_sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_jobs: {
        Row: {
          attempt_count: number
          completed_at: string | null
          connection_id: string
          created_at: string
          dependency_job_id: string | null
          direction: Database["public"]["Enums"]["sync_direction"]
          entity_type: Database["public"]["Enums"]["sync_entity_type"]
          error_category: string | null
          error_message: string | null
          external_id: string | null
          external_version: string | null
          id: string
          idempotency_key: string
          local_id: string
          max_attempts: number
          operation: Database["public"]["Enums"]["sync_operation"]
          organisation_id: string
          payload: Json | null
          result: Json | null
          scheduled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["sync_job_status"]
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          connection_id: string
          created_at?: string
          dependency_job_id?: string | null
          direction: Database["public"]["Enums"]["sync_direction"]
          entity_type: Database["public"]["Enums"]["sync_entity_type"]
          error_category?: string | null
          error_message?: string | null
          external_id?: string | null
          external_version?: string | null
          id?: string
          idempotency_key: string
          local_id: string
          max_attempts?: number
          operation?: Database["public"]["Enums"]["sync_operation"]
          organisation_id: string
          payload?: Json | null
          result?: Json | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_job_status"]
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          connection_id?: string
          created_at?: string
          dependency_job_id?: string | null
          direction?: Database["public"]["Enums"]["sync_direction"]
          entity_type?: Database["public"]["Enums"]["sync_entity_type"]
          error_category?: string | null
          error_message?: string | null
          external_id?: string | null
          external_version?: string | null
          id?: string
          idempotency_key?: string
          local_id?: string
          max_attempts?: number
          operation?: Database["public"]["Enums"]["sync_operation"]
          organisation_id?: string
          payload?: Json | null
          result?: Json | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_jobs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_jobs_dependency_job_id_fkey"
            columns: ["dependency_job_id"]
            isOneToOne: false
            referencedRelation: "integration_sync_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_jobs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_tax_mappings: {
        Row: {
          connection_id: string
          created_at: string
          external_tax_code: string
          external_tax_name: string | null
          id: string
          siteledger_tax_treatment: string
          tax_rate: number | null
        }
        Insert: {
          connection_id: string
          created_at?: string
          external_tax_code: string
          external_tax_name?: string | null
          id?: string
          siteledger_tax_treatment: string
          tax_rate?: number | null
        }
        Update: {
          connection_id?: string
          created_at?: string
          external_tax_code?: string
          external_tax_name?: string | null
          id?: string
          siteledger_tax_treatment?: string
          tax_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_tax_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_tracking_mappings: {
        Row: {
          connection_id: string
          created_at: string
          external_tracking_id: string | null
          external_tracking_name: string | null
          id: string
          local_cost_code: string | null
          local_job_id: string | null
          tracking_type: string | null
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          external_tracking_id?: string | null
          external_tracking_name?: string | null
          id?: string
          local_cost_code?: string | null
          local_job_id?: string | null
          tracking_type?: string | null
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          external_tracking_id?: string | null
          external_tracking_name?: string | null
          id?: string
          local_cost_code?: string | null
          local_job_id?: string | null
          tracking_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_tracking_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_tracking_mappings_local_job_id_fkey"
            columns: ["local_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_webhook_events: {
        Row: {
          attempts: number
          connection_id: string | null
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          processed_at: string | null
          provider_id: string
          received_at: string
          status: Database["public"]["Enums"]["webhook_event_status"]
        }
        Insert: {
          attempts?: number
          connection_id?: string | null
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          processed_at?: string | null
          provider_id: string
          received_at?: string
          status?: Database["public"]["Enums"]["webhook_event_status"]
        }
        Update: {
          attempts?: number
          connection_id?: string | null
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          processed_at?: string | null
          provider_id?: string
          received_at?: string
          status?: Database["public"]["Enums"]["webhook_event_status"]
        }
        Relationships: [
          {
            foreignKeyName: "integration_webhook_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_webhook_events_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "integration_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_balances: {
        Row: {
          created_at: string
          id: string
          last_counted_date: string | null
          location_id: string
          material_item_id: string
          minimum_level: number | null
          organisation_id: string
          quantity_on_hand: number
          reorder_level: number | null
          reserved_quantity: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_counted_date?: string | null
          location_id: string
          material_item_id: string
          minimum_level?: number | null
          organisation_id: string
          quantity_on_hand?: number
          reorder_level?: number | null
          reserved_quantity?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_counted_date?: string | null
          location_id?: string
          material_item_id?: string
          minimum_level?: number | null
          organisation_id?: string
          quantity_on_hand?: number
          reorder_level?: number | null
          reserved_quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_balances_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_material_item_id_fkey"
            columns: ["material_item_id"]
            isOneToOne: false
            referencedRelation: "material_catalogue_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          job_id: string | null
          location_type: string
          name: string
          notes: string | null
          organisation_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          job_id?: string | null
          location_type: string
          name: string
          notes?: string | null
          organisation_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          job_id?: string | null
          location_type?: string
          name?: string
          notes?: string | null
          organisation_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_locations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_locations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          access_type: string
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          job_id: string | null
          organisation_id: string
          revoked_at: string | null
          role: string | null
          status: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          access_type: string
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          job_id?: string | null
          organisation_id: string
          revoked_at?: string | null
          role?: string | null
          status?: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          access_type?: string
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          job_id?: string | null
          organisation_id?: string
          revoked_at?: string | null
          role?: string | null
          status?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_matches: {
        Row: {
          created_at: string
          exceptions: Json | null
          goods_receipt_id: string | null
          id: string
          match_type: Database["public"]["Enums"]["invoice_match_type"]
          matched_at: string | null
          matched_by: string | null
          notes: string | null
          price_match: boolean
          purchase_order_id: string | null
          quantity_match: boolean
          supplier_invoice_id: string
          tax_match: boolean
        }
        Insert: {
          created_at?: string
          exceptions?: Json | null
          goods_receipt_id?: string | null
          id?: string
          match_type?: Database["public"]["Enums"]["invoice_match_type"]
          matched_at?: string | null
          matched_by?: string | null
          notes?: string | null
          price_match?: boolean
          purchase_order_id?: string | null
          quantity_match?: boolean
          supplier_invoice_id: string
          tax_match?: boolean
        }
        Update: {
          created_at?: string
          exceptions?: Json | null
          goods_receipt_id?: string | null
          id?: string
          match_type?: Database["public"]["Enums"]["invoice_match_type"]
          matched_at?: string | null
          matched_by?: string | null
          notes?: string | null
          price_match?: boolean
          purchase_order_id?: string | null
          quantity_match?: boolean
          supplier_invoice_id?: string
          tax_match?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "invoice_matches_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_matches_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_matches_supplier_invoice_id_fkey"
            columns: ["supplier_invoice_id"]
            isOneToOne: true
            referencedRelation: "supplier_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      job_client_contacts: {
        Row: {
          client_contact_id: string
          created_at: string
          id: string
          job_id: string
          organisation_id: string
        }
        Insert: {
          client_contact_id: string
          created_at?: string
          id?: string
          job_id: string
          organisation_id: string
        }
        Update: {
          client_contact_id?: string
          created_at?: string
          id?: string
          job_id?: string
          organisation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_client_contacts_client_contact_id_fkey"
            columns: ["client_contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_client_contacts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_client_contacts_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_drafts: {
        Row: {
          client_id: string | null
          converted_job_id: string | null
          created_at: string
          created_by: string
          current_step: number
          id: string
          organisation_id: string
          payload: Json
          project_name: string | null
          reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          converted_job_id?: string | null
          created_at?: string
          created_by: string
          current_step?: number
          id?: string
          organisation_id: string
          payload?: Json
          project_name?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          converted_job_id?: string | null
          created_at?: string
          created_by?: string
          current_step?: number
          id?: string
          organisation_id?: string
          payload?: Json
          project_name?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_drafts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_drafts_converted_job_id_fkey"
            columns: ["converted_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_drafts_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_members: {
        Row: {
          created_at: string
          id: string
          job_id: string
          organisation_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          organisation_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          organisation_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_members_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          access_notes: string | null
          archived_at: string | null
          building_control_ref: string | null
          client_id: string | null
          contract_type: string
          created_at: string
          deposit_pence: number | null
          duration_unit: string | null
          estimated_duration: number | null
          estimated_value_pence: number | null
          id: string
          organisation_id: string
          parking_notes: string | null
          payment_terms: string | null
          pricing_type: string | null
          principal_contractor: string | null
          progress: number
          project_manager_id: string | null
          project_name: string
          proposed_start_date: string | null
          rams_required: string | null
          reference: string
          retention_applies: boolean
          retention_percentage: number | null
          scope_of_works: string | null
          short_description: string | null
          site_working_hours: string | null
          status: string
          target_completion_date: string | null
          trade: string | null
          updated_at: string
          vat_treatment: string | null
          waste_notes: string | null
          work_type: string | null
        }
        Insert: {
          access_notes?: string | null
          archived_at?: string | null
          building_control_ref?: string | null
          client_id?: string | null
          contract_type?: string
          created_at?: string
          deposit_pence?: number | null
          duration_unit?: string | null
          estimated_duration?: number | null
          estimated_value_pence?: number | null
          id?: string
          organisation_id: string
          parking_notes?: string | null
          payment_terms?: string | null
          pricing_type?: string | null
          principal_contractor?: string | null
          progress?: number
          project_manager_id?: string | null
          project_name: string
          proposed_start_date?: string | null
          rams_required?: string | null
          reference: string
          retention_applies?: boolean
          retention_percentage?: number | null
          scope_of_works?: string | null
          short_description?: string | null
          site_working_hours?: string | null
          status?: string
          target_completion_date?: string | null
          trade?: string | null
          updated_at?: string
          vat_treatment?: string | null
          waste_notes?: string | null
          work_type?: string | null
        }
        Update: {
          access_notes?: string | null
          archived_at?: string | null
          building_control_ref?: string | null
          client_id?: string | null
          contract_type?: string
          created_at?: string
          deposit_pence?: number | null
          duration_unit?: string | null
          estimated_duration?: number | null
          estimated_value_pence?: number | null
          id?: string
          organisation_id?: string
          parking_notes?: string | null
          payment_terms?: string | null
          pricing_type?: string | null
          principal_contractor?: string | null
          progress?: number
          project_manager_id?: string | null
          project_name?: string
          proposed_start_date?: string | null
          rams_required?: string | null
          reference?: string
          retention_applies?: boolean
          retention_percentage?: number | null
          scope_of_works?: string | null
          short_description?: string | null
          site_working_hours?: string | null
          status?: string
          target_completion_date?: string | null
          trade?: string | null
          updated_at?: string
          vat_treatment?: string | null
          waste_notes?: string | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      material_allocations: {
        Row: {
          location_id: string | null
          allocated_at: string | null
          allocated_by: string | null
          created_at: string
          id: string
          job_id: string
          material_item_id: string
          notes: string | null
          organisation_id: string
          purchase_order_line_id: string | null
          quantity_allocated: number | null
          quantity_ordered: number | null
          quantity_received: number | null
          quantity_required: number
          quantity_returned: number | null
          quantity_used: number | null
          task_or_phase: string | null
          updated_at: string
        }
        Insert: {
          location_id?: string | null
          allocated_at?: string | null
          allocated_by?: string | null
          created_at?: string
          id?: string
          job_id: string
          material_item_id: string
          notes?: string | null
          organisation_id: string
          purchase_order_line_id?: string | null
          quantity_allocated?: number | null
          quantity_ordered?: number | null
          quantity_received?: number | null
          quantity_required?: number
          quantity_returned?: number | null
          quantity_used?: number | null
          task_or_phase?: string | null
          updated_at?: string
        }
        Update: {
          location_id?: string | null
          allocated_at?: string | null
          allocated_by?: string | null
          created_at?: string
          id?: string
          job_id?: string
          material_item_id?: string
          notes?: string | null
          organisation_id?: string
          purchase_order_line_id?: string | null
          quantity_allocated?: number | null
          quantity_ordered?: number | null
          quantity_received?: number | null
          quantity_required?: number
          quantity_returned?: number | null
          quantity_used?: number | null
          task_or_phase?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_allocations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_allocations_material_item_id_fkey"
            columns: ["material_item_id"]
            isOneToOne: false
            referencedRelation: "material_catalogue_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_allocations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_allocations_purchase_order_line_id_fkey"
            columns: ["purchase_order_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      material_catalogue_items: {
        Row: {
          archived_at: string | null
          category: string | null
          created_at: string
          description: string
          id: string
          internal_code: string | null
          is_active: boolean
          latest_cost_date: string | null
          latest_cost_pence: number | null
          lead_time_days: number | null
          manufacturer: string | null
          minimum_order_quantity: number | null
          notes: string | null
          organisation_id: string
          pack_size: number | null
          part_number: string | null
          preferred_supplier_id: string | null
          safety_data_sheet_url: string | null
          storage_requirements: string | null
          tax_treatment: string | null
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category?: string | null
          created_at?: string
          description: string
          id?: string
          internal_code?: string | null
          is_active?: boolean
          latest_cost_date?: string | null
          latest_cost_pence?: number | null
          lead_time_days?: number | null
          manufacturer?: string | null
          minimum_order_quantity?: number | null
          notes?: string | null
          organisation_id: string
          pack_size?: number | null
          part_number?: string | null
          preferred_supplier_id?: string | null
          safety_data_sheet_url?: string | null
          storage_requirements?: string | null
          tax_treatment?: string | null
          unit_of_measure?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          internal_code?: string | null
          is_active?: boolean
          latest_cost_date?: string | null
          latest_cost_pence?: number | null
          lead_time_days?: number | null
          manufacturer?: string | null
          minimum_order_quantity?: number | null
          notes?: string | null
          organisation_id?: string
          pack_size?: number | null
          part_number?: string | null
          preferred_supplier_id?: string | null
          safety_data_sheet_url?: string | null
          storage_requirements?: string | null
          tax_treatment?: string | null
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_catalogue_items_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_catalogue_items_preferred_supplier_id_fkey"
            columns: ["preferred_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          content_type: string
          created_at: string
          file_size: number
          id: string
          message_id: string
          original_filename: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          content_type: string
          created_at?: string
          file_size: number
          id?: string
          message_id: string
          original_filename: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string
          file_size?: number
          id?: string
          message_id?: string
          original_filename?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_mentions: {
        Row: {
          created_at: string
          id: string
          mentioned_user_id: string | null
          message_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentioned_user_id?: string | null
          message_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mentioned_user_id?: string | null
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          client_visible: boolean
          conversation_id: string
          created_at: string
          edited_at: string | null
          id: string
          idempotency_key: string | null
          organisation_id: string
          reply_to_id: string | null
          sender_id: string
          sender_type: string
          withdrawn_at: string | null
        }
        Insert: {
          body: string
          client_visible?: boolean
          conversation_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          idempotency_key?: string | null
          organisation_id: string
          reply_to_id?: string | null
          sender_id: string
          sender_type: string
          withdrawn_at?: string | null
        }
        Update: {
          body?: string
          client_visible?: boolean
          conversation_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          idempotency_key?: string | null
          organisation_id?: string
          reply_to_id?: string | null
          sender_id?: string
          sender_type?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mutation_receipts: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          idempotency_key: string
          organisation_id: string
          result: Json | null
          server_version: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          idempotency_key: string
          organisation_id: string
          result?: Json | null
          server_version?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          idempotency_key?: string
          organisation_id?: string
          result?: Json | null
          server_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mutation_receipts_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          attempt_count: number
          case_reference: string | null
          channel: string
          created_at: string
          event_type: string
          id: string
          idempotency_key: string | null
          last_error: string | null
          organisation_id: string
          payload: Json
          provider_reference: string | null
          recipient_email: string
          recipient_user_id: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          scheduled_at: string
          sent_at: string | null
          status: string
          template_key: string
          template_version: number | null
        }
        Insert: {
          attempt_count?: number
          case_reference?: string | null
          channel?: string
          created_at?: string
          event_type: string
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          organisation_id: string
          payload: Json
          provider_reference?: string | null
          recipient_email: string
          recipient_user_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          template_key: string
          template_version?: number | null
        }
        Update: {
          attempt_count?: number
          case_reference?: string | null
          channel?: string
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          organisation_id?: string
          payload?: Json
          provider_reference?: string | null
          recipient_email?: string
          recipient_user_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          template_key?: string
          template_version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          category: string
          created_at: string
          email_enabled: boolean
          email_mode: string
          id: string
          in_app_enabled: boolean
          organisation_id: string
          quiet_hours_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          email_enabled?: boolean
          email_mode?: string
          id?: string
          in_app_enabled?: boolean
          organisation_id: string
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          email_enabled?: boolean
          email_mode?: string
          id?: string
          in_app_enabled?: boolean
          organisation_id?: string
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_template: string
          channel: string
          created_at: string
          enabled: boolean
          id: string
          organisation_id: string | null
          subject: string
          template_key: string
          updated_at: string
          version: number
        }
        Insert: {
          body_template: string
          channel?: string
          created_at?: string
          enabled?: boolean
          id?: string
          organisation_id?: string | null
          subject: string
          template_key: string
          updated_at?: string
          version?: number
        }
        Update: {
          body_template?: string
          channel?: string
          created_at?: string
          enabled?: boolean
          id?: string
          organisation_id?: string | null
          subject?: string
          template_key?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_route: string | null
          archived_at: string | null
          body: string
          category: string
          created_at: string
          deduplication_key: string | null
          id: string
          job_id: string | null
          notification_type: string
          organisation_id: string
          priority: string
          read_at: string | null
          recipient_user_id: string
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
        }
        Insert: {
          action_label?: string | null
          action_route?: string | null
          archived_at?: string | null
          body: string
          category: string
          created_at?: string
          deduplication_key?: string | null
          id?: string
          job_id?: string | null
          notification_type: string
          organisation_id: string
          priority?: string
          read_at?: string | null
          recipient_user_id: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
        }
        Update: {
          action_label?: string | null
          action_route?: string | null
          archived_at?: string | null
          body?: string
          category?: string
          created_at?: string
          deduplication_key?: string | null
          id?: string
          job_id?: string | null
          notification_type?: string
          organisation_id?: string
          priority?: string
          read_at?: string | null
          recipient_user_id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_job_packs: {
        Row: {
          created_at: string | null
          device_id: string
          estimated_size_bytes: number | null
          expires_at: string | null
          id: string
          included_categories: Json | null
          job_id: string
          last_refreshed: string | null
          organisation_id: string
          status: Database["public"]["Enums"]["job_pack_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id: string
          estimated_size_bytes?: number | null
          expires_at?: string | null
          id?: string
          included_categories?: Json | null
          job_id: string
          last_refreshed?: string | null
          organisation_id: string
          status?: Database["public"]["Enums"]["job_pack_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string
          estimated_size_bytes?: number | null
          expires_at?: string | null
          id?: string
          included_categories?: Json | null
          job_id?: string
          last_refreshed?: string | null
          organisation_id?: string
          status?: Database["public"]["Enums"]["job_pack_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_job_packs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "registered_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_job_packs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_job_packs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_mutations: {
        Row: {
          action: string
          base_server_version: string | null
          client_created_at: string | null
          completed_at: string | null
          created_at: string | null
          dependencies: Json | null
          device_id: string
          entity_id: string | null
          entity_type: string
          error_category: string | null
          id: string
          idempotency_key: string
          job_id: string | null
          last_error: string | null
          max_retries: number | null
          organisation_id: string
          payload: Json
          retry_count: number | null
          server_receipt: Json | null
          server_received_at: string | null
          status: Database["public"]["Enums"]["mutation_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action: string
          base_server_version?: string | null
          client_created_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          dependencies?: Json | null
          device_id: string
          entity_id?: string | null
          entity_type: string
          error_category?: string | null
          id?: string
          idempotency_key: string
          job_id?: string | null
          last_error?: string | null
          max_retries?: number | null
          organisation_id: string
          payload: Json
          retry_count?: number | null
          server_receipt?: Json | null
          server_received_at?: string | null
          status?: Database["public"]["Enums"]["mutation_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action?: string
          base_server_version?: string | null
          client_created_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          dependencies?: Json | null
          device_id?: string
          entity_id?: string | null
          entity_type?: string
          error_category?: string | null
          id?: string
          idempotency_key?: string
          job_id?: string | null
          last_error?: string | null
          max_retries?: number | null
          organisation_id?: string
          payload?: Json
          retry_count?: number | null
          server_receipt?: Json | null
          server_received_at?: string | null
          status?: Database["public"]["Enums"]["mutation_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_mutations_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "registered_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_mutations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_mutations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_acknowledgements: {
        Row: {
          acknowledged_at: string
          acknowledged_by: string | null
          confirmed_delivery_date: string | null
          id: string
          notes: string | null
          purchase_order_id: string
          response_type: string
          supplier_contact_name: string | null
          supplier_reference: string | null
        }
        Insert: {
          acknowledged_at?: string
          acknowledged_by?: string | null
          confirmed_delivery_date?: string | null
          id?: string
          notes?: string | null
          purchase_order_id: string
          response_type: string
          supplier_contact_name?: string | null
          supplier_reference?: string | null
        }
        Update: {
          acknowledged_at?: string
          acknowledged_by?: string | null
          confirmed_delivery_date?: string | null
          id?: string
          notes?: string | null
          purchase_order_id?: string
          response_type?: string
          supplier_contact_name?: string | null
          supplier_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_acknowledgements_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_billing_customers: {
        Row: {
          billing_address: Json | null
          billing_email: string | null
          billing_name: string | null
          created_at: string
          id: string
          organisation_id: string
          stripe_customer_email: string | null
          stripe_customer_id: string
          tax_id: string | null
          tax_id_type: string | null
          updated_at: string
        }
        Insert: {
          billing_address?: Json | null
          billing_email?: string | null
          billing_name?: string | null
          created_at?: string
          id?: string
          organisation_id: string
          stripe_customer_email?: string | null
          stripe_customer_id: string
          tax_id?: string | null
          tax_id_type?: string | null
          updated_at?: string
        }
        Update: {
          billing_address?: Json | null
          billing_email?: string | null
          billing_name?: string | null
          created_at?: string
          id?: string
          organisation_id?: string
          stripe_customer_email?: string | null
          stripe_customer_id?: string
          tax_id?: string | null
          tax_id_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_billing_customers_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_entitlements: {
        Row: {
          created_at: string
          effective_at: string
          expires_at: string | null
          feature_id: string
          id: string
          is_enabled: boolean
          limit_unit: string | null
          limit_value: number | null
          organisation_id: string
          plan_id: string | null
          provider_event_id: string | null
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_at?: string
          expires_at?: string | null
          feature_id: string
          id?: string
          is_enabled?: boolean
          limit_unit?: string | null
          limit_value?: number | null
          organisation_id: string
          plan_id?: string | null
          provider_event_id?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_at?: string
          expires_at?: string | null
          feature_id?: string
          id?: string
          is_enabled?: boolean
          limit_unit?: string | null
          limit_value?: number | null
          organisation_id?: string
          plan_id?: string | null
          provider_event_id?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_entitlements_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "billing_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_entitlements_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_entitlements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_feature_overrides: {
        Row: {
          created_at: string
          flag_id: string
          id: string
          organisation_id: string
          overridden_state: boolean
          reason: string | null
          set_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          flag_id: string
          id?: string
          organisation_id: string
          overridden_state: boolean
          reason?: string | null
          set_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          flag_id?: string
          id?: string
          organisation_id?: string
          overridden_state?: boolean
          reason?: string | null
          set_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_feature_overrides_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "platform_feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_feature_overrides_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          organisation_id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organisation_id: string
          role: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organisation_id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_mobile_config: {
        Row: {
          allowed_categories: Json | null
          created_at: string | null
          evidence_quality: string | null
          id: string
          location_capture_allowed: boolean | null
          max_offline_jobs_per_device: number | null
          mobile_data_uploads: boolean | null
          mobile_enabled: boolean | null
          offline_enabled: boolean | null
          organisation_id: string
          pack_expiry_days: number | null
          push_categories: Json | null
          shared_device_lock_minutes: number | null
          shared_device_mode: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_categories?: Json | null
          created_at?: string | null
          evidence_quality?: string | null
          id?: string
          location_capture_allowed?: boolean | null
          max_offline_jobs_per_device?: number | null
          mobile_data_uploads?: boolean | null
          mobile_enabled?: boolean | null
          offline_enabled?: boolean | null
          organisation_id: string
          pack_expiry_days?: number | null
          push_categories?: Json | null
          shared_device_lock_minutes?: number | null
          shared_device_mode?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_categories?: Json | null
          created_at?: string | null
          evidence_quality?: string | null
          id?: string
          location_capture_allowed?: boolean | null
          max_offline_jobs_per_device?: number | null
          mobile_data_uploads?: boolean | null
          mobile_enabled?: boolean | null
          offline_enabled?: boolean | null
          organisation_id?: string
          pack_expiry_days?: number | null
          push_categories?: Json | null
          shared_device_lock_minutes?: number | null
          shared_device_mode?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organisation_mobile_config_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          organisation_id: string
          previous_status: string | null
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          organisation_id: string
          previous_status?: string | null
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          organisation_id?: string
          previous_status?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organisation_status_history_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_subscriptions: {
        Row: {
          access_state: Database["public"]["Enums"]["billing_access_state"]
          billing_interval:
            | Database["public"]["Enums"]["billing_interval"]
            | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          ended_at: string | null
          grace_period_days: number
          grace_period_ends_at: string | null
          id: string
          latest_invoice_id: string | null
          latest_invoice_status: string | null
          organisation_id: string
          pause_collection: Json | null
          plan_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          access_state?: Database["public"]["Enums"]["billing_access_state"]
          billing_interval?:
            | Database["public"]["Enums"]["billing_interval"]
            | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          grace_period_days?: number
          grace_period_ends_at?: string | null
          id?: string
          latest_invoice_id?: string | null
          latest_invoice_status?: string | null
          organisation_id: string
          pause_collection?: Json | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          access_state?: Database["public"]["Enums"]["billing_access_state"]
          billing_interval?:
            | Database["public"]["Enums"]["billing_interval"]
            | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          grace_period_days?: number
          grace_period_ends_at?: string | null
          id?: string
          latest_invoice_id?: string | null
          latest_invoice_status?: string | null
          organisation_id?: string
          pause_collection?: Json | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_subscriptions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_usage_snapshots: {
        Row: {
          calculated_at: string
          created_at: string
          current_value: number
          feature_key: string
          id: string
          limit_value: number | null
          organisation_id: string
          warning_threshold_100: boolean
          warning_threshold_80: boolean
          warning_threshold_90: boolean
        }
        Insert: {
          calculated_at?: string
          created_at?: string
          current_value?: number
          feature_key: string
          id?: string
          limit_value?: number | null
          organisation_id: string
          warning_threshold_100?: boolean
          warning_threshold_80?: boolean
          warning_threshold_90?: boolean
        }
        Update: {
          calculated_at?: string
          created_at?: string
          current_value?: number
          feature_key?: string
          id?: string
          limit_value?: number | null
          organisation_id?: string
          warning_threshold_100?: boolean
          warning_threshold_80?: boolean
          warning_threshold_90?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "organisation_usage_snapshots_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          archived_at: string | null
          company_number: string | null
          county: string | null
          created_at: string
          created_by: string | null
          default_currency: string
          email: string | null
          id: string
          logo_path: string | null
          name: string
          phone: string | null
          postcode: string | null
          town_city: string | null
          trading_name: string | null
          updated_at: string
          utr_reference: string | null
          vat_number: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          archived_at?: string | null
          company_number?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          default_currency?: string
          email?: string | null
          id?: string
          logo_path?: string | null
          name: string
          phone?: string | null
          postcode?: string | null
          town_city?: string | null
          trading_name?: string | null
          updated_at?: string
          utr_reference?: string | null
          vat_number?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          archived_at?: string | null
          company_number?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          default_currency?: string
          email?: string | null
          id?: string
          logo_path?: string | null
          name?: string
          phone?: string | null
          postcode?: string | null
          town_city?: string | null
          trading_name?: string | null
          updated_at?: string
          utr_reference?: string | null
          vat_number?: string | null
        }
        Relationships: []
      }
      passport_checks: {
        Row: {
          check_category: string
          created_at: string
          id: string
          note: string | null
          organisation_id: string
          person_id: string
          status: string
          updated_at: string
        }
        Insert: {
          check_category: string
          created_at?: string
          id?: string
          note?: string | null
          organisation_id: string
          person_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          check_category?: string
          created_at?: string
          id?: string
          note?: string | null
          organisation_id?: string
          person_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "passport_checks_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passport_checks_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "workforce_people"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_applications: {
        Row: {
          amount_due_pence: number
          application_date: string
          created_at: string
          created_by: string | null
          id: string
          job_id: string
          organisation_id: string
          previous_certified_pence: number
          reference: string
          retention_pence: number
          status: string
          updated_at: string
          valuation_pence: number
        }
        Insert: {
          amount_due_pence: number
          application_date: string
          created_at?: string
          created_by?: string | null
          id?: string
          job_id: string
          organisation_id: string
          previous_certified_pence?: number
          reference: string
          retention_pence?: number
          status?: string
          updated_at?: string
          valuation_pence: number
        }
        Update: {
          amount_due_pence?: number
          application_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string
          organisation_id?: string
          previous_certified_pence?: number
          reference?: string
          retention_pence?: number
          status?: string
          updated_at?: string
          valuation_pence?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_analyses: {
        Row: {
          analysis_type: string
          analyzed_at: string
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          dismissed: boolean
          evidence_file_id: string
          evidence_record_id: string | null
          findings: Json
          id: string
          organisation_id: string
          reviewed_by_human: boolean
          updated_at: string | null
        }
        Insert: {
          analysis_type?: string
          analyzed_at?: string
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          dismissed?: boolean
          evidence_file_id: string
          evidence_record_id?: string | null
          findings?: Json
          id?: string
          organisation_id: string
          reviewed_by_human?: boolean
          updated_at?: string | null
        }
        Update: {
          analysis_type?: string
          analyzed_at?: string
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          dismissed?: boolean
          evidence_file_id?: string
          evidence_record_id?: string | null
          findings?: Json
          id?: string
          organisation_id?: string
          reviewed_by_human?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_analyses_evidence_file_id_fkey"
            columns: ["evidence_file_id"]
            isOneToOne: false
            referencedRelation: "evidence_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_analyses_evidence_record_id_fkey"
            columns: ["evidence_record_id"]
            isOneToOne: false
            referencedRelation: "evidence_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_analyses_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      plant_hire_records: {
        Row: {
          revision: number
          currency: string
          supplier_confirmation_reference: string | null
          actual_start_date: string | null
          collected_date: string | null
          cancellation_reason: string | null
          dispute_from_status: string | null
          dispute_reason: string | null
          resolution_reason: string | null
          last_extension_reference: string | null
          certificate_url: string | null
          charging_unit: string | null
          collection_address: string | null
          created_at: string
          created_by: string
          damage_charges_pence: number | null
          damage_notes: string | null
          delivery_address: string | null
          deposit_pence: number | null
          equipment_description: string
          equipment_type: string | null
          hire_end_date: string | null
          hire_reference: string | null
          hire_start_date: string
          id: string
          inspection_url: string | null
          job_id: string | null
          off_hire_date: string | null
          off_hire_reference: string | null
          operator_required: boolean
          organisation_id: string
          quantity: number
          rate_pence: number | null
          status: Database["public"]["Enums"]["hire_status"]
          supplier_id: string
          updated_at: string
        }
        Insert: {
          revision?: number
          currency?: string
          supplier_confirmation_reference?: string | null
          actual_start_date?: string | null
          collected_date?: string | null
          cancellation_reason?: string | null
          dispute_from_status?: string | null
          dispute_reason?: string | null
          resolution_reason?: string | null
          last_extension_reference?: string | null
          certificate_url?: string | null
          charging_unit?: string | null
          collection_address?: string | null
          created_at?: string
          created_by: string
          damage_charges_pence?: number | null
          damage_notes?: string | null
          delivery_address?: string | null
          deposit_pence?: number | null
          equipment_description: string
          equipment_type?: string | null
          hire_end_date?: string | null
          hire_reference?: string | null
          hire_start_date: string
          id?: string
          inspection_url?: string | null
          job_id?: string | null
          off_hire_date?: string | null
          off_hire_reference?: string | null
          operator_required?: boolean
          organisation_id: string
          quantity?: number
          rate_pence?: number | null
          status?: Database["public"]["Enums"]["hire_status"]
          supplier_id: string
          updated_at?: string
        }
        Update: {
          revision?: number
          currency?: string
          supplier_confirmation_reference?: string | null
          actual_start_date?: string | null
          collected_date?: string | null
          cancellation_reason?: string | null
          dispute_from_status?: string | null
          dispute_reason?: string | null
          resolution_reason?: string | null
          last_extension_reference?: string | null
          certificate_url?: string | null
          charging_unit?: string | null
          collection_address?: string | null
          created_at?: string
          created_by?: string
          damage_charges_pence?: number | null
          damage_notes?: string | null
          delivery_address?: string | null
          deposit_pence?: number | null
          equipment_description?: string
          equipment_type?: string | null
          hire_end_date?: string | null
          hire_reference?: string | null
          hire_start_date?: string
          id?: string
          inspection_url?: string | null
          job_id?: string | null
          off_hire_date?: string | null
          off_hire_reference?: string | null
          operator_required?: boolean
          organisation_id?: string
          quantity?: number
          rate_pence?: number | null
          status?: Database["public"]["Enums"]["hire_status"]
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plant_hire_records_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_hire_records_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_hire_records_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_access_grants: {
        Row: {
          access_request_id: string | null
          access_type: string
          created_at: string
          expires_at: string
          granted_at: string
          granted_by: string | null
          id: string
          organisation_id: string
          reason: string
          revoked_at: string | null
          scope_details: Json
          staff_user_id: string
          status: string
        }
        Insert: {
          access_request_id?: string | null
          access_type: string
          created_at?: string
          expires_at: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          organisation_id: string
          reason: string
          revoked_at?: string | null
          scope_details?: Json
          staff_user_id: string
          status?: string
        }
        Update: {
          access_request_id?: string | null
          access_type?: string
          created_at?: string
          expires_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          organisation_id?: string
          reason?: string
          revoked_at?: string | null
          scope_details?: Json
          staff_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_access_grants_access_request_id_fkey"
            columns: ["access_request_id"]
            isOneToOne: false
            referencedRelation: "platform_access_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_access_grants_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_access_requests: {
        Row: {
          access_type: string
          created_at: string
          customer_approved: boolean
          expires_at: string
          id: string
          organisation_id: string
          reason: string
          requestor_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          scope_details: Json
          status: string
          updated_at: string
        }
        Insert: {
          access_type: string
          created_at?: string
          customer_approved?: boolean
          expires_at: string
          id?: string
          organisation_id: string
          reason: string
          requestor_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          scope_details?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          access_type?: string
          created_at?: string
          customer_approved?: boolean
          expires_at?: string
          id?: string
          organisation_id?: string
          reason?: string
          requestor_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          scope_details?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_access_requests_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          ended_at: string | null
          id: string
          published_at: string | null
          scheduled_at: string | null
          status: string
          target_details: Json
          target_type: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          target_details?: Json
          target_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          target_details?: Json
          target_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_audit_events: {
        Row: {
          access_grant_id: string | null
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json
          platform_role: string | null
          reason: string | null
          request_id: string | null
          support_case_id: string | null
          target_org_id: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          access_grant_id?: string | null
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          platform_role?: string | null
          reason?: string | null
          request_id?: string | null
          support_case_id?: string | null
          target_org_id?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          access_grant_id?: string | null
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          platform_role?: string | null
          reason?: string | null
          request_id?: string | null
          support_case_id?: string | null
          target_org_id?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_audit_events_access_grant_id_fkey"
            columns: ["access_grant_id"]
            isOneToOne: false
            referencedRelation: "platform_access_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_audit_events_support_case_id_fkey"
            columns: ["support_case_id"]
            isOneToOne: false
            referencedRelation: "platform_support_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_audit_events_target_org_id_fkey"
            columns: ["target_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_feature_flags: {
        Row: {
          change_reason: string | null
          created_at: string
          created_by: string | null
          default_state: boolean
          description: string
          enabled: boolean
          end_at: string | null
          flag_key: string
          id: string
          start_at: string | null
          updated_at: string
        }
        Insert: {
          change_reason?: string | null
          created_at?: string
          created_by?: string | null
          default_state?: boolean
          description: string
          enabled?: boolean
          end_at?: string | null
          flag_key: string
          id?: string
          start_at?: string | null
          updated_at?: string
        }
        Update: {
          change_reason?: string | null
          created_at?: string
          created_by?: string | null
          default_state?: boolean
          description?: string
          enabled?: boolean
          end_at?: string | null
          flag_key?: string
          id?: string
          start_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_permission_definitions: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          permission_key: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          id?: string
          permission_key: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          permission_key?: string
        }
        Relationships: []
      }
      platform_privileged_actions: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          ip_address: string | null
          organisation_id: string | null
          reason: string | null
          request_id: string | null
          result_summary: string | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          organisation_id?: string | null
          reason?: string | null
          request_id?: string | null
          result_summary?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          organisation_id?: string | null
          reason?: string | null
          request_id?: string | null
          result_summary?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_privileged_actions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "platform_permission_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_staff: {
        Row: {
          created_at: string
          id: string
          invitation_accepted_at: string | null
          invited_by: string | null
          last_sign_in_at: string | null
          mfa_enrolled: boolean
          role: string
          status: string
          suspended_at: string | null
          suspended_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitation_accepted_at?: string | null
          invited_by?: string | null
          last_sign_in_at?: string | null
          mfa_enrolled?: boolean
          role?: string
          status?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invitation_accepted_at?: string | null
          invited_by?: string | null
          last_sign_in_at?: string | null
          mfa_enrolled?: boolean
          role?: string
          status?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_staff_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_hash: string
          invited_by: string
          revoked_at: string | null
          role: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invitation_hash: string
          invited_by: string
          revoked_at?: string | null
          role: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_hash?: string
          invited_by?: string
          revoked_at?: string | null
          role?: string
          status?: string
        }
        Relationships: []
      }
      platform_support_cases: {
        Row: {
          assigned_to: string | null
          category: string
          closed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          organisation_id: string
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          organisation_id: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          organisation_id?: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_support_cases_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_access: {
        Row: {
          accepted_at: string | null
          access_type: string
          client_id: string | null
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          job_scope: string[] | null
          last_accessed_at: string | null
          organisation_id: string
          permissions: string[]
          revoked_at: string | null
          status: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          access_type: string
          client_id?: string | null
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          job_scope?: string[] | null
          last_accessed_at?: string | null
          organisation_id: string
          permissions?: string[]
          revoked_at?: string | null
          status?: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          access_type?: string
          client_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          job_scope?: string[] | null
          last_accessed_at?: string | null
          organisation_id?: string
          permissions?: string[]
          revoked_at?: string | null
          status?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_access_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_rule_history: {
        Row: {
          id: string
          organisation_id: string
          rule_id: string
          actor_id: string
          reason: string
          before_record: Json | null
          after_record: Json
          created_at: string
        }
        Insert: {
          id?: string
          organisation_id: string
          rule_id: string
          actor_id: string
          reason: string
          before_record?: Json | null
          after_record: Json
          created_at?: string
        }
        Update: {
          id?: string
          organisation_id?: string
          rule_id?: string
          actor_id?: string
          reason?: string
          before_record?: Json | null
          after_record?: Json
          created_at?: string
        }
        Relationships: []
      }
      procurement_approval_rules: {
        Row: {
          revision: number
          currency: string
          approval_order: number
          approver_role: string
          cost_code: string | null
          created_at: string
          id: string
          is_active: boolean
          is_emergency_allowed: boolean
          job_id: string | null
          max_value_pence: number | null
          min_value_pence: number
          organisation_id: string
          prevent_self_approval: boolean
          rule_name: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          revision?: number
          currency?: string
          approval_order?: number
          approver_role: string
          cost_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_emergency_allowed?: boolean
          job_id?: string | null
          max_value_pence?: number | null
          min_value_pence?: number
          organisation_id: string
          prevent_self_approval?: boolean
          rule_name: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          revision?: number
          currency?: string
          approval_order?: number
          approver_role?: string
          cost_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_emergency_allowed?: boolean
          job_id?: string | null
          max_value_pence?: number | null
          min_value_pence?: number
          organisation_id?: string
          prevent_self_approval?: boolean
          rule_name?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_approval_rules_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_approval_rules_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_approval_rules_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_approvals: {
        Row: {
          action: string
          requisition_revision: number | null
          review_snapshot: Json
          approval_rule_id: string | null
          approver_id: string
          created_at: string
          decided_at: string | null
          decision: Database["public"]["Enums"]["approval_decision"]
          decision_reason: string | null
          id: string
          requisition_id: string | null
        }
        Insert: {
          action?: string
          requisition_revision?: number | null
          review_snapshot?: Json
          approval_rule_id?: string | null
          approver_id: string
          created_at?: string
          decided_at?: string | null
          decision?: Database["public"]["Enums"]["approval_decision"]
          decision_reason?: string | null
          id?: string
          requisition_id?: string | null
        }
        Update: {
          action?: string
          requisition_revision?: number | null
          review_snapshot?: Json
          approval_rule_id?: string | null
          approver_id?: string
          created_at?: string
          decided_at?: string | null
          decision?: Database["public"]["Enums"]["approval_decision"]
          decision_reason?: string | null
          id?: string
          requisition_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_approvals_approval_rule_id_fkey"
            columns: ["approval_rule_id"]
            isOneToOne: false
            referencedRelation: "procurement_approval_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_approvals_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "purchase_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          job_title: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_documents: {
        Row: {
          archived_at: string | null
          bucket: string
          category: string
          id: string
          job_id: string | null
          mime_type: string
          name: string
          object_path: string
          organisation_id: string
          original_filename: string
          size_bytes: number
          uploaded_at: string
          uploaded_by: string | null
          version: number
          visibility: string
        }
        Insert: {
          archived_at?: string | null
          bucket: string
          category: string
          id?: string
          job_id?: string | null
          mime_type: string
          name: string
          object_path: string
          organisation_id: string
          original_filename: string
          size_bytes?: number
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
          visibility?: string
        }
        Update: {
          archived_at?: string | null
          bucket?: string
          category?: string
          id?: string
          job_id?: string | null
          mime_type?: string
          name?: string
          object_path?: string
          organisation_id?: string
          original_filename?: string
          size_bytes?: number
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          created_at: string
          description: string
          id: string
          line_number: number
          line_total_pence: number | null
          material_item_id: string | null
          notes: string | null
          purchase_order_id: string
          quantity: number
          received_quantity: number | null
          requisition_line_id: string | null
          tax_rate: number | null
          unit_of_measure: string
          unit_price_pence: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          line_number: number
          line_total_pence?: number | null
          material_item_id?: string | null
          notes?: string | null
          purchase_order_id: string
          quantity?: number
          received_quantity?: number | null
          requisition_line_id?: string | null
          tax_rate?: number | null
          unit_of_measure?: string
          unit_price_pence: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          line_number?: number
          line_total_pence?: number | null
          material_item_id?: string | null
          notes?: string | null
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number | null
          requisition_line_id?: string | null
          tax_rate?: number | null
          unit_of_measure?: string
          unit_price_pence?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_material_item_id_fkey"
            columns: ["material_item_id"]
            isOneToOne: false
            referencedRelation: "material_catalogue_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_requisition_line_id_fkey"
            columns: ["requisition_line_id"]
            isOneToOne: false
            referencedRelation: "requisition_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_snapshots: {
        Row: {
          created_at: string
          created_by: string
          id: string
          po_pdf_hash: string | null
          po_pdf_url: string | null
          purchase_order_id: string
          snapshot_data: Json
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          po_pdf_hash?: string | null
          po_pdf_url?: string | null
          purchase_order_id: string
          snapshot_data: Json
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          po_pdf_hash?: string | null
          po_pdf_url?: string | null
          purchase_order_id?: string
          snapshot_data?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_snapshots_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_versions: {
        Row: {
          change_reason: string
          changed_by: string
          created_at: string
          id: string
          purchase_order_id: string
          snapshot: Json
          version: number
        }
        Insert: {
          change_reason: string
          changed_by: string
          created_at?: string
          id?: string
          purchase_order_id: string
          snapshot: Json
          version: number
        }
        Update: {
          change_reason?: string
          changed_by?: string
          created_at?: string
          id?: string
          purchase_order_id?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_versions_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          returns_recorded_at: string | null
          cancelled_by: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          currency: string
          acknowledged_at: string | null
          approved_by: string | null
          closed_at: string | null
          cost_code: string | null
          created_at: string
          delivery_address: string | null
          delivery_charge_pence: number | null
          delivery_contact: string | null
          gross_total_pence: number | null
          id: string
          instructions: string | null
          issued_at: string | null
          job_id: string | null
          net_total_pence: number | null
          order_date: string | null
          organisation_id: string
          po_number: string
          requested_by: string
          required_delivery_date: string | null
          sent_at: string | null
          sent_to: string | null
          status: Database["public"]["Enums"]["purchase_order_status"]
          supplier_id: string
          supplier_quote_reference: string | null
          tax_rate: number | null
          tax_total_pence: number | null
          terms_reference: string | null
          updated_at: string
          version: number
        }
        Insert: {
          returns_recorded_at?: string | null
          cancelled_by?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          currency?: string
          acknowledged_at?: string | null
          approved_by?: string | null
          closed_at?: string | null
          cost_code?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_charge_pence?: number | null
          delivery_contact?: string | null
          gross_total_pence?: number | null
          id?: string
          instructions?: string | null
          issued_at?: string | null
          job_id?: string | null
          net_total_pence?: number | null
          order_date?: string | null
          organisation_id: string
          po_number: string
          requested_by: string
          required_delivery_date?: string | null
          sent_at?: string | null
          sent_to?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"]
          supplier_id: string
          supplier_quote_reference?: string | null
          tax_rate?: number | null
          tax_total_pence?: number | null
          terms_reference?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          returns_recorded_at?: string | null
          cancelled_by?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          currency?: string
          acknowledged_at?: string | null
          approved_by?: string | null
          closed_at?: string | null
          cost_code?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_charge_pence?: number | null
          delivery_contact?: string | null
          gross_total_pence?: number | null
          id?: string
          instructions?: string | null
          issued_at?: string | null
          job_id?: string | null
          net_total_pence?: number | null
          order_date?: string | null
          organisation_id?: string
          po_number?: string
          requested_by?: string
          required_delivery_date?: string | null
          sent_at?: string | null
          sent_to?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"]
          supplier_id?: string
          supplier_quote_reference?: string | null
          tax_rate?: number | null
          tax_total_pence?: number | null
          terms_reference?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requisitions: {
        Row: {
          revision: number
          currency: string
          review_steps: Json
          approved_at: string | null
          cost_code: string | null
          created_at: string
          delivery_location: string | null
          estimated_cost_pence: number | null
          id: string
          job_id: string | null
          organisation_id: string
          priority: string | null
          reason: string | null
          reference: string
          requester_id: string
          required_by_date: string | null
          status: Database["public"]["Enums"]["requisition_status"]
          submitted_at: string | null
          task_or_phase: string | null
          updated_at: string
        }
        Insert: {
          revision?: number
          currency?: string
          review_steps?: Json
          approved_at?: string | null
          cost_code?: string | null
          created_at?: string
          delivery_location?: string | null
          estimated_cost_pence?: number | null
          id?: string
          job_id?: string | null
          organisation_id: string
          priority?: string | null
          reason?: string | null
          reference: string
          requester_id: string
          required_by_date?: string | null
          status?: Database["public"]["Enums"]["requisition_status"]
          submitted_at?: string | null
          task_or_phase?: string | null
          updated_at?: string
        }
        Update: {
          revision?: number
          currency?: string
          review_steps?: Json
          approved_at?: string | null
          cost_code?: string | null
          created_at?: string
          delivery_location?: string | null
          estimated_cost_pence?: number | null
          id?: string
          job_id?: string | null
          organisation_id?: string
          priority?: string | null
          reason?: string | null
          reference?: string
          requester_id?: string
          required_by_date?: string | null
          status?: Database["public"]["Enums"]["requisition_status"]
          submitted_at?: string | null
          task_or_phase?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requisitions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requisitions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          categories: Json | null
          created_at: string | null
          device_id: string
          endpoint: string
          expires_at: string | null
          id: string
          last_delivered: string | null
          organisation_id: string
          p256dh_key: string
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          revoked_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          categories?: Json | null
          created_at?: string | null
          device_id: string
          endpoint: string
          expires_at?: string | null
          id?: string
          last_delivered?: string | null
          organisation_id: string
          p256dh_key: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          revoked_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          categories?: Json | null
          created_at?: string | null
          device_id?: string
          endpoint?: string
          expires_at?: string | null
          id?: string
          last_delivered?: string | null
          organisation_id?: string
          p256dh_key?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          revoked_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "registered_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      qualifications: {
        Row: {
          created_at: string
          evidence_path: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuer: string | null
          organisation_id: string
          person_id: string
          qualification_name: string
          reference: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          evidence_path?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          organisation_id: string
          person_id: string
          qualification_name: string
          reference?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          evidence_path?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          organisation_id?: string
          person_id?: string
          qualification_name?: string
          reference?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qualifications_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualifications_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "workforce_people"
            referencedColumns: ["id"]
          },
        ]
      }
      rams_documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          control_measures: Json
          created_at: string | null
          created_by: string | null
          generated_by_ai: boolean
          hazards: Json
          id: string
          job_id: string | null
          organisation_id: string
          reviewed_by: string | null
          scope_summary: string | null
          status: string
          title: string
          updated_at: string | null
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          control_measures?: Json
          created_at?: string | null
          created_by?: string | null
          generated_by_ai?: boolean
          hazards?: Json
          id?: string
          job_id?: string | null
          organisation_id: string
          reviewed_by?: string | null
          scope_summary?: string | null
          status?: string
          title: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          control_measures?: Json
          created_at?: string | null
          created_by?: string | null
          generated_by_ai?: boolean
          hazards?: Json
          id?: string
          job_id?: string | null
          organisation_id?: string
          reviewed_by?: string | null
          scope_summary?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "rams_documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rams_documents_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      registered_devices: {
        Row: {
          app_version: string | null
          browser: string | null
          created_at: string | null
          device_id: string
          device_name: string | null
          first_seen: string | null
          id: string
          last_seen: string | null
          last_sync: string | null
          offline_enabled: boolean | null
          platform: string | null
          push_enabled: boolean | null
          revoked_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_version?: string | null
          browser?: string | null
          created_at?: string | null
          device_id: string
          device_name?: string | null
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          last_sync?: string | null
          offline_enabled?: boolean | null
          platform?: string | null
          push_enabled?: boolean | null
          revoked_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_version?: string | null
          browser?: string | null
          created_at?: string | null
          device_id?: string
          device_name?: string | null
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          last_sync?: string | null
          offline_enabled?: boolean | null
          platform?: string | null
          push_enabled?: boolean | null
          revoked_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      report_exports: {
        Row: {
          audit_ref: string | null
          created_at: string | null
          exported_by: string
          filter_summary: Json | null
          id: string
          organisation_id: string
          output_format: string
          record_count: number | null
          report_type: string
          visibility: string
        }
        Insert: {
          audit_ref?: string | null
          created_at?: string | null
          exported_by: string
          filter_summary?: Json | null
          id?: string
          organisation_id: string
          output_format: string
          record_count?: number | null
          report_type: string
          visibility: string
        }
        Update: {
          audit_ref?: string | null
          created_at?: string | null
          exported_by?: string
          filter_summary?: Json | null
          id?: string
          organisation_id?: string
          output_format?: string
          record_count?: number | null
          report_type?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_exports_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      report_recipients: {
        Row: {
          added_at: string | null
          email: string
          id: string
          recipient_type: string
          schedule_id: string
          user_id: string | null
        }
        Insert: {
          added_at?: string | null
          email: string
          id?: string
          recipient_type: string
          schedule_id: string
          user_id?: string | null
        }
        Update: {
          added_at?: string | null
          email?: string
          id?: string
          recipient_type?: string
          schedule_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_recipients_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "report_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      report_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string
          error_category: string | null
          id: string
          idempotency_key: string | null
          organisation_id: string
          output_format: string
          output_path: string | null
          report_id: string | null
          report_name: string
          started_at: string
          status: string
          trigger: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          error_category?: string | null
          id?: string
          idempotency_key?: string | null
          organisation_id: string
          output_format?: string
          output_path?: string | null
          report_id?: string | null
          report_name: string
          started_at?: string
          status?: string
          trigger: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          error_category?: string | null
          id?: string
          idempotency_key?: string | null
          organisation_id?: string
          output_format?: string
          output_path?: string | null
          report_id?: string | null
          report_name?: string
          started_at?: string
          status?: string
          trigger?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_runs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_runs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "saved_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_schedules: {
        Row: {
          active: boolean | null
          client_safe: boolean | null
          created_at: string | null
          created_by: string
          day_of_month: number | null
          delivery_time: string
          frequency: string
          id: string
          last_run: string | null
          last_status: string | null
          next_run: string | null
          organisation_id: string
          output_format: string
          recipients: string[]
          saved_report_id: string
          timezone: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          client_safe?: boolean | null
          created_at?: string | null
          created_by: string
          day_of_month?: number | null
          delivery_time?: string
          frequency: string
          id?: string
          last_run?: string | null
          last_status?: string | null
          next_run?: string | null
          organisation_id: string
          output_format?: string
          recipients?: string[]
          saved_report_id: string
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          client_safe?: boolean | null
          created_at?: string | null
          created_by?: string
          day_of_month?: number | null
          delivery_time?: string
          frequency?: string
          id?: string
          last_run?: string | null
          last_status?: string | null
          next_run?: string | null
          organisation_id?: string
          output_format?: string
          recipients?: string[]
          saved_report_id?: string
          timezone?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_schedules_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_schedules_saved_report_id_fkey"
            columns: ["saved_report_id"]
            isOneToOne: false
            referencedRelation: "saved_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_snapshots: {
        Row: {
          applied_filters: Json | null
          created_at: string | null
          generated_by: string
          id: string
          organisation_id: string
          output_hash: string | null
          output_path: string | null
          related_client_id: string | null
          related_job_id: string | null
          report_id: string | null
          report_type: string
          scope: Json | null
          snapshot_timestamp: string
          superseded: boolean | null
          version: number
          visibility: string
        }
        Insert: {
          applied_filters?: Json | null
          created_at?: string | null
          generated_by: string
          id?: string
          organisation_id: string
          output_hash?: string | null
          output_path?: string | null
          related_client_id?: string | null
          related_job_id?: string | null
          report_id?: string | null
          report_type: string
          scope?: Json | null
          snapshot_timestamp?: string
          superseded?: boolean | null
          version?: number
          visibility: string
        }
        Update: {
          applied_filters?: Json | null
          created_at?: string | null
          generated_by?: string
          id?: string
          organisation_id?: string
          output_hash?: string | null
          output_path?: string | null
          related_client_id?: string | null
          related_job_id?: string | null
          report_id?: string | null
          report_type?: string
          scope?: Json | null
          snapshot_timestamp?: string
          superseded?: boolean | null
          version?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_snapshots_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_snapshots_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "saved_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      requests_for_quotation: {
        Row: {
          source_requisition_id: string | null
          currency: string
          revision: number
          awarded_quote_id: string | null
          purchase_order_id: string | null
          cancellation_reason: string | null
          awarded_at: string | null
          closed_at: string | null
          commercial_notes: string | null
          created_at: string
          created_by: string
          delivery_address: string | null
          description: string | null
          id: string
          internal_notes: string | null
          issued_at: string | null
          job_id: string | null
          organisation_id: string
          reference: string
          required_by_date: string | null
          response_deadline: string | null
          status: Database["public"]["Enums"]["rfq_status"]
          updated_at: string
        }
        Insert: {
          source_requisition_id?: string | null
          currency?: string
          revision?: number
          awarded_quote_id?: string | null
          purchase_order_id?: string | null
          cancellation_reason?: string | null
          awarded_at?: string | null
          closed_at?: string | null
          commercial_notes?: string | null
          created_at?: string
          created_by: string
          delivery_address?: string | null
          description?: string | null
          id?: string
          internal_notes?: string | null
          issued_at?: string | null
          job_id?: string | null
          organisation_id: string
          reference: string
          required_by_date?: string | null
          response_deadline?: string | null
          status?: Database["public"]["Enums"]["rfq_status"]
          updated_at?: string
        }
        Update: {
          source_requisition_id?: string | null
          currency?: string
          revision?: number
          awarded_quote_id?: string | null
          purchase_order_id?: string | null
          cancellation_reason?: string | null
          awarded_at?: string | null
          closed_at?: string | null
          commercial_notes?: string | null
          created_at?: string
          created_by?: string
          delivery_address?: string | null
          description?: string | null
          id?: string
          internal_notes?: string | null
          issued_at?: string | null
          job_id?: string | null
          organisation_id?: string
          reference?: string
          required_by_date?: string | null
          response_deadline?: string | null
          status?: Database["public"]["Enums"]["rfq_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_for_quotation_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_for_quotation_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      requisition_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          requisition_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          requisition_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          requisition_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisition_attachments_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "purchase_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      requisition_lines: {
        Row: {
          cost_code: string | null
          created_at: string
          description: string
          estimated_line_total_pence: number | null
          estimated_unit_price_pence: number | null
          id: string
          line_number: number
          material_item_id: string | null
          notes: string | null
          quantity: number
          requisition_id: string
          suggested_supplier_id: string | null
          unit_of_measure: string
        }
        Insert: {
          cost_code?: string | null
          created_at?: string
          description: string
          estimated_line_total_pence?: number | null
          estimated_unit_price_pence?: number | null
          id?: string
          line_number: number
          material_item_id?: string | null
          notes?: string | null
          quantity?: number
          requisition_id: string
          suggested_supplier_id?: string | null
          unit_of_measure?: string
        }
        Update: {
          cost_code?: string | null
          created_at?: string
          description?: string
          estimated_line_total_pence?: number | null
          estimated_unit_price_pence?: number | null
          id?: string
          line_number?: number
          material_item_id?: string | null
          notes?: string | null
          quantity?: number
          requisition_id?: string
          suggested_supplier_id?: string | null
          unit_of_measure?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisition_lines_material_item_id_fkey"
            columns: ["material_item_id"]
            isOneToOne: false
            referencedRelation: "material_catalogue_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_lines_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "purchase_requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_lines_suggested_supplier_id_fkey"
            columns: ["suggested_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      retention_records: {
        Row: {
          amount_pence: number
          created_at: string
          due_date: string | null
          id: string
          job_id: string
          organisation_id: string
          percentage: number
          released_pence: number
          retention_type: string
          status: string
          updated_at: string
          withheld_pence: number
        }
        Insert: {
          amount_pence: number
          created_at?: string
          due_date?: string | null
          id?: string
          job_id: string
          organisation_id: string
          percentage: number
          released_pence?: number
          retention_type: string
          status?: string
          updated_at?: string
          withheld_pence?: number
        }
        Update: {
          amount_pence?: number
          created_at?: string
          due_date?: string | null
          id?: string
          job_id?: string
          organisation_id?: string
          percentage?: number
          released_pence?: number
          retention_type?: string
          status?: string
          updated_at?: string
          withheld_pence?: number
        }
        Relationships: [
          {
            foreignKeyName: "retention_records_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retention_records_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_documents: {
        Row: {
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          rfq_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          rfq_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          rfq_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_documents_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "requests_for_quotation"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_lines: {
        Row: {
          requisition_line_id: string | null
          created_at: string
          description: string
          id: string
          line_number: number
          material_item_id: string | null
          notes: string | null
          quantity: number
          rfq_id: string
          specification: string | null
          unit_of_measure: string
        }
        Insert: {
          requisition_line_id?: string | null
          created_at?: string
          description: string
          id?: string
          line_number: number
          material_item_id?: string | null
          notes?: string | null
          quantity?: number
          rfq_id: string
          specification?: string | null
          unit_of_measure?: string
        }
        Update: {
          requisition_line_id?: string | null
          created_at?: string
          description?: string
          id?: string
          line_number?: number
          material_item_id?: string | null
          notes?: string | null
          quantity?: number
          rfq_id?: string
          specification?: string | null
          unit_of_measure?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_lines_material_item_id_fkey"
            columns: ["material_item_id"]
            isOneToOne: false
            referencedRelation: "material_catalogue_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_lines_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "requests_for_quotation"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_suppliers: {
        Row: {
          created_at: string
          id: string
          intention_to_quote: boolean | null
          invitation_sent_at: string | null
          invitation_token: string | null
          notes: string | null
          response_at: string | null
          response_received: boolean
          rfq_id: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          intention_to_quote?: boolean | null
          invitation_sent_at?: string | null
          invitation_token?: string | null
          notes?: string | null
          response_at?: string | null
          response_received?: boolean
          rfq_id: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          id?: string
          intention_to_quote?: boolean | null
          invitation_sent_at?: string | null
          invitation_token?: string | null
          notes?: string | null
          response_at?: string | null
          response_received?: boolean
          rfq_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_suppliers_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "requests_for_quotation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          archived_at: string | null
          created_at: string | null
          description: string | null
          filter_config: Json | null
          id: string
          name: string
          organisation_id: string
          owner_id: string
          report_type: string
          selected_sections: string[] | null
          shared_with_roles: string[] | null
          updated_at: string | null
          visibility: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          description?: string | null
          filter_config?: Json | null
          id?: string
          name: string
          organisation_id: string
          owner_id: string
          report_type: string
          selected_sections?: string[] | null
          shared_with_roles?: string[] | null
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          description?: string | null
          filter_config?: Json | null
          id?: string
          name?: string
          organisation_id?: string
          owner_id?: string
          report_type?: string
          selected_sections?: string[] | null
          shared_with_roles?: string[] | null
          updated_at?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      snagging_items: {
        Row: {
          archived_at: string | null
          area: string | null
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          defect_type: string
          description: string | null
          id: string
          job_id: string | null
          organisation_id: string
          photo_urls: Json
          raised_by: string | null
          reference: string
          resolution_note: string | null
          severity: string
          status: string
          target_date: string | null
          title: string
          trade: string | null
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          area?: string | null
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          defect_type?: string
          description?: string | null
          id?: string
          job_id?: string | null
          organisation_id: string
          photo_urls?: Json
          raised_by?: string | null
          reference: string
          resolution_note?: string | null
          severity?: string
          status?: string
          target_date?: string | null
          title: string
          trade?: string | null
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          area?: string | null
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          defect_type?: string
          description?: string | null
          id?: string
          job_id?: string | null
          organisation_id?: string
          photo_urls?: Json
          raised_by?: string | null
          reference?: string
          resolution_note?: string | null
          severity?: string
          status?: string
          target_date?: string | null
          title?: string
          trade?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snagging_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snagging_items_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      statutory_deadlines: {
        Row: {
          actioned_at: string | null
          actioned_by: string | null
          archived_at: string | null
          created_at: string | null
          deadline_type: Database["public"]["Enums"]["statutory_deadline_type"]
          due_at: string
          id: string
          job_id: string
          organisation_id: string
          source_record_id: string
          source_record_type: string
          status: Database["public"]["Enums"]["statutory_deadline_status"]
          updated_at: string | null
        }
        Insert: {
          actioned_at?: string | null
          actioned_by?: string | null
          archived_at?: string | null
          created_at?: string | null
          deadline_type: Database["public"]["Enums"]["statutory_deadline_type"]
          due_at: string
          id?: string
          job_id: string
          organisation_id: string
          source_record_id: string
          source_record_type: string
          status?: Database["public"]["Enums"]["statutory_deadline_status"]
          updated_at?: string | null
        }
        Update: {
          actioned_at?: string | null
          actioned_by?: string | null
          archived_at?: string | null
          created_at?: string | null
          deadline_type?: Database["public"]["Enums"]["statutory_deadline_type"]
          due_at?: string
          id?: string
          job_id?: string
          organisation_id?: string
          source_record_id?: string
          source_record_type?: string
          status?: Database["public"]["Enums"]["statutory_deadline_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "statutory_deadlines_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statutory_deadlines_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          reserved_delta: number
          created_at: string
          id: string
          job_id: string | null
          location_id: string
          material_item_id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          organisation_id: string
          performed_by: string
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          unit_cost_pence: number | null
        }
        Insert: {
          reserved_delta?: number
          created_at?: string
          id?: string
          job_id?: string | null
          location_id: string
          material_item_id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          organisation_id: string
          performed_by: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          unit_cost_pence?: number | null
        }
        Update: {
          reserved_delta?: number
          created_at?: string
          id?: string
          job_id?: string | null
          location_id?: string
          material_item_id?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          organisation_id?: string
          performed_by?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          unit_cost_pence?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_material_item_id_fkey"
            columns: ["material_item_id"]
            isOneToOne: false
            referencedRelation: "material_catalogue_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_branches: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          branch_name: string
          city: string | null
          country: string | null
          county: string | null
          created_at: string
          id: string
          is_default: boolean
          notes: string | null
          phone: string | null
          postcode: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          branch_name: string
          city?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          notes?: string | null
          phone?: string | null
          postcode?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          branch_name?: string
          city?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          notes?: string | null
          phone?: string | null
          postcode?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_branches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organisation_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organisation_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organisation_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_categories_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_category_links: {
        Row: {
          category_id: string
          supplier_id: string
        }
        Insert: {
          category_id: string
          supplier_id: string
        }
        Update: {
          category_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_category_links_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "supplier_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_category_links_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contacts: {
        Row: {
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_primary: boolean
          job_title: string | null
          last_name: string
          mobile: string | null
          notes: string | null
          phone: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_primary?: boolean
          job_title?: string | null
          last_name: string
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_primary?: boolean
          job_title?: string | null
          last_name?: string
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contacts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_credit_notes: {
        Row: {
          supplier_return_id: string | null
          net_amount_pence: number
          tax_amount_pence: number
          recorded_by: string | null
          voided_by: string | null
          voided_at: string | null
          void_reason: string | null
          amount_pence: number
          created_at: string
          credit_note_date: string | null
          credit_note_number: string
          currency: string
          document_url: string | null
          id: string
          organisation_id: string
          reason: string | null
          status: string | null
          supplier_id: string
          supplier_invoice_id: string | null
          updated_at: string
        }
        Insert: {
          supplier_return_id?: string | null
          net_amount_pence?: number
          tax_amount_pence?: number
          recorded_by?: string | null
          voided_by?: string | null
          voided_at?: string | null
          void_reason?: string | null
          amount_pence?: number
          created_at?: string
          credit_note_date?: string | null
          credit_note_number: string
          currency?: string
          document_url?: string | null
          id?: string
          organisation_id: string
          reason?: string | null
          status?: string | null
          supplier_id: string
          supplier_invoice_id?: string | null
          updated_at?: string
        }
        Update: {
          supplier_return_id?: string | null
          net_amount_pence?: number
          tax_amount_pence?: number
          recorded_by?: string | null
          voided_by?: string | null
          voided_at?: string | null
          void_reason?: string | null
          amount_pence?: number
          created_at?: string
          credit_note_date?: string | null
          credit_note_number?: string
          currency?: string
          document_url?: string | null
          id?: string
          organisation_id?: string
          reason?: string | null
          status?: string | null
          supplier_id?: string
          supplier_invoice_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_credit_notes_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_credit_notes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_credit_notes_supplier_invoice_id_fkey"
            columns: ["supplier_invoice_id"]
            isOneToOne: false
            referencedRelation: "supplier_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          expiry_date: string | null
          file_hash: string | null
          file_url: string
          id: string
          issued_date: string | null
          notes: string | null
          supplier_id: string
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          expiry_date?: string | null
          file_hash?: string | null
          file_url: string
          id?: string
          issued_date?: string | null
          notes?: string | null
          supplier_id: string
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          expiry_date?: string | null
          file_hash?: string | null
          file_url?: string
          id?: string
          issued_date?: string | null
          notes?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_invoice_lines: {
        Row: {
          created_at: string
          description: string
          goods_receipt_line_id: string | null
          id: string
          line_number: number
          line_total_pence: number | null
          notes: string | null
          purchase_order_line_id: string | null
          quantity: number | null
          supplier_invoice_id: string
          tax_rate: number | null
          unit_price_pence: number
        }
        Insert: {
          created_at?: string
          description: string
          goods_receipt_line_id?: string | null
          id?: string
          line_number: number
          line_total_pence?: number | null
          notes?: string | null
          purchase_order_line_id?: string | null
          quantity?: number | null
          supplier_invoice_id: string
          tax_rate?: number | null
          unit_price_pence: number
        }
        Update: {
          created_at?: string
          description?: string
          goods_receipt_line_id?: string | null
          id?: string
          line_number?: number
          line_total_pence?: number | null
          notes?: string | null
          purchase_order_line_id?: string | null
          quantity?: number | null
          supplier_invoice_id?: string
          tax_rate?: number | null
          unit_price_pence?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoice_lines_goods_receipt_line_id_fkey"
            columns: ["goods_receipt_line_id"]
            isOneToOne: false
            referencedRelation: "goods_receipt_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_purchase_order_line_id_fkey"
            columns: ["purchase_order_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_supplier_invoice_id_fkey"
            columns: ["supplier_invoice_id"]
            isOneToOne: false
            referencedRelation: "supplier_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_invoices: {
        Row: {
          approval_status: string | null
          cost_code: string | null
          created_at: string
          currency: string
          due_date: string | null
          gross_amount_pence: number
          id: string
          invoice_date: string | null
          invoice_document_url: string | null
          invoice_number: string
          job_id: string | null
          net_amount_pence: number
          notes: string | null
          organisation_id: string
          paid_at: string | null
          payment_reference: string | null
          payment_status: string | null
          purchase_order_id: string | null
          status: Database["public"]["Enums"]["supplier_invoice_status"]
          supplier_id: string
          tax_amount_pence: number | null
          tax_rate: number | null
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          cost_code?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          gross_amount_pence?: number
          id?: string
          invoice_date?: string | null
          invoice_document_url?: string | null
          invoice_number: string
          job_id?: string | null
          net_amount_pence?: number
          notes?: string | null
          organisation_id: string
          paid_at?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          purchase_order_id?: string | null
          status?: Database["public"]["Enums"]["supplier_invoice_status"]
          supplier_id: string
          tax_amount_pence?: number | null
          tax_rate?: number | null
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          cost_code?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          gross_amount_pence?: number
          id?: string
          invoice_date?: string | null
          invoice_document_url?: string | null
          invoice_number?: string
          job_id?: string | null
          net_amount_pence?: number
          notes?: string | null
          organisation_id?: string
          paid_at?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          purchase_order_id?: string | null
          status?: Database["public"]["Enums"]["supplier_invoice_status"]
          supplier_id?: string
          tax_amount_pence?: number | null
          tax_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_item_prices: {
        Row: {
          created_at: string
          currency: string
          effective_date: string
          expiry_date: string | null
          id: string
          is_preferred: boolean
          lead_time_days: number | null
          material_item_id: string
          minimum_order: number | null
          notes: string | null
          quote_reference: string | null
          quoted_by: string | null
          supplier_id: string
          supplier_item_code: string | null
          unit_price_pence: number
        }
        Insert: {
          created_at?: string
          currency?: string
          effective_date?: string
          expiry_date?: string | null
          id?: string
          is_preferred?: boolean
          lead_time_days?: number | null
          material_item_id: string
          minimum_order?: number | null
          notes?: string | null
          quote_reference?: string | null
          quoted_by?: string | null
          supplier_id: string
          supplier_item_code?: string | null
          unit_price_pence: number
        }
        Update: {
          created_at?: string
          currency?: string
          effective_date?: string
          expiry_date?: string | null
          id?: string
          is_preferred?: boolean
          lead_time_days?: number | null
          material_item_id?: string
          minimum_order?: number | null
          notes?: string | null
          quote_reference?: string | null
          quoted_by?: string | null
          supplier_id?: string
          supplier_item_code?: string | null
          unit_price_pence?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_item_prices_material_item_id_fkey"
            columns: ["material_item_id"]
            isOneToOne: false
            referencedRelation: "material_catalogue_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_item_prices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_quote_lines: {
        Row: {
          tax_rate: number
          alternative_item: string | null
          availability: string | null
          created_at: string
          id: string
          notes: string | null
          quote_response_id: string
          rfq_line_id: string
          unit_price_pence: number | null
        }
        Insert: {
          tax_rate?: number
          alternative_item?: string | null
          availability?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          quote_response_id: string
          rfq_line_id: string
          unit_price_pence?: number | null
        }
        Update: {
          tax_rate?: number
          alternative_item?: string | null
          availability?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          quote_response_id?: string
          rfq_line_id?: string
          unit_price_pence?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quote_lines_quote_response_id_fkey"
            columns: ["quote_response_id"]
            isOneToOne: false
            referencedRelation: "supplier_quote_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quote_lines_rfq_line_id_fkey"
            columns: ["rfq_line_id"]
            isOneToOne: false
            referencedRelation: "rfq_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_quote_responses: {
        Row: {
          quote_reference: string | null
          recorded_by: string | null
          net_total_pence: number
          tax_total_pence: number
          gross_total_pence: number
          delivery_tax_rate: number
          alternatives_text: string | null
          created_at: string
          delivery_charge_pence: number | null
          id: string
          lead_time_days: number | null
          questions_text: string | null
          quote_document_url: string | null
          rfq_supplier_id: string
          status: string | null
          submitted_at: string | null
          validity_date: string | null
          version: number
        }
        Insert: {
          quote_reference?: string | null
          recorded_by?: string | null
          net_total_pence?: number
          tax_total_pence?: number
          gross_total_pence?: number
          delivery_tax_rate?: number
          alternatives_text?: string | null
          created_at?: string
          delivery_charge_pence?: number | null
          id?: string
          lead_time_days?: number | null
          questions_text?: string | null
          quote_document_url?: string | null
          rfq_supplier_id: string
          status?: string | null
          submitted_at?: string | null
          validity_date?: string | null
          version?: number
        }
        Update: {
          quote_reference?: string | null
          recorded_by?: string | null
          net_total_pence?: number
          tax_total_pence?: number
          gross_total_pence?: number
          delivery_tax_rate?: number
          alternatives_text?: string | null
          created_at?: string
          delivery_charge_pence?: number | null
          id?: string
          lead_time_days?: number | null
          questions_text?: string | null
          quote_document_url?: string | null
          rfq_supplier_id?: string
          status?: string | null
          submitted_at?: string | null
          validity_date?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quote_responses_rfq_supplier_id_fkey"
            columns: ["rfq_supplier_id"]
            isOneToOne: false
            referencedRelation: "rfq_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_return_lines: {
        Row: {
          return_condition: string | null
          created_at: string
          description: string
          goods_receipt_line_id: string | null
          id: string
          quantity: number
          reason: string | null
          supplier_return_id: string
          unit_price_pence: number | null
        }
        Insert: {
          return_condition?: string | null
          created_at?: string
          description: string
          goods_receipt_line_id?: string | null
          id?: string
          quantity?: number
          reason?: string | null
          supplier_return_id: string
          unit_price_pence?: number | null
        }
        Update: {
          return_condition?: string | null
          created_at?: string
          description?: string
          goods_receipt_line_id?: string | null
          id?: string
          quantity?: number
          reason?: string | null
          supplier_return_id?: string
          unit_price_pence?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_return_lines_goods_receipt_line_id_fkey"
            columns: ["goods_receipt_line_id"]
            isOneToOne: false
            referencedRelation: "goods_receipt_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_return_lines_supplier_return_id_fkey"
            columns: ["supplier_return_id"]
            isOneToOne: false
            referencedRelation: "supplier_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_returns: {
        Row: {
          revision: number
          returned_at: string | null
          currency: string
          collection_address: string | null
          collection_date: string | null
          created_at: string
          created_by: string
          credit_note_amount_pence: number | null
          credit_note_received: boolean
          credit_note_reference: string | null
          delivery_issue_id: string | null
          evidence_urls: Json | null
          id: string
          organisation_id: string
          purchase_order_id: string | null
          reason: string
          return_method: string | null
          return_reference: string
          status: Database["public"]["Enums"]["return_status"]
          supplier_id: string
          updated_at: string
        }
        Insert: {
          revision?: number
          returned_at?: string | null
          currency?: string
          collection_address?: string | null
          collection_date?: string | null
          created_at?: string
          created_by: string
          credit_note_amount_pence?: number | null
          credit_note_received?: boolean
          credit_note_reference?: string | null
          delivery_issue_id?: string | null
          evidence_urls?: Json | null
          id?: string
          organisation_id: string
          purchase_order_id?: string | null
          reason: string
          return_method?: string | null
          return_reference: string
          status?: Database["public"]["Enums"]["return_status"]
          supplier_id: string
          updated_at?: string
        }
        Update: {
          revision?: number
          returned_at?: string | null
          currency?: string
          collection_address?: string | null
          collection_date?: string | null
          created_at?: string
          created_by?: string
          credit_note_amount_pence?: number | null
          credit_note_received?: boolean
          credit_note_reference?: string | null
          delivery_issue_id?: string | null
          evidence_urls?: Json | null
          id?: string
          organisation_id?: string
          purchase_order_id?: string | null
          reason?: string
          return_method?: string | null
          return_reference?: string
          status?: Database["public"]["Enums"]["return_status"]
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_returns_delivery_issue_id_fkey"
            columns: ["delivery_issue_id"]
            isOneToOne: false
            referencedRelation: "delivery_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_returns_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_returns_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_returns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          account_number: string | null
          archived_at: string | null
          bank_account_last_four: string | null
          bank_name: string | null
          company_number: string | null
          created_at: string
          delivery_areas: string | null
          id: string
          insurance_document_url: string | null
          internal_notes: string | null
          internal_rating: number | null
          is_approved: boolean
          lead_time_notes: string | null
          legal_name: string | null
          minimum_order: string | null
          organisation_id: string
          payment_method: string | null
          payment_terms: string | null
          status: Database["public"]["Enums"]["supplier_status"]
          supplier_reference: string | null
          trading_name: string
          updated_at: string
          vat_number: string | null
          website: string | null
        }
        Insert: {
          account_number?: string | null
          archived_at?: string | null
          bank_account_last_four?: string | null
          bank_name?: string | null
          company_number?: string | null
          created_at?: string
          delivery_areas?: string | null
          id?: string
          insurance_document_url?: string | null
          internal_notes?: string | null
          internal_rating?: number | null
          is_approved?: boolean
          lead_time_notes?: string | null
          legal_name?: string | null
          minimum_order?: string | null
          organisation_id: string
          payment_method?: string | null
          payment_terms?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          supplier_reference?: string | null
          trading_name: string
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          account_number?: string | null
          archived_at?: string | null
          bank_account_last_four?: string | null
          bank_name?: string | null
          company_number?: string | null
          created_at?: string
          delivery_areas?: string | null
          id?: string
          insurance_document_url?: string | null
          internal_notes?: string | null
          internal_rating?: number | null
          is_approved?: boolean
          lead_time_notes?: string | null
          legal_name?: string | null
          minimum_order?: string | null
          organisation_id?: string
          payment_method?: string | null
          payment_terms?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          supplier_reference?: string | null
          trading_name?: string
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_conflicts: {
        Row: {
          changed_fields: Json | null
          created_at: string | null
          device_id: string
          entity_id: string | null
          entity_type: string
          id: string
          job_id: string | null
          local_version: Json
          mutation_id: string | null
          organisation_id: string
          resolution: Database["public"]["Enums"]["conflict_resolution"] | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          server_version: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          changed_fields?: Json | null
          created_at?: string | null
          device_id: string
          entity_id?: string | null
          entity_type: string
          id?: string
          job_id?: string | null
          local_version: Json
          mutation_id?: string | null
          organisation_id: string
          resolution?: Database["public"]["Enums"]["conflict_resolution"] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          server_version: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          changed_fields?: Json | null
          created_at?: string | null
          device_id?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          job_id?: string | null
          local_version?: Json
          mutation_id?: string | null
          organisation_id?: string
          resolution?: Database["public"]["Enums"]["conflict_resolution"] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          server_version?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_conflicts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "registered_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_conflicts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_conflicts_mutation_id_fkey"
            columns: ["mutation_id"]
            isOneToOne: false
            referencedRelation: "offline_mutations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_conflicts_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_date: string
          event_type: string
          id: string
          job_id: string
          metadata: Json | null
          organisation_id: string
          parent_event_id: string | null
          related_record_id: string | null
          related_record_type: string | null
          summary: string | null
          title: string
          visibility: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_date: string
          event_type: string
          id?: string
          job_id: string
          metadata?: Json | null
          organisation_id: string
          parent_event_id?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          summary?: string | null
          title: string
          visibility?: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          job_id?: string
          metadata?: Json | null
          organisation_id?: string
          parent_event_id?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          summary?: string | null
          title?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "timeline_events"
            referencedColumns: ["id"]
          },
        ]
      }
      toolbox_talks: {
        Row: {
          archived_at: string | null
          attendees: Json
          content: string | null
          created_at: string | null
          created_by: string | null
          delivered_at: string | null
          delivered_by: string | null
          id: string
          job_id: string | null
          organisation_id: string
          topic: string
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          attendees?: Json
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          id?: string
          job_id?: string | null
          organisation_id: string
          topic: string
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          attendees?: Json
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          id?: string
          job_id?: string | null
          organisation_id?: string
          topic?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toolbox_talks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talks_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_sessions: {
        Row: {
          abandoned_at: string | null
          checksum: string | null
          completed_at: string | null
          created_at: string | null
          device_id: string
          entity_id: string | null
          entity_type: string
          file_size_bytes: number | null
          id: string
          job_id: string | null
          mime_type: string
          organisation_id: string
          original_filename: string
          source_metadata: Json | null
          status: Database["public"]["Enums"]["upload_session_status"] | null
          storage_path: string
          total_chunks: number | null
          updated_at: string | null
          uploaded_bytes: number | null
          uploaded_chunks: number | null
          user_id: string
        }
        Insert: {
          abandoned_at?: string | null
          checksum?: string | null
          completed_at?: string | null
          created_at?: string | null
          device_id: string
          entity_id?: string | null
          entity_type: string
          file_size_bytes?: number | null
          id?: string
          job_id?: string | null
          mime_type: string
          organisation_id: string
          original_filename: string
          source_metadata?: Json | null
          status?: Database["public"]["Enums"]["upload_session_status"] | null
          storage_path: string
          total_chunks?: number | null
          updated_at?: string | null
          uploaded_bytes?: number | null
          uploaded_chunks?: number | null
          user_id: string
        }
        Update: {
          abandoned_at?: string | null
          checksum?: string | null
          completed_at?: string | null
          created_at?: string | null
          device_id?: string
          entity_id?: string | null
          entity_type?: string
          file_size_bytes?: number | null
          id?: string
          job_id?: string | null
          mime_type?: string
          organisation_id?: string
          original_filename?: string
          source_metadata?: Json | null
          status?: Database["public"]["Enums"]["upload_session_status"] | null
          storage_path?: string
          total_chunks?: number | null
          updated_at?: string | null
          uploaded_bytes?: number | null
          uploaded_chunks?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "registered_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_sessions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      variation_responses: {
        Row: {
          confirmation_text: string | null
          created_at: string
          id: string
          message: string | null
          organisation_id: string
          portal_session_ref: string | null
          respondent_id: string | null
          respondent_name: string | null
          response_type: string
          variation_id: string
          variation_version: number
        }
        Insert: {
          confirmation_text?: string | null
          created_at?: string
          id?: string
          message?: string | null
          organisation_id: string
          portal_session_ref?: string | null
          respondent_id?: string | null
          respondent_name?: string | null
          response_type: string
          variation_id: string
          variation_version: number
        }
        Update: {
          confirmation_text?: string | null
          created_at?: string
          id?: string
          message?: string | null
          organisation_id?: string
          portal_session_ref?: string | null
          respondent_id?: string | null
          respondent_name?: string | null
          response_type?: string
          variation_id?: string
          variation_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "variation_responses_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variation_responses_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "variations"
            referencedColumns: ["id"]
          },
        ]
      }
      variation_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organisation_id: string
          snapshot: Json
          variation_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organisation_id: string
          snapshot: Json
          variation_id: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organisation_id?: string
          snapshot?: Json
          variation_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "variation_versions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variation_versions_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "variations"
            referencedColumns: ["id"]
          },
        ]
      }
      variations: {
        Row: {
          approval_deadline: string | null
          archived_at: string | null
          assumptions: string | null
          client_price_pence: number
          created_at: string
          created_by: string | null
          current_version: number
          delay_risk: string | null
          description: string | null
          excluded_work: string | null
          id: string
          included_work: string | null
          internal_cost_pence: number | null
          job_id: string
          organisation_id: string
          programme_days: number | null
          reason: string | null
          reference: string
          requested_by: string | null
          revised_completion: string | null
          source: string | null
          status: string
          title: string
          total_pence: number
          updated_at: string
          vat_pence: number
          work_before_approval: boolean
        }
        Insert: {
          approval_deadline?: string | null
          archived_at?: string | null
          assumptions?: string | null
          client_price_pence: number
          created_at?: string
          created_by?: string | null
          current_version?: number
          delay_risk?: string | null
          description?: string | null
          excluded_work?: string | null
          id?: string
          included_work?: string | null
          internal_cost_pence?: number | null
          job_id: string
          organisation_id: string
          programme_days?: number | null
          reason?: string | null
          reference: string
          requested_by?: string | null
          revised_completion?: string | null
          source?: string | null
          status?: string
          title: string
          total_pence: number
          updated_at?: string
          vat_pence?: number
          work_before_approval?: boolean
        }
        Update: {
          approval_deadline?: string | null
          archived_at?: string | null
          assumptions?: string | null
          client_price_pence?: number
          created_at?: string
          created_by?: string | null
          current_version?: number
          delay_risk?: string | null
          description?: string | null
          excluded_work?: string | null
          id?: string
          included_work?: string | null
          internal_cost_pence?: number | null
          job_id?: string
          organisation_id?: string
          programme_days?: number | null
          reason?: string | null
          reference?: string
          requested_by?: string | null
          revised_completion?: string | null
          source?: string | null
          status?: string
          title?: string
          total_pence?: number
          updated_at?: string
          vat_pence?: number
          work_before_approval?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "variations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      workforce_assignments: {
        Row: {
          created_at: string
          expected_finish_date: string | null
          id: string
          job_id: string
          organisation_id: string
          package_description: string | null
          person_id: string
          rams_acknowledged: boolean | null
          role: string | null
          site_induction_completed: boolean | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_finish_date?: string | null
          id?: string
          job_id: string
          organisation_id: string
          package_description?: string | null
          person_id: string
          rams_acknowledged?: boolean | null
          role?: string | null
          site_induction_completed?: boolean | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_finish_date?: string | null
          id?: string
          job_id?: string
          organisation_id?: string
          package_description?: string | null
          person_id?: string
          rams_acknowledged?: boolean | null
          role?: string | null
          site_induction_completed?: boolean | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workforce_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_assignments_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "workforce_people"
            referencedColumns: ["id"]
          },
        ]
      }
      workforce_documents: {
        Row: {
          archived_at: string | null
          bucket: string
          category: string
          id: string
          mime_type: string
          name: string
          object_path: string
          organisation_id: string
          original_filename: string
          person_id: string | null
          review_status: string
          size_bytes: number
          uploaded_at: string
          uploaded_by: string | null
          version: number
          visibility: string
        }
        Insert: {
          archived_at?: string | null
          bucket: string
          category: string
          id?: string
          mime_type: string
          name: string
          object_path: string
          organisation_id: string
          original_filename: string
          person_id?: string | null
          review_status?: string
          size_bytes?: number
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
          visibility?: string
        }
        Update: {
          archived_at?: string | null
          bucket?: string
          category?: string
          id?: string
          mime_type?: string
          name?: string
          object_path?: string
          organisation_id?: string
          original_filename?: string
          person_id?: string | null
          review_status?: string
          size_bytes?: number
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "workforce_documents_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_documents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "workforce_people"
            referencedColumns: ["id"]
          },
        ]
      }
      workforce_people: {
        Row: {
          archived_at: string | null
          availability: string | null
          business_type: string | null
          created_at: string
          current_job_id: string | null
          email: string | null
          first_name: string
          id: string
          initials: string | null
          last_name: string
          next_expiry_date: string | null
          next_expiry_type: string | null
          organisation_id: string
          passport_status: string
          phone: string | null
          primary_trade: string | null
          relationship: string
          secondary_trades: string[] | null
          trading_name: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          availability?: string | null
          business_type?: string | null
          created_at?: string
          current_job_id?: string | null
          email?: string | null
          first_name: string
          id?: string
          initials?: string | null
          last_name: string
          next_expiry_date?: string | null
          next_expiry_type?: string | null
          organisation_id: string
          passport_status?: string
          phone?: string | null
          primary_trade?: string | null
          relationship: string
          secondary_trades?: string[] | null
          trading_name?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          availability?: string | null
          business_type?: string | null
          created_at?: string
          current_job_id?: string | null
          email?: string | null
          first_name?: string
          id?: string
          initials?: string | null
          last_name?: string
          next_expiry_date?: string | null
          next_expiry_type?: string | null
          organisation_id?: string
          passport_status?: string
          phone?: string | null
          primary_trade?: string | null
          relationship?: string
          secondary_trades?: string[] | null
          trading_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workforce_people_current_job_id_fkey"
            columns: ["current_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_people_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      client_portal_overview: {
        Args: { p_hash: string }
        Returns: Json
      }
      procurement_approval_rule_write: {
        Args: { p_org: string; p_request: string; p_data: Json }
        Returns: string
      }
      procurement_stock_hire_write: {
        Args: { p_org: string; p_request: string; p_action: string; p_data: Json }
        Returns: string
      }
      procurement_return_credit_write: {
        Args: { p_org: string; p_request: string; p_action: string; p_data: Json }
        Returns: string
      }
      procurement_cancel_order: {
        Args: { p_org: string; p_request: string; p_data: Json }
        Returns: string
      }
      procurement_rfq_write: {
        Args: { p_org: string; p_request: string; p_action: string; p_data: Json }
        Returns: string
      }
      procurement_requisition_write: {
        Args: { p_org: string; p_request: string; p_action: string; p_data: Json }
        Returns: string
      }
      procurement_invoice_write: {
        Args: { p_org: string; p_request: string; p_action: string; p_data: Json }
        Returns: string
      }
      procurement_write: {
        Args: { p_org: string; p_request: string; p_action: string; p_data: Json }
        Returns: string
      }
      can_access_message_attachment: {
        Args: { p_message_id: string; p_organisation_id: string }
        Returns: boolean
      }
      can_platform_view_disputes: { Args: never; Returns: boolean }
      create_organisation_with_owner: {
        Args: {
          p_address_line1?: string
          p_address_line2?: string
          p_company_number?: string
          p_county?: string
          p_email?: string
          p_name: string
          p_phone?: string
          p_postcode?: string
          p_town_city?: string
          p_trading_name?: string
          p_utr_reference?: string
          p_vat_number?: string
        }
        Returns: string
      }
      create_organisation_with_owner_legacy_v1: {
        Args: { p_name: string; p_trading_name?: string }
        Returns: {
          address_line1: string | null
          address_line2: string | null
          archived_at: string | null
          company_number: string | null
          county: string | null
          created_at: string
          created_by: string | null
          default_currency: string
          email: string | null
          id: string
          logo_path: string | null
          name: string
          phone: string | null
          postcode: string | null
          town_city: string | null
          trading_name: string | null
          updated_at: string
          utr_reference: string | null
          vat_number: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organisations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_org_trial: { Args: { p_organisation_id: string }; Returns: string }
      expire_org_trials: { Args: never; Returns: number }
      extract_org_from_path: { Args: { object_path: string }; Returns: string }
      fn_enqueue_deadline_reminders: { Args: never; Returns: number }
      get_platform_role: { Args: never; Returns: string }
      has_dispute_admin_permission: {
        Args: { p_key: string }
        Returns: boolean
      }
      has_org_role: {
        Args: { org_id: string; required_roles: string[] }
        Returns: boolean
      }
      inventory_available_quantity: {
        Args: { p_location_id: string; p_material_item_id: string }
        Returns: number
      }
      is_dispute_claimant: { Args: { p_dispute_id: string }; Returns: boolean }
      is_dispute_org_admin: { Args: { p_dispute_id: string }; Returns: boolean }
      is_dispute_party: { Args: { p_dispute_id: string }; Returns: boolean }
      is_dispute_respondent: {
        Args: { p_dispute_id: string }
        Returns: boolean
      }
      is_org_member: { Args: { org_id: string }; Returns: boolean }
      is_platform_staff: { Args: never; Returns: boolean }
      is_project_participant: { Args: { p_job_id: string }; Returns: boolean }
      org_has_write_access: {
        Args: { p_organisation_id: string }
        Returns: boolean
      }
      org_member_check: { Args: { p_org_id: string }; Returns: boolean }
      set_member_role: {
        Args: { p_member_id: string; p_role: string }
        Returns: undefined
      }
      set_member_status: {
        Args: { p_member_id: string; p_status: string }
        Returns: undefined
      }
      start_org_trial_for: {
        Args: { p_organisation_id: string }
        Returns: undefined
      }
    }
    Enums: {
      approval_decision: "pending" | "approved" | "rejected" | "overridden"
      billing_access_state:
        | "full"
        | "grace_period"
        | "read_only"
        | "billing_locked"
        | "suspended_by_platform"
      billing_interval: "monthly" | "annual"
      conflict_resolution:
        | "pending"
        | "server_wins"
        | "local_as_revision"
        | "merge"
        | "blocked"
      connection_status:
        | "pending_authorization"
        | "authorizing"
        | "connected"
        | "error"
        | "disconnected"
        | "revoked"
      delivery_issue_status:
        | "open"
        | "investigating"
        | "supplier_notified"
        | "resolved"
        | "credited"
        | "closed"
      device_grant_status: "active" | "revoked" | "expired"
      goods_receipt_status:
        | "complete"
        | "partial"
        | "damaged"
        | "short"
        | "rejected"
        | "unplanned"
      hire_status:
        | "cancelled"
        | "requested"
        | "confirmed"
        | "on_hire"
        | "off_hired"
        | "disputed"
        | "closed"
      import_batch_status:
        | "uploaded"
        | "mapping"
        | "validating"
        | "preview"
        | "confirmed"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      integration_provider_status: "available" | "planned" | "unavailable"
      invoice_match_type: "two_way" | "three_way" | "none"
      job_pack_status: "downloading" | "ready" | "expired" | "revoked"
      mutation_status:
        | "draft"
        | "queued"
        | "syncing"
        | "synced"
        | "needs_attention"
        | "blocked"
        | "failed"
      purchase_order_status:
        | "draft"
        | "awaiting_approval"
        | "approved"
        | "issued"
        | "acknowledged"
        | "partially_delivered"
        | "fully_delivered"
        | "closed"
        | "cancelled"
        | "superseded"
      reconciliation_status:
        | "pending"
        | "linked"
        | "kept_local"
        | "accepted_provider"
        | "adjustment"
        | "ignored"
        | "escalated"
      requisition_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "changes_requested"
        | "approved"
        | "partially_ordered"
        | "fully_ordered"
        | "rejected"
        | "cancelled"
      return_status:
        | "authorised"
        | "in_progress"
        | "collected"
        | "returned"
        | "credited"
        | "cancelled"
      rfq_status:
        | "draft"
        | "issued"
        | "partially_responded"
        | "closed"
        | "awarded"
        | "cancelled"
      statutory_deadline_status:
        | "upcoming"
        | "due_soon"
        | "overdue"
        | "actioned"
        | "expired"
      statutory_deadline_type:
        | "payment_notice"
        | "pay_less_notice"
        | "final_date_for_payment"
        | "eot_notification"
        | "loss_expense_notification"
        | "defects_liability_end"
        | "retention_release"
      stock_movement_type:
        | "receipt"
        | "transfer"
        | "job_issue"
        | "return_from_job"
        | "supplier_return"
        | "adjustment"
        | "write_off"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "unpaid"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "paused"
      supplier_invoice_status:
        | "draft"
        | "received"
        | "pending_match"
        | "matched"
        | "exception"
        | "approved"
        | "paid"
        | "disputed"
        | "cancelled"
      supplier_status: "active" | "suspended" | "archived"
      sync_direction:
        | "siteledger_to_provider"
        | "provider_to_siteledger"
        | "two_way"
        | "disabled"
      sync_entity_type:
        | "client"
        | "supplier"
        | "sales_invoice"
        | "supplier_invoice"
        | "credit_note"
        | "payment_received"
        | "supplier_payment"
        | "tax_code"
        | "chart_of_account"
        | "tracking_category"
        | "job"
        | "contact"
      sync_job_status:
        | "pending"
        | "processing"
        | "succeeded"
        | "retry_scheduled"
        | "needs_attention"
        | "cancelled"
      sync_operation: "push" | "pull" | "sync"
      upload_session_status:
        | "pending"
        | "uploading"
        | "paused"
        | "completed"
        | "failed"
        | "abandoned"
      webhook_event_status:
        | "received"
        | "processing"
        | "processed"
        | "failed"
        | "retrying"
        | "duplicate"
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
      approval_decision: ["pending", "approved", "rejected", "overridden"],
      billing_access_state: [
        "full",
        "grace_period",
        "read_only",
        "billing_locked",
        "suspended_by_platform",
      ],
      billing_interval: ["monthly", "annual"],
      conflict_resolution: [
        "pending",
        "server_wins",
        "local_as_revision",
        "merge",
        "blocked",
      ],
      connection_status: [
        "pending_authorization",
        "authorizing",
        "connected",
        "error",
        "disconnected",
        "revoked",
      ],
      delivery_issue_status: [
        "open",
        "investigating",
        "supplier_notified",
        "resolved",
        "credited",
        "closed",
      ],
      device_grant_status: ["active", "revoked", "expired"],
      goods_receipt_status: [
        "complete",
        "partial",
        "damaged",
        "short",
        "rejected",
        "unplanned",
      ],
      hire_status: [
        "cancelled",
        "requested",
        "confirmed",
        "on_hire",
        "off_hired",
        "disputed",
        "closed",
      ],
      import_batch_status: [
        "uploaded",
        "mapping",
        "validating",
        "preview",
        "confirmed",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      integration_provider_status: ["available", "planned", "unavailable"],
      invoice_match_type: ["two_way", "three_way", "none"],
      job_pack_status: ["downloading", "ready", "expired", "revoked"],
      mutation_status: [
        "draft",
        "queued",
        "syncing",
        "synced",
        "needs_attention",
        "blocked",
        "failed",
      ],
      purchase_order_status: [
        "draft",
        "awaiting_approval",
        "approved",
        "issued",
        "acknowledged",
        "partially_delivered",
        "fully_delivered",
        "closed",
        "cancelled",
        "superseded",
      ],
      reconciliation_status: [
        "pending",
        "linked",
        "kept_local",
        "accepted_provider",
        "adjustment",
        "ignored",
        "escalated",
      ],
      requisition_status: [
        "draft",
        "submitted",
        "under_review",
        "changes_requested",
        "approved",
        "partially_ordered",
        "fully_ordered",
        "rejected",
        "cancelled",
      ],
      return_status: [
        "authorised",
        "in_progress",
        "collected",
        "returned",
        "credited",
        "cancelled",
      ],
      rfq_status: [
        "draft",
        "issued",
        "partially_responded",
        "closed",
        "awarded",
        "cancelled",
      ],
      statutory_deadline_status: [
        "upcoming",
        "due_soon",
        "overdue",
        "actioned",
        "expired",
      ],
      statutory_deadline_type: [
        "payment_notice",
        "pay_less_notice",
        "final_date_for_payment",
        "eot_notification",
        "loss_expense_notification",
        "defects_liability_end",
        "retention_release",
      ],
      stock_movement_type: [
        "receipt",
        "transfer",
        "job_issue",
        "return_from_job",
        "supplier_return",
        "adjustment",
        "write_off",
      ],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "unpaid",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "paused",
      ],
      supplier_invoice_status: [
        "draft",
        "received",
        "pending_match",
        "matched",
        "exception",
        "approved",
        "paid",
        "disputed",
        "cancelled",
      ],
      supplier_status: ["active", "suspended", "archived"],
      sync_direction: [
        "siteledger_to_provider",
        "provider_to_siteledger",
        "two_way",
        "disabled",
      ],
      sync_entity_type: [
        "client",
        "supplier",
        "sales_invoice",
        "supplier_invoice",
        "credit_note",
        "payment_received",
        "supplier_payment",
        "tax_code",
        "chart_of_account",
        "tracking_category",
        "job",
        "contact",
      ],
      sync_job_status: [
        "pending",
        "processing",
        "succeeded",
        "retry_scheduled",
        "needs_attention",
        "cancelled",
      ],
      sync_operation: ["push", "pull", "sync"],
      upload_session_status: [
        "pending",
        "uploading",
        "paused",
        "completed",
        "failed",
        "abandoned",
      ],
      webhook_event_status: [
        "received",
        "processing",
        "processed",
        "failed",
        "retrying",
        "duplicate",
      ],
    },
  },
} as const
