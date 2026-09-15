import { supabase } from "@/integrations/supabase/client";
import { getEmailProvider, type SendEmailOptions } from "./provider";

export interface SendIdempotentEmailParams extends SendEmailOptions {
  idempotencyKey: string;
  template: string;
}

export interface SendEmailSafelyResult {
  sent: boolean;
  suppressed?: boolean | undefined;
  error?: string | undefined;
  providerMessageId?: string | undefined;
}

export async function sendEmailSafely(
  params: SendIdempotentEmailParams,
): Promise<SendEmailSafelyResult> {
  // Check if this idempotency key has already succeeded
  try {
    const { data: existing } = await supabase
      .from("email_events")
      .select("*")
      .eq("idempotency_key", params.idempotencyKey)
      .maybeSingle();

    if (existing && existing.status === "sent") {
      return {
        sent: true,
        providerMessageId: existing.provider_message_id || undefined,
      };
    }
  } catch (err) {
    console.warn("Could not check email idempotency table:", err);
  }

  const provider = getEmailProvider();
  const recipient = Array.isArray(params.to) ? params.to.join(", ") : params.to;

  const result = await provider.sendEmail(params);

  // Safely record event to DB — never let this throw or bubble up as a fatal error
  try {
    await supabase.from("email_events").upsert(
      {
        recipient,
        template: params.template,
        idempotency_key: params.idempotencyKey,
        status: result.success ? "sent" : result.suppressed ? "suppressed" : "failed",
        provider_message_id: result.messageId || null,
        error_message: result.error || null,
      },
      { onConflict: "idempotency_key" },
    );
  } catch (dbErr) {
    console.error("Failed to log email event to database:", dbErr);
  }

  return {
    sent: result.success,
    suppressed: result.suppressed,
    error: result.error,
    providerMessageId: result.messageId,
  };
}
