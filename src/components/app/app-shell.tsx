import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Banknote,
  Bot,
  Briefcase,
  Building2,
  Calculator,
  ChevronDown,
  CreditCard,
  FileText,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Receipt,
  Settings as SettingsIcon,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useWorkspace } from "@/components/app/workspace-context";
import { ROLE_LABEL } from "@/domain/workspace";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** Modules that are not yet built. Route: /app/$module (placeholder page). */
export const MODULES = {
  invoices: { label: "Invoices", icon: FileText, phase: 4 },
  payments: { label: "Payments", icon: CreditCard, phase: 4 },
  expenses: { label: "Expenses", icon: Receipt, phase: 2 },
  cash: { label: "Cash", icon: Wallet, phase: 7 },
  profitability: { label: "Profitability", icon: Gauge, phase: 6 },
  taxes: { label: "Taxes", icon: Calculator, phase: 7 },
  reports: { label: "Reports", icon: BarChart3, phase: 8 },
  insights: { label: "Insights", icon: Lightbulb, phase: 8 },
  "ai-cfo": { label: "AI CFO", icon: Bot, phase: 9 },
} as const;

export type ModuleKey = keyof typeof MODULES;

export function isModuleKey(value: string): value is ModuleKey {
  return Object.prototype.hasOwnProperty.call(MODULES, value);
}

type NavItem =
  | {
      kind: "route";
      to: "/app" | "/app/settings" | "/app/cash" | "/app/clients" | "/app/projects";
      label: string;
      icon: LucideIcon;
    }
  | { kind: "module"; module: ModuleKey; label: string; icon: LucideIcon };

type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Run",
    items: [
      { kind: "route", label: "Command Center", icon: LayoutDashboard, to: "/app" },
      { kind: "route", label: "Clients", icon: Users, to: "/app/clients" },
      { kind: "route", label: "Projects", icon: Briefcase, to: "/app/projects" },
    ],
  },
  {
    label: "Money",
    items: [
      { kind: "module", label: "Invoices", icon: FileText, module: "invoices" },
      { kind: "module", label: "Payments", icon: CreditCard, module: "payments" },
      { kind: "module", label: "Expenses", icon: Receipt, module: "expenses" },
      { kind: "route", label: "Cash & Accounts", icon: Wallet, to: "/app/cash" },
    ],
  },
  {
    label: "Understand",
    items: [
      { kind: "module", label: "Profitability", icon: Gauge, module: "profitability" },
      { kind: "module", label: "Taxes", icon: Calculator, module: "taxes" },
      { kind: "module", label: "Reports", icon: BarChart3, module: "reports" },
      { kind: "module", label: "Insights", icon: Lightbulb, module: "insights" },
    ],
  },
  {
    label: "Intelligence",
    items: [{ kind: "module", label: "AI CFO", icon: Bot, module: "ai-cfo" }],
  },
  {
    label: "System",
    items: [{ kind: "route", label: "Settings", icon: SettingsIcon, to: "/app/settings" }],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav aria-label="Primary" className="flex flex-col gap-6 py-2">
      {NAV.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80">
            {group.label}
          </p>
          <ul className="mt-2 space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const href = item.kind === "module" ? `/app/${item.module}` : item.to;
              const active =
                item.kind === "module"
                  ? pathname === href
                  : item.to === "/app"
                    ? pathname === "/app"
                    : pathname.startsWith(item.to);
              const className = cn(
                "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 relative",
                active
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-xs"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              );

              return (
                <li key={item.label}>
                  {item.kind === "module" ? (
                    <Link
                      to="/app/$module"
                      params={{ module: item.module }}
                      onClick={onNavigate}
                      className={className}
                    >
                      <Icon
                        className="size-4 shrink-0 transition-transform group-hover:scale-105"
                        aria-hidden
                      />
                      <span className="flex-1">{item.label}</span>
                      <span className="rounded bg-muted/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Soon
                      </span>
                    </Link>
                  ) : (
                    <Link to={item.to} onClick={onNavigate} className={className}>
                      <Icon
                        className="size-4 shrink-0 transition-transform group-hover:scale-105"
                        aria-hidden
                      />
                      <span className="flex-1">{item.label}</span>
                      {active && <span className="size-1.5 rounded-full bg-primary" aria-hidden />}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserMenu() {
  const { workspace, role, profile } = useWorkspace();
  const { user, signOut } = useAuth();
  const name = profile?.full_name || user?.email || "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-2.5 px-3 py-2.5 text-left border border-border/60 hover:border-border hover:bg-card/70 transition-all rounded-lg"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground shadow-xs">
            {name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
            <span className="block truncate text-xs text-muted-foreground">{workspace.name}</span>
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-2 shadow-xl border border-border">
        <DropdownMenuLabel className="space-y-1 px-2 py-1.5">
          <p className="text-sm font-semibold">{profile?.full_name ?? "Your profile"}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 truncate">
            <Building2 className="size-3.5" aria-hidden />
            <span className="truncate">{workspace.name}</span>
          </span>
          <span className="rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase">
            {ROLE_LABEL[role]}
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app/settings" className="cursor-pointer">
            <SettingsIcon className="size-4 mr-2" aria-hidden />
            Workspace Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => void signOut()}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { workspace } = useWorkspace();

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[260px_1fr]">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-sidebar px-4 py-5 lg:flex">
        <div className="flex items-center justify-between px-2 pb-4 border-b border-border/60">
          <Link to="/app" className="flex items-center gap-2.5 group">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-xs">
              S
            </span>
            <span className="text-display text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              SoloOS
            </span>
          </Link>
          <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
            v2.0
          </span>
        </div>

        {/* Workspace pill */}
        <div className="mt-3 px-2 py-2 rounded-lg bg-muted/30 border border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate text-xs font-medium text-foreground">{workspace.name}</span>
          </div>
          <span className="text-[10px] uppercase font-mono text-muted-foreground shrink-0">
            Live
          </span>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto pr-1">
          <NavLinks />
        </div>

        <div className="border-t border-border/60 pt-3">
          <UserMenu />
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Open navigation">
              <Menu className="size-4" aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] overflow-y-auto p-4">
            <div className="flex items-center gap-2 px-2 pb-4 border-b border-border/60">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
                S
              </span>
              <SheetTitle className="text-display text-lg font-bold">SoloOS</SheetTitle>
            </div>
            <div className="mt-4">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <div className="mt-6 border-t border-border pt-4">
              <UserMenu />
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
            S
          </span>
          <span className="text-display text-base font-bold">SoloOS</span>
        </div>
        <Link
          to="/app/settings"
          aria-label="Settings"
          className="flex size-9 items-center justify-center rounded-md border border-border bg-card"
        >
          <SettingsIcon className="size-4" aria-hidden />
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="min-w-0 px-4 py-6 sm:px-8 lg:px-12 lg:py-10">{children}</main>
    </div>
  );
}

export function ModulePlaceholder({ moduleKey }: { moduleKey: ModuleKey }) {
  const mod = MODULES[moduleKey];
  const Icon = mod.icon;
  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="panel p-8 bg-card border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden />
          </span>
          <span className="rounded-full bg-muted border border-border px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
            Phase {mod.phase} Upcoming
          </span>
        </div>
        <h1 className="text-display mt-6 text-2xl font-bold tracking-tight text-foreground">
          {mod.label}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          {mod.label} is scheduled for rollout in Phase {mod.phase}. SoloOS strictly derives metrics
          from actual transactional records and will never display fabricated or speculative
          numbers.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border/60 pt-6">
          <Button asChild variant="outline" size="sm">
            <Link to="/app">
              <Banknote className="mr-1.5 size-4" aria-hidden />
              Command Center
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/app/cash">
              <Wallet className="mr-1.5 size-4" aria-hidden />
              Live Cash Accounts
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
