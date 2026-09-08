import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ErrorState, LoadingState } from "@/components/app/state";
import { useWorkspace } from "@/components/app/workspace-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  canManageFinancialSettings,
  canManageWorkspace,
  updateWorkspace,
  updateWorkspaceSettings,
  upsertProfile,
  workspaceMembersQueryOptions,
  workspaceSettingsQueryOptions,
} from "@/domain/workspace";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings | SoloOS" },
      {
        name: "description",
        content: "Manage your SoloOS workspace, profile and financial preferences.",
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

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="panel p-6">
      <h2 id={id} className="text-base font-semibold">
        {title}
      </h2>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SettingsPage() {
  const { workspace, role, profile } = useWorkspace();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const settings = useQuery(workspaceSettingsQueryOptions(workspace.id));
  const members = useQuery(workspaceMembersQueryOptions(workspace.id));

  const canEditWorkspace = canManageWorkspace(role);
  const canEditFinance = canManageFinancialSettings(role);

  // Workspace form
  const [name, setName] = useState(workspace.name);
  const [businessType, setBusinessType] = useState(workspace.business_type ?? "");
  const [country, setCountry] = useState(workspace.country ?? "");
  const [timezone, setTimezone] = useState(workspace.timezone);
  const [currency, setCurrency] = useState(workspace.currency);
  const [fiscalMonth, setFiscalMonth] = useState(workspace.fiscal_year_start_month);

  useEffect(() => {
    setName(workspace.name);
    setBusinessType(workspace.business_type ?? "");
    setCountry(workspace.country ?? "");
    setTimezone(workspace.timezone);
    setCurrency(workspace.currency);
    setFiscalMonth(workspace.fiscal_year_start_month);
  }, [workspace]);

  // Profile form
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [profession, setProfession] = useState(profile?.profession ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setProfession(profile?.profession ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  // Financial form
  const [taxMode, setTaxMode] = useState("reserve_percent");
  const [taxPercent, setTaxPercent] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState(14);
  const [buffer, setBuffer] = useState(0);
  const [invoicePrefix, setInvoicePrefix] = useState("INV-");
  const [invoiceNotes, setInvoiceNotes] = useState("");

  useEffect(() => {
    const s = settings.data;
    if (!s) return;
    setTaxMode(s.tax_mode);
    setTaxPercent(Number(s.tax_reserve_percent));
    setPaymentTerms(s.default_payment_terms_days);
    setBuffer(Number(s.operating_buffer));
    setInvoicePrefix(s.invoice_number_prefix);
    setInvoiceNotes(s.invoice_notes ?? "");
  }, [settings.data]);

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
        operating_buffer: buffer,
        invoice_number_prefix: invoicePrefix.trim(),
        invoice_notes: invoiceNotes.trim() || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspace-settings"] });
      toast.success("Financial preferences updated");
    },
    onError: (e: Error) => toast.error("Couldn't save preferences", { description: e.message }),
  });

  function submit(event: FormEvent<HTMLFormElement>, run: () => void) {
    event.preventDefault();
    run();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You're signed in as {ROLE_LABEL[role]} in {workspace.name}.
        </p>
      </header>

      <Section
        id="workspace"
        title="Workspace"
        description={
          canEditWorkspace
            ? "Business identity and financial year. These drive currency and reporting."
            : "Only owners and admins can change workspace settings."
        }
      >
        <form className="space-y-4" onSubmit={(e) => submit(e, () => workspaceMutation.mutate())}>
          <fieldset
            className="space-y-4"
            disabled={!canEditWorkspace || workspaceMutation.isPending}
          >
            <div className="space-y-2">
              <Label htmlFor="s-name">Business name</Label>
              <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="s-type">Business type</Label>
                <Input
                  id="s-type"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-country">Country</Label>
                <Input
                  id="s-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-tz">Timezone</Label>
                <Input id="s-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-currency">Default currency</Label>
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
                <Label htmlFor="s-fiscal">Financial year starts</Label>
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
          {canEditWorkspace ? (
            <Button type="submit" disabled={workspaceMutation.isPending}>
              {workspaceMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Save workspace
            </Button>
          ) : null}
        </form>
      </Section>

      <Section id="profile" title="Profile" description="How you appear inside SoloOS.">
        <form className="space-y-4" onSubmit={(e) => submit(e, () => profileMutation.mutate())}>
          <fieldset className="grid gap-4 sm:grid-cols-2" disabled={profileMutation.isPending}>
            <div className="space-y-2">
              <Label htmlFor="s-fullname">Full name</Label>
              <Input
                id="s-fullname"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-email">Email</Label>
              <Input id="s-email" value={user?.email ?? ""} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-profession">Profession or category</Label>
              <Input
                id="s-profession"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-phone">Phone</Label>
              <Input
                id="s-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </fieldset>
          <Button type="submit" disabled={profileMutation.isPending}>
            {profileMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            Save profile
          </Button>
        </form>
      </Section>

      <Section
        id="finance"
        title="Financial preferences"
        description={
          canEditFinance
            ? "Defaults used by invoicing, tax reserve and cash planning once those modules arrive."
            : "Only owners, admins and finance roles can change these."
        }
      >
        {settings.isPending ? (
          <LoadingState label="Loading preferences" />
        ) : settings.isError ? (
          <ErrorState
            message={(settings.error as Error).message}
            onRetry={() => void settings.refetch()}
          />
        ) : (
          <form className="space-y-4" onSubmit={(e) => submit(e, () => financeMutation.mutate())}>
            <fieldset
              className="grid gap-4 sm:grid-cols-2"
              disabled={!canEditFinance || financeMutation.isPending}
            >
              <div className="space-y-2">
                <Label htmlFor="s-taxmode">Tax handling</Label>
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
                <Label htmlFor="s-taxpct">Tax reserve (%)</Label>
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
                <Label htmlFor="s-terms">Default payment terms (days)</Label>
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
                <Label htmlFor="s-buffer">Operating buffer ({workspace.currency})</Label>
                <Input
                  id="s-buffer"
                  type="number"
                  min={0}
                  step="0.01"
                  value={buffer}
                  onChange={(e) => setBuffer(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-prefix">Invoice number prefix</Label>
                <Input
                  id="s-prefix"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-notes">Default invoice notes</Label>
                <Input
                  id="s-notes"
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                />
              </div>
            </fieldset>
            {canEditFinance ? (
              <Button type="submit" disabled={financeMutation.isPending}>
                {financeMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                Save preferences
              </Button>
            ) : null}
          </form>
        )}
      </Section>

      <Section id="team" title="Team" description="Workspace membership and your access level.">
        <p className="text-sm">
          <span className="font-medium">{ROLE_LABEL[role]}</span> — {ROLE_DESCRIPTION[role]}
        </p>
        {members.isPending ? (
          <LoadingState label="Loading members" />
        ) : members.isError ? (
          <ErrorState
            message={(members.error as Error).message}
            onRetry={() => void members.refetch()}
          />
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {members.data?.length ?? 0} member{(members.data?.length ?? 0) === 1 ? "" : "s"} in this
            workspace. Inviting teammates arrives with a later phase; access is enforced in the
            database, not in the interface.
          </p>
        )}
      </Section>

      <Section id="security" title="Security" description="The account currently signed in.">
        <dl className="space-y-2 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">Email</dt>
            <dd>{user?.email ?? "—"}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">Sign-in method</dt>
            <dd>{user?.app_metadata?.provider ?? "—"}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">Last signed in</dt>
            <dd>{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"}</dd>
          </div>
        </dl>
        <Button variant="outline" className="mt-5" onClick={() => void signOut()}>
          Sign out
        </Button>
      </Section>
    </div>
  );
}
