/**
 * src/lib/invoice-calculations.ts
 *
 * Pure, side-effect-free financial calculations for invoices.
 *
 * Design rules:
 *  - No floating-point authority. All inputs/outputs are canonical decimal strings.
 *  - Intermediate arithmetic uses BigInt scaled to 4 decimal places (1e4 = 10000).
 *  - Results are always NUMERIC(18,4) compatible canonical strings.
 *  - Mirror the PostgreSQL formulas exactly so UI previews are consistent with DB.
 */

import type { Database } from "@/integrations/supabase/types";

export type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];

/** Canonical decimal string, e.g. "1000.0000" */
type Decimal = string;

/** Scale for 4 decimal places */
const SCALE = 10000n;

/** Parse a canonical decimal string to a BigInt with 4 decimal places */
function toBigInt(value: Decimal | number | null | undefined): bigint {
  if (value === null || value === undefined || value === "") return 0n;
  const str = String(value).trim();
  if (str === "" || isNaN(Number(str))) return 0n;

  const parts = str.split(".");
  const intPart = parts[0] ?? "0";
  const fracPart = parts[1] ?? "";
  const frac = (fracPart + "0000").slice(0, 4); // pad/truncate to 4 decimal digits
  return BigInt(intPart) * SCALE + BigInt(frac);
}

/** Convert a 4-decimal BigInt back to a canonical string */
function fromBigInt(value: bigint): Decimal {
  const neg = value < 0n;
  const abs = neg ? -value : value;
  const intPart = abs / SCALE;
  const fracPart = String(abs % SCALE).padStart(4, "0");
  return `${neg ? "-" : ""}${intPart}.${fracPart}`;
}

/** Round a BigInt division result to 4 decimal places */
function mulScale(a: bigint, b: bigint): bigint {
  // a and b are already scaled by SCALE
  // (a / SCALE) * (b / SCALE) * SCALE = (a * b) / SCALE
  return (a * b) / SCALE;
}

// ============================================================================
// Core Calculation Functions
// ============================================================================

/**
 * Compute line_total = ROUND(quantity × unit_price, 4)
 * Mirrors: ROUND(quantity * unit_price, 4) in PostgreSQL
 */
export function computeLineTotal(quantity: Decimal, unitPrice: Decimal): Decimal {
  const qty = toBigInt(quantity);
  const price = toBigInt(unitPrice);
  const total = mulScale(qty, price);
  return fromBigInt(total);
}

/**
 * Compute subtotal = SUM(line_total for all items)
 */
export function computeSubtotal(lineItems: { quantity: Decimal; unit_price: Decimal }[]): Decimal {
  let sum = 0n;
  for (const item of lineItems) {
    const qty = toBigInt(item.quantity);
    const price = toBigInt(item.unit_price);
    sum += mulScale(qty, price);
  }
  return fromBigInt(sum);
}

/**
 * Compute total = subtotal - discount_amount + tax_amount
 * Returns "0.0000" if result would be negative (matches RPC guard).
 */
export function computeTotal(
  subtotal: Decimal,
  discountAmount: Decimal,
  taxAmount: Decimal,
): Decimal {
  const sub = toBigInt(subtotal);
  const disc = toBigInt(discountAmount);
  const tax = toBigInt(taxAmount);
  const result = sub - disc + tax;
  return fromBigInt(result < 0n ? 0n : result);
}

/**
 * Compute amount_due = total - amount_paid
 * Clamps to 0 (cannot go negative).
 */
export function computeAmountDue(total: Decimal, amountPaid: Decimal): Decimal {
  const t = toBigInt(total);
  const p = toBigInt(amountPaid);
  const due = t - p;
  return fromBigInt(due < 0n ? 0n : due);
}

/**
 * Compute invoice status from financial facts.
 *
 * Mirrors compute_invoice_status() PL/pgSQL function exactly:
 *   - cancelled → cancelled
 *   - draft → draft
 *   - amount_paid >= total && total > 0 → paid
 *   - amount_paid > 0 && amount_due > 0 → partially_paid
 *   - amount_paid = 0 && due_date < today → overdue
 *   - otherwise → sent
 */
export function computeInvoiceStatus(params: {
  currentStatus: InvoiceStatus;
  amountPaid: Decimal;
  total: Decimal;
  amountDue: Decimal;
  dueDateStr: string; // ISO date "YYYY-MM-DD"
  today?: Date; // injectable for testing
}): InvoiceStatus {
  const { currentStatus, amountPaid, total, amountDue, dueDateStr, today = new Date() } = params;

  if (currentStatus === "cancelled") return "cancelled";
  if (currentStatus === "draft") return "draft";

  const paidBig = toBigInt(amountPaid);
  const totalBig = toBigInt(total);
  const dueBig = toBigInt(amountDue);

  if (totalBig > 0n && paidBig >= totalBig) return "paid";
  if (paidBig > 0n && dueBig > 0n) return "partially_paid";

  // Compare dates without time — parse ISO string to avoid timezone issues
  const dateParts = dueDateStr.split("-").map(Number);
  const y = dateParts[0] ?? 1970;
  const m = (dateParts[1] ?? 1) - 1;
  const d = dateParts[2] ?? 1;
  const dueDate = new Date(y, m, d);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (paidBig === 0n && dueDate < todayMidnight) return "overdue";
  return "sent";
}

/**
 * Validate a single line item.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateLineItem(item: {
  description: string;
  quantity: Decimal;
  unit_price: Decimal;
}): string | null {
  if (!item.description || item.description.trim().length === 0) {
    return "Description is required";
  }
  if (item.description.trim().length > 1000) {
    return "Description must be 1000 characters or less";
  }
  const qty = Number(item.quantity);
  if (isNaN(qty) || qty <= 0) {
    return "Quantity must be greater than 0";
  }
  const price = Number(item.unit_price);
  if (isNaN(price) || price < 0) {
    return "Unit price cannot be negative";
  }
  return null;
}

/**
 * Check whether amount_paid + amount_due = total (financial invariant).
 */
export function checkPaymentInvariant(
  total: Decimal,
  amountPaid: Decimal,
  amountDue: Decimal,
): boolean {
  const t = toBigInt(total);
  const p = toBigInt(amountPaid);
  const d = toBigInt(amountDue);
  return p + d === t;
}
