import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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

const ACTIVE_WORKSPACE_KEY = "soloos.active-workspace";

type WorkspaceContextValue = {
  workspace: Workspace;
  role: AppRole;
  memberships: Membership[];
  profile: Profile | null;
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

  const value = useMemo<WorkspaceContextValue | null>(
    () =>
      active
        ? {
            workspace: active.workspace,
            role: active.role,
            memberships: rows,
            profile: profile.data ?? null,
            setActiveWorkspace,
          }
        : null,
    [active, rows, profile.data, setActiveWorkspace],
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
