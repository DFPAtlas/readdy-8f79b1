export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          job_title: string | null;
          avatar_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          job_title?: string | null;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          job_title?: string | null;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [{ foreignKeyName: 'profiles_id_fkey'; columns: ['id']; referencedRelation: 'users'; referencedColumns: ['id'] }];
      };
      organisations: {
        Row: {
          id: string;
          name: string;
          trading_name: string | null;
          company_number: string | null;
          utr_reference: string | null;
          vat_number: string | null;
          address_line1: string | null;
          address_line2: string | null;
          town_city: string | null;
          county: string | null;
          postcode: string | null;
          phone: string | null;
          email: string | null;
          logo_path: string | null;
          default_currency: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          trading_name?: string | null;
          company_number?: string | null;
          utr_reference?: string | null;
          vat_number?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          town_city?: string | null;
          county?: string | null;
          postcode?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_path?: string | null;
          default_currency?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          trading_name?: string | null;
          company_number?: string | null;
          utr_reference?: string | null;
          vat_number?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          town_city?: string | null;
          county?: string | null;
          postcode?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_path?: string | null;
          default_currency?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      organisation_members: {
        Row: {
          id: string;
          organisation_id: string;
          user_id: string;
          role: string;
          status: string;
          invited_by: string | null;
          joined_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          user_id: string;
          role: string;
          status?: string;
          invited_by?: string | null;
          joined_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          user_id?: string;
          role?: string;
          status?: string;
          invited_by?: string | null;
          joined_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: 'organisation_members_organisation_id_fkey'; columns: ['organisation_id']; referencedRelation: 'organisations'; referencedColumns: ['id'] },
        ];
      };
      clients: {
        Row: {
          id: string;
          organisation_id: string;
          client_type: string;
          first_name: string | null;
          last_name: string | null;
          company_name: string | null;
          email: string | null;
          phone: string | null;
          preferred_contact: string | null;
          billing_address_line1: string | null;
          billing_address_line2: string | null;
          billing_town_city: string | null;
          billing_county: string | null;
          billing_postcode: string | null;
          site_address_line1: string | null;
          site_address_line2: string | null;
          site_town_city: string | null;
          site_county: string | null;
          site_postcode: string | null;
          account_status: string;
          portal_status: string;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          client_type: string;
          first_name?: string | null;
          last_name?: string | null;
          company_name?: string | null;
          email?: string | null;
          phone?: string | null;
          preferred_contact?: string | null;
          billing_address_line1?: string | null;
          billing_address_line2?: string | null;
          billing_town_city?: string | null;
          billing_county?: string | null;
          billing_postcode?: string | null;
          site_address_line1?: string | null;
          site_address_line2?: string | null;
          site_town_city?: string | null;
          site_county?: string | null;
          site_postcode?: string | null;
          account_status?: string;
          portal_status?: string;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          client_type?: string;
          first_name?: string | null;
          last_name?: string | null;
          company_name?: string | null;
          email?: string | null;
          phone?: string | null;
          preferred_contact?: string | null;
          billing_address_line1?: string | null;
          billing_address_line2?: string | null;
          billing_town_city?: string | null;
          billing_county?: string | null;
          billing_postcode?: string | null;
          site_address_line1?: string | null;
          site_address_line2?: string | null;
          site_town_city?: string | null;
          site_county?: string | null;
          site_postcode?: string | null;
          account_status?: string;
          portal_status?: string;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Relationships: [{ foreignKeyName: 'clients_organisation_id_fkey'; columns: ['organisation_id']; referencedRelation: 'organisations'; referencedColumns: ['id'] }];
      };
      client_contacts: {
        Row: {
          id: string;
          client_id: string;
          organisation_id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          organisation_id: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          organisation_id?: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: 'client_contacts_client_id_fkey'; columns: ['client_id']; referencedRelation: 'clients'; referencedColumns: ['id'] },
          { foreignKeyName: 'client_contacts_organisation_id_fkey'; columns: ['organisation_id']; referencedRelation: 'organisations'; referencedColumns: ['id'] },
        ];
      };
      jobs: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string | null;
          reference: string;
          project_name: string;
          trade: string | null;
          work_type: string | null;
          status: string;
          progress: number;
          short_description: string | null;
          scope_of_works: string | null;
          pricing_type: string | null;
          estimated_value_pence: number | null;
          vat_treatment: string | null;
          deposit_pence: number | null;
          retention_applies: boolean;
          retention_percentage: number | null;
          payment_terms: string | null;
          proposed_start_date: string | null;
          estimated_duration: number | null;
          duration_unit: string | null;
          target_completion_date: string | null;
          site_working_hours: string | null;
          project_manager_id: string | null;
          rams_required: string | null;
          principal_contractor: string | null;
          access_notes: string | null;
          parking_notes: string | null;
          waste_notes: string | null;
          building_control_ref: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          client_id?: string | null;
          reference: string;
          project_name: string;
          trade?: string | null;
          work_type?: string | null;
          status?: string;
          progress?: number;
          short_description?: string | null;
          scope_of_works?: string | null;
          pricing_type?: string | null;
          estimated_value_pence?: number | null;
          vat_treatment?: string | null;
          deposit_pence?: number | null;
          retention_applies?: boolean;
          retention_percentage?: number | null;
          payment_terms?: string | null;
          proposed_start_date?: string | null;
          estimated_duration?: number | null;
          duration_unit?: string | null;
          target_completion_date?: string | null;
          site_working_hours?: string | null;
          project_manager_id?: string | null;
          rams_required?: string | null;
          principal_contractor?: string | null;
          access_notes?: string | null;
          parking_notes?: string | null;
          waste_notes?: string | null;
          building_control_ref?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          client_id?: string | null;
          reference?: string;
          project_name?: string;
          trade?: string | null;
          work_type?: string | null;
          status?: string;
          progress?: number;
          short_description?: string | null;
          scope_of_works?: string | null;
          pricing_type?: string | null;
          estimated_value_pence?: number | null;
          vat_treatment?: string | null;
          deposit_pence?: number | null;
          retention_applies?: boolean;
          retention_percentage?: number | null;
          payment_terms?: string | null;
          proposed_start_date?: string | null;
          estimated_duration?: number | null;
          duration_unit?: string | null;
          target_completion_date?: string | null;
          site_working_hours?: string | null;
          project_manager_id?: string | null;
          rams_required?: string | null;
          principal_contractor?: string | null;
          access_notes?: string | null;
          parking_notes?: string | null;
          waste_notes?: string | null;
          building_control_ref?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: 'jobs_organisation_id_fkey'; columns: ['organisation_id']; referencedRelation: 'organisations'; referencedColumns: ['id'] },
          { foreignKeyName: 'jobs_client_id_fkey'; columns: ['client_id']; referencedRelation: 'clients'; referencedColumns: ['id'] },
        ];
      };
      job_members: {
        Row: {
          id: string;
          job_id: string;
          organisation_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          organisation_id: string;
          user_id: string;
          role: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          organisation_id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: 'job_members_job_id_fkey'; columns: ['job_id']; referencedRelation: 'jobs'; referencedColumns: ['id'] },
          { foreignKeyName: 'job_members_organisation_id_fkey'; columns: ['organisation_id']; referencedRelation: 'organisations'; referencedColumns: ['id'] },
        ];
      };
      workforce_people: {
        Row: {
          id: string;
          organisation_id: string;
          first_name: string;
          last_name: string;
          initials: string | null;
          relationship: string;
          primary_trade: string | null;
          secondary_trades: string[] | null;
          passport_status: string;
          availability: string | null;
          current_job_id: string | null;
          email: string | null;
          phone: string | null;
          trading_name: string | null;
          business_type: string | null;
          next_expiry_type: string | null;
          next_expiry_date: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          first_name: string;
          last_name: string;
          initials?: string | null;
          relationship: string;
          primary_trade?: string | null;
          secondary_trades?: string[] | null;
          passport_status?: string;
          availability?: string | null;
          current_job_id?: string | null;
          email?: string | null;
          phone?: string | null;
          trading_name?: string | null;
          business_type?: string | null;
          next_expiry_type?: string | null;
          next_expiry_date?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          first_name?: string;
          last_name?: string;
          initials?: string | null;
          relationship?: string;
          primary_trade?: string | null;
          secondary_trades?: string[] | null;
          passport_status?: string;
          availability?: string | null;
          current_job_id?: string | null;
          email?: string | null;
          phone?: string | null;
          trading_name?: string | null;
          business_type?: string | null;
          next_expiry_type?: string | null;
          next_expiry_date?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: 'workforce_people_organisation_id_fkey'; columns: ['organisation_id']; referencedRelation: 'organisations'; referencedColumns: ['id'] },
        ];
      };
      variations: {
        Row: {
          id: string;
          organisation_id: string;
          job_id: string;
          reference: string;
          title: string;
          requested_by: string | null;
          source: string | null;
          reason: string | null;
          description: string | null;
          included_work: string | null;
          excluded_work: string | null;
          internal_cost_pence: number | null;
          client_price_pence: number;
          vat_pence: number;
          total_pence: number;
          programme_days: number | null;
          revised_completion: string | null;
          approval_deadline: string | null;
          status: string;
          current_version: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          job_id: string;
          reference: string;
          title: string;
          requested_by?: string | null;
          source?: string | null;
          reason?: string | null;
          description?: string | null;
          included_work?: string | null;
          excluded_work?: string | null;
          internal_cost_pence?: number | null;
          client_price_pence: number;
          vat_pence: number;
          total_pence: number;
          programme_days?: number | null;
          revised_completion?: string | null;
          approval_deadline?: string | null;
          status?: string;
          current_version?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          job_id?: string;
          reference?: string;
          title?: string;
          requested_by?: string | null;
          source?: string | null;
          reason?: string | null;
          description?: string | null;
          included_work?: string | null;
          excluded_work?: string | null;
          internal_cost_pence?: number | null;
          client_price_pence?: number;
          vat_pence?: number;
          total_pence?: number;
          programme_days?: number | null;
          revised_completion?: string | null;
          approval_deadline?: string | null;
          status?: string;
          current_version?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: 'variations_organisation_id_fkey'; columns: ['organisation_id']; referencedRelation: 'organisations'; referencedColumns: ['id'] },
          { foreignKeyName: 'variations_job_id_fkey'; columns: ['job_id']; referencedRelation: 'jobs'; referencedColumns: ['id'] },
        ];
      };
      audit_events: {
        Row: {
          id: string;
          organisation_id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          old_status: string | null;
          new_status: string | null;
          change_summary: Json | null;
          note: string | null;
          source: string | null;
          reference: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          old_status?: string | null;
          new_status?: string | null;
          change_summary?: Json | null;
          note?: string | null;
          source?: string | null;
          reference?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          actor_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string;
          old_status?: string | null;
          new_status?: string | null;
          change_summary?: Json | null;
          note?: string | null;
          source?: string | null;
          reference?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: 'audit_events_organisation_id_fkey'; columns: ['organisation_id']; referencedRelation: 'organisations'; referencedColumns: ['id'] },
        ];
      };
      portal_access: {
        Row: {
          id: string;
          organisation_id: string;
          client_id: string | null;
          email: string;
          access_type: string;
          token_hash: string;
          job_scope: string[] | null;
          permissions: string[];
          status: string;
          invited_by: string | null;
          expires_at: string | null;
          accepted_at: string | null;
          revoked_at: string | null;
          last_accessed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          client_id?: string | null;
          email: string;
          access_type: string;
          token_hash: string;
          job_scope?: string[] | null;
          permissions?: string[];
          status?: string;
          invited_by?: string | null;
          expires_at?: string | null;
          accepted_at?: string | null;
          revoked_at?: string | null;
          last_accessed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          client_id?: string | null;
          email?: string;
          access_type?: string;
          token_hash?: string;
          job_scope?: string[] | null;
          permissions?: string[];
          status?: string;
          invited_by?: string | null;
          expires_at?: string | null;
          accepted_at?: string | null;
          revoked_at?: string | null;
          last_accessed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: 'portal_access_organisation_id_fkey'; columns: ['organisation_id']; referencedRelation: 'organisations'; referencedColumns: ['id'] },
        ];
      };
      invitations: {
        Row: {
          id: string;
          organisation_id: string;
          email: string;
          access_type: string;
          role: string | null;
          job_id: string | null;
          token_hash: string;
          status: string;
          invited_by: string | null;
          expires_at: string | null;
          accepted_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          email: string;
          access_type: string;
          role?: string | null;
          job_id?: string | null;
          token_hash: string;
          status?: string;
          invited_by?: string | null;
          expires_at?: string | null;
          accepted_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          email?: string;
          access_type?: string;
          role?: string | null;
          job_id?: string | null;
          token_hash?: string;
          status?: string;
          invited_by?: string | null;
          expires_at?: string | null;
          accepted_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: 'invitations_organisation_id_fkey'; columns: ['organisation_id']; referencedRelation: 'organisations'; referencedColumns: ['id'] },
        ];
      };
      evidence_records: {
        Row: {
          id: string;
          organisation_id: string;
          job_id: string | null;
          evidence_type: string;
          caption: string | null;
          project_stage: string | null;
          visibility: string;
          review_status: string;
          captured_by: string | null;
          captured_at: string | null;
          location_label: string | null;
          related_record_type: string | null;
          related_record_id: string | null;
          internal_note: string | null;
          metadata: Json | null;
          offline_status: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          job_id?: string | null;
          evidence_type: string;
          caption?: string | null;
          project_stage?: string | null;
          visibility?: string;
          review_status?: string;
          captured_by?: string | null;
          captured_at?: string | null;
          location_label?: string | null;
          related_record_type?: string | null;
          related_record_id?: string | null;
          internal_note?: string | null;
          metadata?: Json | null;
          offline_status?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          job_id?: string | null;
          evidence_type?: string;
          caption?: string | null;
          project_stage?: string | null;
          visibility?: string;
          review_status?: string;
          captured_by?: string | null;
          captured_at?: string | null;
          location_label?: string | null;
          related_record_type?: string | null;
          related_record_id?: string | null;
          internal_note?: string | null;
          metadata?: Json | null;
          offline_status?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: 'evidence_records_organisation_id_fkey'; columns: ['organisation_id']; referencedRelation: 'organisations'; referencedColumns: ['id'] },
          { foreignKeyName: 'evidence_records_job_id_fkey'; columns: ['job_id']; referencedRelation: 'jobs'; referencedColumns: ['id'] },
        ];
      };
      evidence_files: {
        Row: {
          id: string;
          evidence_id: string;
          organisation_id: string;
          bucket: string;
          object_path: string;
          original_filename: string;
          mime_type: string;
          size_bytes: number;
          visibility: string;
          uploaded_by: string | null;
          uploaded_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          evidence_id: string;
          organisation_id: string;
          bucket: string;
          object_path: string;
          original_filename: string;
          mime_type: string;
          size_bytes: number;
          visibility?: string;
          uploaded_by?: string | null;
          uploaded_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          evidence_id?: string;
          organisation_id?: string;
          bucket?: string;
          object_path?: string;
          original_filename?: string;
          mime_type?: string;
          size_bytes?: number;
          visibility?: string;
          uploaded_by?: string | null;
          uploaded_at?: string;
          archived_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: 'evidence_files_evidence_id_fkey'; columns: ['evidence_id']; referencedRelation: 'evidence_records'; referencedColumns: ['id'] },
          { foreignKeyName: 'evidence_files_organisation_id_fkey'; columns: ['organisation_id']; referencedRelation: 'organisations'; referencedColumns: ['id'] },
        ];
      };
      daily_logs: {
        Row: {
          id: string;
          organisation_id: string;
          job_id: string;
          log_date: string;
          supervisor_id: string | null;
          site_open_time: string | null;
          site_close_time: string | null;
          weather_desc: string | null;
          temperature: string | null;
          site_conditions: string | null;
          access_issues: string | null;
          welfare_status: string | null;
          work_completed: string | null;
          progress_estimate: number | null;
          planned_work_tomorrow: string | null;
          status: string;
          client_summary_published: boolean;
          version: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          job_id: string;
          log_date: string;
          supervisor_id?: string | null;
          site_open_time?: string | null;
          site_close_time?: string | null;
          weather_desc?: string | null;
          temperature?: string | null;
          site_conditions?: string | null;
          access_issues?: string | null;
          welfare_status?: string | null;
          work_completed?: string | null;
          progress_estimate?: number | null;
          planned_work_tomorrow?: string | null;
          status?: string;
          client_summary_published?: boolean;
          version?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          job_id?: string;
          log_date?: string;
          supervisor_id?: string | null;
          site_open_time?: string | null;
          site_close_time?: string | null;
          weather_desc?: string | null;
          temperature?: string | null;
          site_conditions?: string | null;
          access_issues?: string | null;
          welfare_status?: string | null;
          work_completed?: string | null;
          progress_estimate?: number | null;
          planned_work_tomorrow?: string | null;
          status?: string;
          client_summary_published?: boolean;
          version?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: 'daily_logs_organisation_id_fkey'; columns: ['organisation_id']; referencedRelation: 'organisations'; referencedColumns: ['id'] },
          { foreignKeyName: 'daily_logs_job_id_fkey'; columns: ['job_id']; referencedRelation: 'jobs'; referencedColumns: ['id'] },
        ];
      };
      timeline_events: {
        Row: {
          id: string;
          organisation_id: string;
          job_id: string;
          event_type: string;
          title: string;
          summary: string | null;
          actor_id: string | null;
          visibility: string;
          related_record_type: string | null;
          related_record_id: string | null;
          parent_event_id: string | null;
          metadata: Json | null;
          event_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          job_id: string;
          event_type: string;
          title: string;
          summary?: string | null;
          actor_id?: string | null;
          visibility?: string;
          related_record_type?: string | null;
          related_record_id?: string | null;
          parent_event_id?: string | null;
          metadata?: Json | null;
          event_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          job_id?: string;
          event_type?: string;
          title?: string;
          summary?: string | null;
          actor_id?: string | null;
          visibility?: string;
          related_record_type?: string | null;
          related_record_id?: string | null;
          parent_event_id?: string | null;
          metadata?: Json | null;
          event_date?: string;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: 'timeline_events_organisation_id_fkey'; columns: ['organisation_id']; referencedRelation: 'organisations'; referencedColumns: ['id'] },
          { foreignKeyName: 'timeline_events_job_id_fkey'; columns: ['job_id']; referencedRelation: 'jobs'; referencedColumns: ['id'] },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}