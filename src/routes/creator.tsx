/**
 * Creator Studio — Full dashboard with sidebar layout.
 * Tabs: Overview · Campaigns · Earnings · Payout · Guide · Brand Kit
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  ImageIcon,
  LayoutDashboard,
  Loader2,
  LogOut,
  Megaphone,
  Phone,
  Save,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
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
import { Separator } from "@/components/ui/separator";
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
  MALAWI_BANKS,
  MALAWI_CITIES,
  MALAWI_MOBILE_PROVIDERS,
  type CommissionSummary,
  type CreatorFunnelMetrics,
  slugifyCreatorHandle,
} from "@/domain/creator";
import {
  getBrandAssetsServerFn,
  getCreatorEarningsServerFn,
  getMyCreatorProfileServerFn,
  submitCreatorApplicationServerFn,
  updateCreatorCampaignServerFn,
  updateCreatorPayoutDetailsServerFn,
} from "@/server/creator";

export const Route = createFileRoute("/creator")({
  component: CreatorStudioPage,
});

// ─── Navigation Items ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "earnings", label: "Earnings", icon: TrendingUp },
  { id: "payout", label: "Payout Details", icon: Wallet },
  { id: "guide", label: "Creator's Guide", icon: BookOpen },
  { id: "brand-kit", label: "Brand & Media Kit", icon: ImageIcon },
] as const;

type NavId = (typeof NAV_ITEMS)[number]["id"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function assetTypeLabel(t: string) {
  const map: Record<string, string> = {
    logo: "Logo",
    banner: "Banner",
    social_graphic: "Social Graphic",
    guide: "Guide",
    template: "Template",
    copy_template: "Copy Template",
    media: "Media",
    video: "Video Badge",
    campaign_asset: "Campaign Asset",
    other: "Asset",
  };
  return map[t] ?? t;
}

function assetTypeColor(t: string) {
  const map: Record<string, string> = {
    logo: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    banner: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    social_graphic: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    guide: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    template: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    copy_template: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    media: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    video: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    campaign_asset: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    other: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  return map[t] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20";
}

// ─── Page ────────────────────────────────────────────────────────────────────

function CreatorStudioPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<NavId>("overview");
  const [userSession, setUserSession] = useState<{ id: string; email?: string } | null>(null);

  // Auth token helper
  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const u = data.session.user;
        setUserSession({
          id: u.id,
          ...(u.email !== undefined ? { email: u.email } : {}),
        });
      } else {
        setUserSession(null);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (sess?.user) {
        const u = sess.user;
        setUserSession({
          id: u.id,
          ...(u.email !== undefined ? { email: u.email } : {}),
        });
      } else {
        setUserSession(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // ─── Queries ───────────────────────────────────────────────────────────────

  const {
    data: profileData,
    isLoading: profileLoading,
    isError: profileError,
  } = useQuery({
    queryKey: ["my_creator_profile"],
    queryFn: async () => {
      const token = await getToken();
      return getMyCreatorProfileServerFn({ data: { authToken: token } });
    },
  });

  const { data: earningsData, isLoading: earningsLoading } = useQuery({
    queryKey: ["creator_earnings"],
    queryFn: async () => {
      const token = await getToken();
      return getCreatorEarningsServerFn({ data: { authToken: token } });
    },
    enabled: activeTab === "earnings" || activeTab === "overview",
  });

  const { data: brandKitData, isLoading: brandKitLoading } = useQuery({
    queryKey: ["creator_brand_assets"],
    queryFn: () => getBrandAssetsServerFn(),
    enabled: activeTab === "brand-kit",
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const updateCampaignMutation = useMutation({
    mutationFn: async (vars: {
      campaignId: string;
      name?: string;
      destinationPath?: string;
      platform?: string;
      status: "active" | "paused";
    }) => {
      const token = await getToken();
      return updateCreatorCampaignServerFn({
        data: { authToken: token, ...vars },
      });
    },
    onSuccess: () => {
      toast.success("Campaign updated.");
      void queryClient.invalidateQueries({ queryKey: ["my_creator_profile"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Payout Details Form State ─────────────────────────────────────────────

  const [payoutForm, setPayoutForm] = useState<PayoutFormState>({
    payoutMethod: "mobile_money",
    mobileMoneyProvider: "airtel",
    mobileMoneyNumber: "",
    mobileMoneyAccountName: "",
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    bankBranch: "",
    phone: "",
    city: "",
  });

  const profile = profileData?.isCreator ? profileData.profile : null;

  // Initialize form from profile when loaded
  useEffect(() => {
    if (profile) {
      setPayoutForm({
        payoutMethod: (profile.payout_method as "mobile_money" | "bank") || "mobile_money",
        mobileMoneyProvider:
          (profile.mobile_money_provider as "airtel" | "tnm") || "airtel",
        mobileMoneyNumber: profile.mobile_money_number || "",
        mobileMoneyAccountName: profile.mobile_money_account_name || "",
        bankName: profile.bank_name || "",
        bankAccountNumber: profile.bank_account_number || "",
        bankAccountName: profile.bank_account_name || "",
        bankBranch: profile.bank_branch || "",
        phone: profile.phone || "",
        city: profile.city || "",
      });
    }
  }, [profile]);

  const updatePayoutMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (payoutForm.payoutMethod === "mobile_money") {
        return updateCreatorPayoutDetailsServerFn({
          data: {
            authToken: token,
            country: "MW",
            phone: payoutForm.phone || undefined,
            city: payoutForm.city || undefined,
            payoutMethod: "mobile_money",
            mobileMoneyProvider: payoutForm.mobileMoneyProvider,
            mobileMoneyNumber: payoutForm.mobileMoneyNumber,
            mobileMoneyAccountName: payoutForm.mobileMoneyAccountName,
          },
        });
      } else {
        return updateCreatorPayoutDetailsServerFn({
          data: {
            authToken: token,
            country: "MW",
            phone: payoutForm.phone || undefined,
            city: payoutForm.city || undefined,
            payoutMethod: "bank",
            bankName: payoutForm.bankName,
            bankAccountNumber: payoutForm.bankAccountNumber,
            bankAccountName: payoutForm.bankAccountName,
            bankBranch: payoutForm.bankBranch || undefined,
          },
        });
      }
    },
    onSuccess: () => {
      toast.success("Payout details saved successfully!");
      void queryClient.invalidateQueries({ queryKey: ["my_creator_profile"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Application Form State (For non-creators) ──────────────────────────────

  const [applyForm, setApplyForm] = useState({
    displayName: "",
    publicHandle: "",
    email: "",
    primaryPlatform: "youtube" as const,
    websiteUrl: "",
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Please sign in first.");
      return submitCreatorApplicationServerFn({
        data: {
          authToken: token,
          displayName: applyForm.displayName.trim(),
          publicHandle: applyForm.publicHandle.trim().toLowerCase(),
          email: applyForm.email.trim(),
          primaryPlatform: applyForm.primaryPlatform,
          websiteUrl: applyForm.websiteUrl.trim() || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("Welcome to SoloOS Creator Studio! Your account is active.");
      void queryClient.invalidateQueries({ queryKey: ["my_creator_profile"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // ─── Not a creator: Visitor Application Page ───────────────────────────────

  if (profileError || !profileData?.isCreator || !profile) {
    return (
      <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase">
              <span className="text-sm">🇲🇼</span>
              SoloOS Creator Partner Program · Malawi
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
              Partner with SoloOS & Earn Recurring Commissions
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
              Empowering Malawian creators and educators to earn <strong>20% recurring revenue</strong> for 12 months on every business and freelancer you refer. Direct payouts via Airtel Money, TNM Mpamba, or Bank Transfer.
            </p>
          </div>

          {/* 3 Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border/40 bg-card/60">
              <CardHeader className="p-4 pb-2">
                <TrendingUp className="size-5 text-emerald-400 mb-1" />
                <CardTitle className="text-sm font-semibold">20% Recurring Share</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
                Earn 20% on every subscription renewal for 12 months with a 30-day attribution window.
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/60">
              <CardHeader className="p-4 pb-2">
                <Zap className="size-5 text-primary mb-1" />
                <CardTitle className="text-sm font-semibold">Instant Vanity URL</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
                Get an instant personalized partner link like <code>solofinance.app/c/yourhandle</code> with real-time analytics.
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/60">
              <CardHeader className="p-4 pb-2">
                <Wallet className="size-5 text-amber-400 mb-1" />
                <CardTitle className="text-sm font-semibold">Malawi Financial Rails</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
                Receive earnings directly in MWK to your Airtel Money, TNM Mpamba, or Malawian Bank account.
              </CardContent>
            </Card>
          </div>

          {/* Application Form or Sign In Prompt */}
          <Card className="border-primary/20 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl">Join the Creator Program</CardTitle>
              <CardDescription>
                Instant approval. Fill out your details below to activate your partner link and access the Creator Studio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!userSession ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                  <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">Sign in to Get Started</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1">
                      Sign in with Google to create your Creator Studio account and start earning today.
                    </p>
                  </div>
                  <Button asChild size="lg" className="gap-2">
                    <Link to="/auth" search={{ mode: "signin" as const, redirect: "/creator" }}>
                      Sign in with Google
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="displayName">Creator / Channel Name *</Label>
                      <Input
                        id="displayName"
                        placeholder="e.g. Kondwani Phiri"
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
                      <Label htmlFor="publicHandle">Desired Partner Handle *</Label>
                      <div className="flex items-center rounded-md border border-input bg-muted/40 px-3">
                        <span className="text-xs text-muted-foreground select-none">
                          /c/
                        </span>
                        <input
                          id="publicHandle"
                          className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
                          placeholder="kondwani"
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
                    <Label htmlFor="email">Contact Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@domain.com"
                      value={applyForm.email || userSession.email || ""}
                      onChange={(e) =>
                        setApplyForm((s) => ({ ...s, email: e.target.value }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="platform">Primary Content Platform *</Label>
                      <Select
                        value={applyForm.primaryPlatform}
                        onValueChange={(val) =>
                          setApplyForm((s) => ({
                            ...s,
                            primaryPlatform: val as typeof applyForm.primaryPlatform,
                          }))
                        }
                      >
                        <SelectTrigger id="platform">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="x">X / Twitter</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="podcast">Podcast</SelectItem>
                          <SelectItem value="newsletter">Newsletter</SelectItem>
                          <SelectItem value="community">Community / WhatsApp</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="websiteUrl">Channel / Portfolio Link</Label>
                      <Input
                        id="websiteUrl"
                        placeholder="https://youtube.com/@channel"
                        value={applyForm.websiteUrl}
                        onChange={(e) =>
                          setApplyForm((s) => ({ ...s, websiteUrl: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      size="lg"
                      disabled={
                        applyMutation.isPending ||
                        !applyForm.displayName.trim() ||
                        !applyForm.publicHandle.trim()
                      }
                      onClick={() => applyMutation.mutate()}
                      className="gap-2"
                    >
                      {applyMutation.isPending && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      Join Creator Program & Get Link
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Active Creator Studio ──────────────────────────────────────────────────

  const campaigns = profileData.campaigns ?? [];
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "https://solofinance.app";
  const referralLink = `${appOrigin}/c/${profile.referral_code}`;
  const aggregated = earningsData?.aggregated;
  const funnel = earningsData?.funnel;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border/50 bg-card/30 backdrop-blur-sm shrink-0">
        {/* Brand */}
        <div className="p-5 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md">
              <Sparkles className="size-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground leading-none">Creator Studio</div>
              <div className="text-[11px] text-muted-foreground mt-1 leading-none">
                @{profile.public_handle}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-medium">
              🇲🇼 Malawi Partner
            </Badge>
          </div>
        </div>

        {/* Quick Link Share */}
        <div className="p-4 mx-3 my-3 rounded-lg border border-primary/20 bg-primary/5">
          <div className="text-[11px] text-muted-foreground mb-1 font-medium">Your Partner Link</div>
          <div className="text-xs font-mono text-foreground truncate mb-2">
            /c/{profile.referral_code}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs h-7 gap-1.5"
            onClick={() => {
              void navigator.clipboard.writeText(referralLink);
              toast.success("Referral link copied!");
            }}
          >
            <Copy className="size-3" />
            Copy Link
          </Button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                activeTab === id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border/40 space-y-2">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="size-3.5 shrink-0" />
            Sign Out
          </button>
          <div className="text-[11px] text-muted-foreground/60 px-2">
            SoloOS Creator Engine v2.4
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border/50 bg-card/50">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              <Sparkles className="size-3.5" />
            </div>
            <span className="font-bold text-sm">Creator Studio</span>
          </div>
          <div className="flex gap-1 overflow-x-auto max-w-[200px]">
            {NAV_ITEMS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`text-xs px-2.5 py-1 rounded-md shrink-0 ${
                  activeTab === id
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
          {/* ── OVERVIEW ─────────────────────────────────────── */}
          {activeTab === "overview" && (
            <OverviewTab
              profile={profile}
              referralLink={referralLink}
              aggregated={aggregated}
              funnel={funnel}
              earningsLoading={earningsLoading}
              campaigns={campaigns}
            />
          )}

          {/* ── CAMPAIGNS ─────────────────────────────────── */}
          {activeTab === "campaigns" && (
            <CampaignsTab
              campaigns={campaigns}
              profile={profile}
              appOrigin={appOrigin}
              onToggle={(id, status) =>
                updateCampaignMutation.mutate({ campaignId: id, status })
              }
              isToggling={updateCampaignMutation.isPending}
            />
          )}

          {/* ── EARNINGS ──────────────────────────────────── */}
          {activeTab === "earnings" && (
            <EarningsTab
              earningsData={earningsData}
              earningsLoading={earningsLoading}
            />
          )}

          {/* ── PAYOUT DETAILS ────────────────────────────── */}
          {activeTab === "payout" && (
            <PayoutTab
              profile={profile}
              payoutForm={payoutForm}
              setPayoutForm={setPayoutForm}
              onSave={() => updatePayoutMutation.mutate()}
              isSaving={updatePayoutMutation.isPending}
            />
          )}

          {/* ── CREATOR'S GUIDE ───────────────────────────── */}
          {activeTab === "guide" && <GuideTab />}

          {/* ── BRAND KIT ─────────────────────────────────── */}
          {activeTab === "brand-kit" && (
            <BrandKitTab
              assets={brandKitData?.assets ?? []}
              loading={brandKitLoading}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({
  profile,
  referralLink,
  aggregated,
  funnel,
  earningsLoading,
  campaigns,
}: {
  profile: any;
  referralLink: string;
  aggregated: CommissionSummary[] | undefined;
  funnel: CreatorFunnelMetrics | undefined;
  earningsLoading: boolean;
  campaigns: { id: string; name: string; campaign_code: string; status: string }[];
}) {
  const [copied, setCopied] = useState(false);
  const copyLink = () => {
    void navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalEarnedCents = (aggregated ?? []).reduce(
    (sum, s) => sum + s.pendingCents + s.approvedCents + s.paidCents,
    0,
  );
  const pendingCents = (aggregated ?? []).reduce(
    (sum, s) => sum + s.pendingCents + s.approvedCents,
    0,
  );
  const paidCents = (aggregated ?? []).reduce((sum, s) => sum + s.paidCents, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {profile.display_name}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Your Creator Studio — track performance, manage campaigns, and grow your earnings.
          </p>
        </div>
        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
          <span className="mr-1.5 size-1.5 rounded-full bg-emerald-500 inline-block" />
          Active
        </Badge>
      </div>

      {/* Referral Link Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-violet-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            Your Referral Link
          </CardTitle>
          <CardDescription>Share this link to earn commissions on every signup</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-muted-foreground truncate">
              {referralLink}
            </div>
            <Button size="sm" variant="outline" onClick={copyLink} className="shrink-0 gap-2">
              <Copy className="size-4" />
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button size="sm" asChild className="shrink-0 gap-2">
              <a href={referralLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
                Preview
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {earningsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 h-24" />
            </Card>
          ))
        ) : (
          <>
            <KpiCard
              label="Total Earned"
              value={`MK ${(totalEarnedCents / 100).toLocaleString()}`}
              icon={<TrendingUp className="size-4" />}
              color="text-emerald-400"
            />
            <KpiCard
              label="Pending"
              value={`MK ${(pendingCents / 100).toLocaleString()}`}
              icon={<Wallet className="size-4" />}
              color="text-amber-400"
            />
            <KpiCard
              label="Paid Out"
              value={`MK ${(paidCents / 100).toLocaleString()}`}
              icon={<CreditCard className="size-4" />}
              color="text-blue-400"
            />
            <KpiCard
              label="Conversions"
              value={String(funnel?.totalConverted ?? 0)}
              icon={<Users className="size-4" />}
              color="text-violet-400"
            />
          </>
        )}
      </div>

      {/* Funnel */}
      {funnel && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              Referral Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Link Clicks", val: funnel.totalClicks, rate: "" },
                { label: "Signups", val: funnel.totalSignups, rate: `${funnel.clickToSignupPct}%` },
                { label: "Activated", val: funnel.totalActivated, rate: `${funnel.signupToActivationPct}%` },
                { label: "Conversions", val: funnel.totalConverted, rate: `${funnel.activationToConversionPct}%` },
              ].map((item, i, arr) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-xl font-bold text-foreground tabular-nums">
                      {item.val}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                    {item.rate && (
                      <div className="text-[10px] text-emerald-400 font-medium mt-1">
                        {item.rate}
                      </div>
                    )}
                  </div>
                  {i < arr.length - 1 && (
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Campaigns Quick View */}
      {campaigns.filter((c) => c.status === "active").length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Megaphone className="size-4 text-primary" />
              Active Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {campaigns
              .filter((c) => c.status === "active")
              .slice(0, 3)
              .map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">{c.name}</div>
                    <div className="text-xs font-mono text-muted-foreground">/{c.campaign_code}</div>
                  </div>
                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                    Live
                  </Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className={`mb-2 ${color}`}>{icon}</div>
        <div className="text-xl font-bold text-foreground tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </CardContent>
    </Card>
  );
}

// ─── Campaigns Tab ────────────────────────────────────────────────────────────

function CampaignsTab({
  campaigns,
  appOrigin,
  onToggle,
  isToggling,
}: {
  campaigns: { id: string; name: string; campaign_code: string; status: string; platform: string | null }[];
  profile: any;
  appOrigin: string;
  onToggle: (id: string, status: "active" | "paused") => void;
  isToggling: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (id: string, link: string) => {
    void navigator.clipboard.writeText(link);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
        <p className="text-muted-foreground mt-1">
          Manage your tracking campaigns. Each campaign has a unique link for different channels.
        </p>
      </div>

      <div className="space-y-3">
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <Megaphone className="size-8 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No campaigns yet.</p>
            </CardContent>
          </Card>
        ) : (
          campaigns.map((c) => {
            const link = `${appOrigin}/c/${c.campaign_code}`;
            const isActive = c.status === "active";
            return (
              <Card
                key={c.id}
                className={`transition-opacity ${!isActive ? "opacity-60" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{c.name}</span>
                        <Badge
                          variant="outline"
                          className={
                            isActive
                              ? "text-emerald-400 border-emerald-500/30 text-[10px]"
                              : "text-muted-foreground border-border text-[10px]"
                          }
                        >
                          {c.status}
                        </Badge>
                        {c.platform && (
                          <Badge variant="outline" className="text-[10px] capitalize border-border text-muted-foreground">
                            {c.platform}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground truncate">
                          {link}
                        </span>
                        <button
                          onClick={() => copy(c.id, link)}
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Copy className="size-3.5" />
                        </button>
                        {copied === c.id && (
                          <span className="text-[10px] text-emerald-400">Copied!</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 text-xs"
                      disabled={isToggling}
                      onClick={() => onToggle(c.id, isActive ? "paused" : "active")}
                    >
                      {isActive ? "Pause" : "Activate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Card className="border-dashed">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          <p>
            To create a custom tracking campaign, contact your creator manager or reach out via{" "}
            <a href="mailto:creators@solofinance.app" className="text-primary hover:underline">
              creators@solofinance.app
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Earnings Tab ─────────────────────────────────────────────────────────────

function EarningsTab({
  earningsData,
  earningsLoading,
}: {
  earningsData:
    | {
        commissions: any[];
        payouts: any[];
        aggregated?: CommissionSummary[];
        funnel?: any;
      }
    | undefined;
  earningsLoading: boolean;
}) {
  if (earningsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const commissions = earningsData?.commissions ?? [];
  const payouts = earningsData?.payouts ?? [];
  const aggregated = earningsData?.aggregated ?? [];

  const totalEarnedCents = aggregated.reduce(
    (sum, s) => sum + s.pendingCents + s.approvedCents + s.paidCents,
    0,
  );
  const pendingCents = aggregated.reduce(
    (sum, s) => sum + s.pendingCents + s.approvedCents,
    0,
  );
  const paidCents = aggregated.reduce((sum, s) => sum + s.paidCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Earnings</h1>
        <p className="text-muted-foreground mt-1">
          Commission breakdown and payout history — all in Malawian Kwacha (MWK).
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-emerald-500/20">
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground mb-1">Total Earned</div>
            <div className="text-2xl font-bold text-emerald-400 tabular-nums">
              MK {(totalEarnedCents / 100).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20">
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground mb-1">Awaiting Payout</div>
            <div className="text-2xl font-bold text-amber-400 tabular-nums">
              MK {(pendingCents / 100).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20">
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground mb-1">Paid Out</div>
            <div className="text-2xl font-bold text-blue-400 tabular-nums">
              MK {(paidCents / 100).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commissions */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Commission History</h2>
        {commissions.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No commissions recorded yet. Share your referral link to start earning.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-border/50">
              {commissions.slice(0, 20).map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {c.billing_period_label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Gross: MK {(c.gross_amount_cents / 100).toLocaleString()} •{" "}
                      {(c.commission_rate_bps / 100).toFixed(1)}% rate
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-400 tabular-nums">
                        +MK {(c.commission_amount_cents / 100).toLocaleString()}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${
                        c.status === "paid"
                          ? "text-emerald-400 border-emerald-500/30"
                          : c.status === "pending"
                            ? "text-amber-400 border-amber-500/30"
                            : "text-muted-foreground border-border"
                      }`}
                    >
                      {c.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Payouts */}
      {payouts.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Payout Records</h2>
          <Card>
            <div className="divide-y divide-border/50">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-foreground font-mono">
                      {p.payout_reference}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "Pending"}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-foreground tabular-nums">
                    MK {(p.amount_cents / 100).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Payout Details Tab ───────────────────────────────────────────────────────

type PayoutFormState = {
  payoutMethod: "mobile_money" | "bank";
  mobileMoneyProvider: "airtel" | "tnm";
  mobileMoneyNumber: string;
  mobileMoneyAccountName: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  bankBranch: string;
  phone: string;
  city: string;
};

function PayoutTab({
  profile,
  payoutForm,
  setPayoutForm,
  onSave,
  isSaving,
}: {
  profile: any;
  payoutForm: PayoutFormState;
  setPayoutForm: React.Dispatch<React.SetStateAction<PayoutFormState>>;
  onSave: () => void;
  isSaving: boolean;
}) {
  const hasPayoutDetails = !!profile?.payout_method;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payout Details</h1>
        <p className="text-muted-foreground mt-1">
          Set up how you receive your earnings. Currently available for Malawi only.
        </p>
      </div>

      {hasPayoutDetails && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="size-7 rounded-full bg-emerald-500/20 flex items-center justify-center mt-0.5">
              <Wallet className="size-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-emerald-400">Payout method on file</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {profile.payout_method === "mobile_money" ? (
                  <>
                    {profile.mobile_money_provider === "airtel" ? "Airtel Money" : "TNM Mpamba"}{" "}
                    · {profile.mobile_money_number}
                  </>
                ) : (
                  <>
                    {profile.bank_name} · Account {profile.bank_account_number}
                  </>
                )}
                {profile.payout_details_updated_at && (
                  <span className="block text-[11px] text-muted-foreground/80 mt-1">
                    Last updated {new Date(profile.payout_details_updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configure Payout Method</CardTitle>
          <CardDescription>
            Choose your preferred payout rail. Payouts are made monthly directly in MWK.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Method selector */}
          <div className="space-y-1.5">
            <Label>Payout Method</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setPayoutForm((s) => ({ ...s, payoutMethod: "mobile_money" }))
                }
                className={`flex items-center gap-3 rounded-lg border p-3 text-sm font-medium transition-all ${
                  payoutForm.payoutMethod === "mobile_money"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                }`}
              >
                <Phone className="size-4" />
                Mobile Money
              </button>
              <button
                type="button"
                onClick={() => setPayoutForm((s) => ({ ...s, payoutMethod: "bank" }))}
                className={`flex items-center gap-3 rounded-lg border p-3 text-sm font-medium transition-all ${
                  payoutForm.payoutMethod === "bank"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                }`}
              >
                <Building2 className="size-4" />
                Bank Transfer
              </button>
            </div>
          </div>

          {/* Mobile Money fields */}
          {payoutForm.payoutMethod === "mobile_money" && (
            <>
              <div className="space-y-1.5">
                <Label>Mobile Money Provider</Label>
                <div className="grid grid-cols-2 gap-3">
                  {MALAWI_MOBILE_PROVIDERS.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() =>
                        setPayoutForm((s) => ({ ...s, mobileMoneyProvider: p.id }))
                      }
                      className={`flex flex-col items-start rounded-lg border p-3 text-sm transition-all ${
                        payoutForm.mobileMoneyProvider === p.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-foreground/30"
                      }`}
                    >
                      <span className="font-medium text-foreground">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {p.prefixes.join(", ")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Mobile Number</Label>
                <Input
                  placeholder="e.g. 0995000000"
                  value={payoutForm.mobileMoneyNumber}
                  onChange={(e) =>
                    setPayoutForm((s) => ({ ...s, mobileMoneyNumber: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Account Name (Registered Name)</Label>
                <Input
                  placeholder="Name registered with Airtel/TNM"
                  value={payoutForm.mobileMoneyAccountName}
                  onChange={(e) =>
                    setPayoutForm((s) => ({
                      ...s,
                      mobileMoneyAccountName: e.target.value,
                    }))
                  }
                />
              </div>
            </>
          )}

          {/* Bank fields */}
          {payoutForm.payoutMethod === "bank" && (
            <>
              <div className="space-y-1.5">
                <Label>Malawian Bank</Label>
                <Select
                  value={payoutForm.bankName}
                  onValueChange={(val) =>
                    setPayoutForm((s) => ({ ...s, bankName: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {MALAWI_BANKS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Account Number</Label>
                <Input
                  placeholder="e.g. 1000234567"
                  value={payoutForm.bankAccountNumber}
                  onChange={(e) =>
                    setPayoutForm((s) => ({ ...s, bankAccountNumber: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Account Holder Name</Label>
                <Input
                  placeholder="Full name as it appears on bank statement"
                  value={payoutForm.bankAccountName}
                  onChange={(e) =>
                    setPayoutForm((s) => ({ ...s, bankAccountName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Branch Name (optional)</Label>
                <Input
                  placeholder="e.g. Blantyre Victoria Avenue Branch"
                  value={payoutForm.bankBranch}
                  onChange={(e) =>
                    setPayoutForm((s) => ({ ...s, bankBranch: e.target.value }))
                  }
                />
              </div>
            </>
          )}

          <Separator />

          {/* Contact Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>City / District</Label>
              <Select
                value={payoutForm.city}
                onValueChange={(val) => setPayoutForm((s) => ({ ...s, city: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {MALAWI_CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input
                placeholder="0995000000"
                value={payoutForm.phone}
                onChange={(e) =>
                  setPayoutForm((s) => ({ ...s, phone: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              className="w-full gap-2"
              disabled={
                isSaving ||
                (payoutForm.payoutMethod === "mobile_money" &&
                  (!payoutForm.mobileMoneyNumber.trim() ||
                    !payoutForm.mobileMoneyAccountName.trim())) ||
                (payoutForm.payoutMethod === "bank" &&
                  (!payoutForm.bankName ||
                    !payoutForm.bankAccountNumber.trim() ||
                    !payoutForm.bankAccountName.trim()))
              }
              onClick={onSave}
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save Payout Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Creator's Guide Tab ──────────────────────────────────────────────────────

function GuideTab() {
  const sections = [
    {
      icon: <Zap className="size-5 text-amber-400" />,
      title: "20% Recurring Commission Structure",
      content:
        "You earn a 20% recurring commission on every subscription payment made by a user who joined through your referral link. Commissions continue for 12 consecutive months from the date of activation. A 30-day first-touch attribution window ensures you get credit even if they sign up weeks later.",
    },
    {
      icon: <Globe className="size-5 text-blue-400" />,
      title: "Your Referral Link & Custom Campaigns",
      content:
        "Your primary vanity link is solofinance.app/c/{your-handle}. You can also create campaign links to track conversions across different channels (e.g., YouTube videos, Instagram bio, WhatsApp groups). All traffic attributes automatically to your creator profile.",
    },
    {
      icon: <Users className="size-5 text-violet-400" />,
      title: "Who Qualifies as a Conversion?",
      content:
        "A conversion is counted when a referred user starts a workspace subscription on SoloOS. Free trial users and visitors are visible in your real-time Funnel metrics so you can see your click-to-signup conversion rates.",
    },
    {
      icon: <Wallet className="size-5 text-emerald-400" />,
      title: "Malawi Payout Schedule & Financial Rails",
      content:
        "Payouts are processed regularly in Malawian Kwacha (MWK). We support direct mobile money disbursement to Airtel Money and TNM Mpamba, as well as electronic transfers to all licensed Malawian commercial banks. Configure your payout details in the Payout Details tab.",
    },
    {
      icon: <FileText className="size-5 text-rose-400" />,
      title: "Creator Code of Conduct & Transparency",
      content:
        "Self-referrals are prohibited. When recommending SoloOS, always disclose that you are a SoloOS partner in accordance with local guidelines. Misleading claims or spamming community groups will result in account suspension.",
    },
    {
      icon: <BarChart3 className="size-5 text-cyan-400" />,
      title: "Best Practices for Malawian Creators",
      content:
        "The highest-converting creators show practical walkthroughs: how to generate professional tax-compliant invoices, track business cashflow, and prepare for MRA tax filing using SoloOS. Use our official Brand Kit assets for high-production video overlays.",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Creator's Guide</h1>
        <p className="text-muted-foreground mt-1">
          Everything you need to know to succeed in the SoloOS Creator Program in Malawi.
        </p>
      </div>

      <div className="space-y-3">
        {sections.map((s) => (
          <Card key={s.title}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 shrink-0">{s.icon}</div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1.5">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Have questions or need custom promo assets?{" "}
            <a
              href="mailto:creators@solofinance.app"
              className="text-primary hover:underline font-medium"
            >
              creators@solofinance.app
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Brand Kit Tab ────────────────────────────────────────────────────────────

function BrandKitTab({
  assets,
  loading,
}: {
  assets: Array<{
    id: string;
    asset_type: string;
    title: string;
    description: string | null;
    url: string;
    status: string;
    created_at?: string;
  }>;
  loading: boolean;
}) {
  const [viewingAsset, setViewingAsset] = useState<{
    id: string;
    asset_type: string;
    title: string;
    description: string | null;
    url: string;
    status: string;
    created_at?: string;
  } | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeAssets = assets.filter((a) => a.status === "active");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Brand & Media Kit</h1>
        <p className="text-muted-foreground mt-1">
          Official SoloOS brand assets to use in your content. Always use approved assets for
          professional, on-brand posts.
        </p>
      </div>

      {activeAssets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <ImageIcon className="size-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              Brand assets are being prepared. Check back soon.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden sm:table-cell">Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeAssets.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {a.asset_type === "logo" || a.asset_type === "social_graphic" ? (
                        <div className="size-9 rounded border border-border bg-muted/30 overflow-hidden flex-shrink-0">
                          <img
                            src={a.url}
                            alt={a.title}
                            className="size-full object-contain p-0.5"
                          />
                        </div>
                      ) : (
                        <div className="size-9 rounded border border-border bg-muted/30 flex items-center justify-center flex-shrink-0">
                          <FileText className="size-4 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-foreground">{a.title}</div>
                        {a.description && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-xs">
                            {a.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${assetTypeColor(a.asset_type)}`}
                    >
                      {assetTypeLabel(a.asset_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                    {a.created_at
                      ? new Date(a.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setViewingAsset(a)}
                      >
                        <Eye className="mr-1 size-3.5" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs gap-1"
                        asChild
                      >
                        <a href={a.url} target="_blank" rel="noopener noreferrer" download={a.title}>
                          <Download className="size-3" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Card className="border-dashed border-border/60">
        <CardContent className="p-4 text-center text-xs text-muted-foreground">
          Brand assets are provided for promotional use only. Do not alter logos or use assets in
          misleading contexts. For custom content or collaboration, email{" "}
          <a href="mailto:creators@solofinance.app" className="text-primary hover:underline">
            creators@solofinance.app
          </a>
        </CardContent>
      </Card>

      {/* ─── MODAL: View Brand Asset ─────────────────────────────── */}
      <Dialog
        open={!!viewingAsset}
        onOpenChange={(open) => !open && setViewingAsset(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-5 text-primary" />
              Asset Preview
            </DialogTitle>
            <DialogDescription>
              Approved brand asset for promotional use.
            </DialogDescription>
          </DialogHeader>

          {viewingAsset && (
            <div className="space-y-4 py-2">
              {viewingAsset.asset_type === "logo" ||
              viewingAsset.asset_type === "social_graphic" ||
              viewingAsset.asset_type === "screenshot" ? (
                <div className="rounded-lg border border-border bg-muted/20 p-4 flex items-center justify-center max-h-64 overflow-hidden">
                  <img
                    src={viewingAsset.url}
                    alt={viewingAsset.title}
                    className="max-h-56 max-w-full object-contain rounded"
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <FileText className="size-12" />
                  <span className="text-xs uppercase font-medium">{viewingAsset.asset_type.replace(/_/g, " ")}</span>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-base">
                    {viewingAsset.title}
                  </h3>
                  <Badge variant="outline" className={`text-[10px] capitalize ${assetTypeColor(viewingAsset.asset_type)}`}>
                    {assetTypeLabel(viewingAsset.asset_type)}
                  </Badge>
                </div>

                {viewingAsset.description ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {viewingAsset.description}
                  </p>
                ) : (
                  <p className="text-xs italic text-muted-foreground/70">No description provided.</p>
                )}
              </div>

              <div className="rounded-md border border-border/80 bg-muted/40 p-2.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Direct URL:</span>
                  <button
                    onClick={() => {
                      if (viewingAsset?.url) {
                        navigator.clipboard.writeText(viewingAsset.url);
                        toast.success("Asset URL copied to clipboard");
                      }
                    }}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Copy className="size-3" />
                    Copy Link
                  </button>
                </div>
                <div className="font-mono text-[11px] text-foreground truncate select-all">
                  {viewingAsset.url}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setViewingAsset(null)}
            >
              Close
            </Button>
            {viewingAsset && (
              <Button asChild>
                <a
                  href={viewingAsset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={viewingAsset.title}
                >
                  <Download className="mr-2 size-4" />
                  Download
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
