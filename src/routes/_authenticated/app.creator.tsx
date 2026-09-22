import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/creator")({
  beforeLoad: () => {
    throw redirect({ to: "/creator" });
  },
  component: () => null,
});
