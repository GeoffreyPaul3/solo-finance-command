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
      financial_account_status: "active" | "archived";
      financial_account_type:
        "bank" | "cash" | "mobile_money" | "payment_processor" | "digital_wallet" | "other";
      financial_category_type: "income" | "expense";
      financial_transaction_status: "posted" | "reversed";
      financial_transaction_type: "income" | "expense" | "transfer" | "adjustment";
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
      financial_transaction_status: ["posted", "reversed"],
      financial_transaction_type: ["income", "expense", "transfer", "adjustment"],
    },
  },
} as const;
