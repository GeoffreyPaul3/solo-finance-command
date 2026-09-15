export function renderInvitationEmail(params: {
  workspaceName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `You have been invited to join ${params.workspaceName} on SoloOS`;
  const text = `You've been invited by ${params.inviterName} to join "${params.workspaceName}" as a ${params.role}.\n\nClick the link below to accept your invitation:\n${params.inviteUrl}\n\nThis invitation link expires in 7 days.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #09090b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;">
      <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Workspace Invitation</h2>
      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.5;">
        <strong style="color: #fafafa;">${params.inviterName}</strong> has invited you to collaborate on <strong style="color: #fafafa;">${params.workspaceName}</strong> as <strong>${params.role}</strong>.
      </p>
      <div style="margin: 32px 0;">
        <a href="${params.inviteUrl}" style="background-color: #3b82f6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
          Accept Invitation
        </a>
      </div>
      <p style="color: #71717a; font-size: 13px; line-height: 1.4;">
        If the button above does not work, copy and paste this link into your browser:<br/>
        <a href="${params.inviteUrl}" style="color: #60a5fa; word-break: break-all;">${params.inviteUrl}</a>
      </p>
      <p style="color: #52525b; font-size: 12px; margin-top: 24px; border-top: 1px solid #27272a; padding-top: 16px;">
        This invitation is valid for 7 days. No temporary passwords were generated.
      </p>
    </div>
  `;
  return { subject, html, text };
}

export function renderSubscriptionEmail(params: {
  workspaceName: string;
  planName: string;
  amountFormatted: string;
  currentPeriodEnd: string;
}): { subject: string; html: string; text: string } {
  const subject = `Your SoloOS ${params.planName} subscription is active`;
  const text = `Your subscription to SoloOS ${params.planName} for "${params.workspaceName}" has been successfully verified and activated.\n\nAmount: ${params.amountFormatted}\nValid Until: ${params.currentPeriodEnd}\n\nLog in anytime to view your billing details and receipts.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #09090b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;">
      <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Subscription Activated</h2>
      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.5;">
        Your workspace <strong style="color: #fafafa;">${params.workspaceName}</strong> is now powered by <strong style="color: #10b981;">SoloOS ${params.planName}</strong>.
      </p>
      <div style="background: #18181b; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #27272a;">
        <p style="margin: 4px 0; color: #d4d4d8; font-size: 14px;"><strong>Plan:</strong> SoloOS ${params.planName}</p>
        <p style="margin: 4px 0; color: #d4d4d8; font-size: 14px;"><strong>Amount:</strong> ${params.amountFormatted}</p>
        <p style="margin: 4px 0; color: #d4d4d8; font-size: 14px;"><strong>Next Renewal:</strong> ${params.currentPeriodEnd}</p>
      </div>
      <p style="color: #71717a; font-size: 13px;">
        Thank you for trusting SoloOS to run your finances.
      </p>
    </div>
  `;
  return { subject, html, text };
}

export function renderSupportConfirmationEmail(params: {
  ticketId: string;
  name: string;
  subject: string;
}): { subject: string; html: string; text: string } {
  const subject = `[SoloOS Support #${params.ticketId.slice(0, 8)}] We received your request: ${params.subject}`;
  const text = `Hi ${params.name},\n\nWe have received your support request regarding "${params.subject}".\nOur team will review your inquiry and get back to you shortly.\n\nTicket Reference: ${params.ticketId}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #09090b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;">
      <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Support Request Received</h2>
      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.5;">
        Hi ${params.name}, we received your message regarding:
      </p>
      <blockquote style="border-left: 3px solid #3b82f6; margin: 16px 0; padding-left: 12px; color: #d4d4d8; font-style: italic;">
        ${params.subject}
      </blockquote>
      <p style="color: #71717a; font-size: 13px;">
        Ticket ID: <code>${params.ticketId}</code>
      </p>
      <p style="color: #71717a; font-size: 13px; line-height: 1.4;">
        Our team reviews requests rapidly and will respond via this email thread.
      </p>
    </div>
  `;
  return { subject, html, text };
}
