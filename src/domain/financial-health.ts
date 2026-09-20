/**
 * SoloOS Phase 10: SoloOS Financial Health Model
 *
 * Deterministic planning and decision-support indicator derived strictly from SoloOS data.
 *
 * IMPORTANT DISCLAIMER:
 * SoloOS Financial Health is an internal decision-support and planning metric calculated
 * solely from recorded transactions, invoices, and obligations in your workspace.
 * It is NOT a credit score, financial rating, professional audit, or guarantee of solvency.
 */

export interface FinancialHealthInput {
  currency: string;
  liquidCash: number;
  safeToSpend: number;
  totalReceivables: number;
  overdueReceivables: number;
  upcomingObligations: number;
  operatingBuffer: number;
  actualTaxReserve: number;
  targetTaxReserve: number;
  taxShortfall: number;
  currentPeriodIncome: number;
  currentPeriodExpenses: number;
  hasActiveAccounts: boolean;
}

export type HealthRating =
  "strong" | "stable" | "needs_attention" | "vulnerable" | "insufficient_data";

export interface HealthDimension {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  description: string;
  isPositive: boolean;
}

export interface HealthReason {
  type: "positive" | "warning";
  text: string;
}

export interface SoloOSFinancialHealth {
  score: number | null; // null if insufficient data
  rating: HealthRating;
  ratingLabel: string;
  summary: string;
  dimensions: HealthDimension[];
  reasons: HealthReason[];
  isInsufficientData: boolean;
  disclaimer: string;
}

export const FINANCIAL_HEALTH_DISCLAIMER =
  "SoloOS Financial Health is a deterministic planning metric based strictly on your workspace records. It is not a credit score, commercial rating, or professional financial assessment.";

export function calculateSoloOSFinancialHealth(input: FinancialHealthInput): SoloOSFinancialHealth {
  const hasZeroActivity =
    !input.hasActiveAccounts &&
    input.liquidCash === 0 &&
    input.currentPeriodIncome === 0 &&
    input.currentPeriodExpenses === 0 &&
    input.upcomingObligations === 0 &&
    input.totalReceivables === 0;

  if (hasZeroActivity) {
    return {
      score: null,
      rating: "insufficient_data",
      ratingLabel: "Insufficient Data",
      summary:
        "Connect or add accounts and record financial activity to generate your SoloOS Financial Health indicator.",
      dimensions: [],
      reasons: [
        {
          type: "warning",
          text: "No active accounts or financial transactions recorded yet.",
        },
      ],
      isInsufficientData: true,
      disclaimer: FINANCIAL_HEALTH_DISCLAIMER,
    };
  }

  const dimensions: HealthDimension[] = [];
  const reasons: HealthReason[] = [];

  // 1. Cash Coverage (Max 20 pts)
  let cashScore = 0;
  if (input.upcomingObligations === 0) {
    cashScore = 20;
    reasons.push({
      type: "positive",
      text: "No near-term obligations scheduled against liquid cash.",
    });
  } else if (input.liquidCash >= input.upcomingObligations * 2) {
    cashScore = 20;
    reasons.push({
      type: "positive",
      text: "Liquid cash comfortably covers more than double your upcoming obligations.",
    });
  } else if (input.liquidCash >= input.upcomingObligations) {
    cashScore = 14;
    reasons.push({
      type: "positive",
      text: "Upcoming obligations are covered by current liquid cash.",
    });
  } else {
    cashScore = 4;
    reasons.push({
      type: "warning",
      text: "Upcoming obligations exceed current liquid cash balances.",
    });
  }
  dimensions.push({
    id: "cash_coverage",
    name: "Cash Coverage",
    score: cashScore,
    maxScore: 20,
    description: "Liquid cash relative to upcoming scheduled commitments.",
    isPositive: cashScore >= 14,
  });

  // 2. Receivables Health (Max 15 pts)
  let recScore = 0;
  if (input.totalReceivables === 0) {
    recScore = 15;
    reasons.push({ type: "positive", text: "No outstanding client receivables." });
  } else if (input.overdueReceivables === 0) {
    recScore = 15;
    reasons.push({
      type: "positive",
      text: "All outstanding invoices are current and not overdue.",
    });
  } else {
    const overdueRatio = input.overdueReceivables / input.totalReceivables;
    if (overdueRatio <= 0.25) {
      recScore = 10;
      reasons.push({
        type: "positive",
        text: "Overdue invoices represent less than 25% of total receivables.",
      });
    } else {
      recScore = 3;
      reasons.push({
        type: "warning",
        text: `Overdue receivables represent ${Math.round(overdueRatio * 100)}% of your unpaid invoices.`,
      });
    }
  }
  dimensions.push({
    id: "receivables_health",
    name: "Receivables Health",
    score: recScore,
    maxScore: 15,
    description: "Ratio of current versus overdue client invoices.",
    isPositive: recScore >= 10,
  });

  // 3. Obligation Coverage & Safe-to-Spend (Max 15 pts)
  let stsScore = 0;
  if (input.safeToSpend > input.operatingBuffer) {
    stsScore = 15;
    reasons.push({
      type: "positive",
      text: "Safe-to-Spend remains positive above your operating buffer.",
    });
  } else if (input.safeToSpend >= 0) {
    stsScore = 10;
    reasons.push({
      type: "positive",
      text: "Safe-to-Spend is positive after accounting for obligations and reserves.",
    });
  } else {
    stsScore = 2;
    reasons.push({
      type: "warning",
      text: "Safe-to-Spend is negative. Essential reserves exceed available liquid cash.",
    });
  }
  dimensions.push({
    id: "safe_to_spend",
    name: "Safe-to-Spend Integrity",
    score: stsScore,
    maxScore: 15,
    description: "Discretionary funds remaining after tax reserve, buffer, and commitments.",
    isPositive: stsScore >= 10,
  });

  // 4. Tax Reserve Coverage (Max 15 pts)
  let taxScore = 0;
  if (input.targetTaxReserve === 0) {
    taxScore = 15;
  } else if (input.actualTaxReserve >= input.targetTaxReserve) {
    taxScore = 15;
    reasons.push({
      type: "positive",
      text: "Tax reserve is 100% funded according to your planning rate.",
    });
  } else if (input.taxShortfall <= input.targetTaxReserve * 0.3) {
    taxScore = 9;
    reasons.push({
      type: "warning",
      text: "Tax reserve is slightly below target (under 30% shortfall).",
    });
  } else {
    taxScore = 3;
    reasons.push({
      type: "warning",
      text: "Tax reserve has a significant shortfall below the planning target.",
    });
  }
  dimensions.push({
    id: "tax_reserve",
    name: "Tax Reserve Coverage",
    score: taxScore,
    maxScore: 15,
    description: "Tracked tax reserve funds vs target planning estimate.",
    isPositive: taxScore >= 9,
  });

  // 5. Operating Profitability (Max 15 pts)
  let profitScore = 0;
  const netProfit = input.currentPeriodIncome - input.currentPeriodExpenses;
  if (input.currentPeriodIncome > 0 && netProfit >= 0) {
    profitScore = 15;
    reasons.push({
      type: "positive",
      text: "Operating cash flow is net-positive for the current period.",
    });
  } else if (input.currentPeriodIncome === 0 && input.currentPeriodExpenses === 0) {
    profitScore = 8;
  } else if (netProfit >= -input.liquidCash * 0.05) {
    profitScore = 7;
    reasons.push({
      type: "warning",
      text: "Operating cash flow is slightly negative for the current period.",
    });
  } else {
    profitScore = 2;
    reasons.push({
      type: "warning",
      text: "Operating expenses significantly exceeded income in the current period.",
    });
  }
  dimensions.push({
    id: "profitability",
    name: "Operating Cash Movement",
    score: profitScore,
    maxScore: 15,
    description: "Net cash movement (income minus expenses) in the current period.",
    isPositive: profitScore >= 8,
  });

  // 6. Profit Margin Stability (Max 10 pts)
  let marginScore = 0;
  if (input.currentPeriodIncome > 0) {
    const margin = (netProfit / input.currentPeriodIncome) * 100;
    if (margin >= 30) {
      marginScore = 10;
      reasons.push({
        type: "positive",
        text: `Healthy operating margin of ${Math.round(margin)}%.`,
      });
    } else if (margin >= 10) {
      marginScore = 7;
    } else if (margin >= 0) {
      marginScore = 4;
    } else {
      marginScore = 0;
    }
  } else {
    marginScore = 5;
  }
  dimensions.push({
    id: "margin_stability",
    name: "Margin Health",
    score: marginScore,
    maxScore: 10,
    description: "Profit margin on collected income.",
    isPositive: marginScore >= 5,
  });

  // 7. Account Reconciled / Presence (Max 10 pts)
  const accountScore = input.hasActiveAccounts ? 10 : 3;
  if (input.hasActiveAccounts) {
    reasons.push({
      type: "positive",
      text: "Active financial accounts are configured and monitored.",
    });
  } else {
    reasons.push({ type: "warning", text: "No active accounts configured." });
  }
  dimensions.push({
    id: "account_presence",
    name: "Account Setup",
    score: accountScore,
    maxScore: 10,
    description: "Verified presence of active financial accounts.",
    isPositive: accountScore >= 10,
  });

  const totalScore =
    cashScore + recScore + stsScore + taxScore + profitScore + marginScore + accountScore;

  let rating: HealthRating = "strong";
  let ratingLabel = "Strong";
  let summary =
    "Your business demonstrates healthy cash coverage, low debt risk, and funded reserves.";

  if (totalScore >= 80) {
    rating = "strong";
    ratingLabel = "Strong";
    summary =
      "Your business demonstrates robust cash coverage, positive operating movement, and well-funded reserves.";
  } else if (totalScore >= 65) {
    rating = "stable";
    ratingLabel = "Stable";
    summary =
      "Your core financial position is sound, with minor opportunities to optimize tax reserves or collections.";
  } else if (totalScore >= 45) {
    rating = "needs_attention";
    ratingLabel = "Needs Attention";
    summary =
      "Near-term commitments or reserve shortfalls warrant immediate review to preserve safety.";
  } else {
    rating = "vulnerable";
    ratingLabel = "Vulnerable";
    summary =
      "Obligations or negative Safe-to-Spend indicate heightened financial stress. Focus on collections and cash conservation.";
  }

  return {
    score: totalScore,
    rating,
    ratingLabel,
    summary,
    dimensions,
    reasons,
    isInsufficientData: false,
    disclaimer: FINANCIAL_HEALTH_DISCLAIMER,
  };
}
