import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, Edit3, Flag, Loader2, Plus, Target, Trash2 } from "lucide-react";

import { useWorkspace } from "@/components/app/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  goalsQueryOptions,
  createFinancialGoal,
  updateFinancialGoal,
  deleteFinancialGoal,
  calculateGoalProgress,
  GOAL_CATEGORY_LABELS,
  GOAL_STATUS_LABELS,
  type FinancialGoal,
  type GoalCategory,
  type GoalStatus,
} from "@/domain/goals";
import { formatMoney, parseMoneyInput } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/goals")({
  head: () => ({
    meta: [
      { title: "Financial Goals | SoloOS" },
      {
        name: "description",
        content:
          "SoloOS Financial Goals: plan and track your business financial milestones. Emergency fund, tax reserve, equipment, growth fund, and custom goals.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GoalsPage,
});

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS: Array<{ value: GoalStatus | "all"; label: string }> = [
  { value: "all", label: "All Goals" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "Paused" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE: Record<GoalStatus, string> = {
  in_progress: "bg-blue-500/10 text-blue-500",
  completed: "bg-emerald-500/10 text-emerald-500",
  paused: "bg-amber-500/10 text-amber-500",
  cancelled: "bg-zinc-500/10 text-zinc-500",
};

const CATEGORY_COLORS: Record<GoalCategory, string> = {
  emergency_fund: "text-rose-500 bg-rose-500/10",
  business_buffer: "text-blue-500 bg-blue-500/10",
  tax_reserve: "text-violet-500 bg-violet-500/10",
  equipment: "text-amber-500 bg-amber-500/10",
  growth_fund: "text-emerald-500 bg-emerald-500/10",
  custom: "text-slate-500 bg-slate-500/10",
};

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  onEdit,
  onDelete,
  canMutate,
}: {
  goal: FinancialGoal;
  onEdit: (g: FinancialGoal) => void;
  onDelete: (g: FinancialGoal) => void;
  canMutate: boolean;
}) {
  const progress = useMemo(
    () =>
      calculateGoalProgress({
        targetAmount: Number(goal.target_amount),
        currentAmount: Number(goal.current_amount),
        targetDate: goal.target_date,
      }),
    [goal],
  );

  const categoryColor =
    CATEGORY_COLORS[goal.category as GoalCategory] ?? "text-slate-500 bg-slate-500/10";
  const statusBadge = STATUS_BADGE[goal.status as GoalStatus] ?? "bg-muted text-muted-foreground";

  return (
    <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-lg flex-shrink-0",
                categoryColor,
              )}
            >
              <Flag className="size-3.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">{goal.name}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {GOAL_CATEGORY_LABELS[goal.category as GoalCategory] ?? goal.category}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", statusBadge)}>
              {GOAL_STATUS_LABELS[goal.status as GoalStatus] ?? goal.status}
            </span>
            {canMutate && (
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => onEdit(goal)}
                  aria-label={`Edit ${goal.name}`}
                >
                  <Edit3 className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-rose-500"
                  onClick={() => onDelete(goal)}
                  aria-label={`Delete ${goal.name}`}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-end justify-between text-xs">
            <span
              className={cn(
                "font-bold text-base tabular-nums",
                progress.isComplete ? "text-emerald-500" : "text-foreground",
              )}
            >
              {formatMoney(Number(goal.current_amount), goal.currency)}
            </span>
            <span className="text-muted-foreground tabular-nums">
              of {formatMoney(Number(goal.target_amount), goal.currency)}
            </span>
          </div>
          <Progress value={progress.percentComplete} className="h-2" />
          <div className="flex items-center justify-between text-[11px]">
            <span
              className={cn(
                "font-medium",
                progress.isComplete ? "text-emerald-500" : "text-muted-foreground",
              )}
            >
              {progress.statusLabel}
            </span>
            {progress.daysRemaining !== null && !progress.isComplete && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  progress.daysRemaining < 0 ? "text-rose-500" : "text-muted-foreground",
                )}
              >
                <Clock className="size-3" />
                {progress.daysRemaining < 0
                  ? `${Math.abs(progress.daysRemaining)}d overdue`
                  : `${progress.daysRemaining}d remaining`}
              </span>
            )}
          </div>
        </div>

        {!progress.isComplete && (
          <p className="text-[11px] text-muted-foreground">
            {formatMoney(progress.remainingAmount, goal.currency)} remaining to target
          </p>
        )}

        {goal.notes && (
          <p className="text-[11px] text-muted-foreground border-t border-border pt-2 line-clamp-2">
            {goal.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Goal Form Dialog ────────────────────────────────────────────────────────

interface GoalFormState {
  name: string;
  category: GoalCategory;
  targetAmount: string;
  currentAmount: string;
  currency: string;
  targetDate: string;
  notes: string;
  status: GoalStatus;
}

function makeDefaultState(defaultCurrency: string, goal?: FinancialGoal): GoalFormState {
  if (goal) {
    return {
      name: goal.name,
      category: goal.category as GoalCategory,
      targetAmount: String(Number(goal.target_amount)),
      currentAmount: String(Number(goal.current_amount)),
      currency: goal.currency,
      targetDate: goal.target_date ?? "",
      notes: goal.notes ?? "",
      status: goal.status as GoalStatus,
    };
  }
  return {
    name: "",
    category: "emergency_fund",
    targetAmount: "",
    currentAmount: "0",
    currency: defaultCurrency,
    targetDate: "",
    notes: "",
    status: "in_progress",
  };
}

function GoalFormDialog({
  open,
  mode,
  goal,
  workspaceId,
  defaultCurrency,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  goal?: FinancialGoal;
  workspaceId: string;
  defaultCurrency: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<GoalFormState>(() => makeDefaultState(defaultCurrency, goal));
  const [error, setError] = useState<string | null>(null);

  // Reset when dialog opens
  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setForm(makeDefaultState(defaultCurrency, goal));
      setError(null);
    } else {
      onClose();
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const targetAmount = parseFloat(parseMoneyInput(form.targetAmount));
      const currentAmount = parseFloat(parseMoneyInput(form.currentAmount)) || 0;
      if (!form.name.trim()) throw new Error("Goal name is required.");
      if (isNaN(targetAmount) || targetAmount <= 0)
        throw new Error("Target amount must be greater than zero.");
      if (form.currency.length !== 3) throw new Error("Currency must be a 3-letter code.");

      if (mode === "create") {
        return createFinancialGoal(workspaceId, {
          name: form.name.trim(),
          category: form.category,
          targetAmount,
          currentAmount,
          currency: form.currency.toUpperCase(),
          targetDate: form.targetDate || null,
          notes: form.notes.trim() || null,
        });
      } else {
        return updateFinancialGoal(workspaceId, goal!.id, {
          name: form.name.trim(),
          category: form.category,
          targetAmount,
          currentAmount,
          currency: form.currency.toUpperCase(),
          targetDate: form.targetDate || null,
          notes: form.notes.trim() || null,
          status: form.status,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-goals", workspaceId] });
      onClose();
    },
    onError: (e: Error) => {
      setError(e.message);
    },
  });

  const set = <K extends keyof GoalFormState>(key: K, value: GoalFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Financial Goal" : "Edit Goal"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Set a planning milestone. Goals are for tracking only — they do not move funds."
              : "Update this goal's details or progress."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" id="goal-form">
          <div className="space-y-1.5">
            <Label htmlFor="goal-name">Goal Name</Label>
            <Input
              id="goal-name"
              placeholder="e.g. 6-Month Emergency Fund"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              maxLength={200}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => set("category", v as GoalCategory)}
              >
                <SelectTrigger id="goal-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GOAL_CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="goal-currency">Currency</Label>
              <Input
                id="goal-currency"
                placeholder="USD"
                maxLength={3}
                className="uppercase"
                value={form.currency}
                onChange={(e) => set("currency", e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-target-amount">Target Amount</Label>
              <MoneyInput
                id="goal-target-amount"
                placeholder="0.00"
                value={form.targetAmount}
                onChange={(v) => set("targetAmount", v)}
                currency={form.currency}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="goal-current-amount">Designated So Far</Label>
              <MoneyInput
                id="goal-current-amount"
                placeholder="0.00"
                value={form.currentAmount}
                onChange={(v) => set("currentAmount", v)}
                currency={form.currency}
              />
              <p className="text-[10px] text-muted-foreground">
                For tracking only — does not affect accounts.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal-target-date">Target Date (optional)</Label>
            <Input
              id="goal-target-date"
              type="date"
              value={form.targetDate}
              onChange={(e) => set("targetDate", e.target.value)}
            />
          </div>

          {mode === "edit" && (
            <div className="space-y-1.5">
              <Label htmlFor="goal-status">Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as GoalStatus)}>
                <SelectTrigger id="goal-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GOAL_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="goal-notes">Notes (optional)</Label>
            <Textarea
              id="goal-notes"
              placeholder="Describe this goal or note your strategy..."
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              maxLength={2000}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600">
              {error}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending} type="button">
            Cancel
          </Button>
          <Button type="submit" form="goal-form" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            {mode === "create" ? "Create Goal" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteGoalDialog({
  goal,
  workspaceId,
  onClose,
}: {
  goal: FinancialGoal | null;
  workspaceId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteFinancialGoal(workspaceId, goal!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-goals", workspaceId] });
      onClose();
    },
  });

  return (
    <Dialog open={Boolean(goal)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Goal</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{goal?.name}</strong>? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {deleteMutation.error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600">
            {(deleteMutation.error as Error).message}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            id="confirm-delete-goal"
          >
            {deleteMutation.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            Delete Goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function GoalsPage() {
  const { workspace, role } = useWorkspace();
  const canMutate = ["owner", "admin", "finance", "manager"].includes(role ?? "");

  const [statusFilter, setStatusFilter] = useState<GoalStatus | "all">("in_progress");
  const [showCreate, setShowCreate] = useState(false);
  const [editGoal, setEditGoal] = useState<FinancialGoal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinancialGoal | null>(null);

  const goalsQuery = useQuery(goalsQueryOptions(workspace.id, statusFilter));
  const goals = goalsQuery.data ?? [];

  const inProgressGoals = goals.filter((g) => g.status === "in_progress");
  const completedGoals = goals.filter((g) => g.status === "completed");

  return (
    <div className="mx-auto max-w-[1100px] space-y-8 pb-20">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70 mb-2">
            <Target className="size-3.5" />
            Planning
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Financial Goals
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
            Plan and track financial milestones. Goals are planning records only — they do not move
            funds or post to your accounts.
          </p>
        </div>
        {canMutate && (
          <Button
            onClick={() => setShowCreate(true)}
            className="gap-1.5 self-start sm:self-auto"
            id="create-goal-btn"
          >
            <Plus className="size-4" />
            New Goal
          </Button>
        )}
      </header>

      {/* Summary row */}
      {!goalsQuery.isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "In Progress", value: inProgressGoals.length, color: "text-blue-500" },
            { label: "Completed", value: completedGoals.length, color: "text-emerald-500" },
            {
              label: "Currencies",
              value: new Set(goals.map((g) => g.currency)).size,
              color: "text-foreground",
            },
            { label: "Total Goals", value: goals.length, color: "text-foreground" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              <p className={cn("text-xl font-bold tabular-nums mt-0.5", stat.color)}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={cn(
              "flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150",
              statusFilter === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
            aria-pressed={statusFilter === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Goal grid */}
      {goalsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
          <Target className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No goals found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {statusFilter === "in_progress"
              ? "Create your first financial planning goal."
              : `No ${statusFilter.replace("_", " ")} goals.`}
          </p>
          {canMutate && statusFilter === "in_progress" && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-1.5"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="size-3.5" />
              Create a Goal
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={setEditGoal}
              onDelete={setDeleteTarget}
              canMutate={canMutate}
            />
          ))}
        </div>
      )}

      {/* Planning disclaimer */}
      <div className="rounded-lg border border-dashed border-border/60 p-4">
        <p className="text-[11px] text-muted-foreground/70 flex items-start gap-1.5">
          <CheckCircle2 className="size-3.5 flex-shrink-0 mt-0.5 text-emerald-500/60" />
          Financial Goals are planning and designation constructs. Creating, editing, or updating
          goal progress does not post transactions, modify account balances, or affect your
          Safe-to-Spend calculation. Actual fund movement is handled exclusively through the
          financial accounts and transactions system.
        </p>
      </div>

      {/* Dialogs */}
      <GoalFormDialog
        open={showCreate}
        mode="create"
        workspaceId={workspace.id}
        defaultCurrency={workspace.currency ?? "USD"}
        onClose={() => setShowCreate(false)}
      />
      {editGoal && (
        <GoalFormDialog
          open={Boolean(editGoal)}
          mode="edit"
          goal={editGoal}
          workspaceId={workspace.id}
          defaultCurrency={workspace.currency ?? "USD"}
          onClose={() => setEditGoal(null)}
        />
      )}
      <DeleteGoalDialog
        goal={deleteTarget}
        workspaceId={workspace.id}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
