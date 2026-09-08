import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { FinancialAccount } from "./financial";
import type { InvoiceWithRelations } from "./invoices";
import type { ExpenseWithRelations } from "./expenses";
import type { Client } from "./clients";
import type { Project } from "./projects";
import { formatMoney } from "@/lib/money";

// ============================================================================
// Core Types
// ============================================================================

export type InsightSeverity = "info" | "attention" | "warning";

export type InsightCategory =
  "receivables" | "cash" | "expenses" | "profitability" | "clients" | "projects";

export interface Insight {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  description: string;
  supportingValues?: Record<string, unknown> | undefined;
  currency?: string | undefined;
  relatedEntity?:
    | {
        type: "client" | "project" | "invoice" | "account";
        id: string;
        name?: string;
      }
    | undefined;
  action?:
    | {
        label: string;
        to: string;
      }
    | undefined;
}

export interface InsightEngineInput {
  accounts: FinancialAccount[];
  invoices: InvoiceWithRelations[];
  expenses: ExpenseWithRelations[];
  clients: Client[];
  projects: Project[];
  today?: string; // YYYY-MM-DD
}

// ============================================================================
// Deterministic Insight Rules
// ============================================================================

export function generateInsights(input: InsightEngineInput): Insight[] {
  const insights: Insight[] = [];
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7); // YYYY-MM

  // --------------------------------------------------------------------------
  // 1. Receivables: Overdue Invoices
  // --------------------------------------------------------------------------
  const overdueInvoices = input.invoices.filter((inv) => {
    if (inv.status === "cancelled" || inv.status === "paid") return false;
    return Number(inv.amount_due) > 0 && inv.due_date < today;
  });

  if (overdueInvoices.length > 0) {
    const overdueByCurrency: Record<string, { count: number; total: number }> = {};
    for (const inv of overdueInvoices) {
      const cur = inv.currency;
      if (!overdueByCurrency[cur]) {
        overdueByCurrency[cur] = { count: 0, total: 0 };
      }
      const entry = overdueByCurrency[cur]!;
      entry.count += 1;
      entry.total += Number(inv.amount_due);
    }

    for (const [cur, stats] of Object.entries(overdueByCurrency)) {
      insights.push({
        id: `overdue-invoices-${cur}`,
        category: "receivables",
        severity: "warning",
        title: `${stats.count} Overdue ${stats.count === 1 ? "Invoice" : "Invoices"} (${cur})`,
        description: `You have ${formatMoney(stats.total, cur)} in overdue receivables. Prompt follow-up helps preserve operating cash flow.`,
        currency: cur,
        supportingValues: { count: stats.count, total: stats.total },
        action: { label: "Review Invoices", to: "/app/invoices" },
      });
    }
  }

  // --------------------------------------------------------------------------
  // 2. Receivables: Invoices Due Soon (Next 7 days)
  // --------------------------------------------------------------------------
  const sevenDaysAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const dueSoonInvoices = input.invoices.filter((inv) => {
    if (inv.status === "cancelled" || inv.status === "paid") return false;
    return Number(inv.amount_due) > 0 && inv.due_date >= today && inv.due_date <= sevenDaysAhead;
  });

  if (dueSoonInvoices.length > 0) {
    const totalDueSoon = dueSoonInvoices.reduce((sum, inv) => sum + Number(inv.amount_due), 0);
    insights.push({
      id: "invoices-due-soon",
      category: "receivables",
      severity: "attention",
      title: `${dueSoonInvoices.length} ${dueSoonInvoices.length === 1 ? "Invoice" : "Invoices"} Due Within 7 Days`,
      description: `${dueSoonInvoices.length} invoice(s) are maturing within the next week. Confirm delivery or send reminders.`,
      supportingValues: { count: dueSoonInvoices.length, total: totalDueSoon },
      action: { label: "View Invoices", to: "/app/invoices" },
    });
  }

  // --------------------------------------------------------------------------
  // 3. Cash: Inactive or Unreconciled Accounts
  // --------------------------------------------------------------------------
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const unreconciledAccounts = input.accounts.filter((acc) => {
    if (acc.status !== "active") return false;
    return !acc.updated_at || acc.updated_at < thirtyDaysAgo;
  });

  if (unreconciledAccounts.length > 0) {
    insights.push({
      id: "unreconciled-accounts",
      category: "cash",
      severity: "attention",
      title: `${unreconciledAccounts.length} Account(s) Needing Review`,
      description: `Active accounts with no recent balance updates may harbor discrepancies with your external bank records.`,
      supportingValues: { count: unreconciledAccounts.length },
      action: { label: "Reconcile Cash", to: "/app/cash" },
    });
  }

  // --------------------------------------------------------------------------
  // 4. Expenses: Largest Spend Category (Current Month)
  // --------------------------------------------------------------------------
  const monthlyPostedExpenses = input.expenses.filter((e) => {
    return e.status === "posted" && e.expense_date.startsWith(currentMonth);
  });

  if (monthlyPostedExpenses.length > 0) {
    // Group by currency first
    const expensesByCurrency: Record<
      string,
      { total: number; categories: Record<string, { name: string; amount: number }> }
    > = {};

    for (const exp of monthlyPostedExpenses) {
      const cur = exp.currency;
      if (!expensesByCurrency[cur]) {
        expensesByCurrency[cur] = { total: 0, categories: {} };
      }
      const curData = expensesByCurrency[cur]!;
      curData.total += Number(exp.amount);

      const catName = exp.category?.name ?? "General Expenses";
      if (!curData.categories[catName]) {
        curData.categories[catName] = { name: catName, amount: 0 };
      }
      curData.categories[catName]!.amount += Number(exp.amount);
    }

    for (const [cur, data] of Object.entries(expensesByCurrency)) {
      if (data.total <= 0) continue;
      // Find highest category
      const categories = Object.values(data.categories);
      categories.sort((a, b) => b.amount - a.amount);
      const topCat = categories[0];
      if (topCat && topCat.amount > 0) {
        const pct = Math.round((topCat.amount / data.total) * 100);
        insights.push({
          id: `top-expense-category-${cur}`,
          category: "expenses",
          severity: "info",
          title: `Top Spend: ${topCat.name} (${cur})`,
          description: `${topCat.name} constitutes ${pct}% (${formatMoney(topCat.amount, cur)}) of your ${cur} expenses this month.`,
          currency: cur,
          supportingValues: { category: topCat.name, amount: topCat.amount, percent: pct },
          action: { label: "View Expenses", to: "/app/expenses" },
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // 5. Clients: Revenue Concentration (>= 50% of billed revenue)
  // --------------------------------------------------------------------------
  if (input.clients.length >= 2 && input.invoices.length >= 2) {
    const billedByCurrency: Record<string, { total: number; clientMap: Record<string, number> }> =
      {};

    for (const inv of input.invoices) {
      if (inv.status === "cancelled") continue;
      const cur = inv.currency;
      if (!billedByCurrency[cur]) {
        billedByCurrency[cur] = { total: 0, clientMap: {} };
      }
      const curBilled = billedByCurrency[cur]!;
      const amount = Number(inv.total);
      curBilled.total += amount;
      curBilled.clientMap[inv.client_id] = (curBilled.clientMap[inv.client_id] ?? 0) + amount;
    }

    for (const [cur, billedData] of Object.entries(billedByCurrency)) {
      if (billedData.total <= 0) continue;
      for (const [clientId, amount] of Object.entries(billedData.clientMap)) {
        const pct = Math.round((amount / billedData.total) * 100);
        if (pct >= 50) {
          const client = input.clients.find((c) => c.id === clientId);
          const clientName = client?.name ?? "Key Client";
          insights.push({
            id: `client-concentration-${clientId}-${cur}`,
            category: "clients",
            severity: "attention",
            title: `High Client Concentration: ${clientName}`,
            description: `${clientName} represents ${pct}% (${formatMoney(amount, cur)}) of all invoiced revenue in ${cur}. Expanding your client roster can lower revenue dependency risk.`,
            currency: cur,
            relatedEntity: { type: "client", id: clientId, name: clientName },
            supportingValues: { clientId, amount, percent: pct },
            action: { label: "View Client", to: `/app/clients/${clientId}` },
          });
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // 6. Projects: Budget Overrun
  // --------------------------------------------------------------------------
  for (const project of input.projects) {
    if (project.status !== "active" || !project.budget) continue;
    const budget = Number(project.budget);
    if (budget <= 0) continue;

    // Sum project expenses
    const projectExpenses = input.expenses
      .filter(
        (e) =>
          e.project_id === project.id &&
          e.status === "posted" &&
          e.currency === project.budget_currency,
      )
      .reduce((sum, e) => sum + Number(e.amount), 0);

    if (projectExpenses > budget) {
      const cur = project.budget_currency ?? "USD";
      insights.push({
        id: `project-budget-overrun-${project.id}`,
        category: "projects",
        severity: "warning",
        title: `Budget Exceeded: ${project.name}`,
        description: `Expenses (${formatMoney(projectExpenses, cur)}) have exceeded the allocated budget of ${formatMoney(budget, cur)}.`,
        currency: cur,
        relatedEntity: { type: "project", id: project.id, name: project.name },
        supportingValues: { budget, expenses: projectExpenses },
        action: { label: "View Project", to: `/app/projects/${project.id}` },
      });
    }
  }

  // --------------------------------------------------------------------------
  // 7. Cash: Low Cash Runway vs Monthly Spend
  // --------------------------------------------------------------------------
  for (const acc of input.accounts) {
    if (acc.status !== "active") continue;
    const cur = acc.currency;
    const monthlySpend = monthlyPostedExpenses
      .filter((e) => e.currency === cur)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    // If spend this month exceeds 0 and current cash balance is below 50% of monthly spend
    if (
      monthlySpend > 0 &&
      Number(acc.current_balance) > 0 &&
      Number(acc.current_balance) < monthlySpend * 0.5
    ) {
      insights.push({
        id: `low-cash-buffer-${acc.id}`,
        category: "cash",
        severity: "warning",
        title: `Low Cash Buffer in ${acc.name} (${cur})`,
        description: `Current balance (${formatMoney(Number(acc.current_balance), cur)}) covers less than 15 days of this month's average expense run rate.`,
        currency: cur,
        relatedEntity: { type: "account", id: acc.id, name: acc.name },
        supportingValues: { balance: Number(acc.current_balance), monthlySpend },
        action: { label: "View Cash & Accounts", to: "/app/cash" },
      });
    }
  }

  return insights;
}

// ============================================================================
// TanStack Query Hook Option
// ============================================================================

export function insightsQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: ["insights", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<Insight[]> => {
      // Parallel fetch of underlying entities
      const [accountsRes, invoicesRes, expensesRes, clientsRes, projectsRes] = await Promise.all([
        supabase.from("financial_accounts").select("*").eq("workspace_id", workspaceId),
        supabase
          .from("invoices")
          .select("*, client:clients(*), project:projects(*), line_items:invoice_line_items(*)")
          .eq("workspace_id", workspaceId),
        supabase
          .from("expenses")
          .select("*, category:financial_categories(*), client:clients(*), project:projects(*)")
          .eq("workspace_id", workspaceId),
        supabase.from("clients").select("*").eq("workspace_id", workspaceId),
        supabase.from("projects").select("*").eq("workspace_id", workspaceId),
      ]);

      if (accountsRes.error) throw new Error(accountsRes.error.message);
      if (invoicesRes.error) throw new Error(invoicesRes.error.message);
      if (expensesRes.error) throw new Error(expensesRes.error.message);
      if (clientsRes.error) throw new Error(clientsRes.error.message);
      if (projectsRes.error) throw new Error(projectsRes.error.message);

      return generateInsights({
        accounts: accountsRes.data ?? [],
        invoices: (invoicesRes.data as unknown as InvoiceWithRelations[]) ?? [],
        expenses: (expensesRes.data as unknown as ExpenseWithRelations[]) ?? [],
        clients: clientsRes.data ?? [],
        projects: projectsRes.data ?? [],
      });
    },
  });
}
