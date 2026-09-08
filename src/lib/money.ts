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

// ============================================================================
// MoneyInput Parsing & Formatting
// ============================================================================

/**
 * Parses a user-typed string (possibly containing thousands separators, currency
 * symbols, or spaces) into a canonical decimal string safe for Zod / RPC.
 *
 * Examples:
 *   "1,000"         → "1000"
 *   "20,000,000.50" → "20000000.50"
 *   "$1,234.56"     → "1234.56"
 *   "1.5M"          → "1.5"   (trailing non-numeric stripped)
 *   ""              → ""
 *   "-500"          → "-500"  (negatives preserved)
 */
export function parseMoneyInput(raw: string): string {
  if (!raw || raw.trim() === "") return "";

  // Keep only digits, one decimal point, and an optional leading minus.
  let cleaned = raw.trim();

  // Preserve leading minus for negative values
  const negative = cleaned.startsWith("-");
  if (negative) cleaned = cleaned.slice(1);

  // Remove everything that is not a digit or a period
  cleaned = cleaned.replace(/[^\d.]/g, "");

  // Collapse multiple decimal points: keep only the first one
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = (parts[0] ?? "") + "." + parts.slice(1).join("");
  }

  // Remove trailing empty decimal (user typed "1000." → "1000")
  if (cleaned.endsWith(".")) {
    cleaned = cleaned.slice(0, -1);
  }

  if (!cleaned) return "";

  return negative ? `-${cleaned}` : cleaned;
}

/**
 * Formats a canonical decimal value (string or number) for display inside a
 * text input with thousands separators.
 *
 * Examples:
 *   "1000"        → "1,000"
 *   "20000000.50" → "20,000,000.50"
 *   0             → ""    (empty state — don't show "0" pre-filled)
 *   ""            → ""
 */
export function formatMoneyInput(
  canonical: string | number | null | undefined,
  options: { showZero?: boolean } = {},
): string {
  if (canonical === null || canonical === undefined || canonical === "") return "";
  const str = String(canonical).trim();
  if (str === "" || str === "0" || str === "0.00" || str === "0.0000") {
    return options.showZero ? str : "";
  }

  const negative = str.startsWith("-");
  const abs = negative ? str.slice(1) : str;

  // Split integer and decimal parts
  const [intPart = "", decPart] = abs.split(".");

  // Format integer part with commas
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const result = decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
  return negative ? `-${result}` : result;
}

/**
 * Compact money formatting for non-critical aggregate displays.
 * Full value must always be available via MoneyValue in primary contexts.
 */
export function formatMoneyCompact(
  value: string | number | null | undefined,
  currency: CurrencyCode,
): string {
  const amount = toDisplayNumber(value);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return formatMoney(value, currency);
  }
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
