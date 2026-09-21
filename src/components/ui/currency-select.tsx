/**
 * CurrencySelect — Searchable combobox for selecting an ISO 4217 currency.
 *
 * Shows the currency code as the trigger label. Opens a popover with a
 * search input and a scrollable list of all global currencies from CURRENCIES.
 *
 * Usage:
 *   <CurrencySelect value={currency} onChange={setCurrency} />
 */
import { Check, ChevronsUpDown } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CURRENCIES } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface CurrencySelectProps {
  /** ISO 4217 currency code, e.g. "USD", or "all" if includeAll is enabled. */
  value: string;
  /** Called with the new currency code when user selects. */
  onChange: (code: string) => void;
  id?: string;
  disabled?: boolean;
  /** Extra class for the trigger button. */
  className?: string;
  placeholder?: string;
  /** When true, includes an "All Currencies" option at the top. */
  includeAll?: boolean;
  allLabel?: string;
}

export function CurrencySelect({
  value,
  onChange,
  id,
  disabled = false,
  className,
  placeholder = "Select currency…",
  includeAll = false,
  allLabel = "All Currencies",
}: CurrencySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const showAllOption = useMemo(() => {
    if (!includeAll) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return "all".includes(q) || allLabel.toLowerCase().includes(q);
  }, [includeAll, search, allLabel]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) => c.code.toLowerCase().includes(q) || c.label.toLowerCase().includes(q),
    );
  }, [search]);

  const selectedLabel = useMemo(() => {
    if (includeAll && value === "all") return allLabel;
    return CURRENCIES.find((c) => c.code === value)?.label ?? value;
  }, [includeAll, value, allLabel]);

  const handleSelect = useCallback(
    (code: string) => {
      onChange(code);
      setOpen(false);
      setSearch("");
    },
    [onChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={value ? `Currency: ${value} — ${selectedLabel}` : placeholder}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-mono text-sm",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {value ? (
              value === "all" ? (
                <span className="font-semibold">{allLabel}</span>
              ) : (
                <>
                  <span className="font-semibold">{value}</span>
                  <span className="text-muted-foreground font-normal truncate">
                    {selectedLabel}
                  </span>
                </>
              )
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search currency…" value={search} onValueChange={setSearch} />
          <CommandList className="max-h-64">
            <CommandEmpty>No currency found.</CommandEmpty>
            <CommandGroup>
              {showAllOption && (
                <CommandItem
                  key="all"
                  value="all"
                  onSelect={() => handleSelect("all")}
                  className="flex items-center gap-3"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0 text-primary",
                      value === "all" ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="font-mono font-semibold w-10 shrink-0 text-foreground">ALL</span>
                  <span className="text-muted-foreground truncate text-xs">{allLabel}</span>
                </CommandItem>
              )}
              {filtered.map((c) => (
                <CommandItem
                  key={c.code}
                  value={c.code}
                  onSelect={() => handleSelect(c.code)}
                  className="flex items-center gap-3"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0 text-primary",
                      value === c.code ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="font-mono font-semibold w-10 shrink-0 text-foreground">
                    {c.code}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">{c.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
