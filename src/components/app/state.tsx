import { AlertTriangle, Loader2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-40 flex-col items-center justify-center gap-3 text-muted-foreground"
    >
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <p className="text-sm">{label}…</p>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="panel flex flex-col items-start gap-3 p-6">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="size-4" aria-hidden />
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        {message ?? "We couldn't load this data. Check your connection and try again."}
      </p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-start gap-3 p-6">
      {Icon ? (
        <span className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
