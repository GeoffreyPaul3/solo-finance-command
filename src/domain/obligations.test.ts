import { describe, expect, it } from "vitest";

import {
  calculateObligationsTotal,
  classifyObligationStatus,
  createObligationSchema,
  groupObligationsByTimeline,
  type Obligation,
} from "./obligations";

describe("Obligations Domain Logic", () => {
  describe("classifyObligationStatus", () => {
    const asOf = "2026-09-15";

    it("returns overdue when dueDate < asOfDate", () => {
      expect(classifyObligationStatus("2026-09-14", "upcoming", asOf)).toBe("overdue");
      expect(classifyObligationStatus("2026-08-01", "due", asOf)).toBe("overdue");
    });

    it("returns due when dueDate === asOfDate", () => {
      expect(classifyObligationStatus("2026-09-15", "upcoming", asOf)).toBe("due");
    });

    it("returns upcoming when dueDate > asOfDate", () => {
      expect(classifyObligationStatus("2026-09-16", "upcoming", asOf)).toBe("upcoming");
      expect(classifyObligationStatus("2026-10-01", "upcoming", asOf)).toBe("upcoming");
    });

    it("preserves terminal paid status regardless of date", () => {
      expect(classifyObligationStatus("2026-01-01", "paid", asOf)).toBe("paid");
      expect(classifyObligationStatus("2026-12-31", "paid", asOf)).toBe("paid");
    });

    it("preserves terminal cancelled status regardless of date", () => {
      expect(classifyObligationStatus("2026-01-01", "cancelled", asOf)).toBe("cancelled");
      expect(classifyObligationStatus("2026-12-31", "cancelled", asOf)).toBe("cancelled");
    });
  });

  describe("groupObligationsByTimeline", () => {
    const asOf = "2026-09-15";

    const mockObligations: Obligation[] = [
      {
        id: "1",
        workspace_id: "ws-1",
        title: "Past Server Hosting",
        amount: 50,
        currency: "USD",
        due_date: "2026-09-10",
        status: "overdue",
        category_id: null,
        recurring_expense_id: null,
        vendor: "AWS",
        notes: null,
        priority: 1,
        settled_at: null,
        settled_by_transaction_id: null,
        created_by: null,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      },
      {
        id: "2",
        workspace_id: "ws-1",
        title: "Figma Subscription",
        amount: 15,
        currency: "USD",
        due_date: "2026-09-15",
        status: "due",
        category_id: null,
        recurring_expense_id: null,
        vendor: "Figma",
        notes: null,
        priority: 3,
        settled_at: null,
        settled_by_transaction_id: null,
        created_by: null,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      },
      {
        id: "3",
        workspace_id: "ws-1",
        title: "Contractor Payout",
        amount: 500,
        currency: "USD",
        due_date: "2026-09-20",
        status: "upcoming",
        category_id: null,
        recurring_expense_id: null,
        vendor: "Dev Partner",
        notes: null,
        priority: 1,
        settled_at: null,
        settled_by_transaction_id: null,
        created_by: null,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      },
      {
        id: "4",
        workspace_id: "ws-1",
        title: "Office Internet",
        amount: 80,
        currency: "USD",
        due_date: "2026-10-05",
        status: "upcoming",
        category_id: null,
        recurring_expense_id: null,
        vendor: "ISP",
        notes: null,
        priority: 3,
        settled_at: null,
        settled_by_transaction_id: null,
        created_by: null,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      },
      {
        id: "5",
        workspace_id: "ws-1",
        title: "Annual Insurance",
        amount: 1200,
        currency: "USD",
        due_date: "2026-12-01",
        status: "upcoming",
        category_id: null,
        recurring_expense_id: null,
        vendor: "Insurance Co",
        notes: null,
        priority: 2,
        settled_at: null,
        settled_by_transaction_id: null,
        created_by: null,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      },
      {
        id: "6",
        workspace_id: "ws-1",
        title: "Already Settled Bill",
        amount: 200,
        currency: "USD",
        due_date: "2026-09-12",
        status: "paid",
        category_id: null,
        recurring_expense_id: null,
        vendor: "Old Vendor",
        notes: null,
        priority: 3,
        settled_at: "2026-09-12T00:00:00Z",
        settled_by_transaction_id: null,
        created_by: null,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      },
    ];

    it("correctly separates active obligations into timeline groups", () => {
      const groups = groupObligationsByTimeline(mockObligations, asOf);

      expect(groups.overdue.map((o) => o.id)).toEqual(["1"]);
      expect(groups.dueToday.map((o) => o.id)).toEqual(["2"]);
      expect(groups.next7Days.map((o) => o.id)).toEqual(["3"]); // Sept 20 is within 7 days (Sept 22)
      expect(groups.next30Days.map((o) => o.id)).toEqual(["4"]); // Oct 5 is within 30 days (Oct 15)
      expect(groups.future.map((o) => o.id)).toEqual(["5"]); // Dec 1 is > 30 days
      // Paid obligation is completely excluded from active timeline groups
      expect(groups.overdue.some((o) => o.id === "6")).toBe(false);
    });
  });

  describe("calculateObligationsTotal", () => {
    const list: Obligation[] = [
      {
        id: "1",
        workspace_id: "ws-1",
        title: "A",
        amount: 100,
        currency: "USD",
        due_date: "2026-09-20",
        status: "upcoming",
        category_id: null,
        recurring_expense_id: null,
        vendor: null,
        notes: null,
        priority: 3,
        settled_at: null,
        settled_by_transaction_id: null,
        created_by: null,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      },
      {
        id: "2",
        workspace_id: "ws-1",
        title: "B",
        amount: 50,
        currency: "USD",
        due_date: "2026-09-25",
        status: "due",
        category_id: null,
        recurring_expense_id: null,
        vendor: null,
        notes: null,
        priority: 2,
        settled_at: null,
        settled_by_transaction_id: null,
        created_by: null,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      },
      {
        id: "3",
        workspace_id: "ws-1",
        title: "C",
        amount: 200,
        currency: "EUR",
        due_date: "2026-09-22",
        status: "upcoming",
        category_id: null,
        recurring_expense_id: null,
        vendor: null,
        notes: null,
        priority: 1,
        settled_at: null,
        settled_by_transaction_id: null,
        created_by: null,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      },
      {
        id: "4",
        workspace_id: "ws-1",
        title: "D",
        amount: 75,
        currency: "USD",
        due_date: "2026-09-10",
        status: "paid",
        category_id: null,
        recurring_expense_id: null,
        vendor: null,
        notes: null,
        priority: 3,
        settled_at: "2026-09-10T00:00:00Z",
        settled_by_transaction_id: null,
        created_by: null,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      },
    ];

    it("sums all active obligations across currencies when no currency specified", () => {
      expect(calculateObligationsTotal(list)).toBe(350); // 100 + 50 + 200 (paid excluded)
    });

    it("sums only obligations in specified currency", () => {
      expect(calculateObligationsTotal(list, "USD")).toBe(150); // 100 + 50
      expect(calculateObligationsTotal(list, "EUR")).toBe(200);
    });

    it("includes paid obligations when activeOnly is false", () => {
      expect(calculateObligationsTotal(list, "USD", false)).toBe(225); // 100 + 50 + 75
    });
  });

  describe("createObligationSchema", () => {
    it("validates a valid obligation", () => {
      const valid = {
        title: "Cloud hosting",
        amount: "120.50",
        currency: "usd",
        dueDate: "2026-10-01",
        priority: "2",
      };
      const result = createObligationSchema.parse(valid);
      expect(result.amount).toBe(120.5);
      expect(result.currency).toBe("USD");
      expect(result.priority).toBe(2);
    });

    it("rejects non-positive amount", () => {
      expect(() =>
        createObligationSchema.parse({
          title: "Zero",
          amount: 0,
          currency: "USD",
          dueDate: "2026-10-01",
        }),
      ).toThrow();

      expect(() =>
        createObligationSchema.parse({
          title: "Negative",
          amount: -50,
          currency: "USD",
          dueDate: "2026-10-01",
        }),
      ).toThrow();
    });

    it("rejects invalid currency codes", () => {
      expect(() =>
        createObligationSchema.parse({
          title: "Invalid",
          amount: 10,
          currency: "US",
          dueDate: "2026-10-01",
        }),
      ).toThrow();
    });
  });
});
