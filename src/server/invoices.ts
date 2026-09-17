import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmailSafely } from "@/lib/email/send";
import { renderInvoiceEmail } from "@/lib/email/templates";
import { formatMoney } from "@/lib/money";

const sendInvoiceEmailSchema = z.object({
  workspaceId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  recipientEmail: z.string().email(),
  clientName: z.string().min(1),
  customMessage: z.string().optional(),
  authToken: z.string().optional(),
});

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
  if (!userId) {
    throw new Error("Unauthenticated: Please sign in to send invoices.");
  }
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

export const sendInvoiceEmailServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof sendInvoiceEmailSchema>) => sendInvoiceEmailSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId(data.authToken);
    await verifyWorkspaceMember(userId, data.workspaceId);

    // Fetch workspace details using admin client
    const { data: ws, error: wsErr } = await supabaseAdmin
      .from("workspaces")
      .select("id, name, currency")
      .eq("id", data.workspaceId)
      .single();
    if (wsErr || !ws) throw new Error("Workspace not found");

    // Fetch invoice details using admin client
    const { data: inv, error: invErr } = await supabaseAdmin
      .from("invoices")
      .select(
        `
        id,
        invoice_number,
        currency,
        total,
        due_date,
        payment_instructions,
        status
      `,
      )
      .eq("id", data.invoiceId)
      .eq("workspace_id", data.workspaceId)
      .single();
    if (invErr || !inv) throw new Error("Invoice not found");

    // Fetch line items using admin client
    const { data: items } = await supabaseAdmin
      .from("invoice_line_items")
      .select("description, quantity, unit_price, line_total")
      .eq("invoice_id", data.invoiceId)
      .order("sort_order", { ascending: true });

    const totalFormatted = formatMoney(inv.total, inv.currency);
    const lineItems = (items ?? []).map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unit_price),
      total: Number(i.line_total),
    }));

    const rendered = renderInvoiceEmail({
      invoiceNumber: inv.invoice_number,
      workspaceName: ws.name,
      clientName: data.clientName,
      currency: inv.currency,
      totalFormatted,
      dueDate: inv.due_date,
      items: lineItems,
      paymentNotes: data.customMessage || inv.payment_instructions,
    });

    const idempotencyKey = `inv-email-${inv.id}-${Date.now()}`;
    const result = await sendEmailSafely({
      to: data.recipientEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      idempotencyKey,
      template: "invoice_notification",
    });

    if (!result.sent) {
      let errDetail =
        result.error || "Failed to dispatch email. Please check your provider settings.";
      if (errDetail.includes("only send testing emails to your own email address")) {
        errDetail =
          "Resend Sandbox Notice: In development/test mode, emails can only be delivered to your registered Resend account address. To send to any client email, please verify your custom domain at https://resend.com/domains.";
      }
      throw new Error(errDetail);
    }

    // If invoice was in draft, transition status to sent
    if (inv.status === "draft") {
      await supabaseAdmin
        .from("invoices")
        .update({ status: "sent", updated_at: new Date().toISOString() })
        .eq("id", inv.id);
    }

    return {
      success: true,
      messageId: result.providerMessageId,
      recipient: data.recipientEmail,
    };
  });
