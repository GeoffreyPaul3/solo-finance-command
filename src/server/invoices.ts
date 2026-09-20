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

const sendInvoiceReminderEmailSchema = z.object({
  workspaceId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  recipientEmail: z.string().email(),
  clientName: z.string().min(1),
  customMessage: z.string().optional(),
  reminderType: z.enum(["upcoming", "due", "overdue", "escalation", "standard"]).optional(),
  authToken: z.string().optional(),
});

export const sendInvoiceReminderEmailServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof sendInvoiceReminderEmailSchema>) =>
    sendInvoiceReminderEmailSchema.parse(data),
  )
  .handler(async ({ data }) => {
    // 1. Authenticate caller
    const userId = await getAuthenticatedUserId(data.authToken);
    await verifyWorkspaceMember(userId, data.workspaceId);

    // 2. Fetch workspace details
    const { data: ws, error: wsErr } = await supabaseAdmin
      .from("workspaces")
      .select("id, name, currency")
      .eq("id", data.workspaceId)
      .single();
    if (wsErr || !ws) throw new Error("Workspace not found");

    // 3. Fetch authoritative invoice details
    const { data: inv, error: invErr } = await supabaseAdmin
      .from("invoices")
      .select(
        `
        id,
        invoice_number,
        currency,
        total,
        amount_due,
        amount_paid,
        due_date,
        payment_instructions,
        status
      `,
      )
      .eq("id", data.invoiceId)
      .eq("workspace_id", data.workspaceId)
      .single();
    if (invErr || !inv) throw new Error("Invoice not found in this workspace");

    // 4. Verify eligibility
    if (inv.status === "draft") {
      throw new Error(
        "Cannot send a reminder for a draft invoice. Please issue the invoice first.",
      );
    }
    if (inv.status === "cancelled") {
      throw new Error("Cannot send a reminder for a cancelled invoice.");
    }
    if (inv.status === "paid" || Number(inv.amount_due) <= 0) {
      throw new Error("This invoice is already settled in full. No payment is due.");
    }

    // 5. 24-hour duplicate send throttle check
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentReminders } = await supabaseAdmin
      .from("invoice_reminders")
      .select("id, sent_at")
      .eq("invoice_id", data.invoiceId)
      .gte("sent_at", twentyFourHoursAgo)
      .limit(1);

    if (recentReminders && recentReminders.length > 0) {
      throw new Error(
        "A reminder was already sent for this invoice in the last 24 hours. To prevent accidental duplicates, please wait before sending another notice.",
      );
    }

    // 6. Calculate days overdue
    const today = new Date().toISOString().slice(0, 10);
    const todayMs = new Date(today).getTime();
    const dueMs = new Date(inv.due_date).getTime();
    const daysOverdue = Math.round((todayMs - dueMs) / (24 * 60 * 60 * 1000));

    const amountDueFormatted = formatMoney(inv.amount_due, inv.currency);

    // Import template dynamically or use standard
    const { renderInvoiceReminderEmail } = await import("@/lib/email/templates");
    const rendered = renderInvoiceReminderEmail({
      invoiceNumber: inv.invoice_number,
      workspaceName: ws.name,
      clientName: data.clientName,
      currency: inv.currency,
      amountDueFormatted,
      dueDate: inv.due_date,
      daysOverdue,
      customMessage: data.customMessage,
      paymentInstructions: inv.payment_instructions,
      reminderType: data.reminderType,
    });

    const idempotencyKey = `inv-reminder-${inv.id}-${Date.now()}`;
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
        result.error ||
        "Failed to dispatch reminder email. Please check your email provider configuration.";
      if (errDetail.includes("only send testing emails to your own email address")) {
        errDetail =
          "Resend Sandbox Notice: In test mode, emails can only be delivered to your registered Resend account address. To send to client emails, please verify your custom domain in Resend.";
      }
      throw new Error(errDetail);
    }

    // 7. Record reminder audit trail in invoice_reminders
    await supabaseAdmin.from("invoice_reminders").insert({
      workspace_id: data.workspaceId,
      invoice_id: data.invoiceId,
      sent_by: userId,
      recipient_email: data.recipientEmail,
      reminder_type:
        data.reminderType ||
        (daysOverdue > 14 ? "escalation" : daysOverdue > 0 ? "overdue" : "due"),
      subject: rendered.subject,
      message_body: data.customMessage || null,
      provider_message_id: result.providerMessageId || null,
      status: "sent",
    });

    // 8. Write workspace audit log
    await supabaseAdmin.rpc("write_audit_log", {
      _workspace_id: data.workspaceId,
      _action: "invoice.reminder_sent",
      _entity_type: "invoice",
      _entity_id: data.invoiceId,
      _metadata: {
        invoice_number: inv.invoice_number,
        recipient_email: data.recipientEmail,
        amount_due: inv.amount_due,
        days_overdue: daysOverdue,
      } as never,
    });

    return {
      success: true,
      messageId: result.providerMessageId,
      recipient: data.recipientEmail,
    };
  });
