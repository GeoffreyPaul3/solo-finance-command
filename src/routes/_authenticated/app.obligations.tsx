import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Filter,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Repeat,
  TrendingDown,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useWorkspace } from "@/components/app/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CurrencySelect } from "@/components/ui/currency-select";
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
import { TablePagination } from "@/components/ui/table-pagination";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelObligation,
  completeObligation,
  createObligation,
  obligationsListQueryOptions,
  OBLIGATION_PRIORITY_LABELS,
  OBLIGATION_STATUS_LABELS,
  type CreateObligationInput,
  type Obligation,
  type ObligationStatus,
} from "@/domain/obligations";
import {
  calculateAnnualizedCost,
  calculateMonthlyEquivalent,
  createRecurringExpense,
  generateRecurringOccurrences,
  recurringExpensesListQueryOptions,
  RECURRING_FREQUENCY_LABELS,
  RECURRING_STATUS_LABELS,
  updateRecurringExpenseStatus,
  type CreateRecurringExpenseInput,
  type RecurringExpense,
  type RecurringExpenseFrequency,
} from "@/domain/recurring-expenses";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/obligations")({
  head: () => ({
    meta: [
      { title: "Obligations | SoloOS" },
      {
        name: "description",
        content: "Track upcoming commitments, bills, and recurring payments.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ObligationsPage,
});

type ActiveTab = "active" | "all" | "recurring";

const STATUS_BADGE_CLASS: Record<ObligationStatus, string> = {
  upcoming: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  due: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  overdue: "bg-rose-500/10 text-rose-700 border-rose-500/30",
  paid: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export function ObligationsPage() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ActiveTab>("active");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createRecurringModalOpen, setCreateRecurringModalOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(workspace.currency ?? "USD");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendor, setVendor] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("3");

  // Recurring form states
  const [recTitle, setRecTitle] = useState("");
  const [recAmount, setRecAmount] = useState("");
  const [recCurrency, setRecCurrency] = useState(workspace.currency ?? "USD");
  const [recFrequency, setRecFrequency] = useState<RecurringExpenseFrequency>("monthly");
  const [recStartDate, setRecStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [recVendor, setRecVendor] = useState("");
  const [recNotes, setRecNotes] = useState("");

  // Queries
  const obligationsQuery = useQuery(obligationsListQueryOptions(workspace.id));
  const recurringQuery = useQuery(recurringExpensesListQueryOptions(workspace.id));

  // Mutations
  const createMutation = useMutation({
    mutationFn: (input: CreateObligationInput) => createObligation(workspace.id, input),
    onSuccess: () => {
      toast.success("Obligation created");
      void queryClient.invalidateQueries({ queryKey: ["obligations", workspace.id] });
      void queryClient.invalidateQueries({ queryKey: ["safe-to-spend", workspace.id] });
      setCreateModalOpen(false);
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create obligation"),
  });

  const createRecurringMutation = useMutation({
    mutationFn: (input: CreateRecurringExpenseInput) => createRecurringExpense(workspace.id, input),
    onSuccess: () => {
      toast.success("Recurring schedule created");
      void queryClient.invalidateQueries({ queryKey: ["recurring-expenses", workspace.id] });
      void queryClient.invalidateQueries({ queryKey: ["obligations", workspace.id] });
      setCreateRecurringModalOpen(false);
      resetRecurringForm();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create recurring expense"),
  });

  const completeMutation = useMutation({
    mutationFn: (obligationId: string) => completeObligation(workspace.id, obligationId),
    onSuccess: () => {
      toast.success("Obligation marked as paid");
      void queryClient.invalidateQueries({ queryKey: ["obligations", workspace.id] });
      void queryClient.invalidateQueries({ queryKey: ["safe-to-spend", workspace.id] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to complete obligation"),
  });

  const cancelMutation = useMutation({
    mutationFn: (obligationId: string) => cancelObligation(workspace.id, obligationId),
    onSuccess: () => {
      toast.success("Obligation cancelled");
      void queryClient.invalidateQueries({ queryKey: ["obligations", workspace.id] });
      void queryClient.invalidateQueries({ queryKey: ["safe-to-spend", workspace.id] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to cancel obligation"),
  });

  const syncOccurrencesMutation = useMutation({
    mutationFn: () => generateRecurringOccurrences(workspace.id),
    onSuccess: () => {
      toast.success("Synced recurring occurrences");
      void queryClient.invalidateQueries({ queryKey: ["obligations", workspace.id] });
      void queryClient.invalidateQueries({ queryKey: ["recurring-expenses", workspace.id] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to sync recurring expenses"),
  });

  const toggleRecurringStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "paused" | "cancelled" }) =>
      updateRecurringExpenseStatus(workspace.id, id, status),
    onSuccess: () => {
      toast.success("Schedule status updated");
      void queryClient.invalidateQueries({ queryKey: ["recurring-expenses", workspace.id] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update schedule"),
  });

  function resetForm() {
    setTitle("");
    setAmount("");
    setCurrency(workspace.currency ?? "USD");
    setDueDate(new Date().toISOString().slice(0, 10));
    setVendor("");
    setNotes("");
    setPriority("3");
  }

  function resetRecurringForm() {
    setRecTitle("");
    setRecAmount("");
    setRecCurrency(workspace.currency ?? "USD");
    setRecFrequency("monthly");
    setRecStartDate(new Date().toISOString().slice(0, 10));
    setRecVendor("");
    setRecNotes("");
  }

  function handleCreateObligation() {
    const numAmount = parseFloat(amount);
    if (!title.trim() || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid title and positive amount");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      amount: numAmount,
      currency: currency.trim().toUpperCase(),
      dueDate,
      vendor: vendor.trim() || null,
      notes: notes.trim() || null,
      priority: parseInt(priority, 10) || 3,
    });
  }

  function handleCreateRecurring() {
    const numAmount = parseFloat(recAmount);
    if (!recTitle.trim() || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid title and positive amount");
      return;
    }
    createRecurringMutation.mutate({
      title: recTitle.trim(),
      amount: numAmount,
      currency: recCurrency.trim().toUpperCase(),
      frequency: recFrequency,
      startDate: recStartDate,
      vendor: recVendor.trim() || null,
      notes: recNotes.trim() || null,
    });
  }

  const obligations: Obligation[] = obligationsQuery.data ?? [];
  const recurring: RecurringExpense[] = recurringQuery.data ?? [];

  const activeObligations = obligations.filter(
    (o) => o.status === "upcoming" || o.status === "due" || o.status === "overdue",
  );
  const overdueCount = obligations.filter((o) => o.status === "overdue").length;
  const dueTodayCount = obligations.filter((o) => o.status === "due").length;

  const filteredObligations = obligations.filter((o) => {
    if (activeTab === "active") {
      return o.status === "upcoming" || o.status === "due" || o.status === "overdue";
    }
    if (statusFilter === "all") return true;
    return o.status === statusFilter;
  });

  const paginatedObligations = filteredObligations.slice(page * pageSize, (page + 1) * pageSize);

  const totalActiveAmount = activeObligations.reduce((sum, o) => sum + Number(o.amount), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Money · Obligations
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Obligations & Recurring
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Known commitments, bills, and recurring expense schedules that feed into Safe-to-Spend.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncOccurrencesMutation.mutate()}
            disabled={syncOccurrencesMutation.isPending}
            className="gap-1.5"
            title="Generate upcoming occurrences from recurring schedules"
          >
            <RefreshCw
              className={cn("size-3.5", syncOccurrencesMutation.isPending && "animate-spin")}
            />
            Sync
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateRecurringModalOpen(true)}
            className="gap-1.5"
          >
            <Repeat className="size-3.5" />
            Add Schedule
          </Button>
          <Button
            id="add-obligation-button"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="gap-1.5"
          >
            <Plus className="size-3.5" />
            Add Obligation
          </Button>
        </div>
      </header>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Active Commitments</p>
          <p className="mt-1 text-xl font-bold text-foreground">{activeObligations.length}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Total: {formatMoney(totalActiveAmount, workspace.currency ?? "USD")}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Due Today</p>
          <p
            className={cn(
              "mt-1 text-xl font-bold",
              dueTodayCount > 0 ? "text-amber-600" : "text-foreground",
            )}
          >
            {dueTodayCount}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Require attention</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Overdue</p>
          <p
            className={cn(
              "mt-1 text-xl font-bold",
              overdueCount > 0 ? "text-rose-600" : "text-foreground",
            )}
          >
            {overdueCount}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Critical payments</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Recurring Schedules</p>
          <p className="mt-1 text-xl font-bold text-foreground">
            {recurring.filter((r) => r.status === "active").length}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Active subscriptions/bills</p>
        </Card>
      </div>

      {/* Navigation tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => {
              setActiveTab("active");
              setPage(0);
            }}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "active"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            Active ({activeObligations.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("all");
              setPage(0);
            }}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            All History
          </button>
          <button
            onClick={() => {
              setActiveTab("recurring");
              setPage(0);
            }}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "recurring"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            Recurring Schedules ({recurring.length})
          </button>
        </div>

        {activeTab === "all" && (
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-muted-foreground" />
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="due">Due Today</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {obligationsQuery.isLoading || recurringQuery.isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-6 animate-spin mr-2" />
          Loading obligations…
        </div>
      ) : activeTab === "recurring" ? (
        /* Recurring Schedules Table */
        recurring.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-muted/30 p-10 text-center">
            <Repeat className="mx-auto mb-3 size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              No recurring expense schedules
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Add recurring schedules for rent, software subscriptions, or fixed retainers.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateRecurringModalOpen(true)}
              className="mt-4 gap-1.5"
            >
              <Plus className="size-3.5" />
              Add First Schedule
            </Button>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Schedule Title</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Annualized</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurring.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">{rec.title}</div>
                        {rec.vendor && (
                          <div className="text-xs text-muted-foreground">{rec.vendor}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {RECURRING_FREQUENCY_LABELS[rec.frequency]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rec.next_due_date ? new Date(rec.next_due_date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatMoney(Number(rec.amount), rec.currency)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatMoney(
                          calculateAnnualizedCost(Number(rec.amount), rec.frequency),
                          rec.currency,
                        )}
                        /yr
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={rec.status === "active" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {RECURRING_STATUS_LABELS[rec.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {rec.status === "active" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              toggleRecurringStatusMutation.mutate({
                                id: rec.id,
                                status: "paused",
                              })
                            }
                          >
                            Pause
                          </Button>
                        ) : rec.status === "paused" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-primary"
                            onClick={() =>
                              toggleRecurringStatusMutation.mutate({
                                id: rec.id,
                                status: "active",
                              })
                            }
                          >
                            Resume
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      ) : filteredObligations.length === 0 ? (
        /* Empty State */
        <div className="rounded-xl border border-border/50 bg-muted/30 p-10 text-center">
          <Clock className="mx-auto mb-3 size-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {activeTab === "active" ? "No active obligations" : "No obligations found"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Record upcoming payments to protect your cashflow and compute Safe-to-Spend.
          </p>
          <Button size="sm" onClick={() => setCreateModalOpen(true)} className="mt-4 gap-1.5">
            <Plus className="size-3.5" />
            Add Obligation
          </Button>
        </div>
      ) : (
        /* Obligations Table */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Obligation</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedObligations.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{item.title}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {item.vendor && <span>{item.vendor}</span>}
                        {item.notes && <span>· {item.notes}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(item.due_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {OBLIGATION_PRIORITY_LABELS[item.priority as 1 | 2 | 3 | 4 | 5] ?? "P3"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatMoney(Number(item.amount), item.currency)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={cn("text-xs capitalize", STATUS_BADGE_CLASS[item.status])}
                      >
                        {OBLIGATION_STATUS_LABELS[item.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.status !== "paid" && item.status !== "cancelled" && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            onClick={() => completeMutation.mutate(item.id)}
                            disabled={completeMutation.isPending}
                            title="Mark as paid"
                          >
                            <CheckCircle2 className="size-3.5 mr-1" />
                            Paid
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => cancelMutation.mutate(item.id)}
                            disabled={cancelMutation.isPending}
                            title="Cancel obligation"
                          >
                            <Ban className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-4 pt-3">
              <TablePagination
                page={page}
                pageSize={pageSize}
                totalItems={filteredObligations.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                itemLabel="obligations"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Obligation Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Financial Obligation</DialogTitle>
            <DialogDescription>
              Record a known future payment, contractor invoice, or tax bill.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="obl-title">Title / Description</Label>
              <Input
                id="obl-title"
                placeholder="e.g. Q3 Estimated Tax / Server Hosting"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="obl-amount">Amount</Label>
                <MoneyInput
                  id="obl-amount"
                  value={amount}
                  onChange={setAmount}
                  currency={currency}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="obl-currency">Currency</Label>
                <CurrencySelect id="obl-currency" value={currency} onChange={setCurrency} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="obl-date">Due Date</Label>
                <Input
                  id="obl-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="obl-priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="obl-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Critical (P1)</SelectItem>
                    <SelectItem value="2">High (P2)</SelectItem>
                    <SelectItem value="3">Standard (P3)</SelectItem>
                    <SelectItem value="4">Low (P4)</SelectItem>
                    <SelectItem value="5">Optional (P5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="obl-vendor">Vendor (optional)</Label>
              <Input
                id="obl-vendor"
                placeholder="e.g. AWS, Landlord, IRS"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="obl-notes">Notes (optional)</Label>
              <Textarea
                id="obl-notes"
                rows={2}
                placeholder="Additional details or payment link"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              id="confirm-create-obligation"
              onClick={handleCreateObligation}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Save Obligation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Recurring Schedule Modal */}
      <Dialog open={createRecurringModalOpen} onOpenChange={setCreateRecurringModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Recurring Schedule</DialogTitle>
            <DialogDescription>
              Set up automated generation of obligations for subscriptions, rent, and retainers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rec-title">Title / Name</Label>
              <Input
                id="rec-title"
                placeholder="e.g. Figma Subscription, Office Rent"
                value={recTitle}
                onChange={(e) => setRecTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rec-amount">Amount</Label>
                <MoneyInput
                  id="rec-amount"
                  value={recAmount}
                  onChange={setRecAmount}
                  currency={recCurrency}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rec-currency">Currency</Label>
                <CurrencySelect id="rec-currency" value={recCurrency} onChange={setRecCurrency} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rec-frequency">Frequency</Label>
                <Select
                  value={recFrequency}
                  onValueChange={(val) => setRecFrequency(val as RecurringExpenseFrequency)}
                >
                  <SelectTrigger id="rec-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rec-start-date">First Due Date</Label>
                <Input
                  id="rec-start-date"
                  type="date"
                  value={recStartDate}
                  onChange={(e) => setRecStartDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-vendor">Vendor (optional)</Label>
              <Input
                id="rec-vendor"
                placeholder="e.g. Adobe, WeWork"
                value={recVendor}
                onChange={(e) => setRecVendor(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-notes">Notes (optional)</Label>
              <Textarea
                id="rec-notes"
                rows={2}
                placeholder="Billing details or account notes"
                value={recNotes}
                onChange={(e) => setRecNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateRecurringModalOpen(false)}
              disabled={createRecurringMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              id="confirm-create-recurring"
              onClick={handleCreateRecurring}
              disabled={createRecurringMutation.isPending}
            >
              {createRecurringMutation.isPending ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
