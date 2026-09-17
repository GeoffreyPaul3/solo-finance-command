export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  suppressed?: boolean;
}

export interface EmailProvider {
  readonly name: string;
  isConfigured(): boolean;
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
}

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  private getApiKey(): string | null {
    if (typeof process === "undefined" || !process.env) return null;
    let key = process.env["RESEND_API_KEY"];
    const nodeProcess = process as unknown as { loadEnvFile?: () => void };
    if (!key && typeof nodeProcess.loadEnvFile === "function") {
      try {
        nodeProcess.loadEnvFile();
        key = process.env["RESEND_API_KEY"];
      } catch {
        // Gracefully ignore if env file cannot be loaded
      }
    }
    return key || null;
  }

  private getFromEmail(): string {
    let from = "SoloOS <onboarding@resend.dev>";
    if (typeof process !== "undefined" && process.env && process.env["RESEND_FROM_EMAIL"]) {
      from = process.env["RESEND_FROM_EMAIL"].trim();
    }
    // Resend requires verified custom domains and rejects free webmail domains with 403.
    // If an unverified public domain is detected, safely fall back to Resend's default onboarding sender.
    if (/@(gmail|googlemail|yahoo|hotmail|outlook|live|icloud)\.com/i.test(from)) {
      return "SoloOS <onboarding@resend.dev>";
    }
    return from;
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.trim().length > 0);
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        success: false,
        error: "Resend is not configured (RESEND_API_KEY missing).",
        suppressed: true,
      };
    }

    try {
      const payload: Record<string, unknown> = {
        from: this.getFromEmail(),
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
      };
      if (options.text) {
        payload["text"] = options.text;
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
      if (options.idempotencyKey) {
        headers["Idempotency-Key"] = options.idempotencyKey;
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Resend API error [${response.status}]: ${errorText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        messageId: data.id,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}

export class NullEmailProvider implements EmailProvider {
  readonly name = "null";

  isConfigured(): boolean {
    return false;
  }

  async sendEmail(_options: SendEmailOptions): Promise<SendEmailResult> {
    return {
      success: false,
      suppressed: true,
      error: "Email provider is not configured. Email suppressed.",
    };
  }
}

export function getEmailProvider(): EmailProvider {
  const resend = new ResendEmailProvider();
  if (resend.isConfigured()) {
    return resend;
  }
  return new NullEmailProvider();
}
