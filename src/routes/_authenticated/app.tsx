import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app/app-shell";
import { WorkspaceProvider } from "@/components/app/workspace-context";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <WorkspaceProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </WorkspaceProvider>
  );
}
