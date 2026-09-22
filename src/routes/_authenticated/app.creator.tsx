import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Layers,
  Link as LinkIcon,
  Loader2,
  Megaphone,
  Plus,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { slugifyCreatorHandle, validateCampaignCode } from "@/domain/creator";
import {
  submitCreatorApplicationServerFn,
  createCreatorCampaignServerFn,
  getCreatorAssetsServerFn,
  getCreatorEarningsServerFn,
  getMyCreatorProfileServerFn,
} from "@/server/creator";

export const Route = createFileRoute("/_authenticated/app/creator")({
  component: CreatorPortalPage,
});

function CreatorPortalPage() {
  const queryClient = useQueryClient();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Application form state
  const [applyForm, setApplyForm] = useState({
    displayName: "",
    publicHandle: "",
    email: "",
    bio: "",
    primaryPlatform: "youtube",
    estimatedAudience: "",
    websiteUrl: "",
    applicationNote: "",
  });

  // Campaign create modal
  const [createCampaignModal, setCreateCampaignModal] = useState({
    open: false,
    name: "",
    campaignCode: "",
    platform: "youtube",
  });

  // Load creator overview
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["creator_overview"],
    queryFn: () => getMyCreatorProfileServerFn({ data: {} }),
  });

  // Load earnings & funnel
  const { data: earnings, isLoading: earningsLoading } = useQuery({
    queryKey: ["creator_earnings"],
    queryFn: () => getCreatorEarningsServerFn({ data: {} }),
    enabled: Boolean(overview?.profile?.creator_status === "active"),
  });

  // Load creative assets
  const { data: assetsData } = useQuery({
    queryKey: ["creator_assets"],
    queryFn: () => getCreatorAssetsServerFn(),
    enabled: Boolean(overview?.profile?.creator_status === "active"),
  });

  // Apply mutation
  const applyMutation = useMutation({
    mutationFn: (vars: typeof applyForm) =>
      submitCreatorApplicationServerFn({
        data: {
          displayName: vars.displayName.trim(),
          publicHandle: vars.publicHandle.trim().toLowerCase(),
          email: vars.email.trim(),
          bio: vars.bio.trim() || undefined,
          primaryPlatform: vars.primaryPlatform as PlatformEnum,
          websiteUrl: vars.websiteUrl.trim() || undefined,
          applicationNote: vars.applicationNote.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Application submitted! Our team will review your profile shortly.");
      void queryClient.invalidateQueries({ queryKey: ["creator_overview"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to submit application.");
    },
  });

  // Create Campaign mutation
  type PlatformEnum =
    | "tiktok"
    | "instagram"
    | "youtube"
    | "linkedin"
    | "x"
    | "facebook"
    | "newsletter"
    | "blog"
    | "podcast"
    | "community"
    | "other";
  const createCampaignMutation = useMutation({
    mutationFn: (vars: typeof createCampaignModal) =>
      createCreatorCampaignServerFn({
        data: {
          name: vars.name.trim(),
          campaignCode: vars.campaignCode.trim().toLowerCase(),
          platform: vars.platform as PlatformEnum,
          destinationPath: "/",
        },
      }),
    onSuccess: () => {
      toast.success("Tracking campaign created!");
      setCreateCampaignModal({ open: false, name: "", campaignCode: "", platform: "youtube" });
      void queryClient.invalidateQueries({ queryKey: ["creator_overview"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create campaign.");
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedLink(label);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "https://solofinance.app";

  if (overviewLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const profile = overview?.profile;

  // ─────────────────────────────────────────────────────────────────
  // STATE 1: NO PROFILE — SHOW APPLICATION FORM
  // ─────────────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 py-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="size-3.5" />
            SoloOS Creator Distribution Program
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Partner with SoloOS & Earn Recurring Commissions
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
            Earn <strong>20% recurring commissions</strong> for 12 months on every freelance
            professional and studio you introduce to the financial operating system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/40 bg-card/50">
            <CardHeader className="p-4 pb-2">
              <Banknote className="size-5 text-emerald-500 mb-1" />
              <CardTitle className="text-sm font-semibold">20% Recurring</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
              Earn a full 20% cut on all subscription payments for 12 consecutive months.
            </CardContent>
          </Card>
          <Card className="border-border/40 bg-card/50">
            <CardHeader className="p-4 pb-2">
              <LinkIcon className="size-5 text-primary mb-1" />
              <CardTitle className="text-sm font-semibold">Custom Slugs & Tags</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
              Get clean vanity URLs like <code>/c/yourname</code> and per-channel campaign tags.
            </CardContent>
          </Card>
          <Card className="border-border/40 bg-card/50">
            <CardHeader className="p-4 pb-2">
              <TrendingUp className="size-5 text-blue-500 mb-1" />
              <CardTitle className="text-sm font-semibold">Real-Time Funnel</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
              Track clicks, signups, activations, and commissions directly inside your portal.
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Creator Application</CardTitle>
            <CardDescription>
              Tell us about your audience and channels. Applications are reviewed within 24–48
              hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Creator / Channel Name *</Label>
                <Input
                  id="displayName"
                  placeholder="e.g. Sarah Jenkins"
                  value={applyForm.displayName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setApplyForm((s) => ({
                      ...s,
                      displayName: name,
                      publicHandle: s.publicHandle || slugifyCreatorHandle(name),
                    }));
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="publicHandle">Desired Partner Handle (Vanity URL) *</Label>
                <div className="flex items-center">
                  <span className="text-xs font-mono text-muted-foreground mr-1">/c/</span>
                  <Input
                    id="publicHandle"
                    placeholder="sarah"
                    value={applyForm.publicHandle}
                    onChange={(e) =>
                      setApplyForm((s) => ({
                        ...s,
                        publicHandle: slugifyCreatorHandle(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Contact Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={applyForm.email}
                onChange={(e) => setApplyForm((s) => ({ ...s, email: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="primaryPlatform">Primary Content Platform *</Label>
                <Select
                  value={applyForm.primaryPlatform}
                  onValueChange={(val) => setApplyForm((s) => ({ ...s, primaryPlatform: val }))}
                >
                  <SelectTrigger id="primaryPlatform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="twitter">X / Twitter</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="newsletter">Substack / Newsletter</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="podcast">Podcast</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="estimatedAudience">Estimated Audience / Subscribers</Label>
                <Input
                  id="estimatedAudience"
                  type="number"
                  placeholder="e.g. 25000"
                  value={applyForm.estimatedAudience}
                  onChange={(e) =>
                    setApplyForm((s) => ({ ...s, estimatedAudience: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="websiteUrl">Primary Channel / Portfolio Link *</Label>
              <Input
                id="websiteUrl"
                placeholder="https://youtube.com/@sarahfinance"
                value={applyForm.websiteUrl}
                onChange={(e) => setApplyForm((s) => ({ ...s, websiteUrl: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">Short Bio</Label>
              <Input
                id="bio"
                placeholder="Personal finance educator for digital nomads and solopreneurs."
                value={applyForm.bio}
                onChange={(e) => setApplyForm((s) => ({ ...s, bio: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="applicationNote">How do you plan to promote SoloOS?</Label>
              <Textarea
                id="applicationNote"
                rows={3}
                placeholder="I run a monthly freelance newsletter with 15k readers and plan to feature SoloOS tools..."
                value={applyForm.applicationNote}
                onChange={(e) => setApplyForm((s) => ({ ...s, applicationNote: e.target.value }))}
              />
            </div>

            <Button
              className="w-full mt-4"
              size="lg"
              disabled={
                applyMutation.isPending ||
                !applyForm.displayName.trim() ||
                !applyForm.publicHandle.trim() ||
                !applyForm.email.trim() ||
                !applyForm.websiteUrl.trim()
              }
              onClick={() => applyMutation.mutate(applyForm)}
            >
              {applyMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Submit Creator Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // STATE 2: PENDING APPLICATION
  // ─────────────────────────────────────────────────────────────────
  if (profile.application_status === "pending") {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
        <div className="size-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
          <Clock className="size-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Application Under Review
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Thanks for applying, <strong>{profile.display_name}</strong>! Your partner application
            for <code className="text-foreground">/c/{profile.public_handle}</code> is currently
            being reviewed by our team.
          </p>
        </div>
        <Card className="text-left bg-muted/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Application Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Public Handle:</span>
              <span className="font-mono font-medium">/c/{profile.public_handle}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Platform:</span>
              <span className="capitalize font-medium">{profile.primary_platform}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Applied Date:</span>
              <span className="font-medium">
                {new Date(profile.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Review Turnaround:</span>
              <span className="font-medium text-emerald-500">24 – 48 hours</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // STATE 3: REJECTED APPLICATION
  // ─────────────────────────────────────────────────────────────────
  if (profile.application_status === "rejected") {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
        <div className="size-16 rounded-full bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="size-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Application Status Update
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            At this time, we are unable to accept your application for the SoloOS Creator Program.
          </p>
        </div>
        {profile.admin_note && (
          <Card className="text-left border-border/40 bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Feedback from SoloOS Team</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {profile.admin_note}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // STATE 4: ACTIVE CREATOR DASHBOARD
  // ─────────────────────────────────────────────────────────────────
  const defaultLink = `${origin}/c/${profile.referral_code}`;
  const funnel = earnings?.funnel;

  return (
    <div className="space-y-6">
      {/* Header Profile Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Creator Dashboard
            </h1>
            <Badge variant="default" className="bg-emerald-600 gap-1 text-xs">
              <CheckCircle2 className="size-3" />
              Verified Partner
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, <strong>{profile.display_name}</strong> (@{profile.public_handle}). Track
            your referral conversions and payouts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => copyToClipboard(defaultLink, "header")}
            className="gap-2"
          >
            {copiedLink === "header" ? <Check className="size-4" /> : <Copy className="size-4" />}
            Copy Partner Link
          </Button>
        </div>
      </div>

      {/* Primary Referral Link Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold tracking-wider text-primary uppercase">
              Your Primary Referral Link
            </span>
            <div className="font-mono text-sm sm:text-base font-bold text-foreground break-all">
              {defaultLink}
            </div>
            <p className="text-xs text-muted-foreground">
              Includes 30-day attribution window. 20% recurring commission on all subscriptions.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(defaultLink, "main")}
            >
              {copiedLink === "main" ? (
                <Check className="size-4 mr-1" />
              ) : (
                <Copy className="size-4 mr-1" />
              )}
              Copy
            </Button>
            <a href={defaultLink} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm">
                <ExternalLink className="size-4" />
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Funnel Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs">Total Clicks</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono">
              {funnel?.totalClicks.toLocaleString() ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Unique visits to your /c link
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs">Signups</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-primary">
              {funnel?.totalSignups.toLocaleString() ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            {funnel?.clickToSignupPct ?? 0}% click-to-signup
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs">Paid Subscriptions</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-emerald-500">
              {funnel?.totalConverted.toLocaleString() ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            {funnel?.activationToConversionPct ?? 0}% conversion rate
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs">Commission Rate</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono">20%</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            12-month recurring window
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Campaigns, Earnings, Brand Assets */}
      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto">
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Megaphone className="size-4" />
            <span>Campaigns ({overview.campaigns.length})</span>
          </TabsTrigger>
          <TabsTrigger value="commissions" className="flex items-center gap-2">
            <Banknote className="size-4" />
            <span>Commissions ({earnings?.commissions.length ?? 0})</span>
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Download className="size-4" />
            <span>Brand Assets</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: CAMPAIGNS ───────────────────────────────────────── */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Channel Campaigns</h2>
              <p className="text-xs text-muted-foreground">
                Create dedicated links for different platforms or videos to track conversion
                sources.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() =>
                setCreateCampaignModal({
                  open: true,
                  name: "",
                  campaignCode: "",
                  platform: profile.primary_platform,
                })
              }
            >
              <Plus className="size-4 mr-1" />
              New Campaign
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Tracking URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.campaigns.map(
                    (camp: {
                      id: string;
                      name: string;
                      campaign_code: string;
                      platform: string | null;
                      status: string;
                    }) => {
                      const campaignUrl = `${origin}/c/${profile.referral_code}?campaign=${camp.campaign_code}`;
                      return (
                        <TableRow key={camp.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{camp.name}</div>
                            <div className="text-xs font-mono text-muted-foreground">
                              code: {camp.campaign_code}
                            </div>
                          </TableCell>
                          <TableCell className="capitalize text-sm">
                            {camp.platform ?? "General"}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-muted-foreground">
                              /c/{profile.referral_code}?campaign={camp.campaign_code}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">
                              {camp.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(campaignUrl, camp.id)}
                            >
                              {copiedLink === camp.id ? (
                                <Check className="size-4 text-emerald-500" />
                              ) : (
                                <Copy className="size-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    },
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 2: COMMISSIONS & PAYOUTS ───────────────────────────── */}
        <TabsContent value="commissions" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Commission History</CardTitle>
              <CardDescription>
                Commissions earned from your referred subscribers. Processed monthly.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {earningsLoading ? (
                <div className="flex h-36 items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (earnings?.commissions.length ?? 0) === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No commissions recorded yet. Share your partner link to get your first conversion!
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Billing Cycle</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earnings?.commissions.map((comm) => (
                      <TableRow key={comm.id}>
                        <TableCell className="font-mono text-xs">
                          {comm.billing_period_label}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {(comm.gross_amount_cents / 100).toFixed(2)} {comm.currency}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {(comm.commission_rate_bps / 100).toFixed(0)}%
                        </TableCell>
                        <TableCell className="font-mono text-sm font-semibold text-emerald-500">
                          {(comm.commission_amount_cents / 100).toFixed(2)} {comm.currency}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              comm.status === "paid"
                                ? "default"
                                : comm.status === "approved"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="capitalize text-xs"
                          >
                            {comm.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(comm.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: BRAND ASSETS ────────────────────────────────────── */}
        <TabsContent value="assets" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Marketing & Brand Kit</h2>
            <p className="text-xs text-muted-foreground">
              Official logos, badges, and product screenshots for your videos, newsletters, and
              social posts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {(assetsData?.assets.length ?? 0) > 0 ? (
              assetsData?.assets.map((asset) => (
                <Card key={asset.id} className="flex flex-col justify-between">
                  <CardHeader className="p-4 pb-2">
                    <Badge variant="outline" className="w-fit text-xs mb-2">
                      {asset.file_format.toUpperCase()}
                    </Badge>
                    <CardTitle className="text-sm font-medium">{asset.name}</CardTitle>
                    {asset.description && (
                      <CardDescription className="text-xs">{asset.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <a href={asset.download_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <Download className="size-4" />
                        Download Asset
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full p-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                Brand kit assets will be uploaded shortly. In the meantime, feel free to use
                standard SoloOS logos.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── MODAL: Create Tracking Campaign ─────────────────────────── */}
      <Dialog
        open={createCampaignModal.open}
        onOpenChange={(open) => !open && setCreateCampaignModal((s) => ({ ...s, open: false }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Channel Campaign</DialogTitle>
            <DialogDescription>
              Create a dedicated tracking tag for a specific YouTube video, podcast episode, or
              newsletter issue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="campName">Campaign Name *</Label>
              <Input
                id="campName"
                placeholder="e.g. YouTube August Solopreneur Guide"
                value={createCampaignModal.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setCreateCampaignModal((s) => ({
                    ...s,
                    name: val,
                    campaignCode: s.campaignCode || slugifyCreatorHandle(val).slice(0, 32),
                  }));
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="campCode">Campaign Code (Slug) *</Label>
              <Input
                id="campCode"
                placeholder="yt-august-2026"
                value={createCampaignModal.campaignCode}
                onChange={(e) =>
                  setCreateCampaignModal((s) => ({
                    ...s,
                    campaignCode: slugifyCreatorHandle(e.target.value).slice(0, 32),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground font-mono">
                Resulting URL: /c/{profile.referral_code}?campaign=
                {createCampaignModal.campaignCode || "code"}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="campPlatform">Platform</Label>
              <Select
                value={createCampaignModal.platform}
                onValueChange={(val) => setCreateCampaignModal((s) => ({ ...s, platform: val }))}
              >
                <SelectTrigger id="campPlatform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="twitter">X / Twitter</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                  <SelectItem value="podcast">Podcast</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateCampaignModal((s) => ({ ...s, open: false }))}
            >
              Cancel
            </Button>
            <Button
              disabled={
                createCampaignMutation.isPending ||
                !createCampaignModal.name.trim() ||
                !validateCampaignCode(createCampaignModal.campaignCode)
              }
              onClick={() => createCampaignMutation.mutate(createCampaignModal)}
            >
              {createCampaignMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
