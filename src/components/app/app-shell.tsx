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
  clients: { label: "Clients", icon: Users, phase: 3 },
  projects: { label: "Projects", icon: Briefcase, phase: 3 },
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
  | { kind: "route"; to: "/app" | "/app/settings"; label: string; icon: LucideIcon }
  | { kind: "module"; module: ModuleKey; label: string; icon: LucideIcon };

type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Run",
    items: [
      { kind: "route", label: "Command Center", icon: LayoutDashboard, to: "/app" },
      { kind: "module", label: "Clients", icon: Users, module: "clients" },
      { kind: "module", label: "Projects", icon: Briefcase, module: "projects" },
    ],
  },
  {
    label: "Money",
    items: [
      { kind: "module", label: "Invoices", icon: FileText, module: "invoices" },
      { kind: "module", label: "Payments", icon: CreditCard, module: "payments" },
      { kind: "module", label: "Expenses", icon: Receipt, module: "expenses" },
      { kind: "module", label: "Cash", icon: Wallet, module: "cash" },
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
    <nav aria-label="Primary" className="flex flex-col gap-6">
      {NAV.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {group.label}
          </p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const href = item.kind === "module" ? `/app/${item.module}` : item.to;
              const active = pathname === href;
              const className = cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-secondary font-medium text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
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
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="flex-1">{item.label}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Soon
                      </span>
                    </Link>
                  ) : (
                    <Link to={item.to} onClick={onNavigate} className={className}>
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span>{item.label}</span>
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
        <Button variant="ghost" className="h-auto w-full justify-start gap-2 px-3 py-2 text-left">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            {name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="block truncate text-xs text-muted-foreground">{workspace.name}</span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="space-y-1">
          <p className="text-sm font-medium">{profile?.full_name ?? "Your profile"}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
          <Building2 className="size-3.5" aria-hidden />
          {workspace.name} · {ROLE_LABEL[role]}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app/settings">
            <SettingsIcon className="size-4" aria-hidden />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut()}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-sidebar p-4 lg:flex">
        <Link to="/app" className="text-display px-3 py-2 text-lg font-semibold">
          SoloOS
        </Link>
        <div className="mt-4 flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="border-t border-border pt-2">
          <UserMenu />
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Open navigation">
              <Menu className="size-4" aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] overflow-y-auto p-4">
            <SheetTitle className="text-display px-3 text-lg">SoloOS</SheetTitle>
            <div className="mt-4">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <div className="mt-6 border-t border-border pt-2">
              <UserMenu />
            </div>
          </SheetContent>
        </Sheet>
        <span className="text-display text-base font-semibold">SoloOS</span>
        <Link
          to="/app/settings"
          aria-label="Settings"
          className="flex size-9 items-center justify-center rounded-md border border-border"
        >
          <SettingsIcon className="size-4" aria-hidden />
        </Link>
      </header>

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}

export function ModulePlaceholder({ moduleKey }: { moduleKey: ModuleKey }) {
  const mod = MODULES[moduleKey];
  const Icon = mod.icon;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="panel p-8">
        <span className="flex size-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-semibold">{mod.label}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {mod.label} is part of a later SoloOS build phase. Nothing is tracked here yet, and SoloOS
          will never show numbers it hasn't actually recorded.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Planned for phase {mod.phase} of the rollout.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/app">
              <Banknote className="size-4" aria-hidden />
              Back to Command Center
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/app/settings">Review settings</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
