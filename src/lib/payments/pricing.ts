export type PlanTier = "free" | "solo" | "pro";
export type PricingCurrency = "MWK" | "USD";

export interface CanonicalPlanPrice {
  planId: PlanTier;
  currency: PricingCurrency;
  billingInterval: "month";
  amountMajor: number;
  amountCents: number;
  formatted: string;
}

/**
 * SoloOS Launch Pricing:
 * - Free: MWK 0 / $0
 * - Solo: MWK 14,000 / $8
 * - Pro:  MWK 21,000 / $12
 *
 * Architectural rule: MWK and USD are completely independent prices.
 * Never combine them or treat them as an FX conversion.
 */
export const CANONICAL_PRICES: Record<PlanTier, Record<PricingCurrency, CanonicalPlanPrice>> = {
  free: {
    MWK: {
      planId: "free",
      currency: "MWK",
      billingInterval: "month",
      amountMajor: 0,
      amountCents: 0,
      formatted: "MWK 0/month",
    },
    USD: {
      planId: "free",
      currency: "USD",
      billingInterval: "month",
      amountMajor: 0,
      amountCents: 0,
      formatted: "$0/month",
    },
  },
  solo: {
    MWK: {
      planId: "solo",
      currency: "MWK",
      billingInterval: "month",
      amountMajor: 14000,
      amountCents: 1400000,
      formatted: "MWK 14,000/month",
    },
    USD: {
      planId: "solo",
      currency: "USD",
      billingInterval: "month",
      amountMajor: 8,
      amountCents: 800,
      formatted: "$8/month",
    },
  },
  pro: {
    MWK: {
      planId: "pro",
      currency: "MWK",
      billingInterval: "month",
      amountMajor: 21000,
      amountCents: 2100000,
      formatted: "MWK 21,000/month",
    },
    USD: {
      planId: "pro",
      currency: "USD",
      billingInterval: "month",
      amountMajor: 12,
      amountCents: 1200,
      formatted: "$12/month",
    },
  },
};

export const PLAN_DETAILS: Record<
  PlanTier,
  {
    name: string;
    tagline: string;
    description: string;
    highlights: string[];
    recommended?: boolean;
  }
> = {
  free: {
    name: "Free",
    tagline: "Know what you earned",
    description:
      "Core bookkeeping, invoice creation, and foundational cashflow tracking for getting started.",
    highlights: [
      "Single currency tracking",
      "Up to 5 active clients",
      "Up to 10 invoices per month",
      "Standard tax estimator & reserve tracker",
      "1 workspace member",
      "Community support",
    ],
  },
  solo: {
    name: "Solo",
    tagline: "Know what you keep",
    description:
      "The complete financial operating system for thriving independent professionals and consultants.",
    highlights: [
      "Multi-currency support (MWK & USD)",
      "Unlimited clients & invoices",
      "Full cashflow forecasting & runway calculation",
      "Recurring revenue & obligation engine",
      "AI CFO financial intelligence & strategic review",
      "Direct PDF report exports",
      "Up to 3 team members",
      "Priority email support",
    ],
    recommended: true,
  },
  pro: {
    name: "Pro",
    tagline: "Know what to do next",
    description:
      "Advanced intelligence, team collaboration, and multi-entity control for high-earning operators.",
    highlights: [
      "Everything in Solo",
      "Unlimited team members with role-based permissions",
      "Multi-workspace management",
      "Advanced custom tax reserve rules & scenarios",
      "Audit-ready exports (PDF & CSV)",
      "Unlimited AI CFO queries & deep drilldowns",
      "Early access to new financial modules",
      "Dedicated 24/7 priority support",
    ],
  },
};

export function getCanonicalPrice(planId: PlanTier, currency: PricingCurrency): CanonicalPlanPrice {
  const plan = CANONICAL_PRICES[planId];
  if (!plan) {
    throw new Error(`Unknown plan tier: ${planId}`);
  }
  const price = plan[currency];
  if (!price) {
    throw new Error(`Unsupported currency ${currency} for plan ${planId}`);
  }
  return price;
}
