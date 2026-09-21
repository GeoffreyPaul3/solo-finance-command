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

/**
 * Comprehensive ISO 4217 global currency list.
 * Used in onboarding, settings, invoice creation, and all currency selectors.
 * Sorted: major world currencies first, then alphabetical by code.
 */
export const CURRENCIES: { code: string; label: string }[] = [
  // Major / widely used
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound Sterling" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "CHF", label: "Swiss Franc" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "CNY", label: "Chinese Yuan Renminbi" },
  { code: "HKD", label: "Hong Kong Dollar" },
  { code: "NZD", label: "New Zealand Dollar" },
  { code: "SEK", label: "Swedish Krona" },
  { code: "NOK", label: "Norwegian Krone" },
  { code: "DKK", label: "Danish Krone" },
  { code: "SGD", label: "Singapore Dollar" },
  { code: "INR", label: "Indian Rupee" },
  { code: "AED", label: "UAE Dirham" },
  { code: "BRL", label: "Brazilian Real" },
  { code: "MXN", label: "Mexican Peso" },
  { code: "KRW", label: "South Korean Won" },
  { code: "RUB", label: "Russian Ruble" },
  { code: "TRY", label: "Turkish Lira" },
  { code: "ZAR", label: "South African Rand" },
  { code: "MYR", label: "Malaysian Ringgit" },
  { code: "THB", label: "Thai Baht" },
  { code: "IDR", label: "Indonesian Rupiah" },
  { code: "PHP", label: "Philippine Peso" },
  { code: "PLN", label: "Polish Zloty" },
  { code: "CZK", label: "Czech Koruna" },
  { code: "HUF", label: "Hungarian Forint" },
  { code: "ILS", label: "Israeli New Shekel" },
  { code: "SAR", label: "Saudi Riyal" },
  { code: "QAR", label: "Qatari Riyal" },
  { code: "KWD", label: "Kuwaiti Dinar" },
  { code: "BHD", label: "Bahraini Dinar" },
  { code: "OMR", label: "Omani Rial" },
  { code: "JOD", label: "Jordanian Dinar" },
  { code: "EGP", label: "Egyptian Pound" },
  { code: "PKR", label: "Pakistani Rupee" },
  { code: "BDT", label: "Bangladeshi Taka" },
  { code: "LKR", label: "Sri Lankan Rupee" },
  { code: "NPR", label: "Nepalese Rupee" },
  { code: "VND", label: "Vietnamese Dong" },
  { code: "TWD", label: "New Taiwan Dollar" },
  // Africa
  { code: "NGN", label: "Nigerian Naira" },
  { code: "KES", label: "Kenyan Shilling" },
  { code: "GHS", label: "Ghanaian Cedi" },
  { code: "MWK", label: "Malawian Kwacha" },
  { code: "TZS", label: "Tanzanian Shilling" },
  { code: "UGX", label: "Ugandan Shilling" },
  { code: "ETB", label: "Ethiopian Birr" },
  { code: "ZMW", label: "Zambian Kwacha" },
  { code: "BWP", label: "Botswana Pula" },
  { code: "NAD", label: "Namibian Dollar" },
  { code: "MZN", label: "Mozambican Metical" },
  { code: "RWF", label: "Rwandan Franc" },
  { code: "XOF", label: "West African CFA Franc" },
  { code: "XAF", label: "Central African CFA Franc" },
  { code: "DZD", label: "Algerian Dinar" },
  { code: "MAD", label: "Moroccan Dirham" },
  { code: "TND", label: "Tunisian Dinar" },
  { code: "SDG", label: "Sudanese Pound" },
  { code: "LYD", label: "Libyan Dinar" },
  { code: "SOS", label: "Somali Shilling" },
  { code: "MGA", label: "Malagasy Ariary" },
  { code: "SCR", label: "Seychellois Rupee" },
  { code: "MUR", label: "Mauritian Rupee" },
  // Americas
  { code: "ARS", label: "Argentine Peso" },
  { code: "CLP", label: "Chilean Peso" },
  { code: "COP", label: "Colombian Peso" },
  { code: "PEN", label: "Peruvian Sol" },
  { code: "VES", label: "Venezuelan Bolívar" },
  { code: "UYU", label: "Uruguayan Peso" },
  { code: "BOB", label: "Bolivian Boliviano" },
  { code: "PYG", label: "Paraguayan Guaraní" },
  { code: "GTQ", label: "Guatemalan Quetzal" },
  { code: "HNL", label: "Honduran Lempira" },
  { code: "CRC", label: "Costa Rican Colón" },
  { code: "DOP", label: "Dominican Peso" },
  { code: "JMD", label: "Jamaican Dollar" },
  { code: "TTD", label: "Trinidad & Tobago Dollar" },
  { code: "BBD", label: "Barbadian Dollar" },
  { code: "XCD", label: "East Caribbean Dollar" },
  // Europe (non-EUR)
  { code: "RON", label: "Romanian Leu" },
  { code: "BGN", label: "Bulgarian Lev" },
  { code: "HRK", label: "Croatian Kuna" },
  { code: "RSD", label: "Serbian Dinar" },
  { code: "UAH", label: "Ukrainian Hryvnia" },
  { code: "ISK", label: "Icelandic Króna" },
  { code: "GEL", label: "Georgian Lari" },
  { code: "AMD", label: "Armenian Dram" },
  { code: "AZN", label: "Azerbaijani Manat" },
  { code: "KZT", label: "Kazakhstani Tenge" },
  { code: "UZS", label: "Uzbekistani Som" },
  { code: "MDL", label: "Moldovan Leu" },
  { code: "ALL", label: "Albanian Lek" },
  { code: "MKD", label: "Macedonian Denar" },
  { code: "BAM", label: "Bosnia-Herzegovina Convertible Mark" },
  // Middle East / Central Asia
  { code: "IRR", label: "Iranian Rial" },
  { code: "IQD", label: "Iraqi Dinar" },
  { code: "LBP", label: "Lebanese Pound" },
  { code: "SYP", label: "Syrian Pound" },
  { code: "YER", label: "Yemeni Rial" },
  { code: "AFN", label: "Afghan Afghani" },
  // Asia-Pacific
  { code: "MMK", label: "Myanmar Kyat" },
  { code: "KHR", label: "Cambodian Riel" },
  { code: "LAK", label: "Laotian Kip" },
  { code: "MNT", label: "Mongolian Tögrög" },
  { code: "KGS", label: "Kyrgystani Som" },
  { code: "TJS", label: "Tajikistani Somoni" },
  { code: "TMT", label: "Turkmenistani Manat" },
  { code: "FJD", label: "Fijian Dollar" },
  { code: "PGK", label: "Papua New Guinean Kina" },
  { code: "WST", label: "Samoan Tālā" },
  { code: "SBD", label: "Solomon Islands Dollar" },
  { code: "TOP", label: "Tongan Paʻanga" },
  { code: "VUV", label: "Vanuatu Vatu" },
];
