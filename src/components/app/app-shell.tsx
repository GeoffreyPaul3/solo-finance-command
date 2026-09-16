import { useQuery } from "@tanstack/react-query";
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
  LifeBuoy,
  Lock,
  Menu,
  Receipt,
  Settings as SettingsIcon,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { platformAdminRoleQueryOptions } from "@/domain/admin";
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
import logo from "@/assets/solo.png";

type NavItem = {
  to:
    | "/app"
    | "/app/settings"
    | "/app/cash"
    | "/app/clients"
    | "/app/projects"
    | "/app/invoices"
    | "/app/payments"
    | "/app/expenses"
    | "/app/obligations"
    | "/app/profitability"
    | "/app/taxes"
    | "/app/reports"
    | "/app/insights"
    | "/app/ai-cfo"
    | "/app/analytics"
    | "/app/audit";
  label: string;
  icon: LucideIcon;
  /** When set, a lock icon is shown for users who lack this entitlement. */
  requiredEntitlement?: "canUseAiCfo" | "canAccessAnalytics" | "canExportPdfReports" | "canAccessAudit";
};

type NavGroup = { label: string; items: NavItem[] };

/**
 * Navigation information architecture.
 * Reflects the user's mental model of their financial world,
 * not the database schema or build phases.
 */
const NAV: NavGroup[] = [
  {
    label: "Command Center",
    items: [{ label: "Dashboard", icon: LayoutDashboard, to: "/app" }],
  },
  {
    label: "Money",
    items: [
      { label: "Cash & Accounts", icon: Wallet, to: "/app/cash" },
      { label: "Invoices", icon: FileText, to: "/app/invoices" },
      { label: "Payments", icon: CreditCard, to: "/app/payments" },
      { label: "Expenses", icon: Receipt, to: "/app/expenses" },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Clients", icon: Users, to: "/app/clients" },
      { label: "Projects", icon: Briefcase, to: "/app/projects" },
    ],
  },
  {
    label: "Planning",
    items: [
      { label: "Obligations", icon: Banknote, to: "/app/obligations" },
      { label: "Tax Reserve", icon: Calculator, to: "/app/taxes" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Profitability", icon: Gauge, to: "/app/profitability", requiredEntitlement: "canAccessAnalytics" },
      { label: "Insights", icon: Lightbulb, to: "/app/insights", requiredEntitlement: "canAccessAnalytics" },
      { label: "Analytics", icon: TrendingUp, to: "/app/analytics", requiredEntitlement: "canAccessAnalytics" },
      { label: "AI CFO", icon: Bot, to: "/app/ai-cfo", requiredEntitlement: "canUseAiCfo" },
    ],
  },
  {
    label: "Reporting",
    items: [
      { label: "Reports", icon: BarChart3, to: "/app/reports", requiredEntitlement: "canExportPdfReports" },
      { label: "Audit Trail", icon: ShieldCheck, to: "/app/audit", requiredEntitlement: "canAccessAudit" },
    ],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { entitlements } = useWorkspace();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-5 py-2">
      {NAV.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/55 mb-1.5">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active =
                item.to === "/app" ? pathname === "/app" : pathname.startsWith(item.to);
              const isLocked = item.requiredEntitlement
                ? !entitlements[item.requiredEntitlement]
                : false;
              const className = cn(
                "group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              );

              return (
                <li key={item.label}>
                  <Link to={item.to} onClick={onNavigate} className={className}>
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-transform duration-150",
                        active
                          ? "text-primary"
                          : "text-muted-foreground/60 group-hover:text-foreground",
                      )}
                      aria-hidden
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isLocked && !active && (
                      <Lock
                        className="ml-auto size-3 shrink-0 text-muted-foreground/40"
                        aria-label="Requires upgrade"
                      />
                    )}
                    {active && !isLocked && (
                      <span
                        className="ml-auto size-1.5 rounded-full bg-primary shrink-0"
                        aria-hidden
                      />
                    )}
                  </Link>
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
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();
  const { data: adminRole } = useQuery(platformAdminRoleQueryOptions(user?.id));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors rounded-lg"
          aria-label="Account menu"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-foreground leading-tight">
              {profile?.full_name ?? name}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground leading-tight mt-0.5">
              {workspace.name}
            </span>
          </span>
          <ChevronDown className="size-3 text-muted-foreground/50 shrink-0" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60 p-1.5 shadow-xl border border-border">
        <DropdownMenuLabel className="space-y-0.5 px-2 py-2">
          <p className="text-[13px] font-semibold">{profile?.full_name ?? "Your profile"}</p>
          <p className="truncate text-[11px] font-normal text-muted-foreground">{user?.email}</p>
        </DropdownMenuLabel>
        <div className="mx-2 mb-1 flex items-center justify-between rounded bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5 truncate min-w-0">
            <Building2 className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{workspace.name}</span>
          </span>
          <span className="ml-2 shrink-0 rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            {ROLE_LABEL[role]}
          </span>
        </div>
        <DropdownMenuSeparator />
        {adminRole && (
          <>
            <DropdownMenuItem asChild>
              <Link
                to="/admin"
                className="cursor-pointer text-amber-600 dark:text-amber-400 focus:text-amber-600 dark:focus:text-amber-400 font-medium gap-2"
              >
                <ShieldCheck className="size-3.5" aria-hidden />
                Platform Admin
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link to="/app/settings" className="cursor-pointer gap-2">
            <SettingsIcon className="size-3.5" aria-hidden />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => void signOut()}
          className="cursor-pointer text-destructive focus:text-destructive gap-2"
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
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[240px_1fr]">
      {/* ── Desktop Sidebar ── */}
      <aside
        className="sticky top-0 hidden h-screen flex-col border-r border-border/60 bg-sidebar lg:flex"
        aria-label="Application navigation"
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/40">
          <Link
            to="/app"
            className="flex items-center gap-2 group min-w-0"
            aria-label="SoloOS Dashboard"
          >
            <img src={logo} width={26} height={26} alt="SoloOS" className="shrink-0" />
            <span className="text-display text-[15px] font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              SoloOS
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1 shrink-0"></div>
        </div>

        {/* Workspace context */}
        <div className="px-5 py-2.5 border-b border-border/30">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50 mb-0.5">
            Workspace
          </p>
          <p className="text-[13px] font-medium text-foreground truncate">{workspace.name}</p>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          <NavLinks />
        </div>

        {/* Footer */}
        <div className="border-t border-border/40 px-3 pt-2.5 pb-4 space-y-0.5">
          <Link
            to="/app/settings"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <SettingsIcon className="size-3.5 shrink-0" aria-hidden />
            Settings
          </Link>
          <a
            href="/support"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <LifeBuoy className="size-3.5 shrink-0" aria-hidden />
            Support
          </a>
          <div className="pt-2">
            <UserMenu />
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Header ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation" className="size-9">
              <Menu className="size-4" aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[272px] overflow-y-auto p-0">
            {/* Mobile sheet header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <img src={logo} width={22} height={22} alt="SoloOS" />
                <SheetTitle className="text-display text-[15px] font-bold">SoloOS</SheetTitle>
              </div>
              <div className="flex items-center gap-1"></div>
            </div>
            <div className="px-5 py-2.5 border-b border-border/30 bg-muted/20">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                Workspace
              </p>
              <p className="text-[13px] font-medium text-foreground mt-0.5 truncate">
                {workspace.name}
              </p>
            </div>
            <div className="px-3 py-4">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t border-border/40 px-3 pt-2.5 pb-4 space-y-0.5">
              <a
                href="/support"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <LifeBuoy className="size-3.5 shrink-0" aria-hidden />
                Support
              </a>
              <div className="pt-1">
                <UserMenu />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Mobile logo */}
        <div className="flex items-center gap-2">
          <img src={logo} width={20} height={20} alt="SoloOS" />
          <span className="text-display text-[15px] font-bold">SoloOS</span>
        </div>

        {/* Mobile quick link */}
        <Link
          to="/app/settings"
          aria-label="Settings"
          className="flex size-9 items-center justify-center rounded-md border border-border/60 bg-card text-muted-foreground hover:text-foreground transition-colors"
        >
          <SettingsIcon className="size-4" aria-hidden />
        </Link>
      </header>

      {/* ── Main Content ── */}
      <main className="min-w-0 px-4 py-7 sm:px-8 sm:py-9">{children}</main>
    </div>
  );
}

export const MODULES: Record<string, { label: string; icon: LucideIcon; phase: number }> = {};
export type ModuleKey = string;

export function isModuleKey(value: string): value is ModuleKey {
  return Object.prototype.hasOwnProperty.call(MODULES, value);
}

export function ModulePlaceholder({ moduleKey }: { moduleKey: ModuleKey }) {
  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="rounded-xl p-8 bg-card border border-border shadow-sm">
        <h1 className="text-display text-2xl font-bold tracking-tight text-foreground">
          {moduleKey}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          This module is configured in SoloOS.
        </p>
      </div>
    </div>
  );
}
