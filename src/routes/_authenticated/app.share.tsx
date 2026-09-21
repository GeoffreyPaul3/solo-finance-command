import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  FileText,
  Link2,
  Mail,
  Plus,
  Shield,
  Trash2,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/components/app/workspace-context";
import { supabase } from "@/integrations/supabase/client";
import { createShareArtifactServerFn, revokeShareArtifactServerFn, sendShareEmailServerFn } from "@/server/share";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/share")({
  component: ShareCenterPage,
});

const DEFAULT_ARTIFACT_META = { label: "Invoice", icon: FileText, color: "text-blue-500" };
const ARTIFACT_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  invoice: DEFAULT_ARTIFACT_META,
  financial_brief: { label: "Financial Brief", icon: TrendingUp, color: "text-emerald-500" },
  cashflow_report: { label: "Cash Flow Report", icon: Zap, color: "text-cyan-500" },
  profitability_report: { label: "Profitability Report", icon: TrendingUp, color: "text-purple-500" },
  client_report: { label: "Client Report", icon: Users, color: "text-orange-500" },
  project_report: { label: "Project Report", icon: FileText, color: "text-indigo-500" },
  tax_report: { label: "Tax Report", icon: Shield, color: "text-rose-500" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getShareUrl(token: string) {
  return `${window.location.origin}/share/${token}`;
}

// ─── Share Creation Dialog ────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface CreateShareDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

function CreateShareDialog({ open, onClose, workspaceId }: CreateShareDialogProps) {
  const qc = useQueryClient();
  const [step, setStep] = useState<WizardStep>(1);

  const [artifactType, setArtifactType] = useState<string>("invoice");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"unlisted" | "workspace_only">("unlisted");
  const [expiresInDays, setExpiresInDays] = useState<string>("");
  const [hideLineItemPricing, setHideLineItemPricing] = useState(false);
  const [hideNotes, setHideNotes] = useState(false);
  const [sourceEntityId, setSourceEntityId] = useState("workspace-summary");

  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  const { mutate: createShare, isPending } = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return createShareArtifactServerFn({
        data: {
          workspaceId,
          artifactType: artifactType as any,
          sourceEntityType: artifactType === "invoice" ? "invoice" : "workspace",
          sourceEntityId,
          title: title.trim(),
          description: description.trim() || undefined,
          visibility,
          accessConfig: { hideLineItemPricing, hideNotes },
          expiresInDays: expiresInDays ? parseInt(expiresInDays) : null,
          sourceData: { generatedAt: new Date().toISOString(), artifactType },
          authToken: session?.access_token,
        },
      });
    },
    onSuccess: (res) => {
      if (res.success) {
        setCreatedToken(res.shareToken);
        setCreatedUrl(getShareUrl(res.shareToken));
        setStep(5);
        qc.invalidateQueries({ queryKey: ["share-artifacts", workspaceId] });
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleClose() {
    setStep(1);
    setTitle(""); setDescription(""); setArtifactType("invoice"); setCreatedToken(null); setCreatedUrl(null);
    onClose();
  }

  const stepTitles: Record<WizardStep, string> = {
    1: "Choose Artifact Type",
    2: "Configure Access",
    3: "Set Expiration & Visibility",
    4: "Review Snapshot",
    5: "Share Link Ready",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-4 text-primary" />
            Create Secure Share — Step {step} of 5
          </DialogTitle>
          <DialogDescription>{stepTitles[step]}</DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex gap-1 mt-1 mb-4">
          {([1,2,3,4,5] as WizardStep[]).map(s => (
            <div key={s} className={cn("h-1 flex-1 rounded-full transition-colors", s <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="share-artifact-type">Artifact Type</Label>
              <Select value={artifactType} onValueChange={setArtifactType}>
                <SelectTrigger id="share-artifact-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ARTIFACT_TYPE_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      <span className="flex items-center gap-2">
                        <v.icon className={cn("size-3.5", v.color)} />
                        {v.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="share-title">Share Title</Label>
              <Input
                id="share-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Q3 2026 Financial Brief"
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="share-desc">Description (optional)</Label>
              <Textarea
                id="share-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Additional context for the recipient..."
                rows={3}
                maxLength={1000}
              />
            </div>
            <Button
              id="share-wizard-step1-next"
              className="w-full"
              onClick={() => setStep(2)}
              disabled={!title.trim() || !artifactType}
            >
              Next: Configure Access
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              These settings control what recipients can see in the shared view. The underlying financial
              records in SoloOS are <strong>never modified</strong>.
            </p>
            <div className="flex items-center justify-between py-3 border rounded-lg px-4">
              <div>
                <p className="text-sm font-medium">Hide Line-Item Pricing</p>
                <p className="text-xs text-muted-foreground">Show totals only, no individual amounts</p>
              </div>
              <Switch
                id="hide-line-pricing"
                checked={hideLineItemPricing}
                onCheckedChange={setHideLineItemPricing}
              />
            </div>
            <div className="flex items-center justify-between py-3 border rounded-lg px-4">
              <div>
                <p className="text-sm font-medium">Hide Internal Notes</p>
                <p className="text-xs text-muted-foreground">Redact memo and note fields from view</p>
              </div>
              <Switch
                id="hide-notes"
                checked={hideNotes}
                onCheckedChange={setHideNotes}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)} id="share-wizard-step2-next">
                Next: Visibility
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                {[
                  { value: "unlisted", label: "Unlisted", desc: "Anyone with the link" },
                  { value: "workspace_only", label: "Workspace Only", desc: "Authenticated members only" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    id={`visibility-${opt.value}`}
                    type="button"
                    onClick={() => setVisibility(opt.value as any)}
                    className={cn(
                      "border rounded-lg p-3 text-left transition-colors",
                      visibility === opt.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-muted-foreground/50",
                    )}
                  >
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expires-days">Expires In (days, optional)</Label>
              <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                <SelectTrigger id="expires-days">
                  <SelectValue placeholder="Never expires" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Never expires</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(4)} id="share-wizard-step3-next">
                Next: Review
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Snapshot Preview</p>
              <div className="space-y-2">
                {[
                  ["Artifact Type", ARTIFACT_TYPE_META[artifactType]?.label],
                  ["Title", title],
                  ["Visibility", visibility === "unlisted" ? "Unlisted (anyone with link)" : "Workspace members only"],
                  ["Expiration", expiresInDays ? `${expiresInDays} days` : "Never"],
                  ["Line-item pricing", hideLineItemPricing ? "Hidden" : "Visible"],
                  ["Notes", hideNotes ? "Redacted" : "Visible"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium truncate max-w-[55%] text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              <Shield className="inline size-3 mr-1 text-primary" />
              This snapshot is <strong>immutable</strong>. Future changes to the source entity will not
              affect this shared link.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>Back</Button>
              <Button
                className="flex-1"
                onClick={() => createShare()}
                disabled={isPending}
                id="share-wizard-generate"
              >
                {isPending ? "Generating…" : "Generate Secure Link"}
              </Button>
            </div>
          </div>
        )}

        {step === 5 && createdUrl && (
          <div className="space-y-5 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="size-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="size-6 text-emerald-500" />
              </div>
              <p className="font-semibold text-lg">Share Link Generated</p>
              <p className="text-sm text-muted-foreground">Your immutable, encrypted share link is ready.</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 text-left">
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">Secure Share URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs break-all text-foreground font-mono">{createdUrl}</code>
                <Button
                  size="sm"
                  variant="outline"
                  id="copy-share-url-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(createdUrl);
                    toast.success("Link copied to clipboard");
                  }}
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
            </div>
            <Button className="w-full" onClick={handleClose} id="share-wizard-done">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Email Dialog ─────────────────────────────────────────────────────────────

interface SendEmailDialogProps {
  open: boolean;
  onClose: () => void;
  artifact: { id: string; title: string };
  workspaceId: string;
}

function SendEmailDialog({ open, onClose, artifact, workspaceId }: SendEmailDialogProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return sendShareEmailServerFn({
        data: {
          workspaceId,
          artifactId: artifact.id,
          recipientEmail: email,
          recipientName: name || undefined,
          customMessage: message || undefined,
          authToken: session?.access_token,
        },
      });
    },
    onSuccess: () => {
      toast.success("Share email dispatched successfully");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-4 text-primary" />
            Send Share via Email
          </DialogTitle>
          <DialogDescription>
            A secure link to &ldquo;{artifact.title}&rdquo; will be dispatched.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email-recipient">Recipient Email *</Label>
            <Input id="email-recipient" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="accountant@firm.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-recipient-name">Recipient Name (optional)</Label>
            <Input id="email-recipient-name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-message">Custom Message (optional)</Label>
            <Textarea id="email-message" value={message} onChange={e => setMessage(e.target.value)} rows={3} maxLength={500} placeholder="Add a personal note..." />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1"
              disabled={!email || isPending}
              onClick={() => mutate()}
              id="send-share-email-btn"
            >
              {isPending ? "Sending…" : "Send Email"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ShareCenterPage() {
  const { workspace } = useWorkspace();
  const workspaceId = workspace.id;
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [emailArtifact, setEmailArtifact] = useState<{ id: string; title: string } | null>(null);

  const { data: artifacts = [], isLoading } = useQuery({
    queryKey: ["share-artifacts", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shareable_artifacts")
        .select("id, title, description, artifact_type, visibility, status, share_token, view_count, created_at, expires_at, revoked_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const { mutate: revoke } = useMutation({
    mutationFn: async (artifactId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      return revokeShareArtifactServerFn({
        data: { workspaceId, artifactId, authToken: session?.access_token },
      });
    },
    onSuccess: () => {
      toast.success("Share link revoked");
      qc.invalidateQueries({ queryKey: ["share-artifacts", workspaceId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const active = artifacts.filter(a => a.status === "active");
  const revoked = artifacts.filter(a => a.status !== "active");
  const totalViews = active.reduce((sum, a) => sum + (a.view_count ?? 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Share Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create secure, immutable share links for invoices, reports, and financial briefs.
          </p>
        </div>
        <Button id="open-create-share-btn" onClick={() => setShowCreate(true)}>
          <Plus className="size-4 mr-2" />
          New Share Link
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Links", value: active.length, icon: Link2, color: "text-primary" },
          { label: "Total Views", value: totalViews, icon: Eye, color: "text-emerald-500" },
          { label: "Revoked", value: revoked.length, icon: X, color: "text-muted-foreground" },
          { label: "All-time Links", value: artifacts.length, icon: FileText, color: "text-blue-500" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={cn("size-4", s.color)} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Links */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Active Share Links</h2>
        {isLoading && (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading shares…</div>
        )}
        {!isLoading && active.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Link2 className="size-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium">No active share links</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first secure share to distribute financial artifacts.</p>
              <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)} id="create-first-share-btn">
                <Plus className="size-3.5 mr-1.5" />
                Create Share Link
              </Button>
            </CardContent>
          </Card>
        )}
        {active.map(artifact => {
          const meta = ARTIFACT_TYPE_META[artifact.artifact_type] ?? DEFAULT_ARTIFACT_META;
          const Icon = meta.icon;
          const url = getShareUrl(artifact.share_token);
          const isExpired = artifact.expires_at ? new Date(artifact.expires_at) < new Date() : false;
          return (
            <Card key={artifact.id} className={cn("border", isExpired && "opacity-60")}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="size-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <Icon className={cn("size-4", meta.color)} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{artifact.title}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {meta.label}
                        </Badge>
                        <Badge
                          variant={artifact.visibility === "unlisted" ? "secondary" : "outline"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {artifact.visibility === "unlisted" ? "Unlisted" : "Workspace"}
                        </Badge>
                        {isExpired && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Expired</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="size-3" />{artifact.view_count ?? 0} views</span>
                        <span className="flex items-center gap-1"><Clock className="size-3" />Created {formatDate(artifact.created_at)}</span>
                        {artifact.expires_at && (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="size-3" />
                            Expires {formatDate(artifact.expires_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      id={`copy-link-${artifact.id}`}
                      onClick={() => {
                        navigator.clipboard.writeText(url);
                        toast.success("Link copied");
                      }}
                    >
                      <Copy className="size-3.5 mr-1.5" />
                      Copy Link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      id={`send-email-${artifact.id}`}
                      onClick={() => setEmailArtifact({ id: artifact.id, title: artifact.title })}
                    >
                      <Mail className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      id={`revoke-link-${artifact.id}`}
                      onClick={() => {
                        if (confirm(`Revoke share link for "${artifact.title}"? Recipients will immediately lose access.`)) {
                          revoke(artifact.id);
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revoked / Expired */}
      {revoked.length > 0 && (
        <div className="space-y-3">
          <Separator />
          <h2 className="text-sm font-medium text-muted-foreground">Revoked & Expired Links</h2>
          {revoked.map(artifact => {
            const meta = ARTIFACT_TYPE_META[artifact.artifact_type] ?? DEFAULT_ARTIFACT_META;
            const Icon = meta.icon;
            return (
              <div key={artifact.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed opacity-50">
                <Icon className={cn("size-4", meta.color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{artifact.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {artifact.status === "revoked" ? `Revoked ${artifact.revoked_at ? formatDate(artifact.revoked_at) : ""}` : "Expired"}
                    {" · "}{artifact.view_count ?? 0} total views
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{artifact.status}</Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* Info banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            How Secure Shares Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2"><CheckCircle2 className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />Every share is an <strong>immutable snapshot</strong> — source changes don&apos;t silently update existing links.</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />Links use <strong>256-bit cryptographic tokens</strong>. Search engines cannot index them (<code>noindex, nofollow</code>).</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />View counts are incremented <strong>server-side atomically</strong> — never client-controllable.</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />Revoke any link instantly. Recipients lose access immediately.</li>
          </ul>
        </CardContent>
      </Card>

      <CreateShareDialog open={showCreate} onClose={() => setShowCreate(false)} workspaceId={workspaceId} />
      {emailArtifact && (
        <SendEmailDialog
          open={!!emailArtifact}
          onClose={() => setEmailArtifact(null)}
          artifact={emailArtifact}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
