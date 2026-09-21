import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Calculator, FileText, Shield, TrendingUp, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/tools/")({
  head: () => ({
    meta: [
      { title: "Free Financial Tools for Independent Operators | SoloOS" },
      {
        name: "description",
        content:
          "Free calculators: Safe-to-Spend, Cash Runway, Profit, Invoice Profit, Tax Reserve. Built for freelancers and independent operators.",
      },
    ],
  }),
  component: ToolsHubPage,
});

const TOOLS = [
  {
    href: "/tools/safe-to-spend",
    icon: Zap,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    title: "Safe-to-Spend Estimator",
    description:
      "Estimate how much you can safely spend after accounting for tax reserves, obligations, and operating buffers.",
    tags: ["Planning", "Cash"],
  },
  {
    href: "/tools/cash-runway",
    icon: TrendingUp,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    title: "Cash Runway Calculator",
    description: "Calculate how many months your current cash can sustain your burn rate.",
    tags: ["Runway", "Survival"],
  },
  {
    href: "/tools/profit-calculator",
    icon: BarChart3,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    title: "Profit Margin Calculator",
    description:
      "Calculate gross and net profit margins from revenue, direct costs, and operating expenses.",
    tags: ["Profit", "Margin"],
  },
  {
    href: "/tools/invoice-profit",
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    title: "Invoice Profit Estimator",
    description:
      "Estimate profit on an invoice after accounting for direct costs, project overhead, and payment processing fees.",
    tags: ["Invoicing", "Pricing"],
  },
  {
    href: "/tools/tax-reserve",
    icon: Shield,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    title: "Tax Reserve Planner",
    description:
      "Plan how much to set aside for taxes based on your estimated taxable income and planning rate.",
    tags: ["Tax", "Planning"],
  },
];

function ToolsHubPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <div className="border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-sm font-semibold flex items-center gap-2">
            <Calculator className="size-4 text-primary" />
            SoloOS
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth" search={{ mode: "signin" as const }}>
              <Button variant="ghost" size="sm" id="tools-nav-signin">
                Sign In
              </Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" as const }}>
              <Button size="sm" id="tools-nav-signup">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16 space-y-16">
        {/* Hero */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">
            <Calculator className="size-3" />
            Free Financial Tools
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Financial Calculators for Independent Operators
          </h1>
          <p className="text-base text-muted-foreground">
            No sign-up required. Transparent math. Exact decimal precision. Built for freelancers,
            consultants, and solo business owners.
          </p>
        </div>

        {/* Tool cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card
                key={tool.href}
                className="group hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <CardHeader className="pb-2">
                  <div
                    className={`size-10 rounded-xl ${tool.bg} flex items-center justify-center mb-2`}
                  >
                    <Icon className={`size-5 ${tool.color}`} />
                  </div>
                  <CardTitle className="text-base">{tool.title}</CardTitle>
                  <CardDescription className="text-sm">{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {tool.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <Link to={tool.href}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-primary group-hover:bg-primary/10"
                        id={`tool-card-${tool.href.replace("/tools/", "")}`}
                      >
                        Use Tool <ArrowRight className="size-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 px-8 py-12 space-y-4">
          <h2 className="text-xl font-bold">Automate All of This in SoloOS</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            These tools use manual inputs. Connect SoloOS to your actual accounts and get live
            financial intelligence — cash runway, tax reserve, profitability — automatically
            updated.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to="/auth" search={{ mode: "signup" as const }}>
              <Button size="lg" id="tools-cta-get-started">
                Get Started Free
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" size="lg" id="tools-cta-learn-more">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
