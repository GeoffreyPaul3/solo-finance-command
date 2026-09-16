import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ErrorState, LoadingState } from "@/components/app/state";
import { useAuth } from "@/lib/auth";
import {
  membershipsQueryOptions,
  profileQueryOptions,
  type AppRole,
  type Membership,
  type Profile,
  type Workspace,
} from "@/domain/workspace";
import { workspaceSubscriptionQueryOptions } from "@/domain/subscriptions";
import { getWorkspaceEntitlements, type WorkspaceEntitlements } from "@/domain/entitlements";

const ACTIVE_WORKSPACE_KEY = "soloos.active-workspace";

type WorkspaceContextValue = {
  workspace: Workspace;
  role: AppRole;
  memberships: Membership[];
  profile: Profile | null;
  entitlements: WorkspaceEntitlements;
  setActiveWorkspace: (id: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

/**
 * Resolves the active workspace for the signed-in user.
 * Redirects to onboarding when the user has no workspace yet.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const memberships = useQuery(membershipsQueryOptions(user?.id));
  const profile = useQuery(profileQueryOptions(user?.id));
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setActiveId(window.localStorage.getItem(ACTIVE_WORKSPACE_KEY));
  }, []);

  const setActiveWorkspace = useCallback((id: string) => {
    setActiveId(id);
    if (typeof window !== "undefined") window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
  }, []);

  const rows = memberships.data ?? [];
  const active = useMemo(
    () => rows.find((m) => m.workspace.id === activeId) ?? rows[0],
    [rows, activeId],
  );

  useEffect(() => {
    if (memberships.isSuccess && rows.length === 0) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [memberships.isSuccess, rows.length, navigate]);

  // Fetch subscription for the active workspace and compute entitlements.
  // This is deliberately placed here so that every route that calls
  // useWorkspace() gets the same cached, authoritative entitlements without
  // each page having to independently fetch subscription data.
  const subscriptionQuery = useQuery(workspaceSubscriptionQueryOptions(active?.workspace.id));

  const entitlements = useMemo(
    () => getWorkspaceEntitlements(active?.workspace.plan, subscriptionQuery.data ?? null),
    [active?.workspace.plan, subscriptionQuery.data],
  );

  const value = useMemo<WorkspaceContextValue | null>(
    () =>
      active
        ? {
            workspace: active.workspace,
            role: active.role,
            memberships: rows,
            profile: profile.data ?? null,
            entitlements,
            setActiveWorkspace,
          }
        : null,
    [active, rows, profile.data, entitlements, setActiveWorkspace],
  );

  if (memberships.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label="Loading your workspace" />
      </div>
    );
  }

  if (memberships.isError) {
    return (
      <div className="mx-auto max-w-md p-6">
        <ErrorState
          title="We couldn't load your workspace"
          message={(memberships.error as Error).message}
          onRetry={() => void memberships.refetch()}
        />
      </div>
    );
  }

  if (!value) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label="Preparing setup" />
      </div>
    );
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return ctx;
}
