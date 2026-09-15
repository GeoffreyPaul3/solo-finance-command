import type { PlanTier, PricingCurrency } from "./pricing";

export interface InitiateCheckoutParams {
  txRef: string;
  planId: PlanTier;
  amountMajor: number;
  currency: PricingCurrency;
  customerEmail: string;
  customerName?: string | undefined;
  callbackUrl: string;
  returnUrl: string;
}

export interface InitiateCheckoutResult {
  checkoutUrl: string;
  txRef: string;
  provider: "paychangu";
}

export interface VerifyPaymentResult {
  status: "successful" | "failed" | "pending" | "mismatch";
  txRef: string;
  providerRef: string | null;
  verifiedAmountMajor?: number | undefined;
  verifiedCurrency?: string | undefined;
  rawResponse?: unknown;
  failureReason?: string | undefined;
}

export class PayChanguClient {
  private getSecretKey(): string | null {
    if (typeof process === "undefined" || !process.env) return null;
    let key = process.env["PAYCHANGU_SECRET_KEY"];
    const nodeProcess = process as unknown as { loadEnvFile?: () => void };
    if (!key && typeof nodeProcess.loadEnvFile === "function") {
      try {
        nodeProcess.loadEnvFile();
        key = process.env["PAYCHANGU_SECRET_KEY"];
      } catch {
        // Gracefully ignore if env file cannot be loaded
      }
    }
    return key || null;
  }

  isConfigured(): boolean {
    const key = this.getSecretKey();
    return Boolean(key && key.trim().length > 0);
  }

  async initiateCheckout(params: InitiateCheckoutParams): Promise<InitiateCheckoutResult> {
    const secretKey = this.getSecretKey();
    if (!secretKey) {
      throw new Error(
        "Payment provider PayChangu is not configured. Missing PAYCHANGU_SECRET_KEY in server environment.",
      );
    }

    const nameParts = (params.customerName || "Customer").trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || "User";

    const payload = {
      amount: params.amountMajor,
      currency: params.currency,
      email: params.customerEmail,
      first_name: firstName,
      last_name: lastName,
      tx_ref: params.txRef,
      callback_url: params.callbackUrl,
      return_url: params.returnUrl,
      customization: {
        title: `SoloOS ${params.planId.toUpperCase()} Subscription`,
        description: `Monthly subscription to SoloOS ${params.planId.toUpperCase()}`,
      },
    };

    const response = await fetch("https://api.paychangu.com/payment", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`PayChangu checkout error [${response.status}]: ${errorBody}`);
    }

    const data = await response.json();
    const checkoutUrl = data?.data?.checkout_url || data?.checkout_url;

    if (!checkoutUrl) {
      throw new Error(`PayChangu did not return a valid checkout URL: ${JSON.stringify(data)}`);
    }

    return {
      checkoutUrl,
      txRef: params.txRef,
      provider: "paychangu",
    };
  }

  async verifyPayment(
    txRef: string,
    expectedAmountMajor: number,
    expectedCurrency: string,
  ): Promise<VerifyPaymentResult> {
    const secretKey = this.getSecretKey();
    if (!secretKey) {
      throw new Error("Missing PAYCHANGU_SECRET_KEY in server environment.");
    }

    const response = await fetch(
      `https://api.paychangu.com/verify-payment/${encodeURIComponent(txRef)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${secretKey}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        status: "failed",
        txRef,
        providerRef: null,
        failureReason: `PayChangu verify HTTP error [${response.status}]: ${errorText}`,
      };
    }

    const json = await response.json();
    const paymentData = json.data;

    if (!paymentData) {
      return {
        status: "failed",
        txRef,
        providerRef: null,
        failureReason: "PayChangu returned empty verification data payload.",
        rawResponse: json,
      };
    }

    const providerStatus = (paymentData.status || "").toLowerCase();
    const verifiedAmount = Number(paymentData.amount);
    const verifiedCurrency = (paymentData.currency || "").toUpperCase();
    const providerRef = paymentData.reference || paymentData.tx_ref || null;

    if (providerStatus !== "success" && providerStatus !== "successful") {
      return {
        status: "failed",
        txRef,
        providerRef,
        verifiedAmountMajor: verifiedAmount,
        verifiedCurrency,
        failureReason: `Payment status is ${providerStatus}`,
        rawResponse: { status: providerStatus, ref: providerRef },
      };
    }

    // Critical Architectural Guard: Check amount and currency mismatch
    if (
      verifiedAmount !== expectedAmountMajor ||
      verifiedCurrency !== expectedCurrency.toUpperCase()
    ) {
      return {
        status: "mismatch",
        txRef,
        providerRef,
        verifiedAmountMajor: verifiedAmount,
        verifiedCurrency,
        failureReason: `Amount or currency mismatch: expected ${expectedCurrency} ${expectedAmountMajor}, received ${verifiedCurrency} ${verifiedAmount}`,
        rawResponse: { verifiedAmount, verifiedCurrency, providerRef },
      };
    }

    return {
      status: "successful",
      txRef,
      providerRef,
      verifiedAmountMajor: verifiedAmount,
      verifiedCurrency,
      rawResponse: {
        providerRef,
        status: providerStatus,
      },
    };
  }
}

export const payChangu = new PayChanguClient();
