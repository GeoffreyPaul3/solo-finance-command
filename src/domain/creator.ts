/**
 * SoloOS Phase 12: Creator Distribution Engine — Domain Model
 *
 * Core principles:
 * 1. Creator identity is UUID-authoritative. Public handles/codes are presentation only.
 * 2. Commission math uses integer basis-point arithmetic — no floating point.
 * 3. Commission rules are snapshotted at creation time — future rule changes don't alter history.
 * 4. Creators use /c/{creatorCode} — completely separate from workspace /r/{code}.
 * 5. Self-referral detection is defensive and strict.
 * 6. All financial decisions are server-authoritative.
 */

// ─── Status Types ─────────────────────────────────────────────────────────────

export type ApplicationStatus = "pending" | "approved" | "rejected";
export type CreatorStatus = "active" | "suspended" | "closed";
export type CampaignStatus = "active" | "paused" | "archived";
export type CommissionStatus = "pending" | "approved" | "paid" | "reversed" | "ineligible";
export type PayoutStatus = "pending" | "approved" | "processing" | "paid" | "failed" | "cancelled";

export type PayoutMethod = "mobile_money" | "bank";
export type MobileMoneyProvider = "airtel" | "tnm";

// ─── Malawi Localization Constants ──────────────────────────────────────────

export const MALAWI_BANKS = [
  "National Bank of Malawi (NBM)",
  "Standard Bank Malawi",
  "FDH Bank",
  "NBS Bank",
  "Centenary Bank",
  "First Capital Bank (FCB)",
  "Ecobank Malawi",
  "CDH Investment Bank",
  "Opportunity Bank Malawi",
] as const;

export const MALAWI_MOBILE_PROVIDERS = [
  { id: "airtel" as const, name: "Airtel Money", prefixes: ["099", "098", "090"] },
  { id: "tnm" as const, name: "TNM Mpamba", prefixes: ["088", "089", "080"] },
] as const;

export const MALAWI_CITIES = [
  "Lilongwe",
  "Blantyre",
  "Mzuzu",
  "Zomba",
  "Kasungu",
  "Mangochi",
  "Salima",
  "Karonga",
  "Other (Malawi)",
] as const;

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface CreatorProfile {
  id: string;
  user_id: string | null;
  email: string;
  display_name: string;
  public_handle: string;
  referral_code: string;
  bio: string | null;
  website_url: string | null;
  primary_platform: string | null;
  application_status: ApplicationStatus;
  creator_status: CreatorStatus | null;
  application_note: string | null;
  admin_note: string | null;
  country: string;
  phone: string | null;
  city: string | null;
  payout_method: PayoutMethod | null;
  mobile_money_provider: MobileMoneyProvider | null;
  mobile_money_number: string | null;
  mobile_money_account_name: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  bank_branch: string | null;
  payout_details_updated_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  suspended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatorCampaign {
  id: string;
  creator_id: string;
  name: string;
  platform: string | null;
  campaign_code: string;
  status: CampaignStatus;
  destination_path: string;
  created_at: string;
  archived_at: string | null;
}

export interface CreatorCommissionRule {
  id: string;
  name: string;
  commission_rate_bps: number;
  window_months: number;
  is_active: boolean;
  applies_to_plan_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatorCommission {
  id: string;
  creator_id: string;
  attribution_id: string;
  subscription_payment_id: string;
  referred_workspace_id: string;
  commission_rule_id: string | null;
  billing_period_label: string;
  gross_amount_cents: number;
  commission_rate_bps: number;
  window_months_snapshot: number;
  commission_amount_cents: number;
  currency: string;
  status: CommissionStatus;
  flags: Record<string, unknown>;
  approved_at: string | null;
  approved_by: string | null;
  paid_at: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatorPayout {
  id: string;
  creator_id: string;
  currency: string;
  amount_cents: number;
  status: PayoutStatus;
  payout_reference: string | null;
  commission_ids: string[];
  payout_method?: string | null;
  payout_details?: Record<string, unknown> | null;
  notes?: string | null;
  requested_at: string;
  approved_at: string | null;
  approved_by: string | null;
  paid_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatorAsset {
  id: string;
  title: string;
  description: string | null;
  asset_type: string;
  url: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

// ─── Code Validation ──────────────────────────────────────────────────────────

/**
 * Validates a creator referral code (public_handle / referral_code).
 * Format: lowercase alphanumeric + hyphens, 4–48 chars, must start/end with alnum.
 * Distinct from workspace codes (which are UPPERCASE with dash separator like ACME-8F2K).
 */
export function validateCreatorCode(code: string): boolean {
  if (!code || typeof code !== "string") return false;
  const trimmed = code.trim();
  // Strictly lowercase, alphanumeric + hyphens, 4-48 chars, start/end with alnum
  return /^[a-z0-9][a-z0-9-]{2,46}[a-z0-9]$/.test(trimmed);
}

/**
 * Validates a campaign code.
 * Format: lowercase alphanumeric + hyphens, 4–64 chars.
 */
export function validateCampaignCode(code: string): boolean {
  if (!code || typeof code !== "string") return false;
  const trimmed = code.trim();
  return /^[a-z0-9][a-z0-9-]{2,62}[a-z0-9]$/.test(trimmed);
}

/**
 * Slugifies a display name into a valid creator code.
 * e.g. "Geoffrey Paul" → "geoffrey-paul"
 * Collisions must be resolved server-side.
 */
export function slugifyCreatorHandle(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 46);
}

// ─── Commission Math ──────────────────────────────────────────────────────────

/**
 * Computes commission in integer cents using basis-point arithmetic.
 * Uses integer division — matches the SQL DEFINER function exactly.
 * No floating point at any step.
 */
export function computeCommissionCents(grossAmountCents: number, rateInBps: number): number {
  if (grossAmountCents <= 0 || rateInBps <= 0) return 0;
  return Math.floor((grossAmountCents * rateInBps) / 10000);
}

/**
 * Formats basis points as a human-readable percentage string.
 * 2000 → "20%"
 * 1500 → "15%"
 */
export function formatBpsAsPercent(bps: number): string {
  return `${bps / 100}%`;
}

/**
 * Checks whether a payment falls within the commission window.
 * windowMonths is snapshotted from the rule at commission-creation time.
 */
export function isWithinCommissionWindow(params: {
  convertedAt: Date | string;
  paymentDate: Date | string;
  windowMonths: number;
}): boolean {
  const convertedMs = new Date(params.convertedAt).getTime();
  const paymentMs = new Date(params.paymentDate).getTime();
  const windowMs = params.windowMonths * 30.44 * 24 * 60 * 60 * 1000; // approximate
  return paymentMs >= convertedMs && paymentMs <= convertedMs + windowMs;
}

// ─── Status Transitions ───────────────────────────────────────────────────────

const APPLICATION_ORDER: Record<ApplicationStatus, number> = {
  pending: 0,
  approved: 1,
  rejected: 1,
};

const CREATOR_STATUS_ORDER: Record<CreatorStatus, number> = {
  active: 0,
  suspended: 1,
  closed: 2,
};

/**
 * Returns true if transitioning from → to is a valid application status change.
 * Applications can: pending→approved, pending→rejected (but not approved→rejected directly).
 */
export function isApplicationTransitionValid(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  if (from === to) return true; // idempotent
  if (from === "pending" && (to === "approved" || to === "rejected")) return true;
  return false;
}

/**
 * Returns true if transitioning creator_status from → to is valid.
 * active ↔ suspended (reactivation allowed), either → closed.
 */
export function isCreatorStatusTransitionValid(
  from: CreatorStatus | null,
  to: CreatorStatus,
): boolean {
  if (from === to) return true;
  if (to === "active" && (from === "suspended" || from === null)) return true;
  if (to === "suspended" && from === "active") return true;
  if (to === "closed") return true; // terminal from any state
  return false;
}

const COMMISSION_STATUS_ORDER: Record<CommissionStatus, number> = {
  pending: 0,
  approved: 1,
  paid: 2,
  reversed: 3,
  ineligible: 3,
};

/**
 * Returns true if commission status transition is valid.
 */
export function isCommissionTransitionValid(from: CommissionStatus, to: CommissionStatus): boolean {
  if (from === to) return true;
  if (from === "pending" && (to === "approved" || to === "ineligible")) return true;
  if (from === "approved" && (to === "paid" || to === "reversed")) return true;
  if (from === "paid" && to === "reversed") return true;
  return false;
}

const PAYOUT_STATUS_ORDER: Record<PayoutStatus, number> = {
  pending: 0,
  approved: 1,
  processing: 2,
  paid: 3,
  failed: 3,
  cancelled: 3,
};

export function isPayoutTransitionValid(from: PayoutStatus, to: PayoutStatus): boolean {
  if (from === to) return true;
  if (from === "pending" && (to === "approved" || to === "cancelled")) return true;
  if (from === "approved" && (to === "processing" || to === "cancelled")) return true;
  if (from === "processing" && (to === "paid" || to === "failed")) return true;
  return false;
}

// ─── Creator Funnel Metrics ───────────────────────────────────────────────────

export interface CreatorFunnelMetrics {
  totalClicks: number;
  totalSignups: number;
  totalActivated: number;
  totalConverted: number;
  clickToSignupPct: number;
  signupToActivationPct: number;
  activationToConversionPct: number;
}

export function computeCreatorFunnel(
  attributions: {
    status: string;
  }[],
): CreatorFunnelMetrics {
  const totalClicks = attributions.length;
  let totalSignups = 0;
  let totalActivated = 0;
  let totalConverted = 0;

  for (const a of attributions) {
    if (["signed_up", "activated", "converted"].includes(a.status)) totalSignups++;
    if (["activated", "converted"].includes(a.status)) totalActivated++;
    if (a.status === "converted") totalConverted++;
  }

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

  return {
    totalClicks,
    totalSignups,
    totalActivated,
    totalConverted,
    clickToSignupPct: pct(totalSignups, totalClicks),
    signupToActivationPct: pct(totalActivated, totalSignups),
    activationToConversionPct: pct(totalConverted, totalActivated),
  };
}

// ─── Commission Aggregates ────────────────────────────────────────────────────

export interface CommissionSummary {
  currency: string;
  pendingCents: number;
  approvedCents: number;
  paidCents: number;
  reversedCents: number;
}

/**
 * Aggregates commission records into per-currency summaries.
 */
export function aggregateCommissions(
  commissions: Array<{
    currency: string;
    commission_amount_cents: number;
    status: string;
  }>,
): CommissionSummary[] {
  const byCurrency = new Map<string, CommissionSummary>();

  for (const c of commissions) {
    if (!byCurrency.has(c.currency)) {
      byCurrency.set(c.currency, {
        currency: c.currency,
        pendingCents: 0,
        approvedCents: 0,
        paidCents: 0,
        reversedCents: 0,
      });
    }
    const summary = byCurrency.get(c.currency)!;
    if (c.status === "pending") summary.pendingCents += c.commission_amount_cents;
    else if (c.status === "approved") summary.approvedCents += c.commission_amount_cents;
    else if (c.status === "paid") summary.paidCents += c.commission_amount_cents;
    else if (c.status === "reversed") summary.reversedCents += c.commission_amount_cents;
  }

  return Array.from(byCurrency.values()).sort((a, b) => a.currency.localeCompare(b.currency));
}

// ─── Platform Display ─────────────────────────────────────────────────────────

export const CREATOR_PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X (Twitter)" },
  { value: "facebook", label: "Facebook" },
  { value: "newsletter", label: "Newsletter" },
  { value: "blog", label: "Blog" },
  { value: "podcast", label: "Podcast" },
  { value: "community", label: "Community" },
  { value: "other", label: "Other" },
] as const;

export type CreatorPlatform = (typeof CREATOR_PLATFORMS)[number]["value"];

export function getPlatformLabel(platform: string): string {
  return CREATOR_PLATFORMS.find((p) => p.value === platform)?.label ?? platform;
}

// ─── Creator Program Constants ────────────────────────────────────────────────

/** The standard commission rate in basis points (20% = 2000 bps). */
export const STANDARD_COMMISSION_RATE_BPS = 2000;

/** The standard commission window in months. */
export const STANDARD_COMMISSION_WINDOW_MONTHS = 12;

// ─── Malawi Formatting & Validation ──────────────────────────────────────────

/**
 * Validates a Malawi mobile phone number (Airtel: 099/098/090, TNM: 088/089/080).
 */
export function validateMalawiPhone(phone: string): boolean {
  if (!phone || typeof phone !== "string") return false;
  const cleaned = phone.replace(/[\s\-()]/g, "");
  // Matches +26599..., 26599..., 099..., 99... (9 or 10 or 12 digits)
  return /^(\+?265|0)?[89]\d{8}$/.test(cleaned);
}

/**
 * Formats a phone number cleanly as: +265 99 123 4567 or +265 88 123 4567
 */
export function formatMalawiPhone(phone: string): string {
  if (!phone || typeof phone !== "string") return "";
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("265")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 9) {
    return `+265 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  return phone;
}

/**
 * Formats an amount in cents according to currency (defaults to MWK).
 */
export function formatCurrencyAmount(amountCents: number, currency: string = "MWK"): string {
  const major = amountCents / 100;
  const upper = (currency || "MWK").toUpperCase();
  if (upper === "MWK") {
    return `MWK ${major.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  if (upper === "USD") {
    return `$${major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${upper} ${major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

