import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Check,
  CreditCard,
  Crown,
  KeyRound,
  Loader2,
  Mail,
  Shield,
  Trash2,
  Upload,
  User,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ErrorState, LoadingState } from "@/components/app/state";
import { useWorkspace } from "@/components/app/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getWorkspaceEntitlements } from "@/domain/entitlements";
import {
  workspacePaymentsQueryOptions,
  workspaceSubscriptionQueryOptions,
} from "@/domain/subscriptions";
import {
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  canManageFinancialSettings,
  canManageWorkspace,
  updateWorkspace,
  updateWorkspaceSettings,
  upsertProfile,
  workspaceInvitationsQueryOptions,
  workspaceMembersQueryOptions,
  workspaceSettingsQueryOptions,
  type AppRole,
} from "@/domain/workspace";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { parseMoneyInput } from "@/lib/money";
import {
  CANONICAL_PRICES,
  PLAN_DETAILS,
  type PlanTier,
  type PricingCurrency,
} from "@/lib/payments/pricing";
import { inviteMemberServerFn, revokeInvitationServerFn } from "@/server/invitations";
import { cancelSubscriptionServerFn, createCheckoutServerFn } from "@/server/subscriptions";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings | SoloOS" },
      {
        name: "description",
        content: "Manage your SoloOS workspace, team, profile, billing, and security.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

const CURRENCIES = ["USD", "EUR", "GBP", "MWK", "ZAR", "KES", "NGN", "CAD", "AUD"] as const;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function fieldClass() {
  return "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
}

function SettingsPage() {
  const { workspace, role, profile } = useWorkspace();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  const settings = useQuery(workspaceSettingsQueryOptions(workspace.id));
  const members = useQuery(workspaceMembersQueryOptions(workspace.id));
  const invitations = useQuery(workspaceInvitationsQueryOptions(workspace.id));
  const subscriptionQuery = useQuery(workspaceSubscriptionQueryOptions(workspace.id));
  const paymentsQuery = useQuery(workspacePaymentsQueryOptions(workspace.id));

  const entitlements = getWorkspaceEntitlements(workspace.plan, subscriptionQuery.data);

  const canEditWorkspace = canManageWorkspace(role);
  const canEditFinance = canManageFinancialSettings(role);

  // 1. Workspace Tab State
  const [name, setName] = useState(workspace.name);
  const [businessType, setBusinessType] = useState(workspace.business_type ?? "");
  const [country, setCountry] = useState(workspace.country ?? "");
  const [timezone, setTimezone] = useState(workspace.timezone);
  const [currency, setCurrency] = useState(workspace.currency);
  const [fiscalMonth, setFiscalMonth] = useState(workspace.fiscal_year_start_month);
  const [logoUrl, setLogoUrl] = useState<string | null>(workspace.logo_url ?? null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(workspace.name);
    setBusinessType(workspace.business_type ?? "");
    setCountry(workspace.country ?? "");
    setTimezone(workspace.timezone);
    setCurrency(workspace.currency);
    setFiscalMonth(workspace.fiscal_year_start_month);
    setLogoUrl(workspace.logo_url ?? null);
  }, [workspace]);

  // 2. Profile Tab State
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [profession, setProfession] = useState(profile?.profession ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setProfession(profile?.profession ?? "");
    setPhone(profile?.phone ?? "");
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [profile]);

  // 3. Financial Tab State
  const [taxMode, setTaxMode] = useState("reserve_percent");
  const [taxPercent, setTaxPercent] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState(14);
  const [buffer, setBuffer] = useState("0");
  const [invoicePrefix, setInvoicePrefix] = useState("INV-");
  const [invoiceNotes, setInvoiceNotes] = useState("");

  useEffect(() => {
    const s = settings.data;
    if (!s) return;
    setTaxMode(s.tax_mode);
    setTaxPercent(Number(s.tax_reserve_percent));
    setPaymentTerms(s.default_payment_terms_days);
    setBuffer(String(s.operating_buffer ?? 0));
    setInvoicePrefix(s.invoice_number_prefix);
    setInvoiceNotes(s.invoice_notes ?? "");
  }, [settings.data]);

  // 4. Team Tab State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("viewer");
  const [isInviting, setIsInviting] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);

  // 5. Billing Tab State
  const [billingCurrency, setBillingCurrency] = useState<PricingCurrency>(
    workspace.currency === "MWK" ? "MWK" : "USD",
  );
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);
  const [isCancelingSub, setIsCancelingSub] = useState(false);

  // 6. Security Tab State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // File Upload Handlers
  async function handleLogoUpload(file: File) {
    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${workspace.id}/logo_${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage
        .from("workspaces")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from("workspaces").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      await updateWorkspace(workspace.id, { logo_url: publicUrl });
      setLogoUrl(publicUrl);
      await queryClient.invalidateQueries({ queryKey: ["memberships"] });
      toast.success("Workspace logo updated");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Failed to upload logo", { description: msg });
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handleDeleteLogo() {
    try {
      await updateWorkspace(workspace.id, { logo_url: null });
      setLogoUrl(null);
      await queryClient.invalidateQueries({ queryKey: ["memberships"] });
      toast.success("Logo removed");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Failed to remove logo", { description: msg });
    }
  }

  async function handleAvatarUpload(file: File) {
    if (!user) return;
    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar_${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      await upsertProfile({
        userId: user.id,
        email: user.email ?? null,
        fullName: fullName || "User",
        avatarUrl: publicUrl,
      });

      setAvatarUrl(publicUrl);
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Avatar updated");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Failed to upload avatar", { description: msg });
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleDeleteAvatar() {
    if (!user) return;
    try {
      await upsertProfile({
        userId: user.id,
        email: user.email ?? null,
        fullName: fullName || "User",
        avatarUrl: null,
      });
      setAvatarUrl(null);
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Avatar removed");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Failed to remove avatar", { description: msg });
    }
  }

  // Mutations
  const workspaceMutation = useMutation({
    mutationFn: () =>
      updateWorkspace(workspace.id, {
        name: name.trim(),
        business_type: businessType.trim() || null,
        country: country.trim() || null,
        timezone: timezone.trim(),
        currency,
        fiscal_year_start_month: fiscalMonth,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["memberships"] });
      toast.success("Workspace updated");
    },
    onError: (e: Error) => toast.error("Couldn't save workspace", { description: e.message }),
  });

  const profileMutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Your session has expired. Sign in again.");
      return upsertProfile({
        userId: user.id,
        email: user.email ?? null,
        fullName,
        phone: phone || null,
        profession: profession || null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error("Couldn't save profile", { description: e.message }),
  });

  const financeMutation = useMutation({
    mutationFn: () =>
      updateWorkspaceSettings(workspace.id, {
        tax_mode: taxMode,
        tax_reserve_percent: taxPercent,
        default_payment_terms_days: paymentTerms,
        operating_buffer: parseFloat(parseMoneyInput(buffer)) || 0,
        invoice_number_prefix: invoicePrefix.trim(),
        invoice_notes: invoiceNotes.trim() || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspace_settings"] });
      toast.success("Financial preferences updated");
    },
    onError: (e: Error) => toast.error("Couldn't save preferences", { description: e.message }),
  });

  // Invitation Handler
  async function handleSendInvite(e: FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;

    const currentMemberCount = members.data?.length ?? 1;
    if (currentMemberCount >= entitlements.maxTeamMembers) {
      toast.error(`Team limit reached for ${entitlements.displayName} plan.`, {
        description: "Upgrade your plan in the Billing tab to invite additional members.",
      });
      return;
    }

    setIsInviting(true);
    setGeneratedInviteLink(null);
    try {
      const origin = window.location.origin;
      const res = await inviteMemberServerFn({
        data: {
          workspaceId: workspace.id,
          email: inviteEmail.trim(),
          role: inviteRole,
          origin,
        },
      });

      setGeneratedInviteLink(res.inviteUrl);
      setInviteEmail("");
      await queryClient.invalidateQueries({ queryKey: ["workspace_invitations"] });
      toast.success("Invitation created and emailed!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Failed to send invitation", { description: msg });
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRevokeInvite(invitationId: string) {
    try {
      await revokeInvitationServerFn({ data: { invitationId } });
      await queryClient.invalidateQueries({ queryKey: ["workspace_invitations"] });
      toast.success("Invitation revoked");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Failed to revoke invitation", { description: msg });
    }
  }

  // Billing Checkout Handler
  async function handleInitiateCheckout(targetPlan: PlanTier) {
    if (targetPlan === "free") return;
    setIsCheckingOut(targetPlan);
    try {
      const returnUrl = `${window.location.origin}/app/billing/verify`;
      const res = await createCheckoutServerFn({
        data: {
          workspaceId: workspace.id,
          planId: targetPlan,
          currency: billingCurrency,
          customerEmail: user?.email || "customer@example.com",
          customerName: profile?.full_name || undefined,
          returnUrl,
        },
      });

      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        toast.info("PayChangu Simulation Active", {
          description:
            "PayChangu secret key is not configured in server environment. Payment attempt recorded.",
        });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error && !err.message.includes("fetch failed")
          ? err.message
          : "We couldn't start checkout. Your payment was not started. Please try again.";
      toast.error("Checkout unavailable", { description: msg });
    } finally {
      setIsCheckingOut(null);
    }
  }

  // Cancel Subscription Handler
  async function handleCancelSubscription() {
    if (
      !confirm(
        "Are you sure you want to cancel? You will keep your paid benefits until the end of your current period.",
      )
    ) {
      return;
    }
    setIsCancelingSub(true);
    try {
      await cancelSubscriptionServerFn({ data: { workspaceId: workspace.id } });
      await queryClient.invalidateQueries({ queryKey: ["workspace_subscription"] });
      toast.success("Subscription set to cancel at end of billing cycle");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Cancellation failed", { description: msg });
    } finally {
      setIsCancelingSub(false);
    }
  }

  // Password Change Handler
  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Password change failed", { description: msg });
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-20">
      <header className="border-b border-border/60 pb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Workspace configuration, team access, billing entitlements, and security controls.
        </p>
      </header>

      <Tabs defaultValue="workspace" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-muted/60">
          <TabsTrigger value="workspace" className="gap-2 py-2 text-xs sm:text-sm">
            <Building2 className="size-4" />
            Workspace
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2 py-2 text-xs sm:text-sm">
            <User className="size-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2 py-2 text-xs sm:text-sm">
            <Wallet className="size-4" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2 py-2 text-xs sm:text-sm">
            <Users className="size-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2 py-2 text-xs sm:text-sm">
            <CreditCard className="size-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 py-2 text-xs sm:text-sm">
            <Shield className="size-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* 1. WORKSPACE TAB */}
        <TabsContent value="workspace" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Identity</CardTitle>
              <CardDescription>
                Configure your business logo, legal name, currency, and reporting cycle.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Section */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center border-b border-border/50 pb-6">
                <div className="relative size-20 rounded-xl border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="size-full object-contain p-2" />
                  ) : (
                    <Building2 className="size-8 text-muted-foreground/60" />
                  )}
                  {isUploadingLogo && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Loader2 className="size-5 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Workspace Logo</Label>
                  <p className="text-xs text-muted-foreground">
                    PNG, SVG, or JPG up to 2MB. Displayed on invoices and PDF reports.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={logoInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleLogoUpload(file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingLogo || !canEditWorkspace}
                    >
                      <Upload className="size-3.5" />
                      Upload Logo
                    </Button>
                    {logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive gap-1.5"
                        onClick={handleDeleteLogo}
                        disabled={!canEditWorkspace}
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form fields */}
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  workspaceMutation.mutate();
                }}
              >
                <fieldset
                  className="space-y-4"
                  disabled={!canEditWorkspace || workspaceMutation.isPending}
                >
                  <div className="space-y-2">
                    <Label htmlFor="s-name">Business / Workspace Name</Label>
                    <Input
                      id="s-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="s-type">Business Type</Label>
                      <Input
                        id="s-type"
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        placeholder="e.g. Independent Consultant, Design Studio"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-country">Country</Label>
                      <Input
                        id="s-country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="e.g. Malawi, United States"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-tz">Timezone</Label>
                      <Input
                        id="s-tz"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-currency">Primary Operating Currency</Label>
                      <select
                        id="s-currency"
                        className={fieldClass()}
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="s-fiscal">Financial Year Starts</Label>
                      <select
                        id="s-fiscal"
                        className={fieldClass()}
                        value={fiscalMonth}
                        onChange={(e) => setFiscalMonth(Number(e.target.value))}
                      >
                        {MONTHS.map((m, i) => (
                          <option key={m} value={i + 1}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </fieldset>

                {canEditWorkspace && (
                  <Button type="submit" disabled={workspaceMutation.isPending}>
                    {workspaceMutation.isPending && (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    )}
                    Save Workspace Changes
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. PROFILE TAB */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Profile</CardTitle>
              <CardDescription>
                Your personal details and avatar as seen by teammates and on records.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center border-b border-border/50 pb-6">
                <div className="relative size-20 rounded-full border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
                  ) : (
                    <User className="size-8 text-muted-foreground/60" />
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Loader2 className="size-5 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Profile Photo</Label>
                  <p className="text-xs text-muted-foreground">
                    Upload a high-resolution headshot or portrait.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={avatarInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleAvatarUpload(file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                    >
                      <Upload className="size-3.5" />
                      Upload Photo
                    </Button>
                    {avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive gap-1.5"
                        onClick={handleDeleteAvatar}
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  profileMutation.mutate();
                }}
              >
                <fieldset
                  className="grid gap-4 sm:grid-cols-2"
                  disabled={profileMutation.isPending}
                >
                  <div className="space-y-2">
                    <Label htmlFor="s-fullname">Full Name</Label>
                    <Input
                      id="s-fullname"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-email">Email Address</Label>
                    <Input id="s-email" value={user?.email ?? ""} readOnly disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-profession">Profession / Title</Label>
                    <Input
                      id="s-profession"
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      placeholder="e.g. Financial Consultant"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-phone">Phone Number</Label>
                    <Input
                      id="s-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+265 99 000 0000"
                    />
                  </div>
                </fieldset>

                <Button type="submit" disabled={profileMutation.isPending}>
                  {profileMutation.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
                  Save Profile
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. FINANCIAL TAB */}
        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial & Invoicing Preferences</CardTitle>
              <CardDescription>
                Configure automated tax reserving, default invoice prefixes, and payment terms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settings.isPending ? (
                <LoadingState label="Loading preferences..." />
              ) : settings.isError ? (
                <ErrorState
                  message={(settings.error as Error).message}
                  onRetry={() => void settings.refetch()}
                />
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    financeMutation.mutate();
                  }}
                >
                  <fieldset
                    className="grid gap-4 sm:grid-cols-2"
                    disabled={!canEditFinance || financeMutation.isPending}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="s-taxmode">Tax Reserve Mode</Label>
                      <select
                        id="s-taxmode"
                        className={fieldClass()}
                        value={taxMode}
                        onChange={(e) => setTaxMode(e.target.value)}
                      >
                        <option value="reserve_percent">Reserve a percentage of income</option>
                        <option value="none">No automatic tax reserve</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-taxpct">Tax Reserve Percentage (%)</Label>
                      <Input
                        id="s-taxpct"
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={taxPercent}
                        onChange={(e) => setTaxPercent(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-terms">Default Payment Terms (Days)</Label>
                      <Input
                        id="s-terms"
                        type="number"
                        min={0}
                        max={365}
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-buffer">Operating Buffer ({workspace.currency})</Label>
                      <MoneyInput
                        id="s-buffer"
                        value={buffer}
                        onChange={setBuffer}
                        currency={workspace.currency}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-prefix">Invoice Number Prefix</Label>
                      <Input
                        id="s-prefix"
                        value={invoicePrefix}
                        onChange={(e) => setInvoicePrefix(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-notes">Default Invoice Notes / Payment Instructions</Label>
                      <Input
                        id="s-notes"
                        value={invoiceNotes}
                        onChange={(e) => setInvoiceNotes(e.target.value)}
                      />
                    </div>
                  </fieldset>

                  {canEditFinance && (
                    <Button type="submit" disabled={financeMutation.isPending}>
                      {financeMutation.isPending && (
                        <Loader2 className="size-4 animate-spin mr-2" />
                      )}
                      Save Preferences
                    </Button>
                  )}
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. TEAM TAB */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Team Collaboration</CardTitle>
                <CardDescription>
                  Manage access and invite members via secure invitation links.
                </CardDescription>
              </div>
              <Badge variant="outline" className="self-start text-xs">
                {members.data?.length ?? 1} /{" "}
                {entitlements.maxTeamMembers === Infinity
                  ? "Unlimited"
                  : entitlements.maxTeamMembers}{" "}
                Seats
              </Badge>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Invite Form */}
              {canEditWorkspace && (
                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Mail className="size-4 text-primary" />
                    Invite Team Member
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    An email invitation with a secure acceptance link will be sent. No temporary
                    passwords are generated.
                  </p>
                  <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1"
                      required
                    />
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as AppRole)}
                    >
                      <option value="viewer">Viewer (Read-only)</option>
                      <option value="manager">Manager (Clients & Projects)</option>
                      <option value="finance">Finance (Financial Operations)</option>
                      <option value="admin">Admin (Workspace Configuration)</option>
                    </select>
                    <Button type="submit" disabled={isInviting || !inviteEmail}>
                      {isInviting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                      Send Invite
                    </Button>
                  </form>

                  {generatedInviteLink && (
                    <div className="mt-3 p-3 rounded-lg bg-background border border-primary/30 space-y-1 text-xs">
                      <p className="font-semibold text-primary">Invitation Link Generated:</p>
                      <p className="text-muted-foreground font-mono break-all">
                        {generatedInviteLink}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Active Members */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Active Members</h3>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User / Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.data?.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium text-sm">
                            {m.user_id === user?.id ? `${user?.email} (You)` : m.user_id}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{ROLE_LABEL[m.role]}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(m.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pending Invitations */}
              {invitations.data && invitations.data.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Pending Invitations</h3>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.data.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium text-sm">{inv.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{ROLE_LABEL[inv.role]}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  inv.status === "pending"
                                    ? "secondary"
                                    : inv.status === "accepted"
                                      ? "default"
                                      : "destructive"
                                }
                              >
                                {inv.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(inv.expires_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {inv.status === "pending" && canEditWorkspace && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive h-8 px-2"
                                  onClick={() => handleRevokeInvite(inv.id)}
                                >
                                  Revoke
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. BILLING TAB */}
        <TabsContent value="billing" className="space-y-6">
          {/* Current Status Card */}
          <Card className="border-primary/40 bg-gradient-to-br from-background via-muted/10 to-primary/5">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Crown className="size-5 text-primary" />
                  <CardTitle>Current Plan: SoloOS {entitlements.displayName}</CardTitle>
                </div>
                <CardDescription className="mt-1">
                  {entitlements.isPaidPlan
                    ? `Active paid subscription with full autonomous features.`
                    : `Core bookkeeping plan for getting started.`}
                </CardDescription>
              </div>
              <Badge
                variant={entitlements.isPaidPlan ? "default" : "secondary"}
                className="text-sm px-3 py-1 self-start"
              >
                {subscriptionQuery.data?.status === "active"
                  ? "Active"
                  : entitlements.isInGracePeriod
                    ? "Cancels at period end"
                    : "Free Tier"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscriptionQuery.data && (
                <div className="grid gap-4 sm:grid-cols-3 text-sm p-4 rounded-xl bg-background/60 border border-border/60">
                  <div>
                    <span className="text-muted-foreground block text-xs">Current Period Ends</span>
                    <span className="font-semibold">
                      {new Date(subscriptionQuery.data.current_period_end).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Billing Currency</span>
                    <span className="font-semibold">{subscriptionQuery.data.currency}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Auto-renewal</span>
                    <span className="font-semibold">
                      {subscriptionQuery.data.cancel_at_period_end ? "Disabled" : "Active"}
                    </span>
                  </div>
                </div>
              )}

              {/* Entitlements Checklist */}
              <div className="grid gap-2 sm:grid-cols-2 text-xs pt-2">
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-500 shrink-0" />
                  <span>
                    Clients:{" "}
                    <strong>
                      {entitlements.maxClients === Infinity ? "Unlimited" : entitlements.maxClients}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-500 shrink-0" />
                  <span>
                    Invoices:{" "}
                    <strong>
                      {entitlements.maxInvoicesPerMonth === Infinity
                        ? "Unlimited"
                        : `${entitlements.maxInvoicesPerMonth} / month`}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {entitlements.canUseAiCfo ? (
                    <Check className="size-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="size-4 text-muted-foreground shrink-0" />
                  )}
                  <span>AI CFO Financial Intelligence</span>
                </div>
                <div className="flex items-center gap-2">
                  {entitlements.canExportPdfReports ? (
                    <Check className="size-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="size-4 text-muted-foreground shrink-0" />
                  )}
                  <span>Audit-grade PDF Report Exports</span>
                </div>
              </div>

              {entitlements.isPaidPlan && !subscriptionQuery.data?.cancel_at_period_end && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={handleCancelSubscription}
                    disabled={isCancelingSub}
                  >
                    {isCancelingSub ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    Cancel Subscription
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upgrade / Change Plan Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Available Plans</h3>
              {/* Currency Toggle */}
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setBillingCurrency("MWK")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    billingCurrency === "MWK"
                      ? "bg-background shadow-xs text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  MWK (Malawi)
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCurrency("USD")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    billingCurrency === "USD"
                      ? "bg-background shadow-xs text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  USD ($)
                </button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Solo Plan */}
              <Card
                className={`relative flex flex-col justify-between ${
                  entitlements.tier === "solo" ? "border-primary ring-1 ring-primary/40" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">Solo</CardTitle>
                    {entitlements.tier === "solo" && <Badge>Current Plan</Badge>}
                  </div>
                  <div className="mt-2 text-2xl font-bold">
                    {CANONICAL_PRICES.solo[billingCurrency].formatted}
                  </div>
                  <CardDescription>{PLAN_DETAILS.solo.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {PLAN_DETAILS.solo.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full mt-4"
                    disabled={entitlements.tier === "solo" || isCheckingOut !== null}
                    onClick={() => handleInitiateCheckout("solo")}
                  >
                    {isCheckingOut === "solo" ? (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    ) : null}
                    {entitlements.tier === "solo" ? "Current Plan" : "Upgrade to Solo"}
                  </Button>
                </CardContent>
              </Card>

              {/* Pro Plan */}
              <Card
                className={`relative flex flex-col justify-between ${
                  entitlements.tier === "pro" ? "border-primary ring-1 ring-primary/40" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">Pro</CardTitle>
                    {entitlements.tier === "pro" && <Badge>Current Plan</Badge>}
                  </div>
                  <div className="mt-2 text-2xl font-bold">
                    {CANONICAL_PRICES.pro[billingCurrency].formatted}
                  </div>
                  <CardDescription>{PLAN_DETAILS.pro.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {PLAN_DETAILS.pro.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant="default"
                    className="w-full mt-4"
                    disabled={entitlements.tier === "pro" || isCheckingOut !== null}
                    onClick={() => handleInitiateCheckout("pro")}
                  >
                    {isCheckingOut === "pro" ? (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    ) : null}
                    {entitlements.tier === "pro" ? "Current Plan" : "Upgrade to Pro"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Payment History */}
          <div className="space-y-3 pt-4">
            <h3 className="text-base font-semibold">Reconciled Payment History</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsQuery.data && paymentsQuery.data.length > 0 ? (
                    paymentsQuery.data.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.tx_ref}</TableCell>
                        <TableCell className="capitalize">{p.plan_id}</TableCell>
                        <TableCell className="font-medium">
                          {p.expected_currency}{" "}
                          {(Number(p.expected_amount_cents) / 100).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              p.status === "successful"
                                ? "default"
                                : p.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-6 text-muted-foreground text-sm"
                      >
                        No billing transactions on record yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* 6. SECURITY TAB */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account & Authentication</CardTitle>
              <CardDescription>
                Review authentication sessions and update your master password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <dl className="grid gap-4 sm:grid-cols-3 text-sm p-4 rounded-xl bg-muted/30 border border-border/50">
                <div>
                  <dt className="text-muted-foreground text-xs">Email</dt>
                  <dd className="font-medium mt-0.5">{user?.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Sign-in Provider</dt>
                  <dd className="font-medium mt-0.5 capitalize">
                    {user?.app_metadata?.provider ?? "email"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Last Signed In</dt>
                  <dd className="font-medium mt-0.5">
                    {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"}
                  </dd>
                </div>
              </dl>

              {/* Password Change Form */}
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md pt-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <KeyRound className="size-4 text-primary" />
                  Change Password
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                  />
                </div>
                <Button type="submit" disabled={isChangingPassword || !newPassword}>
                  {isChangingPassword ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  Update Password
                </Button>
              </form>

              <div className="border-t border-border/60 pt-6">
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => void signOut()}
                >
                  Sign Out of SoloOS
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
