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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
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
      payment_method:
        "cash" | "bank_transfer" | "mobile_money" | "card" | "payment_processor" | "other";
      payment_status: "posted" | "reversed";
      project_status: "planning" | "active" | "on_hold" | "completed" | "archived";
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
    },
  },
} as const;
