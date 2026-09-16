import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronRight,
  HelpCircle,
  Loader2,
  Mail,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/solo.png";
import { submitSupportRequestServerFn } from "@/server/support";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support | SoloOS — Help Center & Contact" },
      {
        name: "description",
        content:
          "Get help with SoloOS. Browse common questions, billing inquiries, technical issues, and contact our support team directly.",
      },
    ],
    links: [{ rel: "canonical", href: "https://solo-finance-command.vercel.app/support" }],
  }),
  component: SupportPage,
});

const FAQ_TOPICS = [
  {
    category: "Getting Started",
    icon: ArrowRight,
    faqs: [
      {
        q: "How do I create a workspace?",
        a: "Sign up for a free account, complete the onboarding wizard to set your currency, fiscal year, and tax reserve percentage, and you're ready. Your workspace is private to you and anyone you explicitly invite.",
      },
      {
        q: "Can I use multiple currencies?",
        a: "Yes. SoloOS tracks each currency as a separate, independent ledger. MWK balances and USD balances are always reported separately — no automatic FX conversion is performed.",
      },
    ],
  },
  {
    category: "Billing & Payments",
    icon: Mail,
    faqs: [
      {
        q: "How do I upgrade to Solo or Pro?",
        a: "Go to Settings → Billing tab, select your plan, choose your currency (MWK or USD), and click Upgrade. You will be redirected to PayChangu to complete payment. Your subscription activates immediately after verified reconciliation.",
      },
      {
        q: "Are payments secure?",
        a: "All payments are processed through PayChangu. SoloOS never stores card details. After payment, the transaction is verified server-side against the expected amount and currency before activation — no amount mismatch can result in a subscription being granted.",
      },
      {
        q: "How do I cancel my subscription?",
        a: "Go to Settings → Billing → Cancel Subscription. Your paid access continues until the end of your current period. After that, your workspace reverts cleanly to the Free tier. Your data is retained indefinitely.",
      },
    ],
  },
  {
    category: "Team & Invitations",
    icon: MessageSquare,
    faqs: [
      {
        q: "How do I invite teammates?",
        a: "In Settings → Team, enter their email, select a role, and click Send Invite. They will receive an email with a secure link to accept the invitation. No temporary passwords are ever emailed.",
      },
      {
        q: "What roles are available?",
        a: "Viewer (read-only), Manager (clients & projects), Finance (financial operations), Admin (workspace configuration), and Owner (full control including billing).",
      },
    ],
  },
  {
    category: "AI CFO",
    icon: HelpCircle,
    faqs: [
      {
        q: "What can the AI CFO do?",
        a: "The AI CFO reads your verified financial data — revenue, cashflow, tax reserves, obligations, and safety buffer — and answers questions about your financial position and strategy. It is strictly read-only and grounds every response in your actual data.",
      },
      {
        q: "Does the AI CFO have access to my bank accounts?",
        a: "No. The AI CFO only reads the financial data you have entered into SoloOS. It does not connect to external bank APIs or card networks.",
      },
    ],
  },
];

const CONTACT_CATEGORIES = [
  { value: "general", label: "General Question" },
  { value: "billing", label: "Billing & Subscriptions" },
  { value: "technical", label: "Technical Issue" },
  { value: "feature_request", label: "Feature Request" },
];

function SupportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await submitSupportRequestServerFn({
        data: {
          name,
          email,
          subject,
          message,
          category: category as "general" | "billing" | "technical" | "feature_request",
        },
      });
      setTicketId(result.ticketId);
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Failed to submit request", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={logo} width={44} height={44} alt="SoloOS Logo" />
            <span className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              SoloOS
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">Home</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/pricing">Pricing</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth" search={{ mode: "signin" }}>
                Sign in
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/auth" search={{ mode: "signup" }}>
                Get Started <ChevronRight className="size-3.5" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-16 space-y-20">
        {/* Hero */}
        <section className="text-center space-y-3 max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">How can we help?</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Browse answers to common questions or reach our team directly.
          </p>
        </section>

        {/* FAQ Section */}
        <section className="space-y-10">
          <h2 className="text-2xl font-bold tracking-tight">Common Questions</h2>
          <div className="grid gap-8 md:grid-cols-2">
            {FAQ_TOPICS.map((topic) => {
              const Icon = topic.icon;
              return (
                <div key={topic.category} className="space-y-4">
                  <div className="flex items-center gap-2 font-semibold text-sm text-primary">
                    <Icon className="size-4" />
                    {topic.category}
                  </div>
                  <div className="space-y-3">
                    {topic.faqs.map((faq, i) => (
                      <details
                        key={i}
                        className="group rounded-xl border border-border/80 bg-card overflow-hidden"
                      >
                        <summary className="flex cursor-pointer items-center justify-between p-4 font-medium text-sm list-none">
                          <span>{faq.q}</span>
                          <ChevronRight className="size-4 text-muted-foreground shrink-0 ml-2 transition-transform group-open:rotate-90" />
                        </summary>
                        <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                          {faq.a}
                        </p>
                      </details>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact Form */}
        <section className="grid gap-12 md:grid-cols-2 items-start">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Still need help?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our team responds to every message. Use this form to reach us for billing questions,
              technical issues, or general feedback. You'll get an email confirmation with a ticket
              reference.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground pt-4 border-t border-border/60">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                Confirmation email sent after submission
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                Unique ticket ID for every request
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                No account required to submit
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Send a Message</CardTitle>
              <CardDescription>We'll respond as quickly as possible.</CardDescription>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="text-center space-y-4 py-6">
                  <CheckCircle2 className="size-14 text-emerald-500 mx-auto" />
                  <h3 className="text-lg font-semibold">Message Received</h3>
                  <p className="text-muted-foreground text-sm">
                    Thanks, {name}! We'll be in touch at <strong>{email}</strong>.
                  </p>
                  {ticketId && (
                    <p className="text-xs font-mono text-muted-foreground bg-muted/40 rounded px-3 py-2">
                      Ticket ID: {ticketId}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSubmitted(false);
                      setName("");
                      setEmail("");
                      setSubject("");
                      setMessage("");
                    }}
                  >
                    Submit Another Request
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="support-name">Full Name</Label>
                      <Input
                        id="support-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Your name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="support-email">Email Address</Label>
                      <Input
                        id="support-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-category">Category</Label>
                    <select
                      id="support-category"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {CONTACT_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-subject">Subject</Label>
                    <Input
                      id="support-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      placeholder="Brief description of your issue"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-message">Message</Label>
                    <textarea
                      id="support-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      rows={5}
                      placeholder="Describe your issue or question in detail..."
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    />
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Mail className="size-4" />
                    )}
                    Send Message
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 mt-16 bg-muted/20">
        <div className="mx-auto max-w-6xl px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={logo} width={28} height={28} alt="SoloOS" />
            <span className="font-semibold text-foreground">SoloOS</span>
            <span>— The Financial OS for Independent Professionals</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/pricing" className="hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link to="/support" className="text-foreground font-medium transition-colors">
              Support
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
