import { Link, createFileRoute } from "@tanstack/react-router";
import { Activity, ClipboardList, Compass, ListChecks } from "lucide-react";

import { useWorkspace } from "@/components/app/workspace-context";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Command Center | SoloOS" },
      {
        name: "description",
        content: "Your SoloOS command center: what you earned, what you keep, what to do next.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CommandCenter,
});

/** Sections of the eventual Command Center. Values arrive with the Phase 2 financial engine. */
const SECTIONS = [
  {
    icon: Compass,
    title: "Financial overview",
    body: "Revenue, expenses, net income, cash, outstanding and safe-to-spend will appear here once you record real financial activity.",
  },
  {
    icon: Activity,
    title: "Business health",
    body: "Health signals are calculated from your own records only. Nothing is estimated or simulated.",
  },
  {
    icon: ListChecks,
    title: "Action center",
    body: "Overdue invoices, unreconciled payments and tax reminders will surface here when they genuinely exist.",
  },
  {
    icon: ClipboardList,
    title: "Recent activity",
    body: "A running log of real financial and business events in this workspace.",
  },
];

function CommandCenter() {
  const { workspace, profile } = useWorkspace();
  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-5xl">
      <header>
        <p className="text-sm text-muted-foreground">{workspace.name}</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
          {firstName ? `Welcome, ${firstName}` : "Command Center"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Your workspace is set up. SoloOS has no financial records yet, so there is nothing to
          report — and it will never show a number it hasn't actually recorded.
        </p>
      </header>

      <section aria-labelledby="get-started" className="panel mt-8 p-6">
        <h2 id="get-started" className="text-base font-semibold">
          Getting started
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          The modules below are being built in sequence. Open any of them to see exactly what it
          will do and when it arrives.
        </p>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {(
            [
              ["clients", "Add your first client"],
              ["projects", "Create your first project"],
              ["expenses", "Record income and expenses"],
              ["invoices", "Create your first invoice"],
            ] as const
          ).map(([mod, label]) => (
            <li key={mod}>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/app/$module" params={{ module: mod }}>
                  {label}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="structure" className="mt-8">
        <h2 id="structure" className="text-base font-semibold">
          What this page becomes
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {SECTIONS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="panel p-5">
              <span className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <Icon className="size-4" aria-hidden />
              </span>
              <h3 className="mt-4 text-sm font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
