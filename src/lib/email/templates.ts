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

export function renderInvoiceEmail(params: {
  invoiceNumber: string;
  workspaceName: string;
  clientName: string;
  currency: string;
  totalFormatted: string;
  dueDate?: string | null;
  items?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  paymentNotes?: string | null;
}): { subject: string; html: string; text: string } {
  const subject = `Invoice ${params.invoiceNumber} from ${params.workspaceName}`;
  const dueLine = params.dueDate ? `Due date: ${params.dueDate}` : "";
  const itemsText = (params.items ?? [])
    .map((i) => `  - ${i.description}: ${params.currency} ${i.total.toLocaleString()}`)
    .join("\n");
  const text = `Hi ${params.clientName},\n\nPlease find attached Invoice ${params.invoiceNumber} from ${params.workspaceName}.\n\nTotal Due: ${params.totalFormatted}\n${dueLine}\n\n${itemsText ? `Items:\n${itemsText}\n\n` : ""}${params.paymentNotes ? `Payment Instructions:\n${params.paymentNotes}\n\n` : ""}Thank you for your business.\n${params.workspaceName}`;

  const itemsHtml = (params.items ?? [])
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #27272a; color: #d4d4d8; font-size: 14px;">${item.description}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #27272a; color: #a1a1aa; text-align: center; font-size: 14px;">${item.quantity}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #27272a; color: #a1a1aa; text-align: right; font-size: 14px;">${item.unitPrice.toLocaleString()}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #27272a; color: #fafafa; text-align: right; font-weight: 500; font-size: 14px;">${item.total.toLocaleString()}</td>
      </tr>
    `,
    )
    .join("");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #09090b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 24px; border-bottom: 1px solid #27272a; padding-bottom: 16px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 22px;">Invoice ${params.invoiceNumber}</h2>
        <span style="color: #a1a1aa; font-size: 14px;">${params.workspaceName}</span>
      </div>

      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.5;">
        Dear <strong style="color: #fafafa;">${params.clientName}</strong>,
      </p>
      <p style="color: #a1a1aa; font-size: 14px; line-height: 1.5;">
        Please find your invoice details below. ${dueLine ? `Payment is due on <strong style="color: #fafafa;">${params.dueDate}</strong>.` : ""}
      </p>

      <div style="background: #18181b; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #27272a; text-align: center;">
        <span style="color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">Total Due</span>
        <h1 style="color: #ffffff; margin: 6px 0 0; font-size: 28px; font-weight: 700;">${params.totalFormatted}</h1>
      </div>

      ${
        itemsHtml
          ? `
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        <thead>
          <tr style="border-bottom: 1px solid #3f3f46;">
            <th style="padding: 8px 12px; text-align: left; color: #71717a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Description</th>
            <th style="padding: 8px 12px; text-align: center; color: #71717a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Qty</th>
            <th style="padding: 8px 12px; text-align: right; color: #71717a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Rate</th>
            <th style="padding: 8px 12px; text-align: right; color: #71717a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      `
          : ""
      }

      ${
        params.paymentNotes
          ? `
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #27272a;">
        <h4 style="color: #a1a1aa; margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Payment Instructions</h4>
        <p style="color: #d4d4d8; font-size: 13px; line-height: 1.5; margin: 0; white-space: pre-wrap;">${params.paymentNotes}</p>
      </div>
      `
          : ""
      }

      <div style="margin-top: 32px; border-top: 1px solid #27272a; padding-top: 16px; text-align: center;">
        <p style="color: #52525b; font-size: 12px; margin: 0;">
          Sent by ${params.workspaceName} via SoloOS Financial OS.
        </p>
      </div>
    </div>
  `;

  return { subject, html, text };
}

export function renderInvoiceReminderEmail(params: {
  invoiceNumber: string;
  workspaceName: string;
  clientName: string;
  currency: string;
  amountDueFormatted: string;
  dueDate: string;
  daysOverdue: number;
  customMessage?: string | null | undefined;
  paymentInstructions?: string | null | undefined;
  reminderType?: "upcoming" | "due" | "overdue" | "escalation" | "standard" | undefined;
}): { subject: string; html: string; text: string } {
  const isOverdue = params.daysOverdue > 0;
  let subjectPrefix = "Payment Reminder";
  if (params.reminderType === "escalation" || params.daysOverdue > 14) {
    subjectPrefix = "Urgent: Overdue Payment Notice";
  } else if (isOverdue) {
    subjectPrefix = "Overdue Invoice Notice";
  } else if (params.daysOverdue === 0) {
    subjectPrefix = "Payment Due Today";
  } else {
    subjectPrefix = "Upcoming Payment Reminder";
  }

  const subject = `${subjectPrefix}: Invoice ${params.invoiceNumber} (${params.amountDueFormatted}) from ${params.workspaceName}`;

  const defaultMessage = isOverdue
    ? `This is a reminder that invoice ${params.invoiceNumber} for ${params.amountDueFormatted} was due on ${params.dueDate} and is currently ${params.daysOverdue} ${params.daysOverdue === 1 ? "day" : "days"} overdue. We kindly request settlement at your earliest convenience.`
    : `This is a friendly reminder that invoice ${params.invoiceNumber} for ${params.amountDueFormatted} is due on ${params.dueDate}.`;

  const messageText =
    params.customMessage && params.customMessage.trim().length > 0
      ? params.customMessage.trim()
      : defaultMessage;

  const text = `Dear ${params.clientName},\n\n${messageText}\n\nInvoice: ${params.invoiceNumber}\nAmount Due: ${params.amountDueFormatted}\nDue Date: ${params.dueDate}\n\n${params.paymentInstructions ? `Payment Instructions:\n${params.paymentInstructions}\n\n` : ""}Sent by ${params.workspaceName} via SoloOS.`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #09090b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 24px; border-bottom: 1px solid #27272a; padding-bottom: 16px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 22px;">Invoice Reminder</h2>
        <span style="color: #a1a1aa; font-size: 14px;">${params.workspaceName}</span>
      </div>

      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.5;">
        Dear <strong style="color: #fafafa;">${params.clientName}</strong>,
      </p>

      <p style="color: #d4d4d8; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
        ${messageText}
      </p>

      <div style="background: #18181b; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #27272a;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #a1a1aa;">
          <span>Invoice Number:</span>
          <strong style="color: #fafafa;">${params.invoiceNumber}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #a1a1aa;">
          <span>Due Date:</span>
          <strong style="color: ${isOverdue ? "#f87171" : "#fafafa"};">${params.dueDate} ${isOverdue ? `(${params.daysOverdue}d overdue)` : ""}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid #27272a; font-size: 15px;">
          <span style="color: #fafafa; font-weight: 600;">Amount Due:</span>
          <strong style="color: #10b981; font-size: 18px;">${params.amountDueFormatted}</strong>
        </div>
      </div>

      ${
        params.paymentInstructions
          ? `
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #27272a;">
        <h4 style="color: #a1a1aa; margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Payment Instructions</h4>
        <p style="color: #d4d4d8; font-size: 13px; line-height: 1.5; margin: 0; white-space: pre-wrap;">${params.paymentInstructions}</p>
      </div>
      `
          : ""
      }

      <div style="margin-top: 32px; border-top: 1px solid #27272a; padding-top: 16px; text-align: center;">
        <p style="color: #52525b; font-size: 12px; margin: 0;">
          Sent by ${params.workspaceName} via SoloOS Financial OS.
        </p>
      </div>
    </div>
  `;

  return { subject, html, text };
}

export function renderCreatorApplicationSubmittedEmail(params: {
  displayName: string;
  publicHandle: string;
}): { subject: string; html: string; text: string } {
  const subject = `SoloOS Creator Application Received: @${params.publicHandle}`;
  const text = `Hi ${params.displayName},\n\nThank you for applying to the SoloOS Creator Program! We've received your application for @${params.publicHandle}.\n\nOur team reviews all creator applications within 2-3 business days. Once approved, you'll receive your unique referral link, campaign tracking dashboard, and access to partner resources.\n\nBest regards,\nThe SoloOS Team`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #09090b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;">
      <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Application Received</h2>
      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.5;">
        Hi <strong style="color: #fafafa;">${params.displayName}</strong>,
      </p>
      <p style="color: #d4d4d8; font-size: 14px; line-height: 1.6;">
        Thank you for applying to the SoloOS Creator Program! We've received your application for handle <strong style="color: #3b82f6;">@${params.publicHandle}</strong>.
      </p>
      <div style="background: #18181b; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #27272a;">
        <p style="margin: 4px 0; color: #d4d4d8; font-size: 14px;"><strong>Review Window:</strong> 2–3 business days</p>
        <p style="margin: 4px 0; color: #d4d4d8; font-size: 14px;"><strong>Commercial Model:</strong> 20% recurring for 12 months</p>
      </div>
      <p style="color: #71717a; font-size: 13px;">
        You'll receive an email as soon as your application is reviewed.
      </p>
    </div>
  `;
  return { subject, html, text };
}

export function renderCreatorApplicationApprovedEmail(params: {
  displayName: string;
  publicHandle: string;
  referralLink: string;
  dashboardLink: string;
}): { subject: string; html: string; text: string } {
  const subject = `Welcome to the SoloOS Creator Program, @${params.publicHandle}!`;
  const text = `Hi ${params.displayName},\n\nCongratulations! Your application to the SoloOS Creator Program has been approved.\n\nYour Creator Referral Link:\n${params.referralLink}\n\nAccess your Creator Dashboard:\n${params.dashboardLink}\n\nYou'll earn a 20% recurring commission for 12 months on every paying customer you refer.\n\nBest regards,\nThe SoloOS Team`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #09090b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;">
      <h2 style="color: #10b981; margin-top: 0; font-size: 22px;">You're Approved!</h2>
      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.5;">
        Hi <strong style="color: #fafafa;">${params.displayName}</strong>, welcome to the SoloOS Creator Program as <strong style="color: #3b82f6;">@${params.publicHandle}</strong>.
      </p>
      <div style="background: #18181b; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #27272a;">
        <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Your Referral Link</p>
        <p style="margin: 0; font-family: monospace; font-size: 15px; color: #10b981; word-break: break-all;">${params.referralLink}</p>
      </div>
      <div style="margin: 28px 0;">
        <a href="${params.dashboardLink}" style="background-color: #3b82f6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
          Open Creator Dashboard
        </a>
      </div>
      <p style="color: #71717a; font-size: 13px;">
        Earn 20% recurring commission for 12 months on every paid subscription.
      </p>
    </div>
  `;
  return { subject, html, text };
}

export function renderCreatorApplicationRejectedEmail(params: {
  displayName: string;
  reason?: string | undefined;
}): { subject: string; html: string; text: string } {
  const subject = `Update regarding your SoloOS Creator Application`;
  const text = `Hi ${params.displayName},\n\nThank you for your interest in partnering with SoloOS. At this time, we are unable to accept your application into the Creator Program.${params.reason ? `\n\nNotes from our team:\n${params.reason}` : ""}\n\nYou are welcome to re-apply in the future.\n\nBest regards,\nThe SoloOS Team`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #09090b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;">
      <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Creator Application Update</h2>
      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.5;">
        Hi <strong style="color: #fafafa;">${params.displayName}</strong>,
      </p>
      <p style="color: #d4d4d8; font-size: 14px; line-height: 1.6;">
        Thank you for your interest in partnering with SoloOS. At this time, we are unable to accept your application into the Creator Program.
      </p>
      ${
        params.reason
          ? `
      <div style="background: #18181b; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #27272a;">
        <p style="margin: 0; color: #d4d4d8; font-size: 13px;">${params.reason}</p>
      </div>`
          : ""
      }
      <p style="color: #71717a; font-size: 13px;">
        You are welcome to re-apply as your platform audience grows.
      </p>
    </div>
  `;
  return { subject, html, text };
}

export function renderCreatorCommissionEarnedEmail(params: {
  displayName: string;
  amountFormatted: string;
  currency: string;
  periodLabel: string;
}): { subject: string; html: string; text: string } {
  const subject = `New Commission Earned: ${params.amountFormatted}`;
  const text = `Hi ${params.displayName},\n\nGreat news! You earned a new commission of ${params.amountFormatted} (${params.currency}) for period ${params.periodLabel}.\n\nLog in to your Creator Dashboard to view your complete earnings breakdown.\n\nBest regards,\nThe SoloOS Team`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #09090b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;">
      <h2 style="color: #10b981; margin-top: 0; font-size: 20px;">Commission Earned!</h2>
      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.5;">
        Hi <strong style="color: #fafafa;">${params.displayName}</strong>,
      </p>
      <div style="background: #18181b; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #27272a;">
        <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 13px;">Commission Amount:</p>
        <p style="margin: 0; font-size: 24px; font-weight: 700; color: #10b981;">${params.amountFormatted}</p>
        <p style="margin: 8px 0 0; color: #71717a; font-size: 12px;">Period: ${params.periodLabel}</p>
      </div>
    </div>
  `;
  return { subject, html, text };
}

export function renderCreatorPayoutApprovedEmail(params: {
  displayName: string;
  amountFormatted: string;
  reference: string;
}): { subject: string; html: string; text: string } {
  const subject = `Payout Processed: ${params.amountFormatted}`;
  const text = `Hi ${params.displayName},\n\nYour payout of ${params.amountFormatted} (Ref: ${params.reference}) has been processed and paid.\n\nThank you for partnering with SoloOS!\n\nBest regards,\nThe SoloOS Team`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #09090b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;">
      <h2 style="color: #10b981; margin-top: 0; font-size: 20px;">Payout Processed</h2>
      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.5;">
        Hi <strong style="color: #fafafa;">${params.displayName}</strong>,
      </p>
      <p style="color: #d4d4d8; font-size: 14px; line-height: 1.6;">
        Your payout of <strong style="color: #10b981;">${params.amountFormatted}</strong> has been marked as paid. Reference: <code style="color: #fafafa;">${params.reference}</code>.
      </p>
    </div>
  `;
  return { subject, html, text };
}
