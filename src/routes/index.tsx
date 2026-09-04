import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Banknote, LineChart, ShieldCheck, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SoloOS — The financial operating system for independent professionals" },
      {
        name: "description",
        content:
          "SoloOS helps freelancers, consultants and solo businesses know what they earned, what they keep, and what to do next.",
      },
      {
        property: "og:title",
        content: "SoloOS — The financial operating system for independent professionals",
      },
      {
        property: "og:description",
        content:
          "Understand your money, your clients and your cashflow in one calm financial command center.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const PILLARS = [
  {
    icon: Banknote,
    title: "Know what you earned",
    body: "Every invoice, payment and client tracked in one authoritative ledger.",
  },
  {
    icon: Wallet,
    title: "Know what you keep",
    body: "Tax reserve, operating buffer and true take-home, calculated exactly.",
  },
  {
    icon: LineChart,
    title: "Stay ahead of cashflow",
    body: "See what is coming in, what is owed, and when it lands.",
  },
  {
    icon: ShieldCheck,
    title: "Decide with confidence",
    body: "Profitability per client and project, so you know where to spend effort.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <span className="text-display text-lg font-semibold tracking-tight">SoloOS</span>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth" search={{ mode: "signin" }}>
              Sign in
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth" search={{ mode: "signup" }}>
              Get started
            </Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:pt-20">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
            For independent professionals
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] sm:text-6xl">
            The financial operating system for independent professionals.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Know what you earned. Know what you keep. Know what to do next. SoloOS brings
            invoicing, expenses, cash, profitability and tax into one calm command center.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Get started
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth" search={{ mode: "signin" }}>
                Sign in
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="panel p-5">
                <span className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                  <Icon className="size-4" aria-hidden />
                </span>
                <h2 className="mt-4 text-base font-semibold">{title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-6 text-sm text-muted-foreground">
          <span>SoloOS</span>
          <span>Built for people who run their own business.</span>
        </div>
      </footer>
    </div>
  );
}
