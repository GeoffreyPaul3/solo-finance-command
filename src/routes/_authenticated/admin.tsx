import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeAlert,
  BarChart3,
  CreditCard,
  DollarSign,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  LucideIcon,
  Receipt,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { platformAdminRoleQueryOptions } from "@/domain/admin";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
}

const ADMIN_NAV: NavItem[] = [
  { label: "Overview", to: "/admin", icon: LayoutDashboard },
  { label: "Analytics", to: "/admin/analytics", icon: BarChart3 },
  { label: "Users", to: "/admin/users", icon: Users },
  { label: "Workspaces", to: "/admin/workspaces", icon: Shield },
  { label: "Subscriptions", to: "/admin/subscriptions", icon: CreditCard },
  { label: "Revenue", to: "/admin/revenue", icon: DollarSign },
  { label: "Payments", to: "/admin/payments", icon: Receipt },
  { label: "Support", to: "/admin/support", icon: HelpCircle },
  { label: "Audit Log", to: "/admin/audit", icon: ShieldCheck },
];

function AdminLayout() {
  const { user } = useAuth();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const { data: adminRole, isLoading } = useQuery(platformAdminRoleQueryOptions(user?.id));

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Shield className="size-8 animate-pulse text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Verifying administrative access...
          </p>
        </div>
      </div>
    );
  }

  if (!adminRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="mx-auto max-w-md text-center space-y-5">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="size-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Access Restricted</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Platform administrator privileges are required to view this area. Your account (
              <span className="font-mono text-foreground">{user?.email}</span>) does not have an
              active platform administrative role.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link to="/app">
                <ArrowLeft className="mr-2 size-4" />
                Return to Workspace
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[250px_1fr]">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col border-r border-border bg-sidebar px-4 py-5 justify-between">
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2 pb-4 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500 font-bold text-sm">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-foreground block">
                  SoloOS Admin
                </span>
                <span className="text-[10px] uppercase font-mono text-amber-500 tracking-wider">
                  {adminRole.role}
                </span>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.to === "/admin"
                  ? pathname === "/admin" || pathname === "/admin/"
                  : pathname.startsWith(item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-card hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-border/60 pt-4 space-y-2">
          <div className="px-3 py-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground truncate">{user?.email}</p>
            <p className="capitalize">Role: {adminRole.role}</p>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2">
            <Link to="/app">
              <ArrowLeft className="size-3.5" />
              SoloOS App
            </Link>
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden border-b border-border bg-sidebar p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-amber-500" />
          <span className="font-bold text-sm">SoloOS Admin</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/app">Back to App</Link>
        </Button>
      </div>

      {/* Main Outlet */}
      <main className="min-w-0 p-4 sm:p-8 lg:p-10">
        <Outlet />
      </main>
    </div>
  );
}
