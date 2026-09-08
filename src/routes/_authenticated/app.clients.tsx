import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Archive,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  UserCheck,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  clientsQueryOptions,
  createClient,
  type ClientStatus,
  type CreateClientInput,
} from "@/domain/clients";
import { roleAtLeast } from "@/domain/workspace";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/clients")({
  head: () => ({
    meta: [
      { title: "Clients | SoloOS" },
      { name: "description", content: "Client directory and relationship management." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const { workspace, role } = useWorkspace();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all">("active");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const canManage = roleAtLeast(role, "manager");

  const clientsQuery = useQuery(
    clientsQueryOptions(workspace.id, {
      status: statusFilter,
      search: searchQuery,
    }),
  );

  const clients = clientsQuery.data ?? [];

  const invalidateClients = () => {
    queryClient.invalidateQueries({ queryKey: ["clients", workspace.id] });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
            <Badge variant="secondary" className="font-mono text-xs">
              {clients.length}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Directory of organizations, individuals, and contract partners you work with.
          </p>
        </div>

        {canManage && (
          <Button onClick={() => setIsCreateOpen(true)} className="sm:self-center">
            <Plus className="mr-1.5 size-4" />
            Add Client
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-1 self-start sm:self-auto rounded-lg border border-border bg-card p-1">
          <Button
            size="sm"
            variant={statusFilter === "active" ? "secondary" : "ghost"}
            className="h-7 text-xs"
            onClick={() => setStatusFilter("active")}
          >
            Active
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "all" ? "secondary" : "ghost"}
            className="h-7 text-xs"
            onClick={() => setStatusFilter("all")}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "archived" ? "secondary" : "ghost"}
            className="h-7 text-xs"
            onClick={() => setStatusFilter("archived")}
          >
            Archived
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {clientsQuery.isLoading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {clientsQuery.isError && (
        <Card className="border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
          Failed to load clients: {clientsQuery.error?.message}
        </Card>
      )}

      {/* Content */}
      {!clientsQuery.isLoading && !clientsQuery.isError && (
        <>
          {clients.length === 0 ? (
            <Card className="border-dashed p-10 text-center">
              <Users className="mx-auto size-10 text-muted-foreground/50" />
              <h3 className="mt-3 text-base font-semibold">
                {searchQuery ? "No clients found" : "No clients added yet"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                {searchQuery
                  ? "Try searching for a different name, email, or clear the search filter."
                  : "Keep track of who you work for, their contact details, and link active projects."}
              </p>
              {canManage && !searchQuery && (
                <div className="mt-5">
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-1.5 size-4" />
                    Add First Client
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
                      <TableHead>Client Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-center">Projects</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((c) => {
                      const projectsCount = c.projects?.[0]?.count ?? 0;
                      const isArchived = c.status === "archived";

                      return (
                        <TableRow
                          key={c.id}
                          className={cn(
                            "transition-colors",
                            isArchived && "opacity-60 bg-muted/20",
                          )}
                        >
                          <TableCell className="font-medium">
                            <Link
                              to="/app/clients/$clientId"
                              params={{ clientId: c.id }}
                              className="hover:underline text-foreground font-semibold flex items-center gap-2"
                            >
                              {c.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {c.company_name ? (
                              <span className="flex items-center gap-1.5 text-xs">
                                <Building2 className="size-3.5 text-muted-foreground/70" />
                                {c.company_name}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div className="space-y-0.5">
                              {c.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="size-3 text-muted-foreground/70" />
                                  <span>{c.email}</span>
                                </div>
                              )}
                              {c.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="size-3 text-muted-foreground/70" />
                                  <span>{c.phone}</span>
                                </div>
                              )}
                              {!c.email && !c.phone && "—"}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            <Badge variant="outline" className="gap-1 font-mono text-xs">
                              <Briefcase className="size-3" />
                              {projectsCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={isArchived ? "secondary" : "default"}
                              className="text-[10px] capitalize"
                            >
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                              <Link to="/app/clients/$clientId" params={{ clientId: c.id }}>
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
                {clients.map((c) => {
                  const projectsCount = c.projects?.[0]?.count ?? 0;
                  const isArchived = c.status === "archived";

                  return (
                    <Card
                      key={c.id}
                      className={cn(
                        "p-4 space-y-3 min-w-0 overflow-hidden transition-all",
                        isArchived && "opacity-60 bg-muted/20",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            to="/app/clients/$clientId"
                            params={{ clientId: c.id }}
                            className="font-semibold text-base leading-tight truncate block hover:underline"
                          >
                            {c.name}
                          </Link>
                          {c.company_name && (
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Building2 className="size-3" />
                              <span className="truncate">{c.company_name}</span>
                            </div>
                          )}
                        </div>
                        <Badge
                          variant={isArchived ? "secondary" : "default"}
                          className="text-[10px] capitalize shrink-0"
                        >
                          {c.status}
                        </Badge>
                      </div>

                      {(c.email || c.phone) && (
                        <div className="space-y-1 text-xs text-muted-foreground border-t border-border/40 pt-2">
                          {c.email && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Mail className="size-3 shrink-0 text-muted-foreground/70" />
                              <span className="truncate">{c.email}</span>
                            </div>
                          )}
                          {c.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="size-3 shrink-0 text-muted-foreground/70" />
                              <span>{c.phone}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2">
                        <Badge variant="outline" className="gap-1 font-mono text-xs">
                          <Briefcase className="size-3" />
                          {projectsCount} {projectsCount === 1 ? "project" : "projects"}
                        </Badge>
                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                          <Link to="/app/clients/$clientId" params={{ clientId: c.id }}>
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

      {/* Create Client Dialog */}
      <CreateClientDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        workspaceId={workspace.id}
        onSuccess={invalidateClients}
      />
    </div>
  );
}

function CreateClientDialog({
  isOpen,
  onClose,
  workspaceId,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: (input: CreateClientInput) => createClient(workspaceId, input),
    onSuccess: () => {
      toast.success("Client added successfully");
      onSuccess();
      onClose();
      setName("");
      setCompanyName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setNotes("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add client");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Client name is required");
      return;
    }

    mutation.mutate({
      name: name.trim(),
      companyName: companyName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            Add New Client
          </DialogTitle>
          <DialogDescription>
            Create a client or contract organization in your workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="client-name">Client / Contact Name</Label>
            <Input
              id="client-name"
              placeholder="e.g. Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="client-company">Company / Organization (Optional)</Label>
            <Input
              id="client-company"
              placeholder="e.g. Acme Corp"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="client-email">Email (Optional)</Label>
              <Input
                id="client-email"
                type="email"
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-phone">Phone (Optional)</Label>
              <Input
                id="client-phone"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="client-address">Billing Address (Optional)</Label>
            <Input
              id="client-address"
              placeholder="e.g. 123 Innovation Way, Suite 400"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="client-notes">Internal Notes (Optional)</Label>
            <Textarea
              id="client-notes"
              placeholder="Billing preferences, key contacts, contract terms..."
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
              Save Client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
