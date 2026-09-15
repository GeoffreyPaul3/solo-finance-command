import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { sendEmailSafely } from "@/lib/email/send";
import { renderSupportConfirmationEmail } from "@/lib/email/templates";

const supportRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("A valid email is required"),
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  category: z.enum(["general", "billing", "technical", "feature_request"]).default("general"),
  workspaceId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});

export const submitSupportRequestServerFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof supportRequestSchema>) => supportRequestSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: request, error } = await supabase
      .from("support_requests")
      .insert({
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        subject: data.subject.trim(),
        message: data.message.trim(),
        category: data.category,
        workspace_id: data.workspaceId || null,
        user_id: data.userId || null,
        status: "open",
      })
      .select("id")
      .single();

    if (error || !request) {
      throw new Error(`Failed to submit support request: ${error?.message || "Unknown error"}`);
    }

    // Send confirmation email
    const template = renderSupportConfirmationEmail({
      ticketId: request.id,
      name: data.name,
      subject: data.subject,
    });

    await sendEmailSafely({
      to: data.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      idempotencyKey: `support_confirm_${request.id}`,
      template: "support_received",
    });

    return {
      success: true,
      ticketId: request.id,
    };
  });
