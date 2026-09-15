import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// Core Types
// ============================================================================

export type ReportType = "income" | "expenses" | "cashflow" | "receivables";

export interface IncomeReportItem {
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  currency: string;
  invoiceCount: number;
  grossBilled: number;
  grossCollected: number;
  outstanding: number;
}

export interface ExpenseReportItem {
  categoryId: string;
  categoryName: string;
  vendor: string;
  currency: string;
  expenseCount: number;
  totalAmount: number;
  taxDeductibleAmount: number;
}

export interface CashflowReportItem {
  periodStart: string;
  currency: string;
  cashInflow: number;
  cashOutflow: number;
  netCashflow: number;
  closingBalance: number;
}

export interface ReceivablesAgingItem {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  daysOverdue: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  agingBucket: "current" | "1_30" | "31_60" | "61_90" | "90_plus";
}

// ============================================================================
// Pure Business Logic Functions (Unit Testable)
// ============================================================================

export interface IncomeReportTotals {
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  invoiceCount: number;
}

export function calculateIncomeReportTotals(items: IncomeReportItem[]): IncomeReportTotals {
  return items.reduce(
    (acc, item) => ({
      totalBilled: Math.round((acc.totalBilled + item.grossBilled) * 100) / 100,
      totalCollected: Math.round((acc.totalCollected + item.grossCollected) * 100) / 100,
      totalOutstanding: Math.round((acc.totalOutstanding + item.outstanding) * 100) / 100,
      invoiceCount: acc.invoiceCount + item.invoiceCount,
    }),
    { totalBilled: 0, totalCollected: 0, totalOutstanding: 0, invoiceCount: 0 },
  );
}

export interface ExpenseReportTotals {
  totalAmount: number;
  totalDeductible: number;
  expenseCount: number;
}

export function calculateExpenseReportTotals(items: ExpenseReportItem[]): ExpenseReportTotals {
  return items.reduce(
    (acc, item) => ({
      totalAmount: Math.round((acc.totalAmount + item.totalAmount) * 100) / 100,
      totalDeductible: Math.round((acc.totalDeductible + item.taxDeductibleAmount) * 100) / 100,
      expenseCount: acc.expenseCount + item.expenseCount,
    }),
    { totalAmount: 0, totalDeductible: 0, expenseCount: 0 },
  );
}

export interface ReceivablesAgingSummary {
  current: number;
  bucket1_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket90_plus: number;
  totalDue: number;
}

export function calculateReceivablesAgingBuckets(
  items: ReceivablesAgingItem[],
): ReceivablesAgingSummary {
  const summary: ReceivablesAgingSummary = {
    current: 0,
    bucket1_30: 0,
    bucket31_60: 0,
    bucket61_90: 0,
    bucket90_plus: 0,
    totalDue: 0,
  };

  for (const item of items) {
    const amount = item.amountDue;
    summary.totalDue = Math.round((summary.totalDue + amount) * 100) / 100;

    switch (item.agingBucket) {
      case "current":
        summary.current = Math.round((summary.current + amount) * 100) / 100;
        break;
      case "1_30":
        summary.bucket1_30 = Math.round((summary.bucket1_30 + amount) * 100) / 100;
        break;
      case "31_60":
        summary.bucket31_60 = Math.round((summary.bucket31_60 + amount) * 100) / 100;
        break;
      case "61_90":
        summary.bucket61_90 = Math.round((summary.bucket61_90 + amount) * 100) / 100;
        break;
      case "90_plus":
        summary.bucket90_plus = Math.round((summary.bucket90_plus + amount) * 100) / 100;
        break;
    }
  }

  return summary;
}

/**
 * Generates RFC 4180 compliant CSV string from an array of objects.
 * Properly escapes quotes, commas, and newlines.
 */
export function generateCsvString(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "";

  const firstRow = data[0];
  if (!firstRow) return "";

  const headers = Object.keys(firstRow);
  const rows = data.map((row) =>
    headers
      .map((header) => {
        const val = row[header];
        if (val === null || val === undefined) return "";
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(","),
  );

  return [headers.join(","), ...rows].join("\r\n");
}

/**
 * Initiates browser download of a CSV file.
 */
export function downloadCsv(data: Record<string, unknown>[], filename: string): void {
  if (typeof window === "undefined") return;
  const csv = generateCsvString(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Supabase Data Access & TanStack Query Options
// ============================================================================

export function incomeReportQueryOptions(
  workspaceId: string,
  dateFrom: string,
  dateTo: string,
  currency?: string,
) {
  return queryOptions({
    queryKey: ["report-income", workspaceId, dateFrom, dateTo, currency],
    enabled: Boolean(workspaceId && dateFrom && dateTo),
    queryFn: async (): Promise<IncomeReportItem[]> => {
      const args: {
        _workspace_id: string;
        _date_from: string;
        _date_to: string;
        _currency?: string;
      } = {
        _workspace_id: workspaceId,
        _date_from: dateFrom,
        _date_to: dateTo,
      };

      if (currency) args._currency = currency;

      const { data, error } = await supabase.rpc("get_income_report", args);

      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        clientId: row.client_id,
        clientName: row.client_name,
        projectId: row.project_id,
        projectName: row.project_name,
        currency: row.currency,
        invoiceCount: Number(row.invoice_count),
        grossBilled: Number(row.gross_billed),
        grossCollected: Number(row.gross_collected),
        outstanding: Number(row.outstanding),
      }));
    },
  });
}

export function expenseReportQueryOptions(
  workspaceId: string,
  dateFrom: string,
  dateTo: string,
  currency?: string,
) {
  return queryOptions({
    queryKey: ["report-expense", workspaceId, dateFrom, dateTo, currency],
    enabled: Boolean(workspaceId && dateFrom && dateTo),
    queryFn: async (): Promise<ExpenseReportItem[]> => {
      const args: {
        _workspace_id: string;
        _date_from: string;
        _date_to: string;
        _currency?: string;
      } = {
        _workspace_id: workspaceId,
        _date_from: dateFrom,
        _date_to: dateTo,
      };

      if (currency) args._currency = currency;

      const { data, error } = await supabase.rpc("get_expense_report", args);

      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        categoryId: row.category_id,
        categoryName: row.category_name,
        vendor: row.vendor,
        currency: row.currency,
        expenseCount: Number(row.expense_count),
        totalAmount: Number(row.total_amount),
        taxDeductibleAmount: Number(row.tax_deductible_amount),
      }));
    },
  });
}

export function cashflowReportQueryOptions(
  workspaceId: string,
  dateFrom: string,
  dateTo: string,
  currency?: string,
) {
  return queryOptions({
    queryKey: ["report-cashflow", workspaceId, dateFrom, dateTo, currency],
    enabled: Boolean(workspaceId && dateFrom && dateTo),
    queryFn: async (): Promise<CashflowReportItem[]> => {
      const args: {
        _workspace_id: string;
        _date_from: string;
        _date_to: string;
        _currency?: string;
      } = {
        _workspace_id: workspaceId,
        _date_from: dateFrom,
        _date_to: dateTo,
      };

      if (currency) args._currency = currency;

      const { data, error } = await supabase.rpc("get_cashflow_report", args);

      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        periodStart: row.period_start,
        currency: row.currency,
        cashInflow: Number(row.cash_inflow),
        cashOutflow: Number(row.cash_outflow),
        netCashflow: Number(row.net_cashflow),
        closingBalance: Number(row.closing_balance),
      }));
    },
  });
}

export function receivablesReportQueryOptions(workspaceId: string, currency?: string) {
  return queryOptions({
    queryKey: ["report-receivables", workspaceId, currency],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<ReceivablesAgingItem[]> => {
      const args: {
        _workspace_id: string;
        _currency?: string;
      } = {
        _workspace_id: workspaceId,
      };

      if (currency) args._currency = currency;

      const { data, error } = await supabase.rpc("get_receivables_report", args);

      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        invoiceId: row.invoice_id,
        invoiceNumber: row.invoice_number,
        clientId: row.client_id,
        clientName: row.client_name,
        currency: row.currency,
        issueDate: row.issue_date,
        dueDate: row.due_date,
        daysOverdue: Number(row.days_overdue),
        totalAmount: Number(row.total_amount),
        amountPaid: Number(row.amount_paid),
        amountDue: Number(row.amount_due),
        agingBucket: row.aging_bucket as ReceivablesAgingItem["agingBucket"],
      }));
    },
  });
}
