/**
 * MoneyValue — Authoritative financial value display.
 *
 * Renders a monetary amount with proper thousands separators, tabular numerals,
 * and responsive layout that prevents overflow in cards, tables, and dialogs.
 *
 * The full canonical value is ALWAYS rendered — no abbreviation unless
 * compact={true} is explicitly passed in a non-critical display context.
 *
 * Usage:
 *   <MoneyValue value="20000000" currency="MWK" size="xl" />
 *   → renders "MWK 20,000,000.00" with responsive layout
 */
import { cn } from "@/lib/utils";
import { formatMoney, toDisplayNumber } from "@/lib/money";

export type MoneyValueSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface MoneyValueProps {
  value: string | number | null | undefined;
  currency: string;
  size?: MoneyValueSize;
  /** Show compact (e.g. 20M) — only for non-critical secondary metrics */
  compact?: boolean;
  className?: string;
  /** Prefix + (positive) or - (negative) based on direction */
  prefix?: "+" | "-" | "±" | "";
  prefixClassName?: string;
}

const sizeClasses: Record<MoneyValueSize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-2xl sm:text-3xl",
};

export function MoneyValue({
  value,
  currency,
  size = "md",
  className,
  prefix,
  prefixClassName,
}: MoneyValueProps) {
  const amount = toDisplayNumber(value);

  let formatted: string;
  try {
    formatted = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unsupported currency codes (e.g. MWK on some locales)
    formatted = `${currency} ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-baseline gap-1 font-mono tabular-nums",
        "break-words overflow-wrap-anywhere",
        sizeClasses[size],
        "font-bold tracking-tight",
        className,
      )}
      style={{ fontVariantNumeric: "tabular-nums", wordBreak: "break-word" }}
    >
      {prefix && (
        <span className={cn("font-semibold", prefixClassName)} aria-hidden>
          {prefix}
        </span>
      )}
      <span className="min-w-0 shrink break-all">{formatted}</span>
    </span>
  );
}

/**
 * MoneyValueBlock — Block-level layout for cards/metric panels.
 * Splits currency code from amount for maximum overflow safety.
 */
export function MoneyValueBlock({
  value,
  currency,
  size = "xl",
  className,
}: Omit<MoneyValueProps, "prefix" | "prefixClassName">) {
  const amount = toDisplayNumber(value);

  let amountStr: string;
  let currencyStr = currency;

  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      currencyDisplay: "code",
    }).formatToParts(amount);

    currencyStr = parts.find((p) => p.type === "currency")?.value ?? currency;
    amountStr = parts
      .filter((p) => (p.type !== "currency" && p.type !== "literal") || p.value.trim())
      .filter((p) => p.type !== "currency")
      .map((p) => p.value)
      .join("")
      .trim();
  } catch {
    amountStr = amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return (
    <div
      className={cn("min-w-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-0", className)}
      style={{ wordBreak: "break-word" }}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
        {currencyStr}
      </span>
      <span
        className={cn(
          "min-w-0 font-mono tabular-nums font-bold tracking-tight break-all",
          sizeClasses[size],
        )}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {amountStr}
      </span>
    </div>
  );
}

/** Re-export for convenience */
export { formatMoney };
