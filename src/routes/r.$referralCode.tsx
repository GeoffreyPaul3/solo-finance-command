import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { recordReferralLandingServerFn } from "@/server/referrals";

/**
 * Public referral landing route.
 * Records first-touch attribution cookie and redirects to signup.
 * No auth required.
 */
export const Route = createFileRoute("/r/$referralCode")({
  component: ReferralLandingPage,
});

function setReferralCookie(code: string) {
  try {
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    document.cookie = `solos_ref=${encodeURIComponent(code)}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
    localStorage.setItem("solos_ref_code", code);
    localStorage.setItem("solos_ref_ts", Date.now().toString());
  } catch { /* silent fail in SSR or strict cookie env */ }
}

function getAnonSessionId() {
  try {
    const key = "solos_anon_session";
    let id = localStorage.getItem(key);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
    return id;
  } catch { return undefined; }
}

function ReferralLandingPage() {
  const { referralCode } = Route.useParams();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    async function handle() {
      const code = referralCode.toUpperCase();
      setReferralCookie(code);
      const anonSessionId = getAnonSessionId();

      try {
        await recordReferralLandingServerFn({
          data: { referralCode: code, anonymousSessionId: anonSessionId },
        });
      } catch { /* non-blocking */ }

      // Redirect to signup with referral code in query
      window.location.href = `/auth?mode=signup&ref=${encodeURIComponent(code)}`;
    }

    handle();
  }, [referralCode]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">Setting up your referral…</p>
    </div>
  );
}
