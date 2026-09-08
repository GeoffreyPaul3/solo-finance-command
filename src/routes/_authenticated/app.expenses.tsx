import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Filter,
  Loader2,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  TrendingDown,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useWorkspace } from "@/components/app/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { MoneyValue } from "@/components/ui/money-value";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { accountsQueryOptions, categoriesQueryOptions } from "@/domain/financial";
import {
  expensesQueryOptions,
  recordExpenseWithMeta,
  reverseExpense,
  EXPENSE_STATUS_LABELS,
  type ExpenseFilters,
  type RecordExpenseWithMetaInput,
} from "@/domain/expenses";
import { clientsQueryOptions } from "@/domain/clients";
import { projectsQueryOptions } from "@/domain/projects";
import { roleAtLeast } from "@/domain/workspace";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/app/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses | SoloOS" },
      { name: "description", content: "Track and categorize all business expenses." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExpensesPage,
});

const defaultExpenseForm: RecordExpenseWithMetaInput = {
  accountId: "",
  amount: 0,
  transactionDate: new Date().toISOString().slice(0, 10),
  description: "",
  categoryId: undefined,
  vendor: "",
  projectId: undefined,
  clientId: undefined,
  notes: "",
  reference: "",
};

interface FormErrors {
  accountId?: string;
  amount?: string;
  description?: string;
  transactionDate?: string;
}

function ExpensesPage() {
  const { workspace, role } = useWorkspace();
  const queryClient = useQueryClient();
  const canMutate = roleAtLeast(role, "finance");

  const [filters, setFilters] = useState<ExpenseFilters>({ status: "posted" });
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [reverseDialog, setReverseDialog] = useState<{
    open: boolean;
    expenseId: string;
    amount: number;
    currency: string;
    description: string;
  } | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [form, setForm] = useState<RecordExpenseWithMetaInput>(defaultExpenseForm);
  const [amountStr, setAmountStr] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Queries
  const expensesQuery = useQuery(expensesQueryOptions(workspace.id, filters));
  const accountsQuery = useQuery(accountsQueryOptions(workspace.id));
  const categoriesQuery = useQuery(categoriesQueryOptions(workspace.id, "expense"));
  const clientsQuery = useQuery(clientsQueryOptions(workspace.id, { status: "active" }));
  const projectsQuery = useQuery(projectsQueryOptions(workspace.id, { status: "active" }));

  const activeAccounts = (accountsQuery.data ?? []).filter((a) => a.status === "active");

  const expenses = (expensesQuery.data ?? []).filter((e) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    return (
      e.description.toLowerCase().includes(term) ||
      e.vendor?.toLowerCase().includes(term) ||
      e.reference?.toLowerCase().includes(term) ||
      e.client?.name?.toLowerCase().includes(term) ||
      e.project?.name?.toLowerCase().includes(term)
    );
  });

  // Summary stats
  const totalByCategory: Record<string, { name: string; amount: number; currency: string }> = {};
  expenses
    .filter((e) => e.status === "posted")
    .forEach((e) => {
      const acc = e.financial_account;
      if (!acc) return;
      const cur = acc.currency ?? e.currency;
      const catKey = `${e.category_id ?? "uncategorized"}_${cur}`;
      if (!totalByCategory[catKey]) {
        totalByCategory[catKey] = {
          name: e.category?.name ?? "Uncategorized",
          amount: 0,
          currency: cur,
        };
      }
      totalByCategory[catKey].amount += Number(e.amount);
    });

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => recordExpenseWithMeta(workspace.id, form),
    onSuccess: () => {
      toast.success("Expense recorded successfully");
      void queryClient.invalidateQueries({ queryKey: ["expenses", workspace.id] });
      void queryClient.invalidateQueries({ queryKey: ["workspace-cash-summary", workspace.id] });
      void queryClient.invalidateQueries({ queryKey: ["command-center-summary", workspace.id] });
      setCreateOpen(false);
      setForm(defaultExpenseForm);
      setAmountStr("");
      setFormErrors({});
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reverseMutation = useMutation({
    mutationFn: () =>
      reverseExpense(workspace.id, {
        expenseId: reverseDialog!.expenseId,
        reversalReason,
      }),
    onSuccess: () => {
      toast.success("Expense reversed");
      void queryClient.invalidateQueries({ queryKey: ["expenses", workspace.id] });
      void queryClient.invalidateQueries({ queryKey: ["workspace-cash-summary", workspace.id] });
      void queryClient.invalidateQueries({ queryKey: ["command-center-summary", workspace.id] });
      setReverseDialog(null);
      setReversalReason("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function validateAndSubmit() {
    const errors: FormErrors = {};
    if (!form.accountId) errors.accountId = "Account is required";
    if (!amountStr || Number(amountStr) <= 0) errors.amount = "Amount must be greater than 0";
    if (!form.description.trim()) errors.description = "Description is required";
    if (!form.transactionDate) errors.transactionDate = "Date is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    createMutation.mutate();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Money · Expenses
            </span>
          </div>
          <h1 className="text-display mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
            Expenses
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Business expenses linked to the authoritative cash ledger, with optional client &amp;
            project attribution.
          </p>
        </div>
        {canMutate && (
          <Button
            id="record-expense-btn"
            size="sm"
            className="gap-1.5 shadow-sm"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
            Record Expense
          </Button>
        )}
      </header>

      {/* Summary Cards */}
      {expenses.filter((e) => e.status === "posted").length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(
            expenses
              .filter((e) => e.status === "posted")
              .reduce<Record<string, { currency: string; total: number; count: number }>>(
                (acc, e) => {
                  const cur = e.currency;
                  if (!acc[cur]) acc[cur] = { currency: cur, total: 0, count: 0 };
                  acc[cur].total += Number(e.amount);
                  acc[cur].count++;
                  return acc;
                },
                {},
              ),
          ).map(({ currency, total, count }) => (
            <Card key={currency} className="bg-card/80 border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span className="font-semibold uppercase tracking-wider text-foreground">
                    {currency} Expenses
                  </span>
                  <span className="rounded bg-rose-500/10 text-rose-600 px-1.5 py-0.5 text-[10px] font-mono font-bold">
                    {count} items
                  </span>
                </div>
                <MoneyValue
                  value={total}
                  currency={currency}
                  size="lg"
                  className="text-rose-600 dark:text-rose-400"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            id="expenses-search"
            placeholder="Search description, vendor, client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <Select
          value={filters.status ?? "posted"}
          onValueChange={(v) =>
            setFilters((prev) => ({ ...prev, status: v as ExpenseFilters["status"] }))
          }
        >
          <SelectTrigger id="filter-expense-status" className="h-9 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
            <SelectItem value="reversed">Reversed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.accountId ?? "all"}
          onValueChange={(v) =>
            setFilters((prev) => ({ ...prev, accountId: v === "all" ? undefined : v }))
          }
        >
          <SelectTrigger id="filter-expense-account" className="h-9 w-44 text-sm">
            <SelectValue placeholder="All Accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {(accountsQuery.data ?? []).map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                {acc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.categoryId ?? "all"}
          onValueChange={(v) =>
            setFilters((prev) => ({ ...prev, categoryId: v === "all" ? undefined : v }))
          }
        >
          <SelectTrigger id="filter-expense-category" className="h-9 w-44 text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {(categoriesQuery.data ?? []).map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search || filters.status !== "posted" || filters.accountId || filters.categoryId) && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => {
              setFilters({ status: "posted" });
              setSearch("");
            }}
          >
            <X className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      {expensesQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : expensesQuery.isError ? (
        <div className="panel p-6 text-center text-sm text-destructive bg-destructive/5 border border-destructive/20">
          <AlertCircle className="size-5 mx-auto mb-2" />
          <p>{(expensesQuery.error as Error).message}</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="panel p-12 text-center bg-card/60 border border-border">
          <TrendingDown className="size-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">No expenses recorded yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Record your first expense to start tracking business costs against the cash ledger.
          </p>
          {canMutate && (
            <Button size="sm" className="mt-5 gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Record Expense
            </Button>
          )}
        </div>
      ) : (
        <div className="panel overflow-hidden border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Date
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Description
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Vendor
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Category
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Client / Project
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Account
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Amount
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Status
                </TableHead>
                {canMutate && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => {
                const isPosted = expense.status === "posted";
                const client = expense.client;
                const project = expense.project;
                const account = expense.financial_account;
                return (
                  <TableRow key={expense.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {new Date(expense.expense_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm max-w-[180px]">
                      <p className="truncate font-medium text-foreground">{expense.description}</p>
                      {expense.reference && (
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {expense.reference}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {expense.vendor || <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {expense.category?.name ?? "Uncategorized"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {client ? (
                        <Link
                          to="/app/clients/$clientId"
                          params={{ clientId: client.id }}
                          className="text-primary hover:underline text-xs font-medium"
                        >
                          {client.name}
                        </Link>
                      ) : null}
                      {project ? (
                        <p className="text-xs text-muted-foreground truncate">{project.name}</p>
                      ) : null}
                      {!client && !project && (
                        <span className="text-muted-foreground/50 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">
                      {account?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyValue
                        value={expense.amount}
                        currency={expense.currency}
                        size="sm"
                        className={
                          isPosted
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-muted-foreground line-through"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] uppercase font-semibold",
                          isPosted
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
                        )}
                      >
                        {EXPENSE_STATUS_LABELS[expense.status]}
                      </Badge>
                    </TableCell>
                    {canMutate && (
                      <TableCell>
                        {isPosted && (
                          <Button
                            id={`reverse-expense-${expense.id}`}
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-destructive h-7"
                            onClick={() =>
                              setReverseDialog({
                                open: true,
                                expenseId: expense.id,
                                amount: Number(expense.amount),
                                currency: expense.currency,
                                description: expense.description,
                              })
                            }
                          >
                            <RotateCcw className="size-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Expense Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setForm(defaultExpenseForm);
            setAmountStr("");
            setFormErrors({});
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Expense</DialogTitle>
            <DialogDescription>
              This will post a debit to the selected account and record the expense against the cash
              ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Account */}
            <div className="space-y-2">
              <Label htmlFor="expense-account">
                Debit Account <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.accountId}
                onValueChange={(v) => setForm((prev) => ({ ...prev, accountId: v }))}
              >
                <SelectTrigger
                  id="expense-account"
                  className={cn(formErrors.accountId && "border-destructive")}
                >
                  <SelectValue placeholder="Select account…" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.accountId && (
                <p className="text-xs text-destructive">{formErrors.accountId}</p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="expense-amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <MoneyInput
                id="expense-amount"
                value={amountStr}
                onChange={(v) => {
                  setAmountStr(v);
                  setForm((prev) => ({ ...prev, amount: Number(v) || 0 }));
                }}
                currency={activeAccounts.find((a) => a.id === form.accountId)?.currency}
                placeholder="0.00"
                className={cn(formErrors.amount && "border-destructive")}
              />
              {formErrors.amount && <p className="text-xs text-destructive">{formErrors.amount}</p>}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="expense-date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="expense-date"
                type="date"
                value={form.transactionDate}
                onChange={(e) => setForm((prev) => ({ ...prev, transactionDate: e.target.value }))}
                className={cn("text-sm", formErrors.transactionDate && "border-destructive")}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="expense-description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Input
                id="expense-description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="What was this expense for?"
                className={cn("text-sm", formErrors.description && "border-destructive")}
              />
              {formErrors.description && (
                <p className="text-xs text-destructive">{formErrors.description}</p>
              )}
            </div>

            {/* Vendor */}
            <div className="space-y-2">
              <Label htmlFor="expense-vendor">Vendor / Payee</Label>
              <Input
                id="expense-vendor"
                value={form.vendor ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, vendor: e.target.value }))}
                placeholder="Who was paid? (optional)"
                className="text-sm"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="expense-category">Category</Label>
              <Select
                value={form.categoryId ?? "none"}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, categoryId: v === "none" ? undefined : v }))
                }
              >
                <SelectTrigger id="expense-category">
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {(categoriesQuery.data ?? []).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Client */}
            <div className="space-y-2">
              <Label htmlFor="expense-client">Client Attribution</Label>
              <Select
                value={form.clientId ?? "none"}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, clientId: v === "none" ? undefined : v }))
                }
              >
                <SelectTrigger id="expense-client">
                  <SelectValue placeholder="Optional client…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Client</SelectItem>
                  {(clientsQuery.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project */}
            <div className="space-y-2">
              <Label htmlFor="expense-project">Project Attribution</Label>
              <Select
                value={form.projectId ?? "none"}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, projectId: v === "none" ? undefined : v }))
                }
              >
                <SelectTrigger id="expense-project">
                  <SelectValue placeholder="Optional project…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Project</SelectItem>
                  {(projectsQuery.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="expense-notes">Notes</Label>
              <Textarea
                id="expense-notes"
                value={form.notes ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional context (optional)…"
                rows={2}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setForm(defaultExpenseForm);
                setAmountStr("");
                setFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={validateAndSubmit}
              disabled={createMutation.isPending}
              className="gap-1.5"
            >
              {createMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Record Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reverse Expense Dialog */}
      <Dialog
        open={Boolean(reverseDialog?.open)}
        onOpenChange={(open) => {
          if (!open) {
            setReverseDialog(null);
            setReversalReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reverse Expense</DialogTitle>
            <DialogDescription>
              This will credit{" "}
              {reverseDialog && formatMoney(reverseDialog.amount, reverseDialog.currency)} back to
              the account and mark the expense as reversed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {reverseDialog && (
            <div className="p-3 rounded-lg bg-muted/40 border border-border text-sm">
              <p className="font-medium">{reverseDialog.description}</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                {formatMoney(reverseDialog.amount, reverseDialog.currency)}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="expense-reversal-reason">
              Reversal Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="expense-reversal-reason"
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              placeholder="Why is this expense being reversed?"
              rows={3}
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReverseDialog(null);
                setReversalReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={reversalReason.trim().length < 3 || reverseMutation.isPending}
              onClick={() => reverseMutation.mutate()}
            >
              {reverseMutation.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              Confirm Reversal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
