import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// ============================================================================
// Core Database Types
// ============================================================================

export type FinancialAccountType = Database["public"]["Enums"]["financial_account_type"];
export type FinancialAccountStatus = Database["public"]["Enums"]["financial_account_status"];
export type FinancialCategoryType = Database["public"]["Enums"]["financial_category_type"];
export type FinancialTransactionType = Database["public"]["Enums"]["financial_transaction_type"];
export type FinancialTransactionStatus =
  Database["public"]["Enums"]["financial_transaction_status"];

export type FinancialAccount = Database["public"]["Tables"]["financial_accounts"]["Row"];
export type FinancialCategory = Database["public"]["Tables"]["financial_categories"]["Row"];
export type FinancialTransaction = Database["public"]["Tables"]["financial_transactions"]["Row"];

export type FinancialTransactionWithRelations = FinancialTransaction & {
  account?: FinancialAccount;
  category?: FinancialCategory | null;
  paired_account?: FinancialAccount | null;
};

// ============================================================================
// Display & Enumeration Constants
// ============================================================================

export const ACCOUNT_TYPES: FinancialAccountType[] = [
  "bank",
  "cash",
  "mobile_money",
  "payment_processor",
  "digital_wallet",
  "other",
];

export const ACCOUNT_TYPE_LABELS: Record<FinancialAccountType, string> = {
  bank: "Bank Account",
  cash: "Physical Cash",
  mobile_money: "Mobile Money (Airtel, MoMo, etc.)",
  payment_processor: "Payment Processor (Stripe, PayPal, etc.)",
  digital_wallet: "Digital Wallet",
  other: "Other Financial Account",
};

export const TRANSACTION_TYPE_LABELS: Record<FinancialTransactionType, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
  adjustment: "Adjustment",
};

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const createAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Account name is required")
    .max(100, "Account name cannot exceed 100 characters"),
  type: z.enum([
    "bank",
    "cash",
    "mobile_money",
    "payment_processor",
    "digital_wallet",
    "other",
  ] as const),
  currency: z.string().trim().length(3, "Currency must be a 3-letter ISO code").toUpperCase(),
  openingBalance: z.coerce.number().min(0, "Opening balance cannot be negative"),
  openingBalanceDate: z.string().min(1, "Opening balance date is required"),
  description: z.string().trim().optional(),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const recordIncomeSchema = z.object({
  accountId: z.string().uuid("Please select a valid account"),
  amount: z.coerce.number().gt(0, "Income amount must be strictly greater than 0"),
  transactionDate: z.string().min(1, "Transaction date is required"),
  description: z.string().trim().min(1, "Description is required"),
  categoryId: z.string().uuid().optional().nullable(),
  reference: z.string().trim().optional().nullable(),
  idempotencyKey: z.string().trim().optional().nullable(),
});
export type RecordIncomeInput = z.infer<typeof recordIncomeSchema>;

export const recordExpenseSchema = z.object({
  accountId: z.string().uuid("Please select a valid account"),
  amount: z.coerce.number().gt(0, "Expense amount must be strictly greater than 0"),
  transactionDate: z.string().min(1, "Transaction date is required"),
  description: z.string().trim().min(1, "Description is required"),
  categoryId: z.string().uuid().optional().nullable(),
  reference: z.string().trim().optional().nullable(),
  idempotencyKey: z.string().trim().optional().nullable(),
});
export type RecordExpenseInput = z.infer<typeof recordExpenseSchema>;

export const recordTransferSchema = z
  .object({
    sourceAccountId: z.string().uuid("Please select source account"),
    destinationAccountId: z.string().uuid("Please select destination account"),
    amount: z.coerce.number().gt(0, "Transfer amount must be strictly greater than 0"),
    transactionDate: z.string().min(1, "Transaction date is required"),
    description: z.string().trim().min(1, "Description is required"),
    reference: z.string().trim().optional().nullable(),
    idempotencyKey: z.string().trim().optional().nullable(),
  })
  .refine((data) => data.sourceAccountId !== data.destinationAccountId, {
    message: "Source and destination accounts must be different",
    path: ["destinationAccountId"],
  });
export type RecordTransferInput = z.infer<typeof recordTransferSchema>;

export const recordAdjustmentSchema = z.object({
  accountId: z.string().uuid("Please select an account"),
  deltaAmount: z.coerce.number().refine((val) => val !== 0, {
    message: "Adjustment amount cannot be zero",
  }),
  transactionDate: z.string().min(1, "Transaction date is required"),
  reason: z.string().trim().min(3, "A clear audit reason of at least 3 characters is required"),
  reference: z.string().trim().optional().nullable(),
  idempotencyKey: z.string().trim().optional().nullable(),
});
export type RecordAdjustmentInput = z.infer<typeof recordAdjustmentSchema>;

export const reverseTransactionSchema = z.object({
  transactionId: z.string().uuid("Invalid transaction ID"),
  reversalReason: z
    .string()
    .trim()
    .min(3, "A clear reversal reason of at least 3 characters is required"),
});
export type ReverseTransactionInput = z.infer<typeof reverseTransactionSchema>;

// ============================================================================
// Multi-Currency Aggregations
// ============================================================================

export type CurrencyCashPosition = {
  currency: string;
  totalBalance: number;
  accountsCount: number;
  activeAccounts: number;
};

export type WorkspaceCashSummary = {
  positions: CurrencyCashPosition[];
  totalAccounts: number;
  activeAccounts: number;
};

// ============================================================================
// Query Options
// ============================================================================

export const accountsQueryOptions = (workspaceId: string | undefined) =>
  queryOptions({
    queryKey: ["financial-accounts", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<FinancialAccount[]> => {
      const { data, error } = await supabase
        .from("financial_accounts")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("status", { ascending: true }) // active first
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const accountQueryOptions = (
  workspaceId: string | undefined,
  accountId: string | undefined,
) =>
  queryOptions({
    queryKey: ["financial-account", workspaceId, accountId],
    enabled: Boolean(workspaceId && accountId),
    queryFn: async (): Promise<FinancialAccount | null> => {
      const { data, error } = await supabase
        .from("financial_accounts")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("id", accountId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

export const categoriesQueryOptions = (
  workspaceId: string | undefined,
  type?: FinancialCategoryType,
) =>
  queryOptions({
    queryKey: ["financial-categories", workspaceId, type],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<FinancialCategory[]> => {
      let query = supabase
        .from("financial_categories")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("name", { ascending: true });

      if (type) {
        query = query.eq("type", type);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export type TransactionFilterOptions = {
  accountId?: string | undefined;
  type?: FinancialTransactionType | undefined;
  status?: FinancialTransactionStatus | undefined;
  categoryId?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
};

export const transactionsQueryOptions = (
  workspaceId: string | undefined,
  filters: TransactionFilterOptions = {},
) =>
  queryOptions({
    queryKey: ["financial-transactions", workspaceId, filters],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<FinancialTransactionWithRelations[]> => {
      let query = supabase
        .from("financial_transactions")
        .select(
          `
          *,
          account:financial_accounts!financial_transactions_account_id_fkey(*),
          category:financial_categories!financial_transactions_category_id_fkey(*),
          paired_account:financial_accounts!financial_transactions_paired_account_id_fkey(*)
        `,
        )
        .eq("workspace_id", workspaceId!)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters.accountId) {
        query = query.eq("account_id", filters.accountId);
      }
      if (filters.type) {
        query = query.eq("transaction_type", filters.type);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data as unknown as FinancialTransactionWithRelations[]) ?? [];
    },
  });

export const workspaceCashSummaryQueryOptions = (workspaceId: string | undefined) =>
  queryOptions({
    queryKey: ["workspace-cash-summary", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<WorkspaceCashSummary> => {
      const { data, error } = await supabase
        .from("financial_accounts")
        .select("id, currency, current_balance, status")
        .eq("workspace_id", workspaceId!);

      if (error) throw new Error(error.message);
      const accounts = data ?? [];

      const currencyMap = new Map<string, { total: number; count: number; active: number }>();

      let totalAccounts = 0;
      let activeAccounts = 0;

      for (const acc of accounts) {
        totalAccounts++;
        if (acc.status === "active") {
          activeAccounts++;
        }

        const curr = acc.currency.toUpperCase();
        const existing = currencyMap.get(curr) ?? {
          total: 0,
          count: 0,
          active: 0,
        };
        existing.count++;
        if (acc.status === "active") {
          existing.active++;
          existing.total += Number(acc.current_balance);
        }
        currencyMap.set(curr, existing);
      }

      const positions: CurrencyCashPosition[] = Array.from(currencyMap.entries()).map(
        ([currency, data]) => ({
          currency,
          totalBalance: data.total,
          accountsCount: data.count,
          activeAccounts: data.active,
        }),
      );

      return {
        positions,
        totalAccounts,
        activeAccounts,
      };
    },
  });

// ============================================================================
// Atomic Financial Mutation Operations (RPC Invocations)
// ============================================================================

export async function createFinancialAccount(
  workspaceId: string,
  input: CreateAccountInput,
): Promise<string> {
  const validated = createAccountSchema.parse(input);
  const args: Database["public"]["Functions"]["create_financial_account"]["Args"] = {
    _workspace_id: workspaceId,
    _name: validated.name,
    _type: validated.type,
    _currency: validated.currency,
    _opening_balance: validated.openingBalance,
    _opening_balance_date: validated.openingBalanceDate,
  };
  if (validated.description) args._description = validated.description;

  const { data, error } = await supabase.rpc("create_financial_account", args);
  if (error) throw new Error(error.message);
  return data;
}

export async function recordIncome(workspaceId: string, input: RecordIncomeInput): Promise<string> {
  const validated = recordIncomeSchema.parse(input);
  const args: Database["public"]["Functions"]["record_income"]["Args"] = {
    _workspace_id: workspaceId,
    _account_id: validated.accountId,
    _amount: validated.amount,
    _transaction_date: validated.transactionDate,
    _description: validated.description,
  };
  if (validated.categoryId) args._category_id = validated.categoryId;
  if (validated.reference) args._reference = validated.reference;
  if (validated.idempotencyKey) args._idempotency_key = validated.idempotencyKey;

  const { data, error } = await supabase.rpc("record_income", args);
  if (error) throw new Error(error.message);
  return data;
}

export async function recordExpense(
  workspaceId: string,
  input: RecordExpenseInput,
): Promise<string> {
  const validated = recordExpenseSchema.parse(input);
  const args: Database["public"]["Functions"]["record_expense"]["Args"] = {
    _workspace_id: workspaceId,
    _account_id: validated.accountId,
    _amount: validated.amount,
    _transaction_date: validated.transactionDate,
    _description: validated.description,
  };
  if (validated.categoryId) args._category_id = validated.categoryId;
  if (validated.reference) args._reference = validated.reference;
  if (validated.idempotencyKey) args._idempotency_key = validated.idempotencyKey;

  const { data, error } = await supabase.rpc("record_expense", args);
  if (error) throw new Error(error.message);
  return data;
}

export async function recordTransfer(
  workspaceId: string,
  input: RecordTransferInput,
): Promise<string> {
  const validated = recordTransferSchema.parse(input);
  const args: Database["public"]["Functions"]["record_transfer"]["Args"] = {
    _workspace_id: workspaceId,
    _source_account_id: validated.sourceAccountId,
    _destination_account_id: validated.destinationAccountId,
    _amount: validated.amount,
    _transaction_date: validated.transactionDate,
    _description: validated.description,
  };
  if (validated.reference) args._reference = validated.reference;
  if (validated.idempotencyKey) args._idempotency_key = validated.idempotencyKey;

  const { data, error } = await supabase.rpc("record_transfer", args);
  if (error) throw new Error(error.message);
  return data;
}

export async function recordAdjustment(
  workspaceId: string,
  input: RecordAdjustmentInput,
): Promise<string> {
  const validated = recordAdjustmentSchema.parse(input);
  const args: Database["public"]["Functions"]["record_adjustment"]["Args"] = {
    _workspace_id: workspaceId,
    _account_id: validated.accountId,
    _delta_amount: validated.deltaAmount,
    _transaction_date: validated.transactionDate,
    _reason: validated.reason,
  };
  if (validated.reference) args._reference = validated.reference;
  if (validated.idempotencyKey) args._idempotency_key = validated.idempotencyKey;

  const { data, error } = await supabase.rpc("record_adjustment", args);
  if (error) throw new Error(error.message);
  return data;
}

export async function reverseTransaction(
  workspaceId: string,
  input: ReverseTransactionInput,
): Promise<string> {
  const validated = reverseTransactionSchema.parse(input);
  const { data, error } = await supabase.rpc("reverse_transaction", {
    _workspace_id: workspaceId,
    _transaction_id: validated.transactionId,
    _reversal_reason: validated.reversalReason,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function archiveAccount(workspaceId: string, accountId: string): Promise<void> {
  const { error } = await supabase.rpc("archive_financial_account", {
    _workspace_id: workspaceId,
    _account_id: accountId,
  });

  if (error) throw new Error(error.message);
}

export async function reconcileAccount(workspaceId: string, accountId: string) {
  const { data, error } = await supabase.rpc("reconcile_account_balance", {
    _workspace_id: workspaceId,
    _account_id: accountId,
  });

  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}
