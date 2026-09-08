import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  DollarSign,
  Filter,
  Loader2,
  Plus,
  Search,
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
import { clientsQueryOptions, type Client } from "@/domain/clients";
import {
  createProject,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  projectsQueryOptions,
  type CreateProjectInput,
  type ProjectStatus,
} from "@/domain/projects";
import { roleAtLeast } from "@/domain/workspace";
import { CURRENCIES, parseMoneyInput } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/projects")({
  head: () => ({
    meta: [
      { title: "Projects | SoloOS" },
      { name: "description", content: "Track initiatives, deliverables, budgets, and timelines." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { workspace, role } = useWorkspace();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const canManage = roleAtLeast(role, "manager");

  const projectsQuery = useQuery(
    projectsQueryOptions(workspace.id, {
      status: statusFilter,
      ...(clientFilter !== "all" && { clientId: clientFilter }),
      search: searchQuery,
    }),
  );

  const clientsQuery = useQuery(clientsQueryOptions(workspace.id, { status: "active" }));

  const projects = projectsQuery.data ?? [];
  const clients = clientsQuery.data ?? [];

  const invalidateProjects = () => {
    queryClient.invalidateQueries({ queryKey: ["projects", workspace.id] });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <Badge variant="secondary" className="font-mono text-xs">
              {projects.length}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your work initiatives, deliverables, milestones, and budgets.
          </p>
        </div>

        {canManage && (
          <Button onClick={() => setIsCreateOpen(true)} className="sm:self-center">
            <Plus className="mr-1.5 size-4" />
            New Project
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="h-9 w-44 text-xs">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val as ProjectStatus | "all")}
          >
            <SelectTrigger className="h-9 w-36 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {PROJECT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PROJECT_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {projectsQuery.isLoading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {projectsQuery.isError && (
        <Card className="border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
          Failed to load projects: {projectsQuery.error?.message}
        </Card>
      )}

      {/* Content */}
      {!projectsQuery.isLoading && !projectsQuery.isError && (
        <>
          {projects.length === 0 ? (
            <Card className="border-dashed p-10 text-center">
              <Briefcase className="mx-auto size-10 text-muted-foreground/50" />
              <h3 className="mt-3 text-base font-semibold">
                {searchQuery || statusFilter !== "all" || clientFilter !== "all"
                  ? "No projects match your filters"
                  : "No projects created yet"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                {searchQuery || statusFilter !== "all" || clientFilter !== "all"
                  ? "Try adjusting your search criteria or resetting filters."
                  : "Organize client deliverables, track budgets, and establish project timelines."}
              </p>
              {canManage && !searchQuery && statusFilter === "all" && clientFilter === "all" && (
                <div className="mt-5">
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-1.5 size-4" />
                    Create First Project
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-md border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead>Timeline</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((p) => {
                      const isArchived = p.status === "archived";
                      const isCompleted = p.status === "completed";

                      return (
                        <TableRow
                          key={p.id}
                          className={cn(
                            "transition-colors",
                            isArchived && "opacity-60 bg-muted/20",
                          )}
                        >
                          <TableCell className="font-medium">
                            <Link
                              to="/app/projects/$projectId"
                              params={{ projectId: p.id }}
                              className="hover:underline text-foreground font-semibold block truncate max-w-xs"
                            >
                              {p.name}
                            </Link>
                            {p.description && (
                              <span className="text-xs text-muted-foreground line-clamp-1">
                                {p.description}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {p.client ? (
                              <Link
                                to="/app/clients/$clientId"
                                params={{ clientId: p.client.id }}
                                className="text-xs hover:underline flex items-center gap-1.5 text-muted-foreground"
                              >
                                <Building2 className="size-3.5 text-muted-foreground/70" />
                                <span>{p.client.name}</span>
                              </Link>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                Internal / Direct
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                isCompleted ? "secondary" : isArchived ? "outline" : "default"
                              }
                              className="text-[10px] capitalize"
                            >
                              {PROJECT_STATUS_LABELS[p.status] ?? p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {p.budget !== null && p.budget_currency ? (
                              <MoneyValue value={p.budget} currency={p.budget_currency} size="sm" />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {p.start_date || p.end_date ? (
                              <span>
                                {p.start_date ?? "Start"} → {p.end_date ?? "Ongoing"}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                              <Link to="/app/projects/$projectId" params={{ projectId: p.id }}>
                                View
                                <ArrowRight className="ml-1 size-3" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List */}
              <div className="block md:hidden space-y-3">
                {projects.map((p) => {
                  const isArchived = p.status === "archived";
                  const isCompleted = p.status === "completed";

                  return (
                    <Card
                      key={p.id}
                      className={cn(
                        "p-4 space-y-3 min-w-0 overflow-hidden transition-all",
                        isArchived && "opacity-60 bg-muted/20",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            to="/app/projects/$projectId"
                            params={{ projectId: p.id }}
                            className="font-semibold text-base leading-tight truncate block hover:underline"
                          >
                            {p.name}
                          </Link>
                          {p.client ? (
                            <Link
                              to="/app/clients/$clientId"
                              params={{ clientId: p.client.id }}
                              className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 hover:underline"
                            >
                              <Building2 className="size-3" />
                              <span className="truncate">{p.client.name}</span>
                            </Link>
                          ) : (
                            <div className="text-xs text-muted-foreground mt-0.5 italic">
                              Internal / Direct
                            </div>
                          )}
                        </div>
                        <Badge
                          variant={isCompleted ? "secondary" : isArchived ? "outline" : "default"}
                          className="text-[10px] capitalize shrink-0"
                        >
                          {PROJECT_STATUS_LABELS[p.status] ?? p.status}
                        </Badge>
                      </div>

                      {p.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {p.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2 text-xs">
                        <div>
                          {p.budget !== null && p.budget_currency ? (
                            <div className="flex items-baseline gap-1">
                              <span className="text-[11px] text-muted-foreground">Budget:</span>
                              <MoneyValue value={p.budget} currency={p.budget_currency} size="sm" />
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No budget set</span>
                          )}
                        </div>

                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                          <Link to="/app/projects/$projectId" params={{ projectId: p.id }}>
                            Details
                            <ArrowRight className="ml-1 size-3" />
                          </Link>
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        workspaceId={workspace.id}
        defaultCurrency={workspace.currency}
        clients={clients}
        onSuccess={invalidateProjects}
      />
    </div>
  );
}

function CreateProjectDialog({
  isOpen,
  onClose,
  workspaceId,
  defaultCurrency,
  clients,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  defaultCurrency: string;
  clients: Client[];
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState<string>("none");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState(defaultCurrency);
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(workspaceId, input),
    onSuccess: () => {
      toast.success("Project created successfully");
      onSuccess();
      onClose();
      setName("");
      setClientId("none");
      setDescription("");
      setStatus("planning");
      setStartDate("");
      setEndDate("");
      setBudget("");
      setNotes("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create project");
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
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="size-5 text-primary" />
            Create Project
          </DialogTitle>
          <DialogDescription>
            Establish an initiative, deliverable, or retainer in your workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Project Name</Label>
            <Input
              id="proj-name"
              placeholder="e.g. Website Redesign & CMS Migration"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Client Assignment</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select client (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None / Internal Initiative</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.company_name ? `(${c.company_name})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">Description (Optional)</Label>
            <Input
              id="proj-desc"
              placeholder="Brief summary of deliverables and scope..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Initial Status</Label>
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
            <Label htmlFor="proj-budget">Project Budget (Optional)</Label>
            <MoneyInput
              id="proj-budget"
              value={budget}
              onChange={setBudget}
              currency={budgetCurrency}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="proj-start">Start Date (Optional)</Label>
              <Input
                id="proj-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="proj-end">Target End Date (Optional)</Label>
              <Input
                id="proj-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proj-notes">Internal Notes (Optional)</Label>
            <Textarea
              id="proj-notes"
              placeholder="Contract stipulations, hourly caps, or team notes..."
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
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
