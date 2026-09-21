import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  CreditCard,
  FileCheck,
  FileText,
  Lock,
  Mail,
  Scale,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import logo from "@/assets/solo.png";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service | SoloOS — Financial Operating System" },
      {
        name: "description",
        content:
          "Official Terms of Service for SoloOS. Understand your rights, responsibilities, billing terms, cancellation policies, AI CFO limitations, and acceptable use guidelines.",
      },
      { property: "og:title", content: "Terms of Service | SoloOS" },
      {
        property: "og:description",
        content:
          "Clear, honest terms of service governing SoloOS accounts, subscriptions, and financial planning tools.",
      },
    ],
    links: [{ rel: "canonical", href: "https://solo-finance-command.vercel.app/terms" }],
  }),
  component: TermsPage,
});

const SECTIONS = [
  { id: "acceptance", title: "1. Acceptance of Terms" },
  { id: "description", title: "2. Description of SoloOS" },
  { id: "accounts", title: "3. Account Creation & Security" },
  { id: "workspaces", title: "4. Workspace & Member Roles" },
  { id: "billing", title: "5. Subscriptions, Billing & PayChangu" },
  { id: "cancellation", title: "6. Cancellation & Refund Policy" },
  { id: "acceptable-use", title: "7. Acceptable Use Policy" },
  { id: "user-content", title: "8. User Content & Ownership" },
  { id: "financial-disclaimer", title: "9. User Responsibility & Disclaimers" },
  { id: "ai-cfo-limits", title: "10. AI CFO Capabilities & Limitations" },
  { id: "third-party", title: "11. Third-Party Services" },
  { id: "availability-ip", title: "12. Service Availability & IP" },
  { id: "suspension-termination", title: "13. Suspension & Termination" },
  { id: "liability", title: "14. Limitation of Liability" },
  { id: "disputes-contact", title: "15. Governing Terms & Contact" },
];

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={logo} width={38} height={38} alt="SoloOS Logo" className="rounded-md" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                Legal & Trust
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/" className="gap-1.5">
                <ArrowLeft className="size-3.5" />
                <span className="hidden sm:inline">Back to</span> Home
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/pricing">Pricing</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/support">Support</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth" search={{ mode: "signin" }}>
                Sign In
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
            {/* Desktop Table of Contents Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-lg border border-border/70 bg-card p-4 text-sm shadow-xs">
                <p className="font-semibold text-foreground text-xs uppercase tracking-wider mb-3">
                  Contents
                </p>
                <nav className="space-y-1.5" aria-label="Table of contents">
                  {SECTIONS.map((sec) => (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      className="block text-xs text-muted-foreground hover:text-foreground transition-colors py-1 pl-1 border-l-2 border-transparent hover:border-primary"
                    >
                      {sec.title}
                    </a>
                  ))}
                </nav>

                <div className="mt-6 pt-4 border-t border-border/60">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Questions regarding these terms? Contact us at{" "}
                    <a
                      href="mailto:hello@nuerexlabs.com"
                      className="text-primary underline hover:text-primary/90"
                    >
                      hello@nuerexlabs.com
                    </a>{" "}
                    or submit a ticket via our{" "}
                    <Link to="/support" className="text-primary underline">
                      Support Center
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </aside>

            {/* Document Body */}
            <article className="max-w-3xl space-y-12">
              {/* Header Info */}
              <div className="space-y-4 border-b border-border/60 pb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                  <Scale className="size-3.5" />
                  <span>Terms & Commercial Agreement</span>
                </div>
                <h1 className="text-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Terms of Service
                </h1>
                <p className="text-sm font-mono text-muted-foreground">
                  Effective Date: September 16, 2026 · Version 2.0
                </p>
                <p className="text-base text-muted-foreground leading-relaxed">
                  These Terms of Service ("Terms") govern your access to and use of SoloOS ("the
                  Service"). By registering for an account, accessing, or using SoloOS, you agree to
                  be bound by these Terms. If you do not agree to these Terms, do not use the
                  Service.
                </p>
              </div>

              {/* Section 1 */}
              <section id="acceptance" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <FileCheck className="size-5 text-primary shrink-0" />
                  1. Acceptance of Terms
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    By creating a SoloOS account or accessing any workspace, you represent that you
                    are at least 18 years of age (or the legal age of majority in your
                    jurisdiction), have the legal authority to enter into these Terms, and agree to
                    comply with all applicable laws and regulations.
                  </p>
                  <p>
                    If you are creating an account on behalf of an entity or business, you represent
                    and warrant that you have full authorization to bind that entity to these Terms.
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section id="description" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Scale className="size-5 text-primary shrink-0" />
                  2. Description of SoloOS & Service Boundaries
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    SoloOS is a financial operating system and software tool designed to help
                    independent operators organize bookkeeping, issue invoices, track expenses,
                    monitor client and project profitability, and plan cashflow runway and tax
                    reserves.
                  </p>
                  <div className="rounded-md border border-border bg-muted/20 p-4 space-y-2 text-xs">
                    <p className="font-semibold text-foreground uppercase tracking-wider">
                      Explicit Operational Boundaries
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                      <li>
                        <strong className="text-foreground">Not a Banking Institution:</strong>{" "}
                        SoloOS does not hold deposits, manage client escrow, issue credit cards, or
                        provide custodial services.
                      </li>
                      <li>
                        <strong className="text-foreground">
                          Not Certified Accounting or Legal Advice:
                        </strong>{" "}
                        SoloOS provides computational tools and software calculations. Use of SoloOS
                        does not establish an attorney-client, accountant-client, or fiduciary
                        relationship.
                      </li>
                      <li>
                        <strong className="text-foreground">
                          Safe-to-Spend & Tax Reserve Semantics:
                        </strong>{" "}
                        Safe-to-Spend is a planning heuristic calculated from your entered liquid
                        cash minus tax reserve targets, known obligations, and operating buffer,
                        plus verified expected collections. It is not a guarantee of solvency or
                        bank overdraft protection.
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 3 */}
              <section id="accounts" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Lock className="size-5 text-primary shrink-0" />
                  3. Account Creation & Security
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    When creating an account, you must provide a valid email address and accurate
                    information. You are solely responsible for maintaining the confidentiality of
                    your authentication credentials and session tokens.
                  </p>
                  <p>
                    You agree to notify us immediately at{" "}
                    <a
                      href="mailto:hello@nuerexlabs.com"
                      className="text-primary underline hover:text-primary/90"
                    >
                      hello@nuerexlabs.com
                    </a>{" "}
                    if you suspect any unauthorized access to your account or workspace. SoloOS is
                    not liable for any loss or damage arising from your failure to safeguard login
                    credentials.
                  </p>
                </div>
              </section>

              {/* Section 4 */}
              <section id="workspaces" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Users className="size-5 text-primary shrink-0" />
                  4. Workspace Administration & Member Roles
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    SoloOS organizes financial data into isolated workspaces. Workspace Owners and
                    Admins may invite collaborators and assign permission roles:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li>
                      <strong className="text-foreground">Owner:</strong> Full authority over
                      workspace settings, member management, data deletion, and billing upgrades.
                    </li>
                    <li>
                      <strong className="text-foreground">Admin:</strong> Operational authority to
                      manage members and records.
                    </li>
                    <li>
                      <strong className="text-foreground">Finance:</strong> Full access to record
                      transactions, adjust accounts, manage invoices, and configure tax reserves.
                    </li>
                    <li>
                      <strong className="text-foreground">Manager:</strong> Access to manage
                      clients, projects, and invoices.
                    </li>
                    <li>
                      <strong className="text-foreground">Viewer:</strong> Strictly read-only access
                      to financial reporting without modification permissions.
                    </li>
                  </ul>
                  <p className="text-xs">
                    The Workspace Owner is legally responsible for all actions taken by authorized
                    members within their workspace.
                  </p>
                </div>
              </section>

              {/* Section 5 */}
              <section id="billing" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="size-5 text-primary shrink-0" />
                  5. Subscriptions, Billing & PayChangu Processing
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    SoloOS offers three subscription tiers with transparent, fixed pricing in Malawi
                    Kwacha (MWK) and US Dollars (USD):
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3 text-xs">
                    <div className="rounded-md border border-border bg-card p-3">
                      <p className="font-bold text-foreground">Free Tier</p>
                      <p className="text-muted-foreground mt-1">Permanent · Free</p>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Single currency, up to 5 clients, 10 invoices/mo, core bookkeeping.
                      </p>
                    </div>
                    <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                      <p className="font-bold text-foreground">Solo Plan</p>
                      <p className="text-primary font-mono mt-1">MWK 14,000/mo · $8/mo</p>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Multi-currency, unlimited clients & invoices, AI CFO, cashflow forecasting.
                      </p>
                    </div>
                    <div className="rounded-md border border-border bg-card p-3">
                      <p className="font-bold text-foreground">Pro Plan</p>
                      <p className="text-foreground font-mono mt-1">MWK 21,000/mo · $12/mo</p>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Multi-seat collaboration, multi-workspace tools, priority processing.
                      </p>
                    </div>
                  </div>
                  <p className="text-xs">
                    <strong className="text-foreground">Independent Pricing:</strong> MWK and USD
                    prices are independent launch prices chosen intentionally for each market. They
                    are not dynamic currency conversions of each other.
                  </p>
                  <p className="text-xs">
                    <strong className="text-foreground">Payment Processor:</strong> All subscription
                    payments are securely processed via{" "}
                    <strong className="text-foreground">PayChangu</strong>. SoloOS does not store or
                    process payment card data. Subscriptions are activated only upon verified
                    server-side reconciliation matching the expected plan, currency, and amount.
                  </p>
                </div>
              </section>

              {/* Section 6 */}
              <section id="cancellation" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <FileText className="size-5 text-primary shrink-0" />
                  6. Cancellation, Downgrades & Refund Policy
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <div className="rounded-md border border-border bg-card p-4 space-y-2 text-xs">
                    <p className="font-semibold text-foreground">
                      Cancellation at Period End (No Abrupt Lockouts)
                    </p>
                    <p className="text-muted-foreground">
                      You may cancel your paid subscription at any time by navigating to Settings →
                      Billing in your workspace. When you cancel:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>
                        Your paid plan remains fully active until the end of your current paid
                        billing period.
                      </li>
                      <li>
                        At the end of the period, your workspace automatically reverts to the Free
                        tier.
                      </li>
                      <li>
                        <strong className="text-foreground">
                          Zero data loss: Your transactions, clients, invoices, and records are
                          never deleted upon cancellation.
                        </strong>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-md border border-border bg-muted/15 p-4 space-y-2 text-xs">
                    <p className="font-semibold text-foreground">Refund Policy</p>
                    <p className="text-muted-foreground leading-relaxed">
                      Subscription fees are billed in advance for each billing cycle and, except as
                      required by applicable consumer protection laws, are generally non-refundable
                      once a billing cycle has commenced.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      If you experience technical failure or believe you were billed in error, you
                      may contact support at{" "}
                      <a
                        href="mailto:hello@nuerexlabs.com"
                        className="text-primary underline hover:text-primary/90"
                      >
                        hello@nuerexlabs.com
                      </a>{" "}
                      within 7 days of the transaction date. Requests are reviewed on a case-by-case
                      basis. Any applicable refund treatment is governed by the specific plan and
                      payment terms presented at checkout.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 7 */}
              <section id="acceptable-use" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Shield className="size-5 text-primary shrink-0" />
                  7. Acceptable Use Policy
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>You agree not to misuse SoloOS. Specifically, you must not:</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs">
                    <li>
                      Use the Service to create fictitious, fraudulent, or deceptive invoices.
                    </li>
                    <li>
                      Use the Service for money laundering, terrorist financing, or sanctions
                      evasion.
                    </li>
                    <li>
                      Attempt to probe, scan, or breach database Row-Level Security (RLS) policies
                      or tenant boundaries.
                    </li>
                    <li>
                      Reverse engineer, decompile, or copy the underlying proprietary application
                      code.
                    </li>
                    <li>
                      Execute automated scraping or high-volume denial-of-service queries against
                      our APIs.
                    </li>
                    <li>
                      Inject malicious payloads, exploits, or prompt injection attacks into the AI
                      CFO.
                    </li>
                  </ul>
                </div>
              </section>

              {/* Section 8 */}
              <section id="user-content" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <FileText className="size-5 text-primary shrink-0" />
                  8. User Content & Data Ownership
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    <strong className="text-foreground">You Own Your Data:</strong> You retain all
                    intellectual property rights, title, and ownership in and to all financial data,
                    customer lists, invoices, expense records, and documents you enter into SoloOS.
                  </p>
                  <p>
                    You grant SoloOS a limited, non-exclusive license solely to host, store,
                    transmit, and display your data to the extent necessary to provide the Service
                    to you and your authorized workspace members.
                  </p>
                  <p>
                    <strong className="text-foreground">Shared Financial Artifacts:</strong> When
                    you generate an unlisted share link (such as for an invoice or financial brief),
                    you authorize anyone possessing the secure token to view that frozen snapshot.
                    You remain solely responsible for the distribution of your share links and may
                    revoke them at any time through the Share Center.
                  </p>
                  <p>
                    <strong className="text-foreground">Referral Program Terms:</strong> SoloOS
                    provides a referral attribution feature for organic platform growth. Operators
                    agree not to engage in self-referrals, automated referral link spamming, search
                    engine ad bidding on SoloOS trademarks, or deceptive marketing practices. SoloOS
                    reserves the right to void referral attributions obtained through fraud or
                    abusive conduct.
                  </p>
                </div>
              </section>

              {/* Section 9 */}
              <section id="financial-disclaimer" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="size-5 text-amber-500 shrink-0" />
                  9. User Responsibility for Financial Records & Compliance
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    You are solely responsible for verifying the completeness, accuracy, and legal
                    validity of all financial records, invoices, tax calculations, and business
                    decisions made using SoloOS.
                  </p>
                  <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-muted-foreground space-y-2">
                    <p className="font-semibold text-foreground">Statutory Disclaimer</p>
                    <p>
                      Tax laws vary across jurisdictions. The tax reserve calculations,
                      deductibility categorizations, and financial summaries provided by SoloOS are
                      tools to assist your internal planning. SoloOS does not file taxes on your
                      behalf. You should consult a qualified accountant, tax attorney, or registered
                      financial advisor regarding statutory obligations.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 10 */}
              <section id="ai-cfo-limits" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="size-5 text-primary shrink-0" />
                  10. AI CFO Capabilities & Limitations
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    The AI CFO is an interactive financial analysis tool powered by artificial
                    intelligence. By using the AI CFO, you acknowledge and agree that:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs">
                    <li>
                      <strong className="text-foreground">Advisory & Non-Fiduciary:</strong> AI CFO
                      outputs are suggestions and conversational summaries. They do not constitute
                      fiduciary, certified accounting, legal, or investment advice.
                    </li>
                    <li>
                      <strong className="text-foreground">No Autonomous Execution:</strong> The AI
                      CFO cannot move money, make transfers, or alter database records.
                    </li>
                    <li>
                      <strong className="text-foreground">No Outcome Guarantees:</strong> SoloOS
                      makes no representation or guarantee regarding revenue growth, cost savings,
                      or financial success resulting from AI CFO recommendations.
                    </li>
                  </ul>
                </div>
              </section>

              {/* Section 11 */}
              <section id="third-party" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Scale className="size-5 text-primary shrink-0" />
                  11. Third-Party Services
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    SoloOS integrates with third-party infrastructure providers including Supabase
                    (database hosting), PayChangu (payment processing), and Resend (email delivery).
                    Your use of features reliant on these third parties may be subject to their
                    respective terms and policies. SoloOS is not liable for service interruptions
                    caused by third-party outages.
                  </p>
                </div>
              </section>

              {/* Section 12 */}
              <section id="availability-ip" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Lock className="size-5 text-primary shrink-0" />
                  12. Service Availability & Intellectual Property
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    SoloOS strives for high availability, but the Service is provided on an{" "}
                    <strong className="text-foreground">"AS IS"</strong> and{" "}
                    <strong className="text-foreground">"AS AVAILABLE"</strong> basis without
                    warranties of any kind, whether express or implied.
                  </p>
                  <p>
                    All rights, title, and interest in SoloOS, including our software, trademarks,
                    logos, domain names, UI designs, and documentation, remain the exclusive
                    property of SoloOS and its licensors.
                  </p>
                </div>
              </section>

              {/* Section 13 */}
              <section id="suspension-termination" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="size-5 text-primary shrink-0" />
                  13. Suspension & Termination
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    SoloOS may suspend or terminate your account or workspace if you breach these
                    Terms, engage in fraudulent transactions, or compromise system security. You may
                    terminate your account at any time by requesting account deletion via support.
                    Data retention following termination is governed by our Privacy Policy.
                  </p>
                </div>
              </section>

              {/* Section 14 */}
              <section id="liability" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Scale className="size-5 text-primary shrink-0" />
                  14. Limitation of Liability
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <div className="rounded-md border border-border bg-card p-4 space-y-2 text-xs">
                    <p className="font-semibold text-foreground uppercase tracking-wider">
                      Liability Cap & Exclusions
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      To the maximum extent permitted by applicable law, in no event shall SoloOS,
                      its founders, employees, or partners be liable for any indirect, incidental,
                      special, consequential, or punitive damages, or for any loss of profits,
                      revenue, data, or business opportunities arising out of or related to your use
                      of the Service.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      In all circumstances, SoloOS's total aggregate liability arising out of or
                      relating to these Terms or the Service shall not exceed the total amount
                      actually paid by you to SoloOS for the Service during the twelve (12) months
                      immediately preceding the event giving rise to the claim.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 15 */}
              <section id="disputes-contact" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Mail className="size-5 text-primary shrink-0" />
                  15. Governing Terms & Contact Information
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    These Terms constitute the entire agreement between you and SoloOS regarding the
                    Service. We reserve the right to revise these Terms periodically. Changes will
                    be posted on this page with an updated effective date. Continued use of the
                    Service after modifications constitutes acceptance of the revised Terms.
                  </p>
                  <div className="rounded-md border border-border bg-card p-4 space-y-2 text-xs">
                    <p className="font-semibold text-foreground">Contact & Inquiries</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>
                        <strong className="text-foreground">Email:</strong>{" "}
                        <a
                          href="mailto:hello@nuerexlabs.com"
                          className="text-primary underline hover:text-primary/90"
                        >
                          hello@nuerexlabs.com
                        </a>
                      </li>
                      <li>
                        <strong className="text-foreground">Support Center:</strong>{" "}
                        <Link to="/support" className="text-primary underline">
                          solo-finance-command.vercel.app/support
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Bottom Nav CTA */}
              <div className="pt-8 border-t border-border/60 flex flex-wrap items-center justify-between gap-4">
                <Button asChild variant="outline" size="sm">
                  <Link to="/privacy" className="gap-1.5">
                    View Privacy Policy <ChevronRight className="size-3.5" />
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Create Free Workspace
                  </Link>
                </Button>
              </div>
            </article>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-muted/20 mt-auto">
        <div className="mx-auto max-w-6xl px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={logo} width={24} height={24} alt="SoloOS" className="rounded" />
            <span className="font-semibold text-foreground">SoloOS</span>
            <span>— Financial Operating System for Independent Professionals</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/pricing" className="hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link to="/support" className="hover:text-foreground transition-colors">
              Support
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="text-foreground font-medium transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
