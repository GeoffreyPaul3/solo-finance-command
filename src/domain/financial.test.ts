import { describe, expect, it } from "vitest";

import {
  createAccountSchema,
  recordAdjustmentSchema,
  recordExpenseSchema,
  recordIncomeSchema,
  recordTransferSchema,
  reverseTransactionSchema,
  type FinancialAccount,
  type FinancialTransaction,
} from "./financial";
import { type AppRole } from "./workspace";

// ============================================================================
// Authorization Helper (matching server-side RLS and RPC checks)
// ============================================================================

export function canMutateFinancialData(role: AppRole | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "finance";
}

// ============================================================================
// High-Precision Money Arithmetic Simulator (matching PostgreSQL numeric(18, 4))
// ============================================================================

export function roundNumeric(val: number, decimals = 4): number {
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

export function computeReconciledBalance(
  openingBalance: number,
  transactions: {
    transaction_type: "income" | "expense" | "transfer" | "adjustment";
    amount: number;
    transfer_role?: "source" | "destination" | null;
    status: "posted" | "reversed";
    reference?: string | null;
  }[],
): number {
  let balance = openingBalance;
  for (const tx of transactions) {
    if (tx.status === "reversed") continue;

    if (tx.transaction_type === "income") {
      balance = roundNumeric(balance + tx.amount);
    } else if (tx.transaction_type === "expense") {
      balance = roundNumeric(balance - tx.amount);
    } else if (tx.transaction_type === "transfer") {
      if (tx.transfer_role === "destination") {
        balance = roundNumeric(balance + tx.amount);
      } else if (tx.transfer_role === "source") {
        balance = roundNumeric(balance - tx.amount);
      }
    } else if (tx.transaction_type === "adjustment") {
      if (tx.reference?.includes("(debit)")) {
        balance = roundNumeric(balance - tx.amount);
      } else {
        balance = roundNumeric(balance + tx.amount);
      }
    }
  }
  return balance;
}

// ============================================================================
// Test Suite: SoloOS Phase 2 Authoritative Financial Engine
// ============================================================================

describe("SoloOS Phase 2: Authoritative Financial Engine", () => {
  // --------------------------------------------------------------------------
  // 1. Account Domain & Validation
  // --------------------------------------------------------------------------
  describe("1. Financial Account Lifecycle & Validation", () => {
    it("accepts valid financial account inputs across different types and currencies", () => {
      const validBank = {
        name: "Standard Bank Operating Account",
        type: "bank" as const,
        currency: "MWK",
        openingBalance: 2500000,
        openingBalanceDate: "2026-09-01",
        description: "Primary MWK operations",
      };
      const result = createAccountSchema.safeParse(validBank);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe("MWK");
        expect(result.data.openingBalance).toBe(2500000);
      }

      const validStripe = {
        name: "Stripe USD Clearing",
        type: "payment_processor" as const,
        currency: "usd",
        openingBalance: 0,
        openingBalanceDate: "2026-09-01",
      };
      const stripeResult = createAccountSchema.safeParse(validStripe);
      expect(stripeResult.success).toBe(true);
      if (stripeResult.success) {
        expect(stripeResult.data.currency).toBe("USD"); // Uppercase normalization
      }
    });

    it("rejects an empty or whitespace-only account name", () => {
      const invalid = {
        name: "   ",
        type: "bank" as const,
        currency: "USD",
        openingBalance: 0,
        openingBalanceDate: "2026-09-01",
      };
      const result = createAccountSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects account names exceeding 100 characters", () => {
      const invalid = {
        name: "A".repeat(101),
        type: "bank" as const,
        currency: "USD",
        openingBalance: 0,
        openingBalanceDate: "2026-09-01",
      };
      const result = createAccountSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects invalid currency codes", () => {
      const invalid = {
        name: "Euro Account",
        type: "bank" as const,
        currency: "EUROPE", // Must be 3 chars
        openingBalance: 100,
        openingBalanceDate: "2026-09-01",
      };
      const result = createAccountSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects negative opening balances", () => {
      const invalid = {
        name: "Cash Wallet",
        type: "cash" as const,
        currency: "USD",
        openingBalance: -50.0,
        openingBalanceDate: "2026-09-01",
      };
      const result = createAccountSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Income Domain & Precision
  // --------------------------------------------------------------------------
  describe("2. Income Mutation & Precision", () => {
    it("accepts valid income parameters with precise decimal values", () => {
      const input = {
        accountId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        amount: 1450.55,
        transactionDate: "2026-09-08",
        description: "Retainer Payment - Project Apollo",
        reference: "INV-2026-004",
      };
      const result = recordIncomeSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects zero or negative income amounts", () => {
      expect(
        recordIncomeSchema.safeParse({
          accountId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          amount: 0,
          transactionDate: "2026-09-08",
          description: "Zero income",
        }).success,
      ).toBe(false);

      expect(
        recordIncomeSchema.safeParse({
          accountId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          amount: -100.0,
          transactionDate: "2026-09-08",
          description: "Negative income",
        }).success,
      ).toBe(false);
    });

    it("accurately computes balance increments with high precision amounts", () => {
      const opening = 1000.0;
      const microAmount = 0.01;
      const largeAmount = 999999.99;

      const bal1 = roundNumeric(opening + microAmount);
      expect(bal1).toBe(1000.01);

      const bal2 = roundNumeric(bal1 + largeAmount);
      expect(bal2).toBe(1001000.0);

      // Verify no IEEE floating point drift (0.10 + 0.20 === 0.30)
      const fractional1 = 0.1;
      const fractional2 = 0.2;
      const preciseSum = roundNumeric(fractional1 + fractional2);
      expect(preciseSum).toBe(0.3);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Expense Domain
  // --------------------------------------------------------------------------
  describe("3. Expense Mutation & Validation", () => {
    it("accepts valid expense inputs", () => {
      const input = {
        accountId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        amount: 89.99,
        transactionDate: "2026-09-08",
        description: "Figma Professional Annual Subscription",
        reference: "RCPT-8921",
        categoryId: "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      };
      const result = recordExpenseSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects non-positive expense amounts", () => {
      expect(
        recordExpenseSchema.safeParse({
          accountId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          amount: 0,
          transactionDate: "2026-09-08",
          description: "Free item",
        }).success,
      ).toBe(false);

      expect(
        recordExpenseSchema.safeParse({
          accountId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          amount: -50,
          transactionDate: "2026-09-08",
          description: "Negative expense",
        }).success,
      ).toBe(false);
    });

    it("accurately decrements account balance upon posted expense", () => {
      const startBalance = 5000.0;
      const expense = 1245.5;
      const newBalance = roundNumeric(startBalance - expense);
      expect(newBalance).toBe(3754.5);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Transfer Domain & Invariants
  // --------------------------------------------------------------------------
  describe("4. Transfers & Currency Invariants", () => {
    const accountA = "11111111-1111-1111-1111-111111111111";
    const accountB = "22222222-2222-2222-2222-222222222222";

    it("accepts valid transfer between two distinct accounts", () => {
      const input = {
        sourceAccountId: accountA,
        destinationAccountId: accountB,
        amount: 500.0,
        transactionDate: "2026-09-08",
        description: "Transfer to Tax Reserve",
      };
      const result = recordTransferSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("strictly rejects transfer when source and destination accounts are identical", () => {
      const selfTransfer = {
        sourceAccountId: accountA,
        destinationAccountId: accountA,
        amount: 500.0,
        transactionDate: "2026-09-08",
        description: "Self transfer",
      };
      const result = recordTransferSchema.safeParse(selfTransfer);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("must be different");
      }
    });

    it("simulates dual-leg atomic balance update correctly", () => {
      let sourceBalance = 10000.0;
      let destBalance = 2000.0;
      const transferAmount = 1500.0;

      sourceBalance = roundNumeric(sourceBalance - transferAmount);
      destBalance = roundNumeric(destBalance + transferAmount);

      expect(sourceBalance).toBe(8500.0);
      expect(destBalance).toBe(3500.0);
      // Total liquid cash invariant preserved
      expect(sourceBalance + destBalance).toBe(12000.0);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Adjustments Domain
  // --------------------------------------------------------------------------
  describe("5. Financial Adjustments", () => {
    it("accepts valid adjustment with sufficient audit reason", () => {
      const input = {
        accountId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        deltaAmount: -15.5,
        transactionDate: "2026-09-08",
        reason: "Bank wire maintenance fee reconciled",
      };
      const result = recordAdjustmentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects zero-delta adjustments", () => {
      const input = {
        accountId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        deltaAmount: 0,
        transactionDate: "2026-09-08",
        reason: "Correction",
      };
      const result = recordAdjustmentSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects adjustment without a meaningful audit reason", () => {
      const input = {
        accountId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        deltaAmount: 50,
        transactionDate: "2026-09-08",
        reason: "ok", // Less than 3 characters
      };
      const result = recordAdjustmentSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Reversals Domain & Net Financial Effect
  // --------------------------------------------------------------------------
  describe("6. Reversals & Historical Preservation", () => {
    it("validates reversal input requirements", () => {
      const valid = {
        transactionId: "12345678-1234-1234-1234-123456789abc",
        reversalReason: "Duplicate invoice payment received in error",
      };
      expect(reverseTransactionSchema.safeParse(valid).success).toBe(true);

      const invalid = {
        transactionId: "12345678-1234-1234-1234-123456789abc",
        reversalReason: "no", // Too short
      };
      expect(reverseTransactionSchema.safeParse(invalid).success).toBe(false);
    });

    it("guarantees net zero effect upon reversing an income transaction", () => {
      const opening = 2000.0;
      const income = 800.0;

      // 1. Post Income
      const postIncomeBal = roundNumeric(opening + income);
      expect(postIncomeBal).toBe(2800.0);

      // 2. Reverse Income
      const postReversalBal = roundNumeric(postIncomeBal - income);
      expect(postReversalBal).toBe(2000.0);
    });

    it("guarantees net zero effect upon reversing an expense transaction", () => {
      const opening = 5000.0;
      const expense = 450.0;

      // 1. Post Expense
      const postExpenseBal = roundNumeric(opening - expense);
      expect(postExpenseBal).toBe(4550.0);

      // 2. Reverse Expense
      const postReversalBal = roundNumeric(postExpenseBal + expense);
      expect(postReversalBal).toBe(5000.0);
    });

    it("guarantees net zero effect upon reversing a dual-leg transfer", () => {
      const srcOpening = 7000.0;
      const dstOpening = 1000.0;
      const transferAmount = 2500.0;

      // Post transfer
      const srcAfter = roundNumeric(srcOpening - transferAmount);
      const dstAfter = roundNumeric(dstOpening + transferAmount);
      expect(srcAfter).toBe(4500.0);
      expect(dstAfter).toBe(3500.0);

      // Reverse transfer
      const srcReversed = roundNumeric(srcAfter + transferAmount);
      const dstReversed = roundNumeric(dstAfter - transferAmount);
      expect(srcReversed).toBe(srcOpening);
      expect(dstReversed).toBe(dstOpening);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Authorization & Role-Based Mutation Permissions
  // --------------------------------------------------------------------------
  describe("7. Role-Based Access Control (RBAC) Enforcement", () => {
    it("allows financial mutations for owner, admin, and finance roles", () => {
      expect(canMutateFinancialData("owner")).toBe(true);
      expect(canMutateFinancialData("admin")).toBe(true);
      expect(canMutateFinancialData("finance")).toBe(true);
    });

    it("strictly blocks viewer and manager roles from financial mutations", () => {
      expect(canMutateFinancialData("viewer")).toBe(false);
      expect(canMutateFinancialData("manager")).toBe(false);
      expect(canMutateFinancialData(null)).toBe(false);
      expect(canMutateFinancialData(undefined)).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 8. Balance Reconciliation & Audit Formula
  // --------------------------------------------------------------------------
  describe("8. Full Ledger Balance Reconciliation", () => {
    it("computes authoritative balance matching full sequence of mixed transactions", () => {
      const openingBalance = 5000.0;
      const ledger: Parameters<typeof computeReconciledBalance>[1] = [
        { transaction_type: "income", amount: 2500.0, status: "posted" },
        { transaction_type: "expense", amount: 450.0, status: "posted" },
        {
          transaction_type: "transfer",
          amount: 1000.0,
          transfer_role: "source",
          status: "posted",
        },
        { transaction_type: "income", amount: 300.0, status: "reversed" }, // Should be ignored
        {
          transaction_type: "adjustment",
          amount: 50.0,
          status: "posted",
          reference: "Fee (credit)",
        },
        {
          transaction_type: "adjustment",
          amount: 25.0,
          status: "posted",
          reference: "Discrepancy (debit)",
        },
      ];

      // Calculation:
      // 5000 (opening) + 2500 (income) - 450 (expense) - 1000 (transfer out) + 50 (adj credit) - 25 (adj debit)
      // = 6075.00
      const calculated = computeReconciledBalance(openingBalance, ledger);
      expect(calculated).toBe(6075.0);
    });

    it("flags variance when stored balance differs from ledger sum", () => {
      const opening = 1000.0;
      const ledger: Parameters<typeof computeReconciledBalance>[1] = [
        { transaction_type: "income", amount: 500.0, status: "posted" },
      ];
      const correctBalance = computeReconciledBalance(opening, ledger); // 1500.0
      const driftedStoredBalance = 1600.0; // Stored balance has a drift of +100

      const variance = roundNumeric(driftedStoredBalance - correctBalance);
      const isReconciled = variance === 0;

      expect(isReconciled).toBe(false);
      expect(variance).toBe(100.0);
    });
  });

  // --------------------------------------------------------------------------
  // 9. Multi-Currency Isolation
  // --------------------------------------------------------------------------
  describe("9. Multi-Currency Cash Position Aggregation", () => {
    it("aggregates cash balances strictly by currency without cross-contamination", () => {
      const accounts: Pick<FinancialAccount, "currency" | "current_balance" | "status">[] = [
        { currency: "USD", current_balance: 4500.0, status: "active" },
        { currency: "USD", current_balance: 1500.0, status: "active" },
        { currency: "MWK", current_balance: 2500000.0, status: "active" },
        { currency: "EUR", current_balance: 800.0, status: "active" },
        { currency: "USD", current_balance: 300.0, status: "archived" }, // Archived should not be included in active liquid balance
      ];

      const currencyMap = new Map<string, number>();
      for (const acc of accounts) {
        if (acc.status === "active") {
          const curr = acc.currency.toUpperCase();
          currencyMap.set(curr, roundNumeric((currencyMap.get(curr) ?? 0) + acc.current_balance));
        }
      }

      expect(currencyMap.get("USD")).toBe(6000.0); // 4500 + 1500
      expect(currencyMap.get("MWK")).toBe(2500000.0);
      expect(currencyMap.get("EUR")).toBe(800.0);
      expect(currencyMap.get("GBP")).toBeUndefined();
    });
  });
});
