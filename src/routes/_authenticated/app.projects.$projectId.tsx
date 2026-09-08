import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  Edit,
  FileText,
  Loader2,
  Pause,
  Play,
  Plus,
  Receipt,
  Scale,
  Users,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { MoneyValue, MoneyValueBlock } from "@/components/ui/money-value";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { clientsQueryOptions, type Client } from "@/domain/clients";
import {
  projectInvoicesQueryOptions,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
} from "@/domain/invoices";
import {
  archiveProject,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  projectQueryOptions,
  updateProject,
  updateProjectStatus,
  type ProjectStatus,
  type ProjectWithClient,
  type UpdateProjectInput,
} from "@/domain/projects";
import { roleAtLeast } from "@/domain/workspace";
import { CURRENCIES, parseMoneyInput } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Project Details | SoloOS" },
      { name: "description", content: "Project milestones, timeline, budget, and scope." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const { workspace, role } = useWorkspace();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isEditOpen, setIsEditOpen] = useState(false);

  const canManage = roleAtLeast(role, "manager");

  const projectQuery = useQuery(projectQueryOptions(workspace.id, projectId));
  const invoicesQuery = useQuery(projectInvoicesQueryOptions(workspace.id, projectId));
  const clientsQuery = useQuery(clientsQueryOptions(workspace.id, { status: "active" }));

  const project = projectQuery.data;
  const invoices = invoicesQuery.data ?? [];
  const clients = clientsQuery.data ?? [];

  const invalidateProject = () => {
    queryClient.invalidateQueries({ queryKey: ["project", workspace.id, projectId] });
    queryClient.invalidateQueries({ queryKey: ["projects", workspace.id] });
    queryClient.invalidateQueries({ queryKey: ["invoices", "project", workspace.id, projectId] });
  };

  const statusMutation = useMutation({
    mutationFn: (newStatus: ProjectStatus) =>
      updateProjectStatus(workspace.id, projectId, newStatus),
    onSuccess: (_, status) => {
      toast.success(`Project status updated to ${PROJECT_STATUS_LABELS[status]}`);
      invalidateProject();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update project status");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveProject(workspace.id, projectId),
    onSuccess: () => {
      toast.success("Project archived");
      invalidateProject();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to archive project");
    },
  });

  if (projectQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projectQuery.isError || !project) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
          <Link to="/app/projects">
            <ArrowLeft className="size-3.5" />
            Back to Projects
          </Link>
        </Button>
        <Card className="border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
          Failed to load project: {projectQuery.error?.message ?? "Project not found"}
        </Card>
      </div>
    );
  }

  const isArchived = project.status === "archived";
  const isCompleted = project.status === "completed";

  return (
    <div className="space-y-6 pb-12">
      {/* Back button */}
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
          <Link to="/app/projects">
            <ArrowLeft className="size-3.5" />
            Back to Projects
          </Link>
        </Button>
      </div>

      {/* Hero Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-border/60 pb-6">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">
              {project.name}
            </h1>
            <Badge
              variant={isCompleted ? "secondary" : isArchived ? "outline" : "default"}
              className="text-xs capitalize"
            >
              {PROJECT_STATUS_LABELS[project.status] ?? project.status}
            </Badge>
          </div>

          {project.description && (
            <p className="text-sm text-muted-foreground max-w-2xl">{project.description}</p>
          )}
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Status switcher dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="text-xs">
                  Change Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs">Select Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {PROJECT_STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => statusMutation.mutate(s)}
                    disabled={project.status === s || statusMutation.isPending}
                    className="text-xs capitalize"
                  >
                    {PROJECT_STATUS_LABELS[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" variant="outline" onClick={() => setIsEditOpen(true)}>
              <Edit className="mr-1.5 size-3.5" />
              Edit
            </Button>

            {!isArchived && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending}
              >
                <Archive className="mr-1.5 size-3.5" />
                Archive
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Key Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Budget Card */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Project Budget
            </CardTitle>
            <DollarSign className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="min-w-0">
            {project.budget !== null && project.budget_currency ? (
              <MoneyValueBlock
                value={project.budget}
                currency={project.budget_currency}
                size="xl"
              />
            ) : (
              <div className="text-base font-semibold text-muted-foreground">
                No budget specified
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {project.budget !== null
                ? "Agreed contract budget / cap"
                : "Uncapped or time & materials"}
            </p>
          </CardContent>
        </Card>

        {/* Client Association Card */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Client
            </CardTitle>
            <Users className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="min-w-0">
            {project.client ? (
              <div className="space-y-1">
                <Link
                  to="/app/clients/$clientId"
                  params={{ clientId: project.client.id }}
                  className="font-bold text-lg hover:underline text-foreground block truncate"
                >
                  {project.client.name}
                </Link>
                {project.client.company_name && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="size-3" />
                    <span>{project.client.company_name}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-lg font-bold">Internal / Direct</div>
                <p className="text-xs text-muted-foreground">No external client attached</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline Card */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Timeline
            </CardTitle>
            <Calendar className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="min-w-0 space-y-1">
            <div className="text-base font-bold">
              {project.start_date || project.end_date ? (
                <span>
                  {project.start_date ?? "Start"} → {project.end_date ?? "Ongoing"}
                </span>
              ) : (
                <span className="text-muted-foreground font-normal">Flexible timeline</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Created on {new Date(project.created_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Scope & Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Project Scope & Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">
              Scope Description
            </h4>
            <p className="text-sm mt-1 whitespace-pre-line text-foreground/90">
              {project.description || (
                <span className="text-muted-foreground italic">No description provided.</span>
              )}
            </p>
          </div>

          <div className="border-t border-border/50 pt-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">
              Internal Notes
            </h4>
            <p className="text-sm mt-1 whitespace-pre-line text-foreground/90">
              {project.notes || (
                <span className="text-muted-foreground italic">No internal notes added.</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Project Invoices & Realization Section */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Receipt className="size-5 text-primary" />
              Project Invoicing & Receivables
            </h2>
            <p className="text-xs text-muted-foreground">
              Invoices attributed to this project deliverable, milestone receipts, and pending
              balances.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs">
              {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}
            </Badge>
            {canManage && (
              <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                <Link to="/app/invoices">
                  <Plus className="mr-1.5 size-3.5" />
                  New Invoice
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Project Financial Realization Metrics */}
        {invoices.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="p-3.5">
              <span className="text-xs text-muted-foreground block">Total Invoiced</span>
              <div className="mt-1 font-bold text-base">
                <MoneyValue
                  value={invoices.reduce((acc, i) => acc + Number(i.total), 0)}
                  currency={invoices[0]?.currency ?? workspace.currency}
                  size="md"
                />
              </div>
            </Card>

            <Card className="p-3.5">
              <span className="text-xs text-muted-foreground block">Total Realized (Paid)</span>
              <div className="mt-1 font-bold text-base text-emerald-500">
                <MoneyValue
                  value={invoices.reduce((acc, i) => acc + Number(i.amount_paid), 0)}
                  currency={invoices[0]?.currency ?? workspace.currency}
                  size="md"
                />
              </div>
            </Card>

            <Card className="p-3.5">
              <span className="text-xs text-muted-foreground block">Outstanding Balance</span>
              <div className="mt-1 font-bold text-base text-amber-500">
                <MoneyValue
                  value={invoices.reduce((acc, i) => acc + Number(i.amount_due), 0)}
                  currency={invoices[0]?.currency ?? workspace.currency}
                  size="md"
                />
              </div>
            </Card>
          </div>
        )}

        {invoices.length === 0 ? (
          <Card className="border-dashed p-8 text-center">
            <Receipt className="mx-auto size-8 text-muted-foreground/50" />
            <h3 className="mt-2 text-sm font-semibold">No invoices linked to this project yet</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Create an invoice for {project.client?.name ?? "this client"} and select this project
              to track revenue against your project milestones and budget.
            </p>
            {canManage && (
              <div className="mt-4">
                <Button asChild size="sm">
                  <Link to="/app/invoices">
                    <Plus className="mr-1.5 size-3.5" />
                    Create Invoice
                  </Link>
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[130px] font-semibold">Invoice #</TableHead>
                  <TableHead className="w-[110px] font-semibold">Issue Date</TableHead>
                  <TableHead className="w-[110px] font-semibold">Due Date</TableHead>
                  <TableHead className="text-right font-semibold">Total</TableHead>
                  <TableHead className="text-right font-semibold">Outstanding</TableHead>
                  <TableHead className="w-[110px] text-center font-semibold">Status</TableHead>
                  <TableHead className="w-[80px] text-right font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const colors = INVOICE_STATUS_COLORS[inv.status];
                  return (
                    <TableRow key={inv.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-medium">
                        <Link
                          to="/app/invoices/$invoiceId"
                          params={{ invoiceId: inv.id }}
                          className="hover:underline text-primary"
                        >
                          {inv.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {inv.issue_date}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {inv.due_date}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-medium">
                        <MoneyValue value={inv.total} currency={inv.currency} size="sm" />
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-semibold">
                        <MoneyValue
                          value={inv.amount_due}
                          currency={inv.currency}
                          size="sm"
                          className={
                            inv.amount_due > 0 ? "text-amber-500" : "text-muted-foreground"
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] uppercase font-semibold",
                            colors.bg,
                            colors.text,
                            colors.border,
                          )}
                        >
                          {INVOICE_STATUS_LABELS[inv.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                          <Link to="/app/invoices/$invoiceId" params={{ invoiceId: inv.id }}>
                            <ArrowRight className="size-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Edit Project Dialog */}
      <EditProjectDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        workspaceId={workspace.id}
        project={project}
        clients={clients}
        onSuccess={invalidateProject}
      />
    </div>
  );
}

function EditProjectDialog({
  isOpen,
  onClose,
  workspaceId,
  project,
  clients,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  project: ProjectWithClient;
  clients: Client[];
  onSuccess: () => void;
}) {
  const [name, setName] = useState(project.name ?? "");
  const [clientId, setClientId] = useState<string>(project.client_id ?? "none");
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project.status ?? "planning");
  const [startDate, setStartDate] = useState(project.start_date ?? "");
  const [endDate, setEndDate] = useState(project.end_date ?? "");
  const [budget, setBudget] = useState(project.budget !== null ? String(project.budget) : "");
  const [budgetCurrency, setBudgetCurrency] = useState(project.budget_currency ?? "USD");
  const [notes, setNotes] = useState(project.notes ?? "");

  const mutation = useMutation({
    mutationFn: (patch: UpdateProjectInput) => updateProject(workspaceId, project.id, patch),
    onSuccess: () => {
      toast.success("Project updated successfully");
      onSuccess();
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update project");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    const parsedBudget = budget.trim() ? parseFloat(parseMoneyInput(budget)) : null;

    mutation.mutate({
      name: name.trim(),
      clientId: clientId === "none" ? null : clientId,
      description: description.trim() || null,
      status,
      startDate: startDate || null,
      endDate: endDate || null,
      budget: parsedBudget,
      budgetCurrency: parsedBudget !== null ? budgetCurrency : null,
      notes: notes.trim() || null,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update details, budget, and timeline for {project.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-proj-name">Project Name</Label>
            <Input
              id="edit-proj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None / Internal</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.company_name ? `(${c.company_name})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-proj-desc">Description</Label>
            <Input
              id="edit-proj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as ProjectStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROJECT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Budget Currency</Label>
              <Select value={budgetCurrency} onValueChange={setBudgetCurrency}>
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

          <div className="space-y-1.5">
            <Label htmlFor="edit-proj-budget">Budget</Label>
            <MoneyInput
              id="edit-proj-budget"
              value={budget}
              onChange={setBudget}
              currency={budgetCurrency}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-proj-start">Start Date</Label>
              <Input
                id="edit-proj-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-proj-end">Target End Date</Label>
              <Input
                id="edit-proj-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-proj-notes">Notes</Label>
            <Textarea
              id="edit-proj-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-20 resize-none text-sm"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
