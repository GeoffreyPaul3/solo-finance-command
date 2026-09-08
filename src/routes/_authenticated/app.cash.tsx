import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Archive,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  Filter,
  History,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Sliders,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useWorkspace } from "@/components/app/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPES,
  TRANSACTION_TYPE_LABELS,
  accountsQueryOptions,
  archiveAccount,
  categoriesQueryOptions,
  createFinancialAccount,
  reconcileAccount,
  recordAdjustment,
  recordExpense,
  recordIncome,
  recordTransfer,
  reverseTransaction,
  transactionsQueryOptions,
  workspaceCashSummaryQueryOptions,
  type CreateAccountInput,
  type FinancialAccount,
  type FinancialAccountType,
  type FinancialTransactionType,
  type FinancialTransactionWithRelations,
  type RecordAdjustmentInput,
  type RecordExpenseInput,
  type RecordIncomeInput,
  type RecordTransferInput,
} from "@/domain/financial";
import { CURRENCIES, formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/app/cash")({
  head: () => ({
    meta: [
      { title: "Cash & Accounts | SoloOS" },
      {
        name: "description",
        content: "Manage authoritative financial accounts, cashflow, and transactions.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CashPage,
});

function CashPage() {
  const { workspace, role } = useWorkspace();
  const queryClient = useQueryClient();

  const canMutate = role === "owner" || role === "admin" || role === "finance";

  // State for modals
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [isIncomeOpen, setIsIncomeOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [reversalTarget, setReversalTarget] = useState<FinancialTransactionWithRelations | null>(
    null,
  );
  const [reconcileAccountTarget, setReconcileAccountTarget] = useState<FinancialAccount | null>(
    null,
  );

  // Selected account for pre-filling actions
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Queries
  const accountsQuery = useQuery(accountsQueryOptions(workspace.id));
  const summaryQuery = useQuery(workspaceCashSummaryQueryOptions(workspace.id));
  const incomeCategoriesQuery = useQuery(categoriesQueryOptions(workspace.id, "income"));
  const expenseCategoriesQuery = useQuery(categoriesQueryOptions(workspace.id, "expense"));
  const transactionsQuery = useQuery(
    transactionsQueryOptions(workspace.id, {
      accountId: selectedAccountId === "all" ? undefined : selectedAccountId,
      type:
        selectedTypeFilter === "all" ? undefined : (selectedTypeFilter as FinancialTransactionType),
      limit: 100,
    }),
  );

  const accounts = accountsQuery.data ?? [];
  const activeAccounts = accounts.filter((a) => a.status === "active");
  const summary = summaryQuery.data;
  const transactions = transactionsQuery.data ?? [];

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      tx.description.toLowerCase().includes(q) ||
      (tx.reference && tx.reference.toLowerCase().includes(q)) ||
      (tx.category && tx.category.name.toLowerCase().includes(q))
    );
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: ["financial-accounts", workspace.id],
    });
    queryClient.invalidateQueries({
      queryKey: ["workspace-cash-summary", workspace.id],
    });
    queryClient.invalidateQueries({
      queryKey: ["financial-transactions", workspace.id],
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Cash & Accounts</h1>
            <Badge variant="outline" className="text-xs font-mono">
              Phase 2 Engine
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Authoritative multi-currency financial accounts, opening balances, and atomic ledger.
          </p>
        </div>

        {canMutate && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsCreateAccountOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              New Account
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
              onClick={() => setIsIncomeOpen(true)}
              disabled={activeAccounts.length === 0}
            >
              <ArrowDownLeft className="mr-1.5 size-4" />
              Income
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
              onClick={() => setIsExpenseOpen(true)}
              disabled={activeAccounts.length === 0}
            >
              <ArrowUpRight className="mr-1.5 size-4" />
              Expense
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-cyan-500 border-cyan-500/30 hover:bg-cyan-500/10"
              onClick={() => setIsTransferOpen(true)}
              disabled={activeAccounts.length < 2}
            >
              <ArrowLeftRight className="mr-1.5 size-4" />
              Transfer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsAdjustmentOpen(true)}
              disabled={activeAccounts.length === 0}
            >
              <Sliders className="mr-1.5 size-4" />
              Adjustment
            </Button>
          </div>
        )}
      </div>

      {/* Currency Position Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary?.positions.length ? (
          summary.positions.map((pos) => (
            <Card key={pos.currency} className="border-border/60 bg-card/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Liquid Cash ({pos.currency})
                </CardTitle>
                <Wallet className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {formatMoney(pos.totalBalance, pos.currency)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Across {pos.activeAccounts} active account
                  {pos.activeAccounts === 1 ? "" : "s"}
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full border-dashed bg-muted/20 p-6 text-center">
            <Wallet className="mx-auto size-8 text-muted-foreground/60" />
            <h3 className="mt-2 text-sm font-semibold">No accounts created yet</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Add your first bank, cash, or digital wallet account to begin tracking real balances.
            </p>
            {canMutate && (
              <div className="mt-4">
                <Button size="sm" onClick={() => setIsCreateAccountOpen(true)}>
                  <Plus className="mr-1.5 size-4" />
                  Add First Account
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Accounts List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Financial Accounts</h2>
          <span className="text-xs text-muted-foreground">
            {accounts.length} Total ({activeAccounts.length} Active)
          </span>
        </div>

        {accounts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((acc) => {
              const isArchived = acc.status === "archived";
              return (
                <Card
                  key={acc.id}
                  className={`flex flex-col justify-between transition-all ${
                    isArchived
                      ? "opacity-60 bg-muted/30 border-muted"
                      : "border-border hover:border-border/80"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-semibold">{acc.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {ACCOUNT_TYPE_LABELS[acc.type] ?? acc.type}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={isArchived ? "secondary" : "default"}
                        className="text-[10px] capitalize"
                      >
                        {acc.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-4">
                    <div>
                      <span className="text-xs text-muted-foreground">
                        Current Authoritative Balance
                      </span>
                      <div className="text-xl font-bold">
                        {formatMoney(acc.current_balance, acc.currency)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2">
                      <span>Opening: {formatMoney(acc.opening_balance, acc.currency)}</span>
                      <span>{acc.opening_balance_date}</span>
                    </div>

                    {acc.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 italic">
                        {acc.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7"
                        onClick={() => setSelectedAccountId(acc.id)}
                      >
                        <History className="mr-1 size-3" />
                        Ledger
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7"
                        onClick={() => setReconcileAccountTarget(acc)}
                      >
                        <Scale className="mr-1 size-3" />
                        Reconcile
                      </Button>
                      {canMutate && !isArchived && (
                        <ArchiveAccountButton
                          workspaceId={workspace.id}
                          account={acc}
                          onSuccess={invalidateAll}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Authoritative Transaction Ledger */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Authoritative Transaction History
            </h2>
            <p className="text-xs text-muted-foreground">
              Immutable ledger of all posted and reversed transactions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead>Description & Reference</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center w-[90px]">Status</TableHead>
                <TableHead className="text-right w-[80px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => {
                  const isReversed = tx.status === "reversed";
                  const isIncome = tx.transaction_type === "income";
                  const isExpense = tx.transaction_type === "expense";
                  const isTransfer = tx.transaction_type === "transfer";
                  const isAdjustment = tx.transaction_type === "adjustment";

                  let amountColor = "text-foreground";
                  let amountPrefix = "";

                  if (isIncome) {
                    amountColor = "text-emerald-500 font-semibold";
                    amountPrefix = "+";
                  } else if (isExpense) {
                    amountColor = "text-rose-500 font-semibold";
                    amountPrefix = "-";
                  } else if (isTransfer) {
                    if (tx.transfer_role === "destination") {
                      amountColor = "text-emerald-500 font-semibold";
                      amountPrefix = "+";
                    } else {
                      amountColor = "text-rose-500 font-semibold";
                      amountPrefix = "-";
                    }
                  } else if (isAdjustment) {
                    amountColor = "text-indigo-400 font-semibold";
                    amountPrefix = "±";
                  }

                  return (
                    <TableRow key={tx.id} className={isReversed ? "opacity-50 line-through" : ""}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {tx.transaction_date}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{tx.description}</div>
                        {tx.reference && (
                          <div className="text-[11px] text-muted-foreground">
                            Ref: {tx.reference}
                          </div>
                        )}
                        {tx.reversal_of_transaction_id && (
                          <div className="text-[10px] text-indigo-400">Reversal adjustment</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {tx.account?.name ?? "Account"}
                        {isTransfer && tx.paired_account && (
                          <span className="block text-[10px] text-muted-foreground">
                            {tx.transfer_role === "source"
                              ? `→ To: ${tx.paired_account.name}`
                              : `← From: ${tx.paired_account.name}`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {tx.category ? (
                          <span className="inline-flex items-center gap-1">
                            <span
                              className="size-2 rounded-full"
                              style={{
                                backgroundColor: tx.category.color ?? "#6B7280",
                              }}
                            />
                            {tx.category.name}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {TRANSACTION_TYPE_LABELS[tx.transaction_type] ?? tx.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm ${amountColor}`}>
                        {amountPrefix}
                        {formatMoney(tx.amount, tx.currency)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={isReversed ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canMutate && !isReversed && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground hover:text-rose-500"
                            onClick={() => setReversalTarget(tx)}
                            title="Reverse Transaction"
                          >
                            <RotateCcw className="size-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">
                    No transactions recorded for this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modals */}
      <CreateAccountModal
        isOpen={isCreateAccountOpen}
        onClose={() => setIsCreateAccountOpen(false)}
        workspaceId={workspace.id}
        defaultCurrency={workspace.currency}
        onSuccess={invalidateAll}
      />

      <RecordIncomeModal
        isOpen={isIncomeOpen}
        onClose={() => setIsIncomeOpen(false)}
        workspaceId={workspace.id}
        accounts={activeAccounts}
        categories={incomeCategoriesQuery.data ?? []}
        onSuccess={invalidateAll}
      />

      <RecordExpenseModal
        isOpen={isExpenseOpen}
        onClose={() => setIsExpenseOpen(false)}
        workspaceId={workspace.id}
        accounts={activeAccounts}
        categories={expenseCategoriesQuery.data ?? []}
        onSuccess={invalidateAll}
      />

      <RecordTransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        workspaceId={workspace.id}
        accounts={activeAccounts}
        onSuccess={invalidateAll}
      />

      <RecordAdjustmentModal
        isOpen={isAdjustmentOpen}
        onClose={() => setIsAdjustmentOpen(false)}
        workspaceId={workspace.id}
        accounts={activeAccounts}
        onSuccess={invalidateAll}
      />

      {reversalTarget && (
        <ReverseTransactionModal
          isOpen={Boolean(reversalTarget)}
          onClose={() => setReversalTarget(null)}
          workspaceId={workspace.id}
          transaction={reversalTarget}
          onSuccess={invalidateAll}
        />
      )}

      {reconcileAccountTarget && (
        <ReconcileModal
          isOpen={Boolean(reconcileAccountTarget)}
          onClose={() => setReconcileAccountTarget(null)}
          workspaceId={workspace.id}
          account={reconcileAccountTarget}
        />
      )}
    </div>
  );
}

// ============================================================================
// Modal Component 1: Create Account
// ============================================================================

function CreateAccountModal({
  isOpen,
  onClose,
  workspaceId,
  defaultCurrency,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  defaultCurrency: string;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<FinancialAccountType>("bank");
  const [currency, setCurrency] = useState(defaultCurrency || "USD");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [openingBalanceDate, setOpeningBalanceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: (input: CreateAccountInput) => createFinancialAccount(workspaceId, input),
    onSuccess: () => {
      toast.success("Financial account created successfully");
      onSuccess();
      onClose();
      setName("");
      setDescription("");
      setOpeningBalance("0");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create financial account");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      name,
      type,
      currency,
      openingBalance: parseFloat(openingBalance) || 0,
      openingBalanceDate,
      description: description.trim() ? description : undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Financial Account</DialogTitle>
          <DialogDescription>
            Add an authoritative financial account to your workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">Account Name</Label>
            <Input
              id="acc-name"
              placeholder="e.g. Chase Business Checking"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Account Type</Label>
              <Select value={type} onValueChange={(val) => setType(val as FinancialAccountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ACCOUNT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} — {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-balance">Opening Balance</Label>
              <Input
                id="acc-balance"
                type="number"
                step="0.01"
                min="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acc-date">Opening Date</Label>
              <Input
                id="acc-date"
                type="date"
                value={openingBalanceDate}
                onChange={(e) => setOpeningBalanceDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acc-desc">Description / Notes (Optional)</Label>
            <Input
              id="acc-desc"
              placeholder="e.g. Primary operating account"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Create Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Modal Component 2: Record Income
// ============================================================================

function RecordIncomeModal({
  isOpen,
  onClose,
  workspaceId,
  accounts,
  categories,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  accounts: FinancialAccount[];
  categories: { id: string; name: string }[];
  onSuccess: () => void;
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [reference, setReference] = useState("");

  const selectedAccount = accounts.find((a) => a.id === accountId);

  const mutation = useMutation({
    mutationFn: (input: RecordIncomeInput) => recordIncome(workspaceId, input),
    onSuccess: () => {
      toast.success("Income recorded successfully");
      onSuccess();
      onClose();
      setAmount("");
      setDescription("");
      setReference("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to record income");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      toast.error("Please select an account");
      return;
    }
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    mutation.mutate({
      accountId,
      amount: val,
      transactionDate,
      description,
      categoryId: categoryId === "none" ? null : categoryId,
      reference: reference.trim() ? reference : null,
      idempotencyKey: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-500">
            <ArrowDownLeft className="size-5" />
            Record Income
          </DialogTitle>
          <DialogDescription>
            Atomic transaction incrementing your authoritative account balance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Destination Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inc-amount">Amount ({selectedAccount?.currency || "USD"})</Label>
              <Input
                id="inc-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inc-date">Date</Label>
              <Input
                id="inc-date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inc-desc">Description</Label>
            <Input
              id="inc-desc"
              placeholder="e.g. Payment for Q3 Consulting Milestone"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Uncategorized" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inc-ref">Reference / Invoice #</Label>
              <Input
                id="inc-ref"
                placeholder="e.g. INV-2026-001"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Post Income
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Modal Component 3: Record Expense
// ============================================================================

function RecordExpenseModal({
  isOpen,
  onClose,
  workspaceId,
  accounts,
  categories,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  accounts: FinancialAccount[];
  categories: { id: string; name: string }[];
  onSuccess: () => void;
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [reference, setReference] = useState("");

  const selectedAccount = accounts.find((a) => a.id === accountId);

  const mutation = useMutation({
    mutationFn: (input: RecordExpenseInput) => recordExpense(workspaceId, input),
    onSuccess: () => {
      toast.success("Expense recorded successfully");
      onSuccess();
      onClose();
      setAmount("");
      setDescription("");
      setReference("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to record expense");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      toast.error("Please select an account");
      return;
    }
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    mutation.mutate({
      accountId,
      amount: val,
      transactionDate,
      description,
      categoryId: categoryId === "none" ? null : categoryId,
      reference: reference.trim() ? reference : null,
      idempotencyKey: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-500">
            <ArrowUpRight className="size-5" />
            Record Expense
          </DialogTitle>
          <DialogDescription>
            Atomic transaction decrementing your authoritative account balance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Source Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.currency}) — Bal: {formatMoney(a.current_balance, a.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">Amount ({selectedAccount?.currency || "USD"})</Label>
              <Input
                id="exp-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-date">Date</Label>
              <Input
                id="exp-date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exp-desc">Description</Label>
            <Input
              id="exp-desc"
              placeholder="e.g. AWS Cloud Infrastructure or Office Rent"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Uncategorized" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-ref">Receipt / Reference #</Label>
              <Input
                id="exp-ref"
                placeholder="e.g. RCPT-4491"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-rose-600 hover:bg-rose-700"
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Post Expense
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Modal Component 4: Record Transfer
// ============================================================================

function RecordTransferModal({
  isOpen,
  onClose,
  workspaceId,
  accounts,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  accounts: FinancialAccount[];
  onSuccess: () => void;
}) {
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id || "");
  const [destinationAccountId, setDestinationAccountId] = useState(accounts[1]?.id || "");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("Transfer between accounts");
  const [reference, setReference] = useState("");

  const sourceAccount = accounts.find((a) => a.id === sourceAccountId);
  const destinationAccount = accounts.find((a) => a.id === destinationAccountId);

  const isSameCurrency =
    sourceAccount && destinationAccount && sourceAccount.currency === destinationAccount.currency;

  const mutation = useMutation({
    mutationFn: (input: RecordTransferInput) => recordTransfer(workspaceId, input),
    onSuccess: () => {
      toast.success("Transfer completed successfully");
      onSuccess();
      onClose();
      setAmount("");
      setReference("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to execute transfer");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceAccountId === destinationAccountId) {
      toast.error("Source and destination accounts must be different");
      return;
    }
    if (!isSameCurrency) {
      toast.error(
        `Transfers require identical currencies. Source is ${sourceAccount?.currency}, Destination is ${destinationAccount?.currency}`,
      );
      return;
    }
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    mutation.mutate({
      sourceAccountId,
      destinationAccountId,
      amount: val,
      transactionDate,
      description,
      reference: reference.trim() ? reference : null,
      idempotencyKey: `trf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-cyan-500">
            <ArrowLeftRight className="size-5" />
            Transfer Money
          </DialogTitle>
          <DialogDescription>
            Atomic dual-leg transfer between your accounts. Currency must match.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>From Account (Source)</Label>
            <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.currency}) — Bal: {formatMoney(a.current_balance, a.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>To Account (Destination)</Label>
            <Select value={destinationAccountId} onValueChange={setDestinationAccountId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} disabled={a.id === sourceAccountId}>
                    {a.name} ({a.currency}) — Bal: {formatMoney(a.current_balance, a.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isSameCurrency && sourceAccount && destinationAccount && (
            <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>
                Cross-currency transfers are not supported in Phase 2. Both accounts must share
                currency {sourceAccount.currency}.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trf-amount">Amount ({sourceAccount?.currency || "USD"})</Label>
              <Input
                id="trf-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trf-date">Date</Label>
              <Input
                id="trf-date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trf-desc">Description</Label>
            <Input
              id="trf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trf-ref">Reference (Optional)</Label>
            <Input
              id="trf-ref"
              placeholder="e.g. Wire confirmation or check #"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-cyan-600 hover:bg-cyan-700"
              disabled={mutation.isPending || !isSameCurrency}
            >
              {mutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Execute Transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Modal Component 5: Record Adjustment
// ============================================================================

function RecordAdjustmentModal({
  isOpen,
  onClose,
  workspaceId,
  accounts,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  accounts: FinancialAccount[];
  onSuccess: () => void;
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");

  const selectedAccount = accounts.find((a) => a.id === accountId);

  const mutation = useMutation({
    mutationFn: (input: RecordAdjustmentInput) => recordAdjustment(workspaceId, input),
    onSuccess: () => {
      toast.success("Adjustment posted successfully");
      onSuccess();
      onClose();
      setAmount("");
      setReason("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to post adjustment");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      toast.error("Please select an account");
      return;
    }
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("A detailed audit reason of at least 3 characters is required");
      return;
    }

    const deltaAmount = direction === "credit" ? val : -val;

    mutation.mutate({
      accountId,
      deltaAmount,
      transactionDate,
      reason,
      reference: `Manual Adjustment (${direction})`,
      idempotencyKey: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-400">
            <Sliders className="size-5" />
            Financial Balance Adjustment
          </DialogTitle>
          <DialogDescription>
            Controlled audit adjustment. A clear justification is recorded permanently.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Target Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.currency}) — Bal: {formatMoney(a.current_balance, a.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Adjustment Direction</Label>
              <Select
                value={direction}
                onValueChange={(val) => setDirection(val as "credit" | "debit")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Increase (+ Credit)</SelectItem>
                  <SelectItem value="debit">Decrease (- Debit)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-amount">Magnitude ({selectedAccount?.currency || "USD"})</Label>
              <Input
                id="adj-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-date">Effective Date</Label>
            <Input
              id="adj-date"
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-reason">Audit Reason & Justification</Label>
            <Textarea
              id="adj-reason"
              placeholder="e.g. Reconciliation discrepancy after bank fee correction"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={2}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Apply Adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Modal Component 6: Reverse Transaction
// ============================================================================

function ReverseTransactionModal({
  isOpen,
  onClose,
  workspaceId,
  transaction,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  transaction: FinancialTransactionWithRelations;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      reverseTransaction(workspaceId, {
        transactionId: transaction.id,
        reversalReason: reason,
      }),
    onSuccess: () => {
      toast.success("Transaction reversed successfully");
      onSuccess();
      onClose();
      setReason("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reverse transaction");
    },
  });

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 3) {
      toast.error("A reversal reason of at least 3 characters is required");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-500">
            <RotateCcw className="size-5" />
            Reverse Transaction
          </DialogTitle>
          <DialogDescription>
            Historical records are preserved. A reversal adjustment will zero out the financial
            effect.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleConfirm} className="space-y-4">
          <div className="rounded-md border border-border bg-muted/40 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original Transaction:</span>
              <span className="font-semibold">{transaction.description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-mono font-semibold">
                {formatMoney(transaction.amount, transaction.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account:</span>
              <span>{transaction.account?.name ?? "Account"}</span>
            </div>
            {transaction.transaction_type === "transfer" && (
              <p className="text-[11px] text-amber-500 mt-1">
                Note: This is a transfer. Both legs of the transfer will be reversed atomically.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rev-reason">Reversal Reason</Label>
            <Textarea
              id="rev-reason"
              placeholder="e.g. Duplicate entry or client dispute"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={2}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Confirm Reversal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Modal Component 7: Reconcile Account
// ============================================================================

function ReconcileModal({
  isOpen,
  onClose,
  workspaceId,
  account,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  account: FinancialAccount;
}) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["reconcile-account", workspaceId, account.id],
    queryFn: () => reconcileAccount(workspaceId, account.id),
    enabled: isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="size-5 text-primary" />
            Reconcile Account Balance
          </DialogTitle>
          <DialogDescription>
            Verifies persisted account balance against the full historical transactional ledger.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex justify-center items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="size-5 animate-spin" />
            Computing ledger verification...
          </div>
        ) : data ? (
          <div className="space-y-4 py-2">
            <div
              className={`rounded-lg border p-4 text-center ${
                data.is_reconciled
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-400"
              }`}
            >
              {data.is_reconciled ? (
                <div className="flex flex-col items-center gap-1.5">
                  <CheckCircle2 className="size-8 text-emerald-500" />
                  <span className="text-base font-semibold text-foreground">
                    Authoritative Balance Verified
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Current balance matches opening balance + net posted transactions with zero
                    variance.
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <AlertCircle className="size-8 text-rose-500" />
                  <span className="text-base font-semibold text-foreground">Variance Detected</span>
                  <span className="text-xs text-muted-foreground">
                    Variance of {formatMoney(data.variance, data.currency)} found between stored
                    balance and ledger.
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-md border border-border bg-card p-3 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Opening Balance:</span>
                <span className="font-mono">
                  {formatMoney(data.opening_balance, data.currency)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Calculated Ledger Balance:</span>
                <span className="font-mono font-semibold">
                  {formatMoney(data.calculated_balance, data.currency)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Stored Account Balance:</span>
                <span className="font-mono font-semibold">
                  {formatMoney(data.stored_balance, data.currency)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">Could not fetch reconciliation data.</p>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => void refetch()} size="sm">
            <RefreshCw className="mr-1.5 size-3.5" />
            Re-verify
          </Button>
          <Button onClick={onClose} size="sm">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Archive Account Button
// ============================================================================

function ArchiveAccountButton({
  workspaceId,
  account,
  onSuccess,
}: {
  workspaceId: string;
  account: FinancialAccount;
  onSuccess: () => void;
}) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () => archiveAccount(workspaceId, account.id),
    onSuccess: () => {
      toast.success(`Account "${account.name}" archived`);
      onSuccess();
      setIsConfirmOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to archive account");
    },
  });

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="text-xs h-7 text-muted-foreground hover:text-amber-500"
        onClick={() => setIsConfirmOpen(true)}
      >
        <Archive className="mr-1 size-3" />
        Archive
      </Button>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Archive Account</DialogTitle>
            <DialogDescription>
              Archiving "{account.name}" disables new postings while permanently preserving
              historical transactions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmOpen(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Confirm Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
