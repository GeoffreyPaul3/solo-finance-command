import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  Edit,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
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
import { Textarea } from "@/components/ui/textarea";
import { MoneyValue } from "@/components/ui/money-value";
import {
  archiveClient,
  clientQueryOptions,
  unarchiveClient,
  updateClient,
  type Client,
  type UpdateClientInput,
} from "@/domain/clients";
import { PROJECT_STATUS_LABELS, type Project } from "@/domain/projects";
import { roleAtLeast } from "@/domain/workspace";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/clients/$clientId")({
  head: () => ({
    meta: [
      { title: "Client Details | SoloOS" },
      { name: "description", content: "Client profile, associated projects, and contact history." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientDetailPage,
});

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const { workspace, role } = useWorkspace();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isEditOpen, setIsEditOpen] = useState(false);

  const canManage = roleAtLeast(role, "manager");

  const clientQuery = useQuery(clientQueryOptions(workspace.id, clientId));
  const client = clientQuery.data;

  const invalidateClient = () => {
    queryClient.invalidateQueries({ queryKey: ["client", workspace.id, clientId] });
    queryClient.invalidateQueries({ queryKey: ["clients", workspace.id] });
  };

  const archiveMutation = useMutation({
    mutationFn: () => archiveClient(workspace.id, clientId),
    onSuccess: () => {
      toast.success("Client archived");
      invalidateClient();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to archive client");
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: () => unarchiveClient(workspace.id, clientId),
    onSuccess: () => {
      toast.success("Client reactivated");
      invalidateClient();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reactivate client");
    },
  });

  if (clientQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (clientQuery.isError || !client) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
          <Link to="/app/clients">
            <ArrowLeft className="size-3.5" />
            Back to Clients
          </Link>
        </Button>
        <Card className="border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
          Failed to load client: {clientQuery.error?.message ?? "Client not found"}
        </Card>
      </div>
    );
  }

  const isArchived = client.status === "archived";
  const projects = (client.projects as Project[]) ?? [];

  return (
    <div className="space-y-6 pb-12">
      {/* Back button */}
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
          <Link to="/app/clients">
            <ArrowLeft className="size-3.5" />
            Back to Clients
          </Link>
        </Button>
      </div>

      {/* Hero Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-border/60 pb-6">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{client.name}</h1>
            <Badge variant={isArchived ? "secondary" : "default"} className="text-xs capitalize">
              {client.status}
            </Badge>
          </div>
          {client.company_name && (
            <p className="text-base text-muted-foreground flex items-center gap-1.5">
              <Building2 className="size-4 text-muted-foreground/70" />
              <span>{client.company_name}</span>
            </p>
          )}
        </div>

        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => setIsEditOpen(true)}>
              <Edit className="mr-1.5 size-3.5" />
              Edit
            </Button>
            {isArchived ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => unarchiveMutation.mutate()}
                disabled={unarchiveMutation.isPending}
              >
                <ArchiveRestore className="mr-1.5 size-3.5" />
                Reactivate
              </Button>
            ) : (
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

      {/* Main Grid: Details + Contact */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Contact info card */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Email</span>
              {client.email ? (
                <a
                  href={`mailto:${client.email}`}
                  className="font-medium hover:underline flex items-center gap-1.5 mt-0.5"
                >
                  <Mail className="size-3.5 text-muted-foreground" />
                  <span className="truncate">{client.email}</span>
                </a>
              ) : (
                <span className="text-muted-foreground italic">No email provided</span>
              )}
            </div>

            <div>
              <span className="text-xs text-muted-foreground block">Phone</span>
              {client.phone ? (
                <a
                  href={`tel:${client.phone}`}
                  className="font-medium hover:underline flex items-center gap-1.5 mt-0.5"
                >
                  <Phone className="size-3.5 text-muted-foreground" />
                  <span>{client.phone}</span>
                </a>
              ) : (
                <span className="text-muted-foreground italic">No phone provided</span>
              )}
            </div>

            <div>
              <span className="text-xs text-muted-foreground block">Billing Address</span>
              {client.address ? (
                <p className="text-xs font-mono mt-0.5 whitespace-pre-line flex items-start gap-1.5">
                  <MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{client.address}</span>
                </p>
              ) : (
                <span className="text-muted-foreground italic">No address provided</span>
              )}
            </div>

            <div className="border-t border-border/50 pt-3 text-xs text-muted-foreground space-y-1">
              <div>Added: {new Date(client.created_at).toLocaleDateString()}</div>
              <div>Last updated: {new Date(client.updated_at).toLocaleDateString()}</div>
            </div>
          </CardContent>
        </Card>

        {/* Notes & Overview */}
        <Card className="md:col-span-2 flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Internal Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {client.notes ? (
              <p className="text-sm whitespace-pre-line leading-relaxed text-foreground/90">
                {client.notes}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No internal notes recorded for this client. You can add billing preferences, key
                stakeholders, or relationship context via the Edit button.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Associated Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Briefcase className="size-5 text-primary" />
              Associated Projects
            </h2>
            <p className="text-xs text-muted-foreground">
              Work initiatives, retainers, and contracts assigned to this client.
            </p>
          </div>

          <Badge variant="secondary" className="font-mono text-xs">
            {projects.length}
          </Badge>
        </div>

        {projects.length === 0 ? (
          <Card className="border-dashed p-8 text-center">
            <Briefcase className="mx-auto size-8 text-muted-foreground/50" />
            <h3 className="mt-2 text-sm font-semibold">No projects for this client yet</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Create projects to organize deliverables, budgets, and track progress for{" "}
              {client.name}.
            </p>
            {canManage && (
              <div className="mt-4">
                <Button asChild size="sm">
                  <Link to="/app/projects">
                    <Plus className="mr-1.5 size-3.5" />
                    Go to Projects
                  </Link>
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const status = p.status as keyof typeof PROJECT_STATUS_LABELS;
              return (
                <Card
                  key={p.id}
                  className="flex flex-col justify-between p-4 min-w-0 overflow-hidden hover:border-border/80 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to="/app/projects/$projectId"
                        params={{ projectId: p.id }}
                        className="font-semibold text-base leading-tight truncate hover:underline"
                      >
                        {p.name}
                      </Link>
                      <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                        {PROJECT_STATUS_LABELS[status] ?? p.status}
                      </Badge>
                    </div>

                    {p.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 border-t border-border/50 pt-3">
                    {p.budget !== null && p.budget_currency && (
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-muted-foreground">Budget:</span>
                        <MoneyValue value={p.budget} currency={p.budget_currency} size="sm" />
                      </div>
                    )}

                    {(p.start_date || p.end_date) && (
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Timeline:</span>
                        <span>
                          {p.start_date ?? "—"} → {p.end_date ?? "Ongoing"}
                        </span>
                      </div>
                    )}

                    <div className="pt-1 flex justify-end">
                      <Button asChild size="sm" variant="ghost" className="h-6 text-xs gap-1">
                        <Link to="/app/projects/$projectId" params={{ projectId: p.id }}>
                          View
                          <ArrowRight className="size-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Phase 4 Architecture Readiness Card */}
      <Card className="border-border/60 bg-muted/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FileText className="size-4" />
            Financial History & Invoicing
          </CardTitle>
          <CardDescription className="text-xs">
            Architecture prepared for Phase 4: Invoicing + Payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground leading-relaxed">
            When Phase 4 is enabled, all issued invoices, recorded milestone payments, and
            outstanding receivables associated with <strong>{client.name}</strong> will be
            consolidated here in real time. No financial calculations are mocked.
          </p>
        </CardContent>
      </Card>

      {/* Edit Client Dialog */}
      <EditClientDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        workspaceId={workspace.id}
        client={client}
        onSuccess={invalidateClient}
      />
    </div>
  );
}

function EditClientDialog({
  isOpen,
  onClose,
  workspaceId,
  client,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  client: Client;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(client.name ?? "");
  const [companyName, setCompanyName] = useState(client.company_name ?? "");
  const [email, setEmail] = useState(client.email ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [address, setAddress] = useState(client.address ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");

  const mutation = useMutation({
    mutationFn: (patch: UpdateClientInput) => updateClient(workspaceId, client.id, patch),
    onSuccess: () => {
      toast.success("Client details updated");
      onSuccess();
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update client");
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
      companyName: companyName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
          <DialogDescription>
            Update profile and contact details for {client.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Client Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-company">Company (Optional)</Label>
            <Input
              id="edit-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input id="edit-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-address">Billing Address</Label>
            <Input id="edit-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
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
