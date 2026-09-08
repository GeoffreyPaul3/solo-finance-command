import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { LoadingState } from "@/components/app/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createWorkspace,
  membershipsQueryOptions,
  profileQueryOptions,
  upsertProfile,
} from "@/domain/workspace";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your workspace | SoloOS" },
      { name: "description", content: "Create your SoloOS workspace and financial preferences." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

const BUSINESS_TYPES = [
  "Freelancer",
  "Consultant",
  "Creator",
  "Contractor",
  "Agency",
  "Other",
] as const;

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

const TAX_MODES = [
  { value: "reserve_percent", label: "Reserve a percentage of income" },
  { value: "none", label: "No automatic tax reserve" },
] as const;

function guessTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function fieldClass() {
  return "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
}

function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const memberships = useQuery(membershipsQueryOptions(user?.id));
  const profile = useQuery(profileQueryOptions(user?.id));
  const submitted = useRef(false);

  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState<string>("Freelancer");
  const [country, setCountry] = useState("");
  const [timezone, setTimezone] = useState(guessTimezone());
  const [currency, setCurrency] = useState("USD");
  const [fiscalMonth, setFiscalMonth] = useState(1);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profession, setProfession] = useState("");

  const [taxMode, setTaxMode] = useState<string>("reserve_percent");
  const [taxPercent, setTaxPercent] = useState(20);
  const [paymentTerms, setPaymentTerms] = useState(14);
  const [buffer, setBuffer] = useState(0);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existing = profile.data;
    if (existing?.full_name) setFullName((v) => v || existing.full_name!);
    if (existing?.profession) setProfession((v) => v || existing.profession!);
    if (existing?.phone) setPhone((v) => v || existing.phone!);
  }, [profile.data]);

  // Already has a workspace → onboarding is done.
  useEffect(() => {
    if (memberships.isSuccess && (memberships.data?.length ?? 0) > 0) {
      navigate({ to: "/app", replace: true });
    }
  }, [memberships.isSuccess, memberships.data, navigate]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Your session has expired. Sign in again.");
      await upsertProfile({
        userId: user.id,
        email: user.email ?? null,
        fullName,
        phone: phone || null,
        profession: profession || null,
        markOnboarded: true,
      });
      return createWorkspace({
        name: name.trim(),
        businessType: businessType || null,
        country: country.trim() || null,
        timezone,
        currency,
        fiscalYearStartMonth: fiscalMonth,
        taxReservePercent: taxMode === "none" ? 0 : taxPercent,
        defaultPaymentTermsDays: paymentTerms,
        operatingBuffer: buffer,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success("Workspace created", { description: `${name.trim()} is ready.` });
      navigate({ to: "/app", replace: true });
    },
    onError: (err: Error) => {
      submitted.current = false;
      setError(err.message);
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (submitted.current || mutation.isPending) return;
    if (!name.trim()) return setError("Give your business or workspace a name.");
    if (!fullName.trim()) return setError("Enter your full name.");
    if (taxMode !== "none" && (taxPercent < 0 || taxPercent > 100))
      return setError("Tax reserve must be between 0 and 100 percent.");
    if (paymentTerms < 0 || paymentTerms > 365)
      return setError("Payment terms must be between 0 and 365 days.");
    if (buffer < 0) return setError("Operating buffer cannot be negative.");
    submitted.current = true;
    mutation.mutate();
  }

  if (memberships.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label="Checking your workspace" />
      </div>
    );
  }

  const pending = mutation.isPending;

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:py-16">
      <p className="text-display text-lg font-semibold">SoloOS</p>
      <h1 className="mt-6 text-2xl font-semibold sm:text-3xl">Set up your workspace</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        These details shape your currency, invoicing defaults and tax reserve. You can change all of
        them later in Settings.
      </p>

      <form className="mt-10 space-y-10" onSubmit={handleSubmit} noValidate>
        <fieldset className="panel space-y-4 p-6" disabled={pending}>
          <legend className="px-1 text-sm font-semibold">Business identity</legend>

          <div className="space-y-2">
            <Label htmlFor="ws-name">Business or workspace name</Label>
            <Input
              id="ws-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mensah Design Studio"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ws-type">Business type</Label>
              <select
                id="ws-type"
                className={fieldClass()}
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-country">Country</Label>
              <Input
                id="ws-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Malawi"
                autoComplete="country-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-tz">Timezone</Label>
              <Input id="ws-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-currency">Default currency</Label>
              <select
                id="ws-currency"
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
              <Label htmlFor="ws-fiscal">Financial year starts</Label>
              <select
                id="ws-fiscal"
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

        <fieldset className="panel space-y-4 p-6" disabled={pending}>
          <legend className="px-1 text-sm font-semibold">Your profile</legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="p-name">Full name</Label>
              <Input
                id="p-name"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-email">Email</Label>
              <Input id="p-email" value={user?.email ?? ""} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-profession">Profession or category</Label>
              <Input
                id="p-profession"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="Brand designer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-phone">Phone (optional)</Label>
              <Input
                id="p-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="panel space-y-4 p-6" disabled={pending}>
          <legend className="px-1 text-sm font-semibold">Financial preferences</legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="f-taxmode">Tax handling</Label>
              <select
                id="f-taxmode"
                className={fieldClass()}
                value={taxMode}
                onChange={(e) => setTaxMode(e.target.value)}
              >
                {TAX_MODES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {taxMode !== "none" ? (
              <div className="space-y-2">
                <Label htmlFor="f-taxpct">Tax reserve (%)</Label>
                <Input
                  id="f-taxpct"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value))}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="f-terms">Default payment terms (days)</Label>
              <Input
                id="f-terms"
                type="number"
                min={0}
                max={365}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="f-buffer">Operating buffer ({currency})</Label>
              <Input
                id="f-buffer"
                type="number"
                min={0}
                step="0.01"
                value={buffer}
                onChange={(e) => setBuffer(Number(e.target.value))}
                aria-describedby="f-buffer-hint"
              />
              <p id="f-buffer-hint" className="text-xs text-muted-foreground">
                Cash you want to keep untouched in the business.
              </p>
            </div>
          </div>
        </fieldset>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {pending ? "Creating workspace…" : "Create workspace"}
        </Button>
      </form>
    </div>
  );
}
