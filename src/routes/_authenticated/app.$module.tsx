import { createFileRoute, notFound } from "@tanstack/react-router";

import { ModulePlaceholder, isModuleKey } from "@/components/app/app-shell";

export const Route = createFileRoute("/_authenticated/app/$module")({
  head: () => ({
    meta: [
      { title: "Module | SoloOS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ModulePage,
});

function ModulePage() {
  const { module } = Route.useParams();
  if (!isModuleKey(module)) throw notFound();
  return <ModulePlaceholder moduleKey={module} />;
}
