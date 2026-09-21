import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronRight,
  Database,
  Eye,
  FileText,
  Lock,
  Mail,
  Scale,
  Shield,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import logo from "@/assets/solo.png";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | SoloOS — Financial Operating System" },
      {
        name: "description",
        content:
          "Official Privacy Policy for SoloOS. Learn how we handle your financial records, workspace data, authentication, AI CFO processing, and payment information with complete transparency.",
      },
      { property: "og:title", content: "Privacy Policy | SoloOS" },
      {
        property: "og:description",
        content:
          "Transparent, truthful explanation of data handling, tenant isolation, and security at SoloOS.",
      },
    ],
    links: [{ rel: "canonical", href: "https://solo-finance-command.vercel.app/privacy" }],
  }),
  component: PrivacyPage,
});

const SECTIONS = [
  { id: "overview", title: "1. Overview & Nature of SoloOS" },
  { id: "data-collected", title: "2. Information We Collect" },
  { id: "financial-data", title: "3. How Financial Data Is Handled" },
  { id: "payments", title: "4. Payment Processing & PayChangu" },
  { id: "transactional-email", title: "5. Transactional Email & Resend" },
  { id: "ai-cfo", title: "6. AI CFO & Language Model Processing" },
  { id: "security-rls", title: "7. Security, RLS & Isolation" },
  { id: "storage-cookies", title: "8. Browser Storage & Tracking Truth" },
  { id: "retention-deletion", title: "9. Data Retention & Deletion" },
  { id: "user-rights", title: "10. User Rights & Data Requests" },
  { id: "international", title: "11. International Processing" },
  { id: "changes-contact", title: "12. Policy Updates & Contact" },
];

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={logo} width={38} height={38} alt="SoloOS Logo" className="rounded-md" />
            <div className="flex flex-col">
              <span className="text-display text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                SoloOS
              </span>
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
                    Have questions about this policy? Contact us at{" "}
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
                  <ShieldCheck className="size-3.5" />
                  <span>Privacy & Trust Architecture</span>
                </div>
                <h1 className="text-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Privacy Policy
                </h1>
                <p className="text-sm font-mono text-muted-foreground">
                  Effective Date: September 16, 2026 · Version 2.0
                </p>
                <p className="text-base text-muted-foreground leading-relaxed">
                  This Privacy Policy describes how SoloOS collects, stores, processes, and protects
                  your personal information and workspace financial records. SoloOS is designed from
                  the ground up to provide independent professionals with an authoritative, private,
                  and calm financial command center.
                </p>
              </div>

              {/* Section 1 */}
              <section id="overview" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Scale className="size-5 text-primary shrink-0" />
                  1. Overview & Nature of SoloOS
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    SoloOS is a software application and financial operating system for independent
                    professionals, consultants, and solo business operators. SoloOS provides tools
                    for cash tracking, invoicing, expense logging, client profitability analysis,
                    debt and obligation tracking, tax-reserve planning, and financial decision
                    support.
                  </p>
                  <div className="rounded-md border border-border bg-muted/20 p-4 space-y-2">
                    <p className="font-semibold text-foreground text-xs uppercase tracking-wider">
                      Important Distinctions Regarding SoloOS
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
                      <li>
                        <strong className="text-foreground">Not a Financial Institution:</strong>{" "}
                        SoloOS is not a bank, credit union, depository institution, or money
                        services business. SoloOS does not hold, custody, or transmit customer
                        funds.
                      </li>
                      <li>
                        <strong className="text-foreground">
                          Not a Certified Accounting or Tax Filing Service:
                        </strong>{" "}
                        SoloOS is not a certified public accounting firm or licensed tax preparer.
                        Tax reserve percentages and Safe-to-Spend calculations are planning
                        designations determined by user inputs and mathematical rules, not formal
                        tax filings or legal compliance certifications.
                      </li>
                      <li>
                        <strong className="text-foreground">
                          Software Ledger vs. Banking Settlement:
                        </strong>{" "}
                        The balances, accounts, and transactions tracked in SoloOS represent
                        user-recorded ledger entries within your private workspace. They do not
                        initiate automated bank transfers or touch clearing networks.
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 2 */}
              <section id="data-collected" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <FileText className="size-5 text-primary shrink-0" />
                  2. Information We Collect
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>We collect information you directly provide when using SoloOS:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong className="text-foreground">Account & Identity Information:</strong>{" "}
                      Your email address, full name, optional profile avatar, and internal user
                      identifier assigned during authentication.
                    </li>
                    <li>
                      <strong className="text-foreground">Workspace Configuration:</strong>{" "}
                      Workspace name, optional logo image, business type, country, timezone, base
                      ledger currency (such as MWK or USD), fiscal year start month, and tax reserve
                      planning percentage.
                    </li>
                    <li>
                      <strong className="text-foreground">Customer Support Inquiries:</strong> Name,
                      email address, subject line, message text, and diagnostic ticket identifiers
                      submitted via our in-app support center or sent to{" "}
                      <span className="font-mono text-xs text-foreground">
                        hello@nuerexlabs.com
                      </span>
                      .
                    </li>
                  </ul>
                </div>
              </section>

              {/* Section 3 */}
              <section id="financial-data" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Database className="size-5 text-primary shrink-0" />
                  3. How Financial Data Is Handled
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    When using SoloOS, you enter financial records required to operate your solo
                    business. This information includes:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs">
                    <li>
                      <strong className="text-foreground">Financial Accounts:</strong> Account names
                      (e.g., "Bank Operating", "Airtel Money", "Cash Reserve"), account types,
                      native currency codes, and opening balances.
                    </li>
                    <li>
                      <strong className="text-foreground">Transactions:</strong> Incomes, expenses,
                      transfers, manual adjustments, transaction categories, descriptions, dates,
                      and associated project or client linkages.
                    </li>
                    <li>
                      <strong className="text-foreground">Invoices:</strong> Client business names,
                      client email addresses, billing addresses, line items, unit rates, tax
                      designations, issued dates, due dates, and settlement records.
                    </li>
                    <li>
                      <strong className="text-foreground">Expenses & Deductibility:</strong> Vendor
                      names, amounts, categories, tax deductibility flags, and notes.
                    </li>
                    <li>
                      <strong className="text-foreground">Obligations & Debts:</strong> Upcoming
                      commitments, statutory or supplier liabilities, due dates, and repayment
                      schedules.
                    </li>
                    <li>
                      <strong className="text-foreground">Tax Reserve Planning Data:</strong>{" "}
                      User-set target tax rates and designated tax allocations.
                    </li>
                    <li>
                      <strong className="text-foreground">Clients & Projects:</strong> Client names,
                      contact details, project budgets, hourly or fixed rates, and delivery
                      milestones.
                    </li>
                  </ul>
                  <p>
                    Your financial data belongs exclusively to you. SoloOS does not sell, rent, or
                    monetize your financial records, transaction histories, or customer lists to
                    advertisers or third-party data brokers.
                  </p>
                </div>
              </section>

              {/* Section 4 */}
              <section id="payments" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Lock className="size-5 text-primary shrink-0" />
                  4. Payment Processing & PayChangu
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    SoloOS paid subscriptions (Solo and Pro plans in MWK and USD) are processed
                    through our authorized payment gateway partner,{" "}
                    <strong className="text-foreground">PayChangu</strong>.
                  </p>
                  <div className="rounded-md border border-border bg-card p-4 space-y-2 text-xs">
                    <p className="font-semibold text-foreground">
                      Authoritative Payment Security Invariants
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>
                        <strong className="text-foreground">Zero Card Storage:</strong> SoloOS
                        servers never receive, store, or process raw credit card numbers, debit card
                        numbers, CVVs, or mobile money PINs. Payment details are entered directly on
                        PayChangu's secure checkout page.
                      </li>
                      <li>
                        <strong className="text-foreground">Server-Side Reconciliation:</strong>{" "}
                        Before checkout, an authoritative pending transaction record is registered
                        internally with the expected plan, expected currency, and expected amount.
                        After payment, our backend verifies the transaction against PayChangu's
                        verification API (
                        <span className="font-mono text-[11px]">verify-payment/{`{tx_ref}`}</span>).
                      </li>
                      <li>
                        <strong className="text-foreground">Anti-Tampering Controls:</strong> A
                        subscription is activated only if the transaction status is successful and
                        the verified amount and currency match the expected plan price exactly.
                        Tampered or mismatched requests are rejected.
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 5 */}
              <section id="transactional-email" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Mail className="size-5 text-primary shrink-0" />
                  5. Transactional Email & Resend
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    SoloOS uses <strong className="text-foreground">Resend</strong> to deliver
                    critical transactional emails. These include:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li>Workspace invitations to team members</li>
                    <li>Subscription activation and renewal receipts</li>
                    <li>Support request submission confirmations</li>
                  </ul>
                  <p className="text-xs">
                    Only the recipient's email address and the specific message body are transmitted
                    to Resend for message dispatch. SoloOS does not send unsolicited marketing
                    emails, and we maintain an internal audit log of all email events for
                    idempotency and delivery verification.
                  </p>
                </div>
              </section>

              {/* Section 6 */}
              <section id="ai-cfo" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="size-5 text-primary shrink-0" />
                  6. AI CFO & Language Model Processing
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    SoloOS includes an integrated{" "}
                    <strong className="text-foreground">AI CFO</strong> feature that provides
                    strategic financial analysis and plain-English summaries of your business
                    metrics.
                  </p>
                  <div className="rounded-md border border-border bg-muted/15 p-4 space-y-2 text-xs">
                    <p className="font-semibold text-foreground">How AI CFO Processing Operates</p>
                    <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                      <li>
                        <strong className="text-foreground">Context Assembly:</strong> When you
                        consult the AI CFO, a strictly bounded financial summary (current liquid
                        cash, Safe-to-Spend runway, tax reserve estimates, active obligations, and
                        monthly revenue totals) is transmitted to the configured AI model provider
                        (such as Google Gemini via secure server functions) to formulate the
                        response.
                      </li>
                      <li>
                        <strong className="text-foreground">Strictly Read-Only:</strong> The AI CFO
                        operates with read-only permissions. The language model cannot execute
                        financial transactions, modify account balances, generate invoices, or alter
                        database records.
                      </li>
                      <li>
                        <strong className="text-foreground">Advisory Only:</strong> Output from the
                        AI CFO is purely advisory and informational. It does not constitute formal
                        legal, tax, accounting, or investment advice. Users remain solely
                        responsible for all business and financial decisions.
                      </li>
                      <li>
                        <strong className="text-foreground">Untrusted Input Safeguards:</strong>{" "}
                        User prompts and descriptions are treated as untrusted input with strict
                        prompt boundaries to prevent prompt injection and data exfiltration.
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 7 */}
              <section id="security-rls" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Shield className="size-5 text-primary shrink-0" />
                  7. Security, Row-Level Security (RLS) & Workspace Isolation
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    We protect your data using modern architectural safeguards without making
                    unsupported compliance claims:
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-xs">
                    <li>
                      <strong className="text-foreground">
                        PostgreSQL Row-Level Security (RLS):
                      </strong>{" "}
                      Every financial table (accounts, transactions, invoices, expenses,
                      obligations, tax settings) is secured with database-level RLS policies.
                      Database queries are restricted so that users can only view and modify records
                      belonging to workspaces in which they are verified members.
                    </li>
                    <li>
                      <strong className="text-foreground">Role-Based Access Control (RBAC):</strong>{" "}
                      Workspace permissions are enforced via roles (Owner, Admin, Finance, Manager,
                      Viewer). Read-only members cannot execute modifications or access billing
                      controls.
                    </li>
                    <li>
                      <strong className="text-foreground">Immutable Financial Audit Trails:</strong>{" "}
                      Ledger adjustments, invoice status transitions, and subscription verification
                      records maintain permanent audit timestamps and actor references.
                    </li>
                    <li>
                      <strong className="text-foreground">Encryption in Transit:</strong> All
                      traffic between your browser and SoloOS is encrypted via standard TLS / HTTPS.
                    </li>
                    <li>
                      <strong className="text-foreground">Factual Compliance Notice:</strong> SoloOS
                      does not claim SOC 2, ISO 27001, or PCI DSS certification for its application
                      layer, nor do we use marketing phrases like "military-grade" or "bank-grade"
                      security. We rely on the security engineering of our infrastructure providers
                      (Supabase and Vercel) alongside our own verified database policies.
                    </li>
                  </ul>
                </div>
              </section>

              {/* Section 8 */}
              <section id="storage-cookies" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Eye className="size-5 text-primary shrink-0" />
                  8. Browser Storage & Tracking Truth
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>SoloOS believes in complete honesty regarding browser storage and tracking:</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs">
                    <li>
                      <strong className="text-foreground">Strictly Necessary Storage:</strong> We
                      use browser <span className="font-mono text-[11px]">localStorage</span>{" "}
                      exclusively to persist your authenticated user session (via Supabase Auth) and
                      remember your currently selected workspace across page reloads.
                    </li>
                    <li>
                      <strong className="text-foreground">Shareable Financial Artifacts:</strong>{" "}
                      When you create a shareable financial artifact (e.g. invoice share or
                      financial brief), SoloOS generates a cryptographically secure 256-bit unlisted
                      bearer token. The resulting view displays a strictly redacted, read-only
                      immutable snapshot frozen at the time of creation. Sensitive credentials,
                      banking details, and internal IDs are stripped. You may revoke links at any
                      time or set expiration bounds. Public share links emit{" "}
                      <span className="font-mono text-[11px]">noindex, nofollow</span> headers to
                      prevent search engine indexing.
                    </li>
                    <li>
                      <strong className="text-foreground">Referral Attribution Cookies:</strong> If
                      you visit SoloOS via an operator's referral link, a first-touch attribution
                      cookie (<span className="font-mono text-[11px]">solos_ref</span>) is stored in
                      your browser for 30 days to attribute subsequent signups. It contains solely
                      the referral code and creation timestamp. We do not use cross-site tracking or
                      commercial ad networks.
                    </li>
                    <li>
                      <strong className="text-foreground">Free Public Calculators:</strong> Our
                      public tools (Safe-to-Spend, Cash Runway, Profit Calculator, Invoice Profit,
                      and Tax Reserve) execute 100% in your local browser runtime. Values entered
                      into public calculators are never transmitted to or saved on our servers.
                    </li>
                    <li>
                      <strong className="text-foreground">
                        Zero Third-Party Advertising Trackers:
                      </strong>{" "}
                      SoloOS does not embed third-party advertising cookies, cross-site trackers,
                      Meta Pixel, or invasive behavioral profiling software.
                    </li>
                  </ul>
                  <p className="text-xs">
                    Because we do not use advertising tracking cookies or ad profiling, we do not
                    display deceptive cookie consent banners.
                  </p>
                </div>
              </section>

              {/* Section 9 */}
              <section id="retention-deletion" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Database className="size-5 text-primary shrink-0" />
                  9. Data Retention & Deletion
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    <strong className="text-foreground">Active Workspaces:</strong> Your records,
                    invoices, transactions, and settings remain available for the lifetime of your
                    workspace.
                  </p>
                  <p>
                    <strong className="text-foreground">Plan Downgrades:</strong> If you cancel a
                    paid Solo or Pro subscription, your paid features continue until the end of the
                    current billing cycle. Your workspace then reverts to the Free plan.{" "}
                    <strong className="text-foreground">
                      SoloOS never deletes your financial data upon plan cancellation or downgrade.
                    </strong>
                  </p>
                  <p>
                    <strong className="text-foreground">Account & Workspace Deletion:</strong> You
                    may request complete permanent deletion of your account and associated
                    workspaces at any time. Submit a request through our{" "}
                    <Link to="/support" className="text-primary underline">
                      Support Center
                    </Link>{" "}
                    or email{" "}
                    <a
                      href="mailto:hello@nuerexlabs.com"
                      className="text-primary underline hover:text-primary/90"
                    >
                      hello@nuerexlabs.com
                    </a>
                    . Upon confirmed verification of ownership, your data will be purged within 30
                    days, except where retention is required by applicable statutory obligations.
                  </p>
                </div>
              </section>

              {/* Section 10 */}
              <section id="user-rights" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Scale className="size-5 text-primary shrink-0" />
                  10. User Rights & Privacy Requests
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>As a SoloOS user, you have the right to:</p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li>Access and inspect all financial records and profile data entered.</li>
                    <li>Update, edit, or correct transaction and profile information anytime.</li>
                    <li>
                      Export your data in standard formats (such as PDF invoices and financial
                      reports).
                    </li>
                    <li>Request full deletion of your user account and workspaces.</li>
                  </ul>
                  <p className="text-xs">
                    To exercise any of these rights, contact us at{" "}
                    <a
                      href="mailto:hello@nuerexlabs.com"
                      className="text-primary underline hover:text-primary/90"
                    >
                      hello@nuerexlabs.com
                    </a>{" "}
                    with your registered account email.
                  </p>
                </div>
              </section>

              {/* Section 11 */}
              <section id="international" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Database className="size-5 text-primary shrink-0" />
                  11. International Data Processing
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    SoloOS is accessible globally and provides native multi-currency support (such
                    as Malawi Kwacha and US Dollars). Data is hosted and processed on secure cloud
                    infrastructure provided by Supabase (database hosting) and Vercel (application
                    hosting). By using the service, you acknowledge that information may be
                    transferred to and processed in data centers operated by these infrastructure
                    providers.
                  </p>
                </div>
              </section>

              {/* Section 12 */}
              <section id="changes-contact" className="scroll-mt-24 space-y-4">
                <h2 className="text-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Mail className="size-5 text-primary shrink-0" />
                  12. Policy Updates & Contact Information
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    We may update this Privacy Policy to reflect improvements to SoloOS, regulatory
                    developments, or changes to third-party integrations. Material updates will be
                    reflected on this page with an updated effective date.
                  </p>
                  <div className="rounded-md border border-border bg-card p-4 space-y-2 text-xs">
                    <p className="font-semibold text-foreground">Direct Contact Channels</p>
                    <p className="text-muted-foreground">
                      For privacy inquiries, data deletion requests, or trust questions:
                    </p>
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
                        <strong className="text-foreground">In-App Support Desk:</strong>{" "}
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
                  <Link to="/terms" className="gap-1.5">
                    View Terms of Service <ChevronRight className="size-3.5" />
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/support">Contact Support</Link>
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
            <Link to="/privacy" className="text-foreground font-medium transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
