export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: number;
          metadata: Json;
          workspace_id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: number;
          metadata?: Json;
          workspace_id: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: number;
          metadata?: Json;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          onboarded_at: string | null;
          phone: string | null;
          profession: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          onboarded_at?: string | null;
          phone?: string | null;
          profession?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          onboarded_at?: string | null;
          phone?: string | null;
          profession?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_settings: {
        Row: {
          created_at: string;
          default_payment_terms_days: number;
          desired_monthly_income: number | null;
          invoice_next_number: number;
          invoice_notes: string | null;
          invoice_number_prefix: string;
          operating_buffer: number;
          payment_instructions: string | null;
          target_hourly_rate: number | null;
          target_margin_percent: number | null;
          tax_mode: string;
          tax_reserve_percent: number;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          default_payment_terms_days?: number;
          desired_monthly_income?: number | null;
          invoice_next_number?: number;
          invoice_notes?: string | null;
          invoice_number_prefix?: string;
          operating_buffer?: number;
          payment_instructions?: string | null;
          target_hourly_rate?: number | null;
          target_margin_percent?: number | null;
          tax_mode?: string;
          tax_reserve_percent?: number;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          default_payment_terms_days?: number;
          desired_monthly_income?: number | null;
          invoice_next_number?: number;
          invoice_notes?: string | null;
          invoice_number_prefix?: string;
          operating_buffer?: number;
          payment_instructions?: string | null;
          target_hourly_rate?: number | null;
          target_margin_percent?: number | null;
          tax_mode?: string;
          tax_reserve_percent?: number;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: true;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          business_type: string | null;
          country: string | null;
          created_at: string;
          created_by: string;
          currency: string;
          fiscal_year_start_month: number;
          id: string;
          logo_url: string | null;
          name: string;
          plan: string;
          status: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          business_type?: string | null;
          country?: string | null;
          created_at?: string;
          created_by: string;
          currency?: string;
          fiscal_year_start_month?: number;
          id?: string;
          logo_url?: string | null;
          name: string;
          plan?: string;
          status?: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          business_type?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string;
          currency?: string;
          fiscal_year_start_month?: number;
          id?: string;
          logo_url?: string | null;
          name?: string;
          plan?: string;
          status?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      financial_accounts: {
        Row: {
          created_at: string;
          created_by: string | null;
          currency: string;
          current_balance: number;
          description: string | null;
          id: string;
          name: string;
          opening_balance: number;
          opening_balance_date: string;
          status: Database["public"]["Enums"]["financial_account_status"];
          type: Database["public"]["Enums"]["financial_account_type"];
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          currency: string;
          current_balance?: number;
          description?: string | null;
          id?: string;
          name: string;
          opening_balance?: number;
          opening_balance_date?: string;
          status?: Database["public"]["Enums"]["financial_account_status"];
          type?: Database["public"]["Enums"]["financial_account_type"];
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          current_balance?: number;
          description?: string | null;
          id?: string;
          name?: string;
          opening_balance?: number;
          opening_balance_date?: string;
          status?: Database["public"]["Enums"]["financial_account_status"];
          type?: Database["public"]["Enums"]["financial_account_type"];
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financial_accounts_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      financial_goals: {
        Row: {
          category: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          current_amount: number;
          id: string;
          name: string;
          notes: string | null;
          status: string;
          target_amount: number;
          target_date: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          created_by?: string | null;
          currency: string;
          current_amount?: number;
          id?: string;
          name: string;
          notes?: string | null;
          status?: string;
          target_amount: number;
          target_date?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          current_amount?: number;
          id?: string;
          name?: string;
          notes?: string | null;
          status?: string;
          target_amount?: number;
          target_date?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financial_goals_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_reminders: {
        Row: {
          id: string;
          invoice_id: string;
          message_body: string | null;
          provider_message_id: string | null;
          recipient_email: string;
          reminder_type: string;
          sent_at: string;
          sent_by: string | null;
          status: string;
          subject: string;
          workspace_id: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          message_body?: string | null;
          provider_message_id?: string | null;
          recipient_email: string;
          reminder_type?: string;
          sent_at?: string;
          sent_by?: string | null;
          status?: string;
          subject: string;
          workspace_id: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          message_body?: string | null;
          provider_message_id?: string | null;
          recipient_email?: string;
          reminder_type?: string;
          sent_at?: string;
          sent_by?: string | null;
          status?: string;
          subject?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_reminders_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_reminders_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      shareable_artifacts: {
        Row: {
          access_config: Json;
          artifact_type: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          expires_at: string | null;
          id: string;
          last_viewed_at: string | null;
          revoked_at: string | null;
          share_token: string;
          snapshot_data: Json;
          source_entity_id: string;
          source_entity_type: string;
          status: string;
          title: string;
          updated_at: string;
          view_count: number;
          visibility: string;
          workspace_id: string;
        };
        Insert: {
          access_config?: Json;
          artifact_type: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          expires_at?: string | null;
          id?: string;
          last_viewed_at?: string | null;
          revoked_at?: string | null;
          share_token: string;
          snapshot_data?: Json;
          source_entity_id: string;
          source_entity_type: string;
          status?: string;
          title: string;
          updated_at?: string;
          view_count?: number;
          visibility?: string;
          workspace_id: string;
        };
        Update: {
          access_config?: Json;
          artifact_type?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          expires_at?: string | null;
          id?: string;
          last_viewed_at?: string | null;
          revoked_at?: string | null;
          share_token?: string;
          snapshot_data?: Json;
          source_entity_id?: string;
          source_entity_type?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          view_count?: number;
          visibility?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shareable_artifacts_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_referral_profiles: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          referral_code: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          referral_code: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          referral_code?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_referral_profiles_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: true;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      referral_attributions: {
        Row: {
          activated_at: string | null;
          anonymous_session_id: string | null;
          campaign_id: string | null;
          converted_at: string | null;
          created_at: string;
          creator_id: string | null;
          id: string;
          landing_at: string;
          referral_code: string | null;
          referred_user_id: string | null;
          referred_workspace_id: string | null;
          referrer_workspace_id: string | null;
          signup_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          activated_at?: string | null;
          anonymous_session_id?: string | null;
          campaign_id?: string | null;
          converted_at?: string | null;
          created_at?: string;
          creator_id?: string | null;
          id?: string;
          landing_at?: string;
          referral_code?: string | null;
          referred_user_id?: string | null;
          referred_workspace_id?: string | null;
          referrer_workspace_id?: string | null;
          signup_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          activated_at?: string | null;
          anonymous_session_id?: string | null;
          campaign_id?: string | null;
          converted_at?: string | null;
          created_at?: string;
          creator_id?: string | null;
          id?: string;
          landing_at?: string;
          referral_code?: string | null;
          referred_user_id?: string | null;
          referred_workspace_id?: string | null;
          referrer_workspace_id?: string | null;
          signup_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "referral_attributions_referrer_workspace_id_fkey";
            columns: ["referrer_workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referral_attributions_referred_workspace_id_fkey";
            columns: ["referred_workspace_id"];
            isOneToOne: true;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      distribution_events: {
        Row: {
          actor_user_id: string | null;
          anonymous_session_id: string | null;
          artifact_id: string | null;
          created_at: string;
          event_type: string;
          id: string;
          metadata: Json;
          referral_code: string | null;
          source: string | null;
          workspace_id: string | null;
        };
        Insert: {
          actor_user_id?: string | null;
          anonymous_session_id?: string | null;
          artifact_id?: string | null;
          created_at?: string;
          event_type: string;
          id?: string;
          metadata?: Json;
          referral_code?: string | null;
          source?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          actor_user_id?: string | null;
          anonymous_session_id?: string | null;
          artifact_id?: string | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          metadata?: Json;
          referral_code?: string | null;
          source?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "distribution_events_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "distribution_events_artifact_id_fkey";
            columns: ["artifact_id"];
            isOneToOne: false;
            referencedRelation: "shareable_artifacts";
            referencedColumns: ["id"];
          },
        ];
      };
      financial_categories: {
        Row: {
          color: string | null;
          created_at: string;
          icon: string | null;
          id: string;
          is_system: boolean;
          name: string;
          type: Database["public"]["Enums"]["financial_category_type"];
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          icon?: string | null;
          id?: string;
          is_system?: boolean;
          name: string;
          type: Database["public"]["Enums"]["financial_category_type"];
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          icon?: string | null;
          id?: string;
          is_system?: boolean;
          name?: string;
          type?: Database["public"]["Enums"]["financial_category_type"];
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financial_categories_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          address: string | null;
          company_name: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          status: Database["public"]["Enums"]["client_status"];
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          address?: string | null;
          company_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          status?: Database["public"]["Enums"]["client_status"];
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          address?: string | null;
          company_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          status?: Database["public"]["Enums"]["client_status"];
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clients_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          budget: number | null;
          budget_currency: string | null;
          client_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          end_date: string | null;
          id: string;
          name: string;
          notes: string | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["project_status"];
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          budget?: number | null;
          budget_currency?: string | null;
          client_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          budget?: number | null;
          budget_currency?: string | null;
          client_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          workspace_id: string;
          client_id: string;
          project_id: string | null;
          invoice_number: string;
          status: Database["public"]["Enums"]["invoice_status"];
          currency: string;
          issue_date: string;
          due_date: string;
          subtotal: number;
          discount_amount: number;
          tax_amount: number;
          total: number;
          amount_paid: number;
          amount_due: number;
          notes: string | null;
          payment_instructions: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          client_id: string;
          project_id?: string | null;
          invoice_number: string;
          status?: Database["public"]["Enums"]["invoice_status"];
          currency: string;
          issue_date?: string;
          due_date: string;
          subtotal?: number;
          discount_amount?: number;
          tax_amount?: number;
          total?: number;
          amount_paid?: number;
          amount_due?: number;
          notes?: string | null;
          payment_instructions?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          client_id?: string;
          project_id?: string | null;
          invoice_number?: string;
          status?: Database["public"]["Enums"]["invoice_status"];
          currency?: string;
          issue_date?: string;
          due_date?: string;
          subtotal?: number;
          discount_amount?: number;
          tax_amount?: number;
          total?: number;
          amount_paid?: number;
          amount_due?: number;
          notes?: string | null;
          payment_instructions?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_line_items: {
        Row: {
          id: string;
          workspace_id: string;
          invoice_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          invoice_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          invoice_id?: string;
          description?: string;
          quantity?: number;
          unit_price?: number;
          line_total?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_line_items_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          workspace_id: string;
          financial_transaction_id: string;
          financial_account_id: string;
          category_id: string | null;
          client_id: string | null;
          project_id: string | null;
          amount: number;
          currency: string;
          expense_date: string;
          description: string;
          vendor: string | null;
          notes: string | null;
          reference: string | null;
          status: Database["public"]["Enums"]["expense_status"];
          idempotency_key: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          financial_transaction_id: string;
          financial_account_id: string;
          category_id?: string | null;
          client_id?: string | null;
          project_id?: string | null;
          amount: number;
          currency: string;
          expense_date: string;
          description: string;
          vendor?: string | null;
          notes?: string | null;
          reference?: string | null;
          status?: Database["public"]["Enums"]["expense_status"];
          idempotency_key?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          financial_transaction_id?: string;
          financial_account_id?: string;
          category_id?: string | null;
          client_id?: string | null;
          project_id?: string | null;
          amount?: number;
          currency?: string;
          expense_date?: string;
          description?: string;
          vendor?: string | null;
          notes?: string | null;
          reference?: string | null;
          status?: Database["public"]["Enums"]["expense_status"];
          idempotency_key?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_financial_transaction_id_fkey";
            columns: ["financial_transaction_id"];
            isOneToOne: true;
            referencedRelation: "financial_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_financial_account_id_fkey";
            columns: ["financial_account_id"];
            isOneToOne: false;
            referencedRelation: "financial_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          workspace_id: string;
          invoice_id: string;
          financial_transaction_id: string;
          financial_account_id: string;
          amount: number;
          currency: string;
          payment_date: string;
          payment_method: Database["public"]["Enums"]["payment_method"];
          reference: string | null;
          notes: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          idempotency_key: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          invoice_id: string;
          financial_transaction_id: string;
          financial_account_id: string;
          amount: number;
          currency: string;
          payment_date: string;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          reference?: string | null;
          notes?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          idempotency_key?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          invoice_id?: string;
          financial_transaction_id?: string;
          financial_account_id?: string;
          amount?: number;
          currency?: string;
          payment_date?: string;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          reference?: string | null;
          notes?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          idempotency_key?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_financial_transaction_id_fkey";
            columns: ["financial_transaction_id"];
            isOneToOne: false;
            referencedRelation: "financial_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_financial_account_id_fkey";
            columns: ["financial_account_id"];
            isOneToOne: false;
            referencedRelation: "financial_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      financial_transactions: {
        Row: {
          account_id: string;
          amount: number;
          category_id: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          description: string;
          id: string;
          idempotency_key: string | null;
          paired_account_id: string | null;
          reference: string | null;
          reversal_of_transaction_id: string | null;
          reversal_reason: string | null;
          reversed_by_transaction_id: string | null;
          source_id: string | null;
          source_type: string | null;
          status: Database["public"]["Enums"]["financial_transaction_status"];
          transaction_date: string;
          transaction_type: Database["public"]["Enums"]["financial_transaction_type"];
          transfer_id: string | null;
          transfer_role: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          account_id: string;
          amount: number;
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency: string;
          description: string;
          id?: string;
          idempotency_key?: string | null;
          paired_account_id?: string | null;
          reference?: string | null;
          reversal_of_transaction_id?: string | null;
          reversal_reason?: string | null;
          reversed_by_transaction_id?: string | null;
          source_id?: string | null;
          source_type?: string | null;
          status?: Database["public"]["Enums"]["financial_transaction_status"];
          transaction_date: string;
          transaction_type: Database["public"]["Enums"]["financial_transaction_type"];
          transfer_id?: string | null;
          transfer_role?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          account_id?: string;
          amount?: number;
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string;
          id?: string;
          idempotency_key?: string | null;
          paired_account_id?: string | null;
          reference?: string | null;
          reversal_of_transaction_id?: string | null;
          reversal_reason?: string | null;
          reversed_by_transaction_id?: string | null;
          source_id?: string | null;
          source_type?: string | null;
          status?: Database["public"]["Enums"]["financial_transaction_status"];
          transaction_date?: string;
          transaction_type?: Database["public"]["Enums"]["financial_transaction_type"];
          transfer_id?: string | null;
          transfer_role?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financial_transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "financial_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financial_transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "financial_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financial_transactions_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      obligations: {
        Row: {
          amount: number;
          category_id: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          due_date: string;
          id: string;
          notes: string | null;
          priority: number;
          recurring_expense_id: string | null;
          settled_at: string | null;
          settled_by_transaction_id: string | null;
          status: Database["public"]["Enums"]["obligation_status"];
          title: string;
          updated_at: string;
          vendor: string | null;
          workspace_id: string;
        };
        Insert: {
          amount: number;
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency: string;
          due_date: string;
          id?: string;
          notes?: string | null;
          priority?: number;
          recurring_expense_id?: string | null;
          settled_at?: string | null;
          settled_by_transaction_id?: string | null;
          status?: Database["public"]["Enums"]["obligation_status"];
          title: string;
          updated_at?: string;
          vendor?: string | null;
          workspace_id: string;
        };
        Update: {
          amount?: number;
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          due_date?: string;
          id?: string;
          notes?: string | null;
          priority?: number;
          recurring_expense_id?: string | null;
          settled_at?: string | null;
          settled_by_transaction_id?: string | null;
          status?: Database["public"]["Enums"]["obligation_status"];
          title?: string;
          updated_at?: string;
          vendor?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "obligations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "obligations_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "financial_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "obligations_recurring_expense_id_fkey";
            columns: ["recurring_expense_id"];
            isOneToOne: false;
            referencedRelation: "recurring_expenses";
            referencedColumns: ["id"];
          },
        ];
      };
      recurring_expenses: {
        Row: {
          amount: number;
          category_id: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          end_date: string | null;
          frequency: Database["public"]["Enums"]["recurring_expense_frequency"];
          id: string;
          next_due_date: string | null;
          notes: string | null;
          start_date: string;
          status: Database["public"]["Enums"]["recurring_expense_status"];
          title: string;
          updated_at: string;
          vendor: string | null;
          workspace_id: string;
        };
        Insert: {
          amount: number;
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency: string;
          end_date?: string | null;
          frequency: Database["public"]["Enums"]["recurring_expense_frequency"];
          id?: string;
          next_due_date?: string | null;
          notes?: string | null;
          start_date: string;
          status?: Database["public"]["Enums"]["recurring_expense_status"];
          title: string;
          updated_at?: string;
          vendor?: string | null;
          workspace_id: string;
        };
        Update: {
          amount?: number;
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          end_date?: string | null;
          frequency?: Database["public"]["Enums"]["recurring_expense_frequency"];
          id?: string;
          next_due_date?: string | null;
          notes?: string | null;
          start_date?: string;
          status?: Database["public"]["Enums"]["recurring_expense_status"];
          title?: string;
          updated_at?: string;
          vendor?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recurring_expenses_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "financial_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      recurring_expense_occurrences: {
        Row: {
          created_at: string;
          id: string;
          obligation_id: string | null;
          occurrence_date: string;
          recurring_expense_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          obligation_id?: string | null;
          occurrence_date: string;
          recurring_expense_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          obligation_id?: string | null;
          occurrence_date?: string;
          recurring_expense_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recurring_expense_occurrences_recurring_expense_id_fkey";
            columns: ["recurring_expense_id"];
            isOneToOne: false;
            referencedRelation: "recurring_expenses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recurring_expense_occurrences_obligation_id_fkey";
            columns: ["obligation_id"];
            isOneToOne: false;
            referencedRelation: "obligations";
            referencedColumns: ["id"];
          },
        ];
      };
      tax_reserve_adjustments: {
        Row: {
          amount: number;
          as_of_date: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          id: string;
          notes: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          amount: number;
          as_of_date?: string;
          created_at?: string;
          created_by?: string | null;
          currency: string;
          id?: string;
          notes?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          amount?: number;
          as_of_date?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          notes?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tax_reserve_adjustments_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_cfo_interactions: {
        Row: {
          context_snapshot: Json | null;
          created_at: string;
          id: string;
          question: string;
          response: Json;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          context_snapshot?: Json | null;
          created_at?: string;
          id?: string;
          question: string;
          response: Json;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          context_snapshot?: Json | null;
          created_at?: string;
          id?: string;
          question?: string;
          response?: Json;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_cfo_interactions_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admin_roles: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      subscription_plans: {
        Row: {
          created_at: string;
          description: string;
          features: Json;
          id: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          features?: Json;
          id: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          features?: Json;
          id?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      subscription_prices: {
        Row: {
          amount_cents: number;
          billing_interval: string;
          created_at: string;
          currency: string;
          id: string;
          is_active: boolean;
          plan_id: string;
        };
        Insert: {
          amount_cents: number;
          billing_interval: string;
          created_at?: string;
          currency: string;
          id?: string;
          is_active?: boolean;
          plan_id: string;
        };
        Update: {
          amount_cents?: number;
          billing_interval?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          is_active?: boolean;
          plan_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscription_prices_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          created_at: string;
          currency: string;
          current_period_end: string;
          current_period_start: string;
          id: string;
          plan_id: string;
          status: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created_at?: string;
          currency: string;
          current_period_end: string;
          current_period_start: string;
          id?: string;
          plan_id: string;
          status: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created_at?: string;
          currency?: string;
          current_period_end?: string;
          current_period_start?: string;
          id?: string;
          plan_id?: string;
          status?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: true;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_payments: {
        Row: {
          created_at: string;
          expected_amount_cents: number;
          expected_currency: string;
          failure_reason: string | null;
          id: string;
          metadata: Json;
          plan_id: string;
          provider: string;
          provider_ref: string | null;
          status: string;
          subscription_id: string | null;
          tx_ref: string;
          updated_at: string;
          verified_amount_cents: number | null;
          verified_at: string | null;
          verified_currency: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          expected_amount_cents: number;
          expected_currency: string;
          failure_reason?: string | null;
          id?: string;
          metadata?: Json;
          plan_id: string;
          provider?: string;
          provider_ref?: string | null;
          status?: string;
          subscription_id?: string | null;
          tx_ref: string;
          updated_at?: string;
          verified_amount_cents?: number | null;
          verified_at?: string | null;
          verified_currency?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          expected_amount_cents?: number;
          expected_currency?: string;
          failure_reason?: string | null;
          id?: string;
          metadata?: Json;
          plan_id?: string;
          provider?: string;
          provider_ref?: string | null;
          status?: string;
          subscription_id?: string | null;
          tx_ref?: string;
          updated_at?: string;
          verified_amount_cents?: number | null;
          verified_at?: string | null;
          verified_currency?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscription_payments_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_payments_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          role: Database["public"]["Enums"]["app_role"];
          status: string;
          token: string;
          workspace_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at: string;
          id?: string;
          invited_by: string;
          role?: Database["public"]["Enums"]["app_role"];
          status?: string;
          token: string;
          workspace_id: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          role?: Database["public"]["Enums"]["app_role"];
          status?: string;
          token?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      support_requests: {
        Row: {
          category: string;
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          status: string;
          subject: string;
          user_id: string | null;
          workspace_id: string | null;
        };
        Insert: {
          category?: string;
          created_at?: string;
          email: string;
          id?: string;
          message: string;
          name: string;
          status?: string;
          subject: string;
          user_id?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          status?: string;
          subject?: string;
          user_id?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "support_requests_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      email_events: {
        Row: {
          created_at: string;
          error_message: string | null;
          id: string;
          idempotency_key: string;
          provider_message_id: string | null;
          recipient: string;
          status: string;
          template: string;
        };
        Insert: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          idempotency_key: string;
          provider_message_id?: string | null;
          recipient: string;
          status: string;
          template: string;
        };
        Update: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          idempotency_key?: string;
          provider_message_id?: string | null;
          recipient?: string;
          status?: string;
          template?: string;
        };
        Relationships: [];
      };
      creator_assets: {
        Row: {
          asset_type: string;
          created_at: string;
          description: string | null;
          download_url: string;
          file_format: string;
          file_size_bytes: number | null;
          id: string;
          name: string;
          thumbnail_url: string | null;
          updated_at: string;
        };
        Insert: {
          asset_type: string;
          created_at?: string;
          description?: string | null;
          download_url: string;
          file_format: string;
          file_size_bytes?: number | null;
          id?: string;
          name: string;
          thumbnail_url?: string | null;
          updated_at?: string;
        };
        Update: {
          asset_type?: string;
          created_at?: string;
          description?: string | null;
          download_url?: string;
          file_format?: string;
          file_size_bytes?: number | null;
          id?: string;
          name?: string;
          thumbnail_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      creator_campaigns: {
        Row: {
          archived_at: string | null;
          campaign_code: string;
          created_at: string;
          creator_id: string;
          destination_path: string;
          id: string;
          name: string;
          platform: string | null;
          status: string;
        };
        Insert: {
          archived_at?: string | null;
          campaign_code: string;
          created_at?: string;
          creator_id: string;
          destination_path?: string;
          id?: string;
          name: string;
          platform?: string | null;
          status?: string;
        };
        Update: {
          archived_at?: string | null;
          campaign_code?: string;
          created_at?: string;
          creator_id?: string;
          destination_path?: string;
          id?: string;
          name?: string;
          platform?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "creator_campaigns_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "creator_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      creator_channels: {
        Row: {
          created_at: string;
          creator_id: string;
          follower_count: number | null;
          handle: string | null;
          id: string;
          is_verified: boolean;
          platform: string;
          url: string | null;
        };
        Insert: {
          created_at?: string;
          creator_id: string;
          follower_count?: number | null;
          handle?: string | null;
          id?: string;
          is_verified?: boolean;
          platform: string;
          url?: string | null;
        };
        Update: {
          created_at?: string;
          creator_id?: string;
          follower_count?: number | null;
          handle?: string | null;
          id?: string;
          is_verified?: boolean;
          platform?: string;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "creator_channels_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "creator_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      creator_commission_rules: {
        Row: {
          applies_to_plan_id: string | null;
          commission_rate_bps: number;
          commission_window_months: number;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          applies_to_plan_id?: string | null;
          commission_rate_bps: number;
          commission_window_months?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          applies_to_plan_id?: string | null;
          commission_rate_bps?: number;
          commission_window_months?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "creator_commission_rules_applies_to_plan_id_fkey";
            columns: ["applies_to_plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      creator_commissions: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          attribution_id: string;
          billing_period_label: string;
          commission_amount_cents: number;
          commission_rate_bps: number;
          commission_rule_id: string | null;
          created_at: string;
          creator_id: string;
          currency: string;
          flags: Json;
          gross_amount_cents: number;
          id: string;
          paid_at: string | null;
          referred_workspace_id: string;
          reversal_reason: string | null;
          reversed_at: string | null;
          status: string;
          subscription_payment_id: string;
          updated_at: string;
          window_months_snapshot: number;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          attribution_id: string;
          billing_period_label: string;
          commission_amount_cents: number;
          commission_rate_bps: number;
          commission_rule_id?: string | null;
          created_at?: string;
          creator_id: string;
          currency: string;
          flags?: Json;
          gross_amount_cents: number;
          id?: string;
          paid_at?: string | null;
          referred_workspace_id: string;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          status?: string;
          subscription_payment_id: string;
          updated_at?: string;
          window_months_snapshot: number;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          attribution_id?: string;
          billing_period_label?: string;
          commission_amount_cents?: number;
          commission_rate_bps?: number;
          commission_rule_id?: string | null;
          created_at?: string;
          creator_id?: string;
          currency?: string;
          flags?: Json;
          gross_amount_cents?: number;
          id?: string;
          paid_at?: string | null;
          referred_workspace_id?: string;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          status?: string;
          subscription_payment_id?: string;
          updated_at?: string;
          window_months_snapshot?: number;
        };
        Relationships: [
          {
            foreignKeyName: "creator_commissions_attribution_id_fkey";
            columns: ["attribution_id"];
            isOneToOne: false;
            referencedRelation: "referral_attributions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creator_commissions_commission_rule_id_fkey";
            columns: ["commission_rule_id"];
            isOneToOne: false;
            referencedRelation: "creator_commission_rules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creator_commissions_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "creator_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creator_commissions_referred_workspace_id_fkey";
            columns: ["referred_workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creator_commissions_subscription_payment_id_fkey";
            columns: ["subscription_payment_id"];
            isOneToOne: false;
            referencedRelation: "subscription_payments";
            referencedColumns: ["id"];
          },
        ];
      };
      creator_payouts: {
        Row: {
          amount_cents: number;
          approved_at: string | null;
          approved_by: string | null;
          commission_ids: Json;
          created_at: string;
          creator_id: string;
          currency: string;
          failed_at: string | null;
          failure_reason: string | null;
          id: string;
          paid_at: string | null;
          payout_reference: string;
          requested_at: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          amount_cents: number;
          approved_at?: string | null;
          approved_by?: string | null;
          commission_ids?: Json;
          created_at?: string;
          creator_id: string;
          currency: string;
          failed_at?: string | null;
          failure_reason?: string | null;
          id?: string;
          paid_at?: string | null;
          payout_reference: string;
          requested_at?: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          approved_at?: string | null;
          approved_by?: string | null;
          commission_ids?: Json;
          created_at?: string;
          creator_id?: string;
          currency?: string;
          failed_at?: string | null;
          failure_reason?: string | null;
          id?: string;
          paid_at?: string | null;
          payout_reference?: string;
          requested_at?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "creator_payouts_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "creator_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      creator_profiles: {
        Row: {
          admin_note: string | null;
          application_note: string | null;
          application_status: string;
          approved_at: string | null;
          approved_by: string | null;
          bio: string | null;
          created_at: string;
          creator_status: string | null;
          display_name: string;
          email: string;
          estimated_audience: number | null;
          id: string;
          primary_platform: string;
          public_handle: string;
          referral_code: string;
          rejected_at: string | null;
          suspended_at: string | null;
          updated_at: string;
          user_id: string | null;
          website_url: string | null;
        };
        Insert: {
          admin_note?: string | null;
          application_note?: string | null;
          application_status?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          bio?: string | null;
          created_at?: string;
          creator_status?: string | null;
          display_name: string;
          email: string;
          estimated_audience?: number | null;
          id?: string;
          primary_platform: string;
          public_handle: string;
          referral_code: string;
          rejected_at?: string | null;
          suspended_at?: string | null;
          updated_at?: string;
          user_id?: string | null;
          website_url?: string | null;
        };
        Update: {
          admin_note?: string | null;
          application_note?: string | null;
          application_status?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          bio?: string | null;
          created_at?: string;
          creator_status?: string | null;
          display_name?: string;
          email?: string;
          estimated_audience?: number | null;
          id?: string;
          primary_platform?: string;
          public_handle?: string;
          referral_code?: string;
          rejected_at?: string | null;
          suspended_at?: string | null;
          updated_at?: string;
          user_id?: string | null;
          website_url?: string | null;
        };
        Relationships: [];
      };
      platform_audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: number;
          metadata: Json;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: number;
          metadata?: Json;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: number;
          metadata?: Json;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_artifact_view: {
        Args: {
          p_share_token: string;
        };
        Returns: boolean;
      };
      is_platform_admin: {
        Args: {
          check_user_id: string;
        };
        Returns: boolean;
      };
      archive_financial_account: {
        Args: {
          _account_id: string;
          _workspace_id: string;
        };
        Returns: undefined;
      };
      create_financial_account: {
        Args: {
          _currency: string;
          _description?: string;
          _name: string;
          _opening_balance?: number;
          _opening_balance_date?: string;
          _type: Database["public"]["Enums"]["financial_account_type"];
          _workspace_id: string;
        };
        Returns: string;
      };
      create_workspace: {
        Args: {
          _business_type?: string;
          _country?: string;
          _currency?: string;
          _default_payment_terms_days?: number;
          _fiscal_year_start_month?: number;
          _name: string;
          _operating_buffer?: number;
          _tax_reserve_percent?: number;
          _timezone?: string;
        };
        Returns: string;
      };
      current_workspace_role: {
        Args: { _workspace_id: string };
        Returns: Database["public"]["Enums"]["app_role"];
      };
      has_workspace_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][];
          _workspace_id: string;
        };
        Returns: boolean;
      };
      is_workspace_member: { Args: { _workspace_id: string }; Returns: boolean };
      reconcile_account_balance: {
        Args: {
          _account_id: string;
          _workspace_id: string;
        };
        Returns: {
          account_id: string;
          account_name: string;
          calculated_balance: number;
          currency: string;
          is_reconciled: boolean;
          opening_balance: number;
          stored_balance: number;
          variance: number;
        }[];
      };
      record_adjustment: {
        Args: {
          _account_id: string;
          _delta_amount: number;
          _idempotency_key?: string;
          _reason: string;
          _reference?: string;
          _transaction_date: string;
          _workspace_id: string;
        };
        Returns: string;
      };
      record_expense: {
        Args: {
          _account_id: string;
          _amount: number;
          _category_id?: string;
          _description: string;
          _idempotency_key?: string;
          _reference?: string;
          _transaction_date: string;
          _workspace_id: string;
        };
        Returns: string;
      };
      record_income: {
        Args: {
          _account_id: string;
          _amount: number;
          _category_id?: string;
          _description: string;
          _idempotency_key?: string;
          _reference?: string;
          _transaction_date: string;
          _workspace_id: string;
        };
        Returns: string;
      };
      record_transfer: {
        Args: {
          _amount: number;
          _description: string;
          _destination_account_id: string;
          _idempotency_key?: string;
          _reference?: string;
          _source_account_id: string;
          _transaction_date: string;
          _workspace_id: string;
        };
        Returns: string;
      };
      reverse_transaction: {
        Args: {
          _reversal_reason: string;
          _transaction_id: string;
          _workspace_id: string;
        };
        Returns: string;
      };
      seed_default_financial_categories: {
        Args: { _workspace_id: string };
        Returns: undefined;
      };
      create_invoice: {
        Args: {
          _workspace_id: string;
          _client_id: string;
          _project_id?: string | null;
          _currency?: string;
          _issue_date?: string;
          _due_date?: string | null;
          _discount_amount?: number;
          _tax_amount?: number;
          _notes?: string | null;
          _payment_instructions?: string | null;
          _line_items?: Json;
        };
        Returns: string;
      };
      update_invoice: {
        Args: {
          _workspace_id: string;
          _invoice_id: string;
          _client_id?: string | null;
          _project_id?: string | null;
          _project_id_clear?: boolean;
          _currency?: string | null;
          _issue_date?: string | null;
          _due_date?: string | null;
          _discount_amount?: number | null;
          _tax_amount?: number | null;
          _notes?: string | null;
          _payment_instructions?: string | null;
          _line_items?: Json | null;
        };
        Returns: undefined;
      };
      send_invoice: {
        Args: { _workspace_id: string; _invoice_id: string };
        Returns: undefined;
      };
      cancel_invoice: {
        Args: { _workspace_id: string; _invoice_id: string };
        Returns: undefined;
      };
      record_invoice_payment: {
        Args: {
          _workspace_id: string;
          _invoice_id: string;
          _amount: number;
          _payment_date: string;
          _payment_method?: string;
          _financial_account_id?: string | null;
          _reference?: string | null;
          _notes?: string | null;
          _idempotency_key?: string | null;
        };
        Returns: string;
      };
      reverse_invoice_payment: {
        Args: {
          _workspace_id: string;
          _payment_id: string;
          _reversal_reason: string;
        };
        Returns: undefined;
      };
      get_workspace_receivables_summary: {
        Args: { _workspace_id: string };
        Returns: {
          total_outstanding: number;
          total_overdue: number;
          invoices_this_month: number;
          active_invoice_count: number;
        }[];
      };
      record_expense_with_meta: {
        Args: {
          _workspace_id: string;
          _account_id: string;
          _amount: number;
          _transaction_date: string;
          _description: string;
          _category_id?: string;
          _vendor?: string | null;
          _project_id?: string | null;
          _client_id?: string | null;
          _notes?: string | null;
          _reference?: string | null;
          _idempotency_key?: string | null;
        };
        Returns: string;
      };
      reverse_expense: {
        Args: {
          _workspace_id: string;
          _expense_id: string;
          _reversal_reason: string;
        };
        Returns: undefined;
      };
      get_command_center_summary: {
        Args: {
          _workspace_id: string;
          _date_from?: string;
          _date_to?: string;
        };
        Returns: {
          currency: string;
          total_revenue: number;
          total_expenses: number;
          net_cash: number;
          cash_balance: number;
          receivables_due: number;
        }[];
      };
      get_profitability_summary: {
        Args: {
          _workspace_id: string;
          _date_from?: string;
          _date_to?: string;
        };
        Returns: {
          currency: string;
          total_revenue: number;
          total_expenses: number;
          net_profit: number;
          invoice_count: number;
          expense_count: number;
        }[];
      };
      write_audit_log: {
        Args: {
          _action: string;
          _entity_id?: string;
          _entity_type: string;
          _metadata?: Json;
          _workspace_id: string;
        };
        Returns: undefined;
      };
      cancel_obligation: {
        Args: {
          _obligation_id: string;
          _workspace_id: string;
        };
        Returns: undefined;
      };
      complete_obligation: {
        Args: {
          _obligation_id: string;
          _settled_by_transaction_id?: string;
          _workspace_id: string;
        };
        Returns: undefined;
      };
      create_obligation: {
        Args: {
          _amount: number;
          _category_id?: string;
          _currency: string;
          _due_date: string;
          _notes?: string;
          _priority?: number;
          _recurring_expense_id?: string;
          _title: string;
          _vendor?: string;
          _workspace_id: string;
        };
        Returns: string;
      };
      create_recurring_expense: {
        Args: {
          _amount: number;
          _category_id?: string;
          _currency: string;
          _end_date?: string;
          _frequency: Database["public"]["Enums"]["recurring_expense_frequency"];
          _notes?: string;
          _start_date: string;
          _title: string;
          _vendor?: string;
          _workspace_id: string;
        };
        Returns: string;
      };
      generate_recurring_occurrences: {
        Args: {
          _as_of_date?: string;
          _horizon_days?: number;
          _workspace_id: string;
        };
        Returns: undefined;
      };
      get_cashflow_projection: {
        Args: {
          _horizon_days?: number;
          _workspace_id: string;
        };
        Returns: {
          currency: string;
          expected_inflow: number;
          expected_outflow: number;
          net_change: number;
          projected_balance: number;
          projection_date: string;
        }[];
      };
      get_cashflow_report: {
        Args: {
          _currency?: string;
          _date_from: string;
          _date_to: string;
          _workspace_id: string;
        };
        Returns: {
          cash_inflow: number;
          cash_outflow: number;
          closing_balance: number;
          currency: string;
          net_cashflow: number;
          period_start: string;
        }[];
      };
      get_command_center_v2_summary: {
        Args: {
          _date_from?: string;
          _date_to?: string;
          _workspace_id: string;
        };
        Returns: {
          cash_balance: number;
          currency: string;
          current_sts: number;
          is_primary_currency: boolean;
          net_cash: number;
          projected_sts: number;
          receivables_due: number;
          target_tax_reserve: number;
          total_expenses: number;
          total_revenue: number;
          tracked_tax_reserve: number;
          upcoming_obligations: number;
        }[];
      };
      get_expense_report: {
        Args: {
          _currency?: string;
          _date_from: string;
          _date_to: string;
          _workspace_id: string;
        };
        Returns: {
          category_id: string;
          category_name: string;
          currency: string;
          expense_count: number;
          tax_deductible_amount: number;
          total_amount: number;
          vendor: string;
        }[];
      };
      get_income_report: {
        Args: {
          _currency?: string;
          _date_from: string;
          _date_to: string;
          _workspace_id: string;
        };
        Returns: {
          client_id: string;
          client_name: string;
          currency: string;
          gross_billed: number;
          gross_collected: number;
          invoice_count: number;
          outstanding: number;
          project_id: string;
          project_name: string;
        }[];
      };
      get_receivables_report: {
        Args: {
          _currency?: string;
          _workspace_id: string;
        };
        Returns: {
          aging_bucket: string;
          amount_due: number;
          amount_paid: number;
          client_id: string;
          client_name: string;
          currency: string;
          days_overdue: number;
          due_date: string;
          invoice_id: string;
          invoice_number: string;
          issue_date: string;
          total_amount: number;
        }[];
      };
      get_recent_ai_cfo_interactions: {
        Args: {
          _limit?: number;
          _workspace_id: string;
        };
        Returns: {
          context_snapshot: Json | null;
          created_at: string;
          id: string;
          question: string;
          response: Json;
          user_id: string;
        }[];
      };
      get_client_economics: {
        Args: {
          _client_id?: string | null;
          _workspace_id: string;
        };
        Returns: {
          attributable_expenses: number;
          avg_days_to_payment: number | null;
          client_id: string;
          client_name: string;
          currency: string;
          last_payment_date: string | null;
          net_profit: number;
          outstanding_receivables: number;
          paid_invoices_count: number;
          overdue_invoices_count: number;
          profit_margin_percent: number;
          total_collected: number;
          total_invoiced: number;
          total_invoices_count: number;
        }[];
      };
      get_project_economics: {
        Args: {
          _project_id?: string | null;
          _workspace_id: string;
        };
        Returns: {
          budget: number | null;
          budget_currency: string | null;
          budget_utilization_percent: number | null;
          budget_variance: number | null;
          client_id: string | null;
          client_name: string | null;
          collected_revenue: number;
          currency: string;
          health_state: string;
          net_profit: number;
          outstanding_revenue: number;
          profit_margin_percent: number;
          project_expenses: number;
          project_id: string;
          project_name: string;
          project_revenue: number;
        }[];
      };
      get_safe_to_spend: {
        Args: {
          _workspace_id: string;
        };
        Returns: {
          currency: string;
          current_safe_to_spend: number;
          expected_collections_30d: number;
          is_primary_currency: boolean;
          liquid_cash: number;
          operating_buffer: number;
          projected_safe_to_spend: number;
          target_tax_reserve: number;
          tracked_tax_reserve: number;
          upcoming_obligations_30d: number;
        }[];
      };
      get_tax_summary: {
        Args: {
          _tax_year?: number;
          _workspace_id: string;
        };
        Returns: {
          currency: string;
          expenses_ytd: number;
          gross_income_ytd: number;
          is_primary_currency: boolean;
          net_taxable_income_ytd: number;
          shortfall: number;
          target_tax_reserve: number;
          tax_reserve_rate: number;
          tracked_tax_reserve: number;
        }[];
      };
      log_ai_cfo_interaction: {
        Args: {
          _context_snapshot?: Json;
          _question: string;
          _response: Json;
          _workspace_id: string;
        };
        Returns: string;
      };
      update_obligation: {
        Args: {
          _amount: number;
          _category_id?: string;
          _currency: string;
          _due_date: string;
          _notes?: string;
          _obligation_id: string;
          _priority?: number;
          _recurring_expense_id?: string;
          _title: string;
          _vendor?: string;
          _workspace_id: string;
        };
        Returns: undefined;
      };
      update_recurring_expense_status: {
        Args: {
          _recurring_expense_id: string;
          _status: Database["public"]["Enums"]["recurring_expense_status"];
          _workspace_id: string;
        };
        Returns: undefined;
      };
      upsert_tax_reserve_adjustment: {
        Args: {
          _amount: number;
          _as_of_date?: string;
          _currency: string;
          _notes?: string;
          _workspace_id: string;
        };
        Returns: undefined;
      };
      generate_creator_commission: {
        Args: {
          p_subscription_payment_id: string;
        };
        Returns: string;
      };
      resolve_creator_by_code: {
        Args: {
          p_campaign_code?: string;
          p_referral_code: string;
        };
        Returns: {
          campaign_id: string;
          campaign_name: string;
          creator_id: string;
          destination_path: string;
          display_name: string;
          primary_platform: string;
        }[];
      };
    };
    Enums: {
      app_role: "owner" | "admin" | "finance" | "manager" | "viewer";
      client_status: "active" | "archived";
      financial_account_status: "active" | "archived";
      financial_account_type:
        "bank" | "cash" | "mobile_money" | "payment_processor" | "digital_wallet" | "other";
      financial_category_type: "income" | "expense";
      expense_status: "posted" | "reversed";
      financial_transaction_status: "posted" | "reversed";
      financial_transaction_type: "income" | "expense" | "transfer" | "adjustment";
      invoice_status: "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled";
      obligation_status: "upcoming" | "due" | "overdue" | "paid" | "cancelled";
      payment_method:
        "cash" | "bank_transfer" | "mobile_money" | "card" | "payment_processor" | "other";
      payment_status: "posted" | "reversed";
      project_status: "planning" | "active" | "on_hold" | "completed" | "archived";
      recurring_expense_frequency: "weekly" | "monthly" | "quarterly" | "yearly";
      recurring_expense_status: "active" | "paused" | "cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "finance", "manager", "viewer"],
      client_status: ["active", "archived"],
      financial_account_status: ["active", "archived"],
      financial_account_type: [
        "bank",
        "cash",
        "mobile_money",
        "payment_processor",
        "digital_wallet",
        "other",
      ],
      financial_category_type: ["income", "expense"],
      expense_status: ["posted", "reversed"],
      financial_transaction_status: ["posted", "reversed"],
      financial_transaction_type: ["income", "expense", "transfer", "adjustment"],
      invoice_status: ["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"],
      obligation_status: ["upcoming", "due", "overdue", "paid", "cancelled"],
      payment_method: [
        "cash",
        "bank_transfer",
        "mobile_money",
        "card",
        "payment_processor",
        "other",
      ],
      payment_status: ["posted", "reversed"],
      project_status: ["planning", "active", "on_hold", "completed", "archived"],
      recurring_expense_frequency: ["weekly", "monthly", "quarterly", "yearly"],
      recurring_expense_status: ["active", "paused", "cancelled"],
    },
  },
} as const;
