import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { sendEmailSafely } from "@/lib/email/send";
import { renderInvoiceEmail } from "@/lib/email/templates";
import { formatMoney } from "@/lib/money";

const sendInvoiceEmailSchema = z.object({
  workspaceId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  recipientEmail: z.string().email(),
  clientName: z.string().min(1),
  customMessage: z.string().optional(),
});

async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (data?.user) return data.user.id;
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user.id;
  throw new Error("Unauthenticated: Please sign in to send invoices.");
}

async function verifyWorkspaceMember(userId: string, workspaceId: string) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Forbidden: You are not a member of this workspace.");
  }
}

export const sendInvoiceEmailServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof sendInvoiceEmailSchema>) => sendInvoiceEmailSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await getCurrentUserId();
    await verifyWorkspaceMember(userId, data.workspaceId);

    // Fetch workspace details
    const { data: ws, error: wsErr } = await supabase
      .from("workspaces")
      .select("id, name, currency")
      .eq("id", data.workspaceId)
      .single();
    if (wsErr || !ws) throw new Error("Workspace not found");

    // Fetch invoice details
    const { data: inv, error: invErr } = await supabase
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

    // Fetch line items
    const { data: items } = await supabase
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
      throw new Error(
        result.error || "Failed to dispatch email. Please check your provider settings.",
      );
    }

    // If invoice was in draft, transition status to sent
    if (inv.status === "draft") {
      await supabase
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
