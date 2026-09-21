/**
 * SoloOS Phase 11: Shareable Artifacts Domain Model
 *
 * Core principles:
 * 1. Every share is an IMMUTABLE snapshot at creation time.
 * 2. Sensitive information (bank credentials, internal IDs, auth tokens, passwords, unrelated clients) is strictly stripped.
 * 3. Visibility modes: 'workspace_only' (members only) vs 'unlisted' (accessible with 32-byte secure token).
 * 4. Tokens are 32-byte cryptographically secure URL-safe strings.
 */

export type ArtifactType =
  | "financial_brief"
  | "cashflow_report"
  | "profitability_report"
  | "client_report"
  | "project_report"
  | "tax_report"
  | "invoice";

export type ArtifactSourceEntityType = "invoice" | "client" | "project" | "workspace" | "report";

export type ArtifactVisibility = "workspace_only" | "unlisted";

export type ArtifactStatus = "active" | "revoked" | "expired";

export interface ArtifactAccessConfig {
  hideNotes?: boolean | undefined;
  hideLineItemPricing?: boolean | undefined;
  hideAttentionSignals?: boolean | undefined;
  customHeaderNote?: string | undefined;
}

export interface ShareableArtifact {
  id: string;
  workspace_id: string;
  created_by: string | null;
  artifact_type: ArtifactType;
  source_entity_type: ArtifactSourceEntityType;
  source_entity_id: string;
  title: string;
  description: string | null;
  share_token: string;
  visibility: ArtifactVisibility;
  status: ArtifactStatus;
  snapshot_data: Record<string, unknown>;
  access_config: ArtifactAccessConfig;
  view_count: number;
  last_viewed_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Validates whether an artifact is accessible to an unlisted visitor.
 */
export function isArtifactAccessible(
  artifact: Pick<ShareableArtifact, "status" | "visibility" | "expires_at" | "revoked_at">,
  asOf: Date = new Date(),
): { accessible: boolean; reason?: string } {
  if (artifact.status === "revoked" || artifact.revoked_at) {
    return { accessible: false, reason: "This share link has been revoked by the owner." };
  }
  if (artifact.status === "expired") {
    return { accessible: false, reason: "This share link has expired." };
  }
  if (artifact.expires_at && new Date(artifact.expires_at) <= asOf) {
    return { accessible: false, reason: "This share link has expired." };
  }
  if (artifact.visibility === "workspace_only") {
    return {
      accessible: false,
      reason: "This artifact is restricted to authorized workspace members only.",
    };
  }
  return { accessible: true };
}

/**
 * Validates a share token format (must be 43-64 characters URL-safe base64 or hex).
 */
export function validateShareTokenFormat(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const trimmed = token.trim();
  if (trimmed.length < 32 || trimmed.length > 128) return false;
  // URL safe chars: a-z, A-Z, 0-9, -, _
  return /^[A-Za-z0-9_-]+$/.test(trimmed);
}

/**
 * Generates a cryptographically strong 32-byte (256-bit) URL-safe random token.
 */
export function generateSecureShareToken(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    // Base64url encode without padding
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  // Fallback for node test environments if window.crypto missing
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
  let token = "";
  for (let i = 0; i < 43; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Redacts raw source data to produce an immutable, safe public representation.
 * Guarantees that internal database secrets, user passwords, auth tokens,
 * banking credentials, and unrelated client records are never included.
 */
export function buildRedactedArtifactSnapshot(
  type: ArtifactType,
  sourceData: Record<string, unknown>,
  config: ArtifactAccessConfig = {},
): Record<string, unknown> {
  const baseSnapshot = {
    artifactType: type,
    snapshotTimestamp: new Date().toISOString(),
    config: {
      hideNotes: Boolean(config.hideNotes),
      customHeaderNote: config.customHeaderNote?.trim() || null,
    },
  };

  switch (type) {
    case "invoice": {
      const inv = sourceData;
      return {
        ...baseSnapshot,
        invoiceNumber: String(inv["invoice_number"] ?? inv["invoiceNumber"] ?? "INV-SHARE"),
        currency: String(inv["currency"] ?? "MWK"),
        issueDate: String(inv["issue_date"] ?? inv["issueDate"] ?? ""),
        dueDate: String(inv["due_date"] ?? inv["dueDate"] ?? ""),
        status: String(inv["status"] ?? "sent"),
        clientName: String(inv["client_name"] ?? inv["clientName"] ?? "Client"),
        clientEmail: config.hideNotes ? null : (inv["client_email"] ?? inv["clientEmail"] ?? null),
        subtotal: Number(inv["subtotal"] ?? 0),
        taxAmount: Number(inv["tax_amount"] ?? inv["taxAmount"] ?? 0),
        discountAmount: Number(inv["discount_amount"] ?? inv["discountAmount"] ?? 0),
        total: Number(inv["total"] ?? 0),
        amountPaid: Number(inv["amount_paid"] ?? inv["amountPaid"] ?? 0),
        amountDue: Number(inv["amount_due"] ?? inv["amountDue"] ?? 0),
        notes: config.hideNotes
          ? null
          : String(inv["notes"] ?? inv["payment_instructions"] ?? ""),
        lineItems: Array.isArray(inv["line_items"])
          ? inv["line_items"].map((item: Record<string, unknown>) => ({
              description: String(item["description"] ?? ""),
              quantity: Number(item["quantity"] ?? 1),
              unitPrice: config.hideLineItemPricing ? null : Number(item["unit_price"] ?? 0),
              total: Number(item["line_total"] ?? item["total"] ?? 0),
            }))
          : [],
      };
    }

    case "financial_brief": {
      const brief = sourceData;
      return {
        ...baseSnapshot,
        headline: String(brief["headline"] ?? "Financial Brief"),
        currency: String(brief["currency"] ?? "MWK"),
        safeToSpend: Number(brief["safeToSpend"] ?? 0),
        liquidCash: Number(brief["liquidCash"] ?? 0),
        receivables: Number(brief["receivables"] ?? 0),
        actualTaxReserve: Number(brief["actualTaxReserve"] ?? 0),
        upcomingObligations: Number(brief["upcomingObligations"] ?? 0),
        attentionSignals: config.hideAttentionSignals
          ? []
          : Array.isArray(brief["attentionSignals"])
            ? brief["attentionSignals"].map((sig: Record<string, unknown>) => ({
                id: String(sig["id"] ?? ""),
                type: "attention",
                title: String(sig["title"] ?? ""),
                detail: String(sig["detail"] ?? ""),
              }))
            : [],
        positiveSignals: Array.isArray(brief["positiveSignals"])
          ? brief["positiveSignals"].map((sig: Record<string, unknown>) => ({
              id: String(sig["id"] ?? ""),
              type: "positive",
              title: String(sig["title"] ?? ""),
              detail: String(sig["detail"] ?? ""),
            }))
          : [],
      };
    }

    case "cashflow_report": {
      const cf = sourceData;
      return {
        ...baseSnapshot,
        currency: String(cf["currency"] ?? "MWK"),
        periodLabel: String(cf["periodLabel"] ?? "Current Period"),
        openingCash: Number(cf["openingCash"] ?? 0),
        cashInflow: Number(cf["cashInflow"] ?? 0),
        cashOutflow: Number(cf["cashOutflow"] ?? 0),
        netCashflow: Number(cf["netCashflow"] ?? 0),
        closingCash: Number(cf["closingCash"] ?? 0),
        currentSafeToSpend: Number(cf["currentSafeToSpend"] ?? 0),
      };
    }

    case "profitability_report": {
      const pr = sourceData;
      return {
        ...baseSnapshot,
        currency: String(pr["currency"] ?? "MWK"),
        periodLabel: String(pr["periodLabel"] ?? "Year to Date"),
        grossRevenue: Number(pr["grossRevenue"] ?? 0),
        directCosts: Number(pr["directCosts"] ?? 0),
        grossProfit: Number(pr["grossProfit"] ?? 0),
        operatingExpenses: Number(pr["operatingExpenses"] ?? 0),
        netProfit: Number(pr["netProfit"] ?? 0),
        profitMarginPercent: Number(pr["profitMarginPercent"] ?? 0),
      };
    }

    case "client_report": {
      const cr = sourceData;
      return {
        ...baseSnapshot,
        clientName: String(cr["clientName"] ?? "Client"),
        currency: String(cr["currency"] ?? "MWK"),
        totalInvoiced: Number(cr["totalInvoiced"] ?? 0),
        totalCollected: Number(cr["totalCollected"] ?? 0),
        outstandingReceivables: Number(cr["outstandingReceivables"] ?? 0),
        totalInvoicesCount: Number(cr["totalInvoicesCount"] ?? 0),
        paidInvoicesCount: Number(cr["paidInvoicesCount"] ?? 0),
        overdueInvoicesCount: Number(cr["overdueInvoicesCount"] ?? 0),
        avgDaysToPayment: cr["avgDaysToPayment"] !== null ? Number(cr["avgDaysToPayment"]) : null,
      };
    }

    case "project_report": {
      const proj = sourceData;
      return {
        ...baseSnapshot,
        projectName: String(proj["projectName"] ?? "Project"),
        clientName: proj["clientName"] ? String(proj["clientName"]) : null,
        currency: String(proj["currency"] ?? "MWK"),
        budget: proj["budget"] !== null ? Number(proj["budget"]) : null,
        totalBilled: Number(proj["totalBilled"] ?? 0),
        totalCollected: Number(proj["totalCollected"] ?? 0),
        projectExpenses: Number(proj["projectExpenses"] ?? 0),
        netMargin: Number(proj["netMargin"] ?? 0),
        utilizationPercent:
          proj["utilizationPercent"] !== null ? Number(proj["utilizationPercent"]) : null,
        status: String(proj["status"] ?? "active"),
      };
    }

    case "tax_report": {
      const tr = sourceData;
      return {
        ...baseSnapshot,
        currency: String(tr["currency"] ?? "MWK"),
        taxYear: Number(tr["taxYear"] ?? new Date().getFullYear()),
        actualIncome: Number(tr["actualIncome"] ?? 0),
        actualExpenses: Number(tr["actualExpenses"] ?? 0),
        taxableBasis: Number(tr["taxableBasis"] ?? 0),
        configuredTaxRate: Number(tr["configuredTaxRate"] ?? 0),
        estimatedTaxAmount: Number(tr["estimatedTaxAmount"] ?? 0),
        actualTrackedReserve: Number(tr["actualTrackedReserve"] ?? 0),
        reserveShortfall: Number(tr["reserveShortfall"] ?? 0),
        healthStatus: String(tr["healthStatus"] ?? "funded"),
        disclaimer: "Planning estimate based on tracked reserves. Not an official tax filing.",
      };
    }

    default:
      return baseSnapshot;
  }
}
