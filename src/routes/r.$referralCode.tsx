import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import {
  formatReferralCookie,
  parseReferralCookie,
  resolveReferralAttribution,
  type StoredReferralAttribution,
} from "@/domain/referrals";
import { recordReferralLandingServerFn } from "@/server/referrals";

/**
 * Public referral landing route.
 * Enforces 30-day first-touch attribution:
 * - First valid referral attribution wins.
 * - Subsequent referral clicks within 30 days do NOT overwrite.
 * - Expired attributions (>30 days) are replaced.
 * - Redirects to /auth?mode=signup&ref=WINNING_CODE.
 * No auth required.
 */
export const Route = createFileRoute("/r/$referralCode")({
  component: ReferralLandingPage,
});

function getExistingStoredAttribution(): StoredReferralAttribution | null {
  try {
    // 1. Try cookie first
    if (typeof document !== "undefined" && document.cookie) {
      const fromCookie = parseReferralCookie(document.cookie);
      if (fromCookie) return fromCookie;
    }

    // 2. Fallback to localStorage
    if (typeof localStorage !== "undefined") {
      const code = localStorage.getItem("solos_ref_code");
      const tsStr = localStorage.getItem("solos_ref_ts");
      const ts = tsStr ? Number(tsStr) : Date.now();
      if (code && !isNaN(ts)) {
        return { code: code.toUpperCase(), timestamp: ts };
      }
    }
  } catch {
    /* silent fail in non-browser env */
  }
  return null;
}

function persistReferralAttribution(code: string, timestamp: number = Date.now()) {
  try {
    const cleanCode = code.toUpperCase();
    document.cookie = formatReferralCookie(cleanCode, timestamp);
    localStorage.setItem("solos_ref_code", cleanCode);
    localStorage.setItem("solos_ref_ts", timestamp.toString());
  } catch {
    /* silent fail in strict cookie env */
  }
}

function getAnonSessionId(): string | undefined {
  try {
    const key = "solos_anon_session";
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

function ReferralLandingPage() {
  const { referralCode } = Route.useParams();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    async function handle() {
      const existing = getExistingStoredAttribution();
      const resolution = resolveReferralAttribution({
        existing,
        incomingCode: referralCode,
        asOf: Date.now(),
      });

      const effectiveCode = resolution.activeCode || referralCode.toUpperCase();
      const anonSessionId = getAnonSessionId();

      if (resolution.shouldUpdate) {
        // Persist new first-touch attribution
        persistReferralAttribution(effectiveCode, Date.now());

        // Notify server
        try {
          await recordReferralLandingServerFn({
            data: { referralCode: effectiveCode, anonymousSessionId: anonSessionId },
          });
        } catch {
          /* non-blocking telemetry */
        }
      }

      // Redirect to signup preserving the winning referral code
      window.location.href = `/auth?mode=signup&ref=${encodeURIComponent(effectiveCode)}`;
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
