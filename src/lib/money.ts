/**
 * Centralised monetary presentation helpers.
 *
 * Authoritative monetary values live in PostgreSQL `numeric` columns and are
 * transported as strings. These helpers exist ONLY for display and for parsing
 * user input; they must never be used as the authoritative representation of
 * money in a calculation that is persisted.
 */

export type CurrencyCode = string;

/** Parse a numeric value coming from the database (string) for display. */
export function toDisplayNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(
  value: string | number | null | undefined,
  currency: CurrencyCode,
  options: { maximumFractionDigits?: number } = {},
): string {
  const amount = toDisplayNumber(value);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: options.maximumFractionDigits ?? 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatPercent(value: string | number | null | undefined, digits = 1): string {
  return `${toDisplayNumber(value).toFixed(digits)}%`;
}

/** Currencies offered during onboarding. Structural multi-currency support. */
export const CURRENCIES: { code: string; label: string }[] = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "NGN", label: "Nigerian Naira" },
  { code: "KES", label: "Kenyan Shilling" },
  { code: "ZAR", label: "South African Rand" },
  { code: "MWK", label: "Malawian Kwacha" },
  { code: "GHS", label: "Ghanaian Cedi" },
  { code: "INR", label: "Indian Rupee" },
  { code: "SGD", label: "Singapore Dollar" },
  { code: "AED", label: "UAE Dirham" },
  { code: "BRL", label: "Brazilian Real" },
];
