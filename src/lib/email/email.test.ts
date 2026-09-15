import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NullEmailProvider, ResendEmailProvider } from "./provider";
import {
  renderInvitationEmail,
  renderSubscriptionEmail,
  renderSupportConfirmationEmail,
} from "./templates";

describe("Email Provider Architecture", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("NullEmailProvider suppresses emails safely without throwing errors", async () => {
    const provider = new NullEmailProvider();

    expect(provider.isConfigured()).toBe(false);

    const result = await provider.sendEmail({
      to: "test@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    expect(result.success).toBe(false);
    expect(result.suppressed).toBe(true);
    expect(result.error).toContain("Email provider is not configured");
  });

  it("ResendEmailProvider accurately reflects presence of API key in environment", () => {
    delete process.env["RESEND_API_KEY"];
    const withoutKey = new ResendEmailProvider();
    expect(withoutKey.isConfigured()).toBe(false);

    process.env["RESEND_API_KEY"] = "re_test_key_123";
    const withKey = new ResendEmailProvider();
    expect(withKey.isConfigured()).toBe(true);
  });
});

describe("Email Templates Security & Formatting", () => {
  it("renderInvitationEmail contains secure Supabase invitation link and no passwords", () => {
    const invite = renderInvitationEmail({
      workspaceName: "Acme Consulting",
      inviterName: "Alice Banda",
      role: "Finance Manager",
      inviteUrl: "https://solo-finance-command.vercel.app/auth?token=invite_token_123",
    });

    expect(invite.subject).toContain("Acme Consulting");
    expect(invite.text).toContain("Alice Banda");
    expect(invite.text).toContain("Finance Manager");
    expect(invite.text).toContain(
      "https://solo-finance-command.vercel.app/auth?token=invite_token_123",
    );

    // Critical Architectural Guard: No credentials or temporary passwords in invitation emails
    expect(invite.html).toContain("No temporary passwords were generated");
    expect(invite.text.toLowerCase()).not.toContain("password:");
    expect(invite.html.toLowerCase()).not.toContain("password is");
    expect(invite.html.toLowerCase()).not.toContain("your password:");
  });

  it("renderSubscriptionEmail properly displays verified tier and renewal date", () => {
    const email = renderSubscriptionEmail({
      workspaceName: "Acme Consulting",
      planName: "Solo",
      amountFormatted: "MWK 14,000/month",
      currentPeriodEnd: "July 15, 2026",
    });

    expect(email.subject).toContain("Solo");
    expect(email.text).toContain("Acme Consulting");
    expect(email.text).toContain("MWK 14,000/month");
    expect(email.text).toContain("July 15, 2026");
    expect(email.html).toContain("Subscription Activated");
  });

  it("renderSupportConfirmationEmail includes ticket reference and user subject", () => {
    const email = renderSupportConfirmationEmail({
      ticketId: "8f7e6d5c-4b3a-2109-8765-43210fedcba9",
      name: "Chifundo Phiri",
      subject: "Tax reserve question",
    });

    expect(email.subject).toContain("[SoloOS Support #8f7e6d5c]");
    expect(email.text).toContain("Chifundo Phiri");
    expect(email.text).toContain("8f7e6d5c-4b3a-2109-8765-43210fedcba9");
    expect(email.html).toContain("Tax reserve question");
  });
});
