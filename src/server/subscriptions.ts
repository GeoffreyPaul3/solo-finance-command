import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmailSafely } from "@/lib/email/send";
import { renderSubscriptionEmail } from "@/lib/email/templates";
import { payChangu } from "@/lib/payments/paychangu";
import { CANONICAL_PRICES, type PlanTier, type PricingCurrency } from "@/lib/payments/pricing";

const createCheckoutSchema = z.object({
  workspaceId: z.string().uuid(),
  planId: z.enum(["solo", "pro"]),
  currency: z.enum(["MWK", "USD"]),
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  returnUrl: z.string().url(),
  callbackUrl: z.string().url().optional(),
  authToken: z.string().optional(),
});

function ensureNodeEnvLoaded() {
  const nodeProcess = (typeof process !== "undefined" ? process : undefined) as unknown as {
    loadEnvFile?: () => void;
  };
  if (nodeProcess && typeof nodeProcess.loadEnvFile === "function") {
    try {
      nodeProcess.loadEnvFile();
    } catch {
      // Ignore if .env is already loaded or absent
    }
  }
}

async function getAuthenticatedUserId(authToken?: string): Promise<string | null> {
  if (authToken) {
    try {
      const { data } = await supabaseAdmin.auth.getUser(authToken);
      if (data?.user) return data.user.id;
    } catch {
      // Ignore invalid auth token errors
    }
  }
  const { data } = await supabase.auth.getUser();
  if (data?.user) return data.user.id;
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user.id;
  return null;
}

async function verifyWorkspaceMember(userId: string | null, workspaceId: string) {
  if (!userId) return;
  const { data, error } = await supabaseAdmin
    .from("workspace_members")
    .select("role")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Forbidden: You are not an authorized member of this workspace.");
  }
}

export const createCheckoutServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof createCheckoutSchema>) => createCheckoutSchema.parse(data))
  .handler(async ({ data }) => {
    ensureNodeEnvLoaded();

    const userId = await getAuthenticatedUserId(data.authToken);
    await verifyWorkspaceMember(userId, data.workspaceId);

    const priceInfo = CANONICAL_PRICES[data.planId][data.currency];
    if (!priceInfo) {
      throw new Error(`Invalid plan or currency selection: ${data.planId} in ${data.currency}`);
    }

    // Generate unique internal transaction reference
    const txRef = `so_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Architectural Rule #4: Create internal pending payment record BEFORE PayChangu
    // Uses admin client to bypass RLS — this is a trusted server-side operation.
    const { error: insertErr } = await supabaseAdmin.from("subscription_payments").insert({
      workspace_id: data.workspaceId,
      plan_id: data.planId,
      tx_ref: txRef,
      provider: "paychangu",
      expected_amount_cents: priceInfo.amountCents,
      expected_currency: data.currency,
      status: "pending",
      metadata: {
        customer_email: data.customerEmail,
        customer_name: data.customerName,
      },
    });

    if (insertErr) {
      console.error("[Checkout] Failed to initialize payment record:", insertErr);
      throw new Error(
        "We couldn't start checkout. Your payment was not started. Please try again.",
      );
    }

    if (!payChangu.isConfigured()) {
      return {
        configured: false,
        checkoutUrl: null,
        txRef,
        message:
          "PayChangu credentials are not configured in server environment. Test simulation reference created.",
      };
    }

    try {
      const checkout = await payChangu.initiateCheckout({
        txRef,
        planId: data.planId,
        amountMajor: priceInfo.amountMajor,
        currency: data.currency,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        returnUrl: data.returnUrl,
        callbackUrl: data.callbackUrl || data.returnUrl,
      });

      return {
        configured: true,
        checkoutUrl: checkout.checkoutUrl,
        txRef,
      };
    } catch (err: unknown) {
      console.error("[Checkout] PayChangu initiation failure:", err);
      // Mark internal payment record as failed so there is no stale pending attempt
      await supabaseAdmin
        .from("subscription_payments")
        .update({
          status: "failed",
          failure_reason: err instanceof Error ? err.message : String(err),
        })
        .eq("tx_ref", txRef);

      throw new Error(
        "We couldn't start checkout with the payment provider. Your payment was not started. Please try again.",
      );
    }
  });

const verifyPaymentSchema = z.object({
  txRef: z.string().min(1),
  workspaceId: z.string().uuid(),
  authToken: z.string().optional(),
});

export const verifyPaymentServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof verifyPaymentSchema>) => verifyPaymentSchema.parse(data))
  .handler(async ({ data }) => {
    // Security Rule #1: Verify caller is authenticated and a workspace member
    const userId = await getAuthenticatedUserId(data.authToken);
    await verifyWorkspaceMember(userId, data.workspaceId);

    // 1. Fetch internal pending payment record
    const { data: payment, error: fetchErr } = await supabaseAdmin
      .from("subscription_payments")
      .select("*")
      .eq("tx_ref", data.txRef)
      .maybeSingle();

    if (fetchErr || !payment) {
      throw new Error(`Payment attempt with reference ${data.txRef} not found.`);
    }

    // Idempotency: If already verified as successful, return existing status
    if (payment.status === "successful") {
      return {
        status: "successful",
        alreadyVerified: true,
        planId: payment.plan_id,
      };
    }

    const expectedMajor = Number(payment.expected_amount_cents) / 100;
    const expectedCur = payment.expected_currency;

    // If PayChangu is not configured in this environment (e.g. dev/test mode without API key)
    if (!payChangu.isConfigured()) {
      // In unconfigured mode, don't fake success — record honest status
      return {
        status: "unconfigured",
        message: "PAYCHANGU_SECRET_KEY is not configured on the server.",
      };
    }

    // 2. Query PayChangu verification endpoint
    const verification = await payChangu.verifyPayment(data.txRef, expectedMajor, expectedCur);

    if (verification.status === "successful") {
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30-day period

      // 3. Atomically activate subscription
      const { data: subData, error: subErr } = await supabaseAdmin
        .from("subscriptions")
        .upsert(
          {
            workspace_id: data.workspaceId,
            plan_id: payment.plan_id,
            status: "active",
            currency: expectedCur,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            cancel_at_period_end: false,
            canceled_at: null,
          },
          { onConflict: "workspace_id" },
        )
        .select("id")
        .single();

      if (subErr) {
        throw new Error(`Failed to activate subscription: ${subErr.message}`);
      }

      // Update payment record with verification details
      await supabaseAdmin
        .from("subscription_payments")
        .update({
          status: "successful",
          subscription_id: subData.id,
          verified_amount_cents: (verification.verifiedAmountMajor ?? expectedMajor) * 100,
          verified_currency: verification.verifiedCurrency || expectedCur,
          verified_at: now.toISOString(),
          provider_ref: verification.providerRef,
        })
        .eq("id", payment.id);

      // Update workspace plan column
      await supabaseAdmin
        .from("workspaces")
        .update({ plan: payment.plan_id })
        .eq("id", data.workspaceId);

      // 4. Send subscription confirmation email (safe, failures don't block success)
      const { data: ws } = await supabaseAdmin
        .from("workspaces")
        .select("name")
        .eq("id", data.workspaceId)
        .maybeSingle();

      const customerEmail =
        typeof payment.metadata === "object" && payment.metadata !== null
          ? (payment.metadata as Record<string, string>)["customer_email"]
          : undefined;

      if (customerEmail) {
        const formattedAmount = `${expectedCur} ${expectedMajor.toLocaleString()}`;
        const template = renderSubscriptionEmail({
          workspaceName: ws?.name || "Your Workspace",
          planName: payment.plan_id.toUpperCase(),
          amountFormatted: formattedAmount,
          currentPeriodEnd: periodEnd.toLocaleDateString(),
        });

        await sendEmailSafely({
          to: customerEmail,
          subject: template.subject,
          html: template.html,
          text: template.text,
          idempotencyKey: `sub_welcome_${payment.id}`,
          template: "subscription_activated",
        });
      }

      return {
        status: "successful",
        planId: payment.plan_id,
      };
    }

    // If mismatch or failure
    await supabaseAdmin
      .from("subscription_payments")
      .update({
        status: verification.status === "mismatch" ? "mismatch" : "failed",
        failure_reason: verification.failureReason || "Payment verification failed",
        verified_amount_cents: verification.verifiedAmountMajor
          ? verification.verifiedAmountMajor * 100
          : null,
        verified_currency: verification.verifiedCurrency || null,
        provider_ref: verification.providerRef,
      })
      .eq("id", payment.id);

    return {
      status: verification.status,
      failureReason: verification.failureReason,
    };
  });

const cancelSubscriptionSchema = z.object({
  workspaceId: z.string().uuid(),
  authToken: z.string().optional(),
});

export const cancelSubscriptionServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof cancelSubscriptionSchema>) =>
    cancelSubscriptionSchema.parse(data),
  )
  .handler(async ({ data }) => {
    // Security Rule #1: Verify caller is authenticated and a workspace member (owner/admin)
    const userId = await getAuthenticatedUserId(data.authToken);
    await verifyWorkspaceMember(userId, data.workspaceId);

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
      })
      .eq("workspace_id", data.workspaceId);

    if (error) throw new Error(error.message);
    return { success: true };
  });
