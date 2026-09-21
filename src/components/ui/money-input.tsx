/**
 * MoneyInput — Premium financial text input with automatic thousands separators.
 *
 * Stores a CANONICAL decimal string (e.g. "20000000.50") and displays it with
 * thousands formatting (e.g. "20,000,000.50"). The canonical value is what gets
 * submitted to Zod validation and RPC calls — never the formatted display string.
 *
 * Usage:
 *   <MoneyInput
 *     id="amount"
 *     value={amount}          // canonical: "1000000"
 *     onChange={setAmount}    // receives canonical: "1000000"
 *     currency="MWK"
 *   />
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { formatMoneyInput, parseMoneyInput } from "@/lib/money";

export interface MoneyInputProps {
  /** Canonical decimal value (no commas). e.g. "20000000.50" or "". */
  value: string;
  /** Called with the canonical decimal string on every valid change. */
  onChange: (canonical: string) => void;
  /** ISO currency code shown as a leading label. Optional. */
  currency?: string | undefined;
  /** Allow negative values (e.g. for adjustment direction). Default: false. */
  allowNegative?: boolean | undefined;
  id?: string | undefined;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  required?: boolean | undefined;
  className?: string | undefined;
  "aria-describedby"?: string | undefined;
  "aria-label"?: string | undefined;
  autoFocus?: boolean | undefined;
}

export function MoneyInput({
  value,
  onChange,
  currency,
  allowNegative = false,
  id,
  placeholder = "0.00",
  disabled = false,
  required = false,
  className,
  "aria-describedby": ariaDescribedBy,
  "aria-label": ariaLabel,
  autoFocus,
}: MoneyInputProps) {
  // The display string (formatted with commas) that the input renders.
  const [displayValue, setDisplayValue] = useState(() => formatMoneyInput(value));
  const inputRef = useRef<HTMLInputElement>(null);
  // Track the last canonical to avoid infinite update loops
  const lastCanonical = useRef(value);

  // Sync incoming canonical prop → display value when controlled externally
  useEffect(() => {
    if (value !== lastCanonical.current) {
      lastCanonical.current = value;
      setDisplayValue(formatMoneyInput(value));
    }
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      // Allow typing a decimal point at the end (user is mid-entry)
      const endsWithDot = raw.endsWith(".");
      // Allow negative sign as first character when allowNegative is true
      if (raw === "-" && allowNegative) {
        setDisplayValue("-");
        onChange("");
        return;
      }

      // Parse to canonical
      const canonical = parseMoneyInput(raw);

      // Reject negative values if not allowed
      if (!allowNegative && canonical.startsWith("-")) return;

      // Update canonical upward
      lastCanonical.current = canonical;
      onChange(canonical);

      // Format for display (but preserve trailing dot for ongoing decimal entry)
      const formatted = endsWithDot
        ? formatMoneyInput(canonical, { showZero: true }) + "."
        : formatMoneyInput(canonical || raw, { showZero: true });

      // Cursor position correction: after formatting inserts commas the cursor
      // shifts. Preserve position relative to the end of the string.
      const el = e.target;
      const prevLen = raw.length;
      const nextLen = formatted.length;
      const cursorFromEnd = prevLen - (el.selectionStart ?? prevLen);

      setDisplayValue(formatted);

      // Restore cursor in the next tick after React re-renders
      requestAnimationFrame(() => {
        if (inputRef.current) {
          const newPos = Math.max(0, nextLen - cursorFromEnd);
          inputRef.current.setSelectionRange(newPos, newPos);
        }
      });
    },
    [allowNegative, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: Backspace, Delete, Tab, Escape, Enter, Arrow keys, Home, End, Ctrl/Cmd+A/C/V/X
      const allowedKeys = [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ];
      if (allowedKeys.includes(e.key)) return;
      if ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x", "z"].includes(e.key.toLowerCase()))
        return;

      // Allow digits
      if (/^\d$/.test(e.key)) return;

      // Allow one decimal point
      if (e.key === "." && !displayValue.includes(".")) return;

      // Allow minus sign at start if allowNegative
      if (e.key === "-" && allowNegative && (inputRef.current?.selectionStart ?? 0) === 0) return;

      // Block everything else
      e.preventDefault();
    },
    [displayValue, allowNegative],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text");
      const canonical = parseMoneyInput(pasted);
      if (!allowNegative && canonical.startsWith("-")) return;
      if (!canonical) return;

      lastCanonical.current = canonical;
      onChange(canonical);
      setDisplayValue(formatMoneyInput(canonical, { showZero: true }));
    },
    [allowNegative, onChange],
  );

  const handleBlur = useCallback(() => {
    // On blur, normalize: e.g. "1000." → "1,000"
    const canonical = parseMoneyInput(displayValue);
    if (canonical) {
      setDisplayValue(formatMoneyInput(canonical, { showZero: true }));
    } else {
      setDisplayValue("");
    }
  }, [displayValue]);

  return (
    <div className="relative flex items-center">
      {currency && (
        <span
          className="pointer-events-none absolute left-3 select-none text-xs font-semibold text-muted-foreground"
          aria-hidden
        >
          {currency}
        </span>
      )}
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel ?? (currency ? `Amount in ${currency}` : "Amount")}
        autoFocus={autoFocus}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm",
          "transition-colors placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "font-mono tabular-nums",
          currency && "pl-10",
          className,
        )}
      />
    </div>
  );
}
