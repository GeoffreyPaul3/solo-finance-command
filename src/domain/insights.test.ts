import { describe, expect, it } from "vitest";
import { generateInsights, type InsightEngineInput } from "./insights";

describe("Deterministic Insights Engine", () => {
  const baseInput: InsightEngineInput = {
    accounts: [],
    invoices: [],
    expenses: [],
    clients: [],
    projects: [],
    today: "2026-09-08",
  };

  it("returns an empty array when given empty financial records", () => {
    const insights = generateInsights(baseInput);
    expect(insights).toEqual([]);
  });

  describe("Receivables Rules", () => {
    it("generates a warning insight for overdue invoices per currency", () => {
      const input: InsightEngineInput = {
        ...baseInput,
        invoices: [
          {
            id: "inv-1",
            workspace_id: "ws-1",
            client_id: "c-1",
            project_id: null,
            invoice_number: "INV-001",
            issue_date: "2026-08-01",
            due_date: "2026-08-15", // overdue
            currency: "USD",
            subtotal: 1000,
            tax_amount: 0,
            discount_amount: 0,
            total: 1000,
            amount_paid: 200,
            amount_due: 800,
            status: "overdue",
            notes: null,
            payment_instructions: null,
            created_by: null,
            created_at: "2026-08-01T00:00:00Z",
            updated_at: "2026-08-01T00:00:00Z",
          },
          {
            id: "inv-2",
            workspace_id: "ws-1",
            client_id: "c-2",
            project_id: null,
            invoice_number: "INV-002",
            issue_date: "2026-08-05",
            due_date: "2026-08-20", // overdue
            currency: "USD",
            subtotal: 500,
            tax_amount: 0,
            discount_amount: 0,
            total: 500,
            amount_paid: 0,
            amount_due: 500,
            status: "sent",
            notes: null,
            payment_instructions: null,
            created_by: null,
            created_at: "2026-08-05T00:00:00Z",
            updated_at: "2026-08-05T00:00:00Z",
          },
          {
            id: "inv-3",
            workspace_id: "ws-1",
            client_id: "c-3",
            project_id: null,
            invoice_number: "INV-003",
            issue_date: "2026-09-01",
            due_date: "2026-09-30", // not overdue
            currency: "USD",
            subtotal: 2000,
            tax_amount: 0,
            discount_amount: 0,
            total: 2000,
            amount_paid: 0,
            amount_due: 2000,
            status: "sent",
            notes: null,
            payment_instructions: null,
            created_by: null,
            created_at: "2026-09-01T00:00:00Z",
            updated_at: "2026-09-01T00:00:00Z",
          },
        ],
      };

      const insights = generateInsights(input);
      const overdue = insights.find((i) => i.id === "overdue-invoices-USD");

      expect(overdue).toBeDefined();
      expect(overdue?.severity).toBe("warning");
      expect(overdue?.category).toBe("receivables");
      expect(overdue?.supportingValues?.["count"]).toBe(2);
      expect(overdue?.supportingValues?.["total"]).toBe(1300);
      expect(overdue?.action?.to).toBe("/app/invoices");
    });

    it("generates an attention insight for invoices maturing within 7 days", () => {
      const input: InsightEngineInput = {
        ...baseInput,
        invoices: [
          {
            id: "inv-due-soon",
            workspace_id: "ws-1",
            client_id: "c-1",
            project_id: null,
            invoice_number: "INV-004",
            issue_date: "2026-08-25",
            due_date: "2026-09-12", // 4 days from today (2026-09-08)
            currency: "EUR",
            subtotal: 1500,
            tax_amount: 0,
            discount_amount: 0,
            total: 1500,
            amount_paid: 0,
            amount_due: 1500,
            status: "sent",
            notes: null,
            payment_instructions: null,
            created_by: null,
            created_at: "2026-08-25T00:00:00Z",
            updated_at: "2026-08-25T00:00:00Z",
          },
        ],
      };

      const insights = generateInsights(input);
      const dueSoon = insights.find((i) => i.id === "invoices-due-soon");

      expect(dueSoon).toBeDefined();
      expect(dueSoon?.severity).toBe("attention");
      expect(dueSoon?.category).toBe("receivables");
      expect(dueSoon?.supportingValues?.["count"]).toBe(1);
    });
  });

  describe("Expense Rules", () => {
    it("identifies top expense category in the current month", () => {
      const input: InsightEngineInput = {
        ...baseInput,
        expenses: [
          {
            id: "exp-1",
            workspace_id: "ws-1",
            financial_transaction_id: "tx-1",
            financial_account_id: "acc-1",
            category_id: "cat-hosting",
            client_id: null,
            project_id: null,
            amount: 800,
            currency: "USD",
            expense_date: "2026-09-02",
            description: "Server bills",
            vendor: "AWS",
            notes: null,
            reference: null,
            status: "posted",
            idempotency_key: null,
            created_by: null,
            created_at: "2026-09-02T00:00:00Z",
            updated_at: "2026-09-02T00:00:00Z",
            category: {
              id: "cat-hosting",
              workspace_id: "ws-1",
              name: "Cloud Infrastructure",
              color: null,
              icon: null,
              is_system: false,
              type: "expense",
              created_at: "",
              updated_at: "",
            },
          },
          {
            id: "exp-2",
            workspace_id: "ws-1",
            financial_transaction_id: "tx-2",
            financial_account_id: "acc-1",
            category_id: "cat-office",
            client_id: null,
            project_id: null,
            amount: 200,
            currency: "USD",
            expense_date: "2026-09-04",
            description: "Office supplies",
            vendor: "Staples",
            notes: null,
            reference: null,
            status: "posted",
            idempotency_key: null,
            created_by: null,
            created_at: "2026-09-04T00:00:00Z",
            updated_at: "2026-09-04T00:00:00Z",
            category: {
              id: "cat-office",
              workspace_id: "ws-1",
              name: "Office Supplies",
              color: null,
              icon: null,
              is_system: false,
              type: "expense",
              created_at: "",
              updated_at: "",
            },
          },
        ],
      };

      const insights = generateInsights(input);
      const topCat = insights.find((i) => i.id === "top-expense-category-USD");

      expect(topCat).toBeDefined();
      expect(topCat?.severity).toBe("info");
      expect(topCat?.supportingValues?.["category"]).toBe("Cloud Infrastructure");
      expect(topCat?.supportingValues?.["amount"]).toBe(800);
      expect(topCat?.supportingValues?.["percent"]).toBe(80);
    });
  });

  describe("Client Concentration Rules", () => {
    it("flags client concentration when one client accounts for >= 50% of invoiced revenue", () => {
      const input: InsightEngineInput = {
        ...baseInput,
        clients: [
          {
            id: "client-big",
            workspace_id: "ws-1",
            name: "Mega Corp",
            email: "finance@megacorp.com",
            phone: null,
            company_name: "Mega Corp",
            status: "active",
            address: null,
            notes: null,
            created_by: null,
            created_at: "",
            updated_at: "",
          },
          {
            id: "client-small",
            workspace_id: "ws-1",
            name: "Small Startup",
            email: "hi@startup.io",
            phone: null,
            company_name: null,
            status: "active",
            address: null,
            notes: null,
            created_by: null,
            created_at: "",
            updated_at: "",
          },
        ],
        invoices: [
          {
            id: "inv-1",
            workspace_id: "ws-1",
            client_id: "client-big",
            project_id: null,
            invoice_number: "INV-101",
            issue_date: "2026-09-01",
            due_date: "2026-09-30",
            currency: "USD",
            subtotal: 8000,
            tax_amount: 0,
            discount_amount: 0,
            total: 8000,
            amount_paid: 8000,
            amount_due: 0,
            status: "paid",
            notes: null,
            payment_instructions: null,
            created_by: null,
            created_at: "",
            updated_at: "",
          },
          {
            id: "inv-2",
            workspace_id: "ws-1",
            client_id: "client-small",
            project_id: null,
            invoice_number: "INV-102",
            issue_date: "2026-09-02",
            due_date: "2026-09-30",
            currency: "USD",
            subtotal: 2000,
            tax_amount: 0,
            discount_amount: 0,
            total: 2000,
            amount_paid: 2000,
            amount_due: 0,
            status: "paid",
            notes: null,
            payment_instructions: null,
            created_by: null,
            created_at: "",
            updated_at: "",
          },
        ],
      };

      const insights = generateInsights(input);
      const concentration = insights.find((i) => i.id === "client-concentration-client-big-USD");

      expect(concentration).toBeDefined();
      expect(concentration?.severity).toBe("attention");
      expect(concentration?.supportingValues?.["percent"]).toBe(80);
      expect(concentration?.title).toContain("Mega Corp");
    });
  });

  describe("Project Budget Rules", () => {
    it("flags budget overrun when project expenses exceed allocated budget", () => {
      const input: InsightEngineInput = {
        ...baseInput,
        projects: [
          {
            id: "proj-1",
            workspace_id: "ws-1",
            client_id: null,
            name: "Mobile App Redesign",
            description: null,
            status: "active",
            budget: 5000,
            budget_currency: "USD",
            start_date: null,
            end_date: null,
            notes: null,
            created_by: null,
            created_at: "",
            updated_at: "",
          },
        ],
        expenses: [
          {
            id: "exp-p1",
            workspace_id: "ws-1",
            financial_transaction_id: "tx-p1",
            financial_account_id: "acc-1",
            category_id: null,
            client_id: null,
            project_id: "proj-1",
            amount: 5500,
            currency: "USD",
            expense_date: "2026-09-05",
            description: "Contractor design fees",
            vendor: null,
            notes: null,
            reference: null,
            status: "posted",
            idempotency_key: null,
            created_by: null,
            created_at: "",
            updated_at: "",
          },
        ],
      };

      const insights = generateInsights(input);
      const overrun = insights.find((i) => i.id === "project-budget-overrun-proj-1");

      expect(overrun).toBeDefined();
      expect(overrun?.severity).toBe("warning");
      expect(overrun?.title).toContain("Budget Exceeded");
      expect(overrun?.supportingValues?.["expenses"]).toBe(5500);
      expect(overrun?.supportingValues?.["budget"]).toBe(5000);
    });
  });
});
