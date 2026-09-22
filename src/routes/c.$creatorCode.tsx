import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { validateCreatorCode } from "@/domain/creator";
import { recordCreatorLandingServerFn } from "@/server/creator";

interface CreatorLandingSearch {
  campaign?: string | undefined;
}

export const Route = createFileRoute("/c/$creatorCode")({
  validateSearch: (search: Record<string, unknown>): CreatorLandingSearch => {
    const rawCampaign = search["campaign"];
    const campaign =
      typeof rawCampaign === "string" && rawCampaign.trim()
        ? rawCampaign.trim().toLowerCase()
        : undefined;
    return campaign ? { campaign } : {};
  },
  head: () => ({
    meta: [
      { title: "SoloOS Partner Invitation" },
      {
        name: "description",
        content:
          "You've been invited to SoloOS — The financial operating system for independent professionals.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: CreatorLandingPage,
});

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

function persistCreatorAttribution(params: {
  creatorId: string;
  creatorCode: string;
  campaignId?: string | null;
}) {
  try {
    const ts = Date.now().toString();
    localStorage.setItem("solos_creator_id", params.creatorId);
    localStorage.setItem("solos_creator_code", params.creatorCode);
    if (params.campaignId) {
      localStorage.setItem("solos_campaign_id", params.campaignId);
    }
    localStorage.setItem("solos_creator_ts", ts);

    // Cookie fallback: 30 days
    const maxAge = 30 * 24 * 60 * 60;
    document.cookie = `solos_c_id=${encodeURIComponent(params.creatorId)};path=/;max-age=${maxAge};SameSite=Lax`;
    document.cookie = `solos_c_code=${encodeURIComponent(params.creatorCode)};path=/;max-age=${maxAge};SameSite=Lax`;
  } catch {
    /* non-blocking */
  }
}

function CreatorLandingPage() {
  const { creatorCode } = Route.useParams();
  const { campaign } = Route.useSearch();
  const handledRef = useRef(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    async function handle() {
      const cleanCode = creatorCode.trim().toLowerCase();
      if (!validateCreatorCode(cleanCode)) {
        setErrorStatus("Invalid creator code format.");
        return;
      }

      const anonSessionId = getAnonSessionId();

      try {
        const result = await recordCreatorLandingServerFn({
          data: {
            creatorCode: cleanCode,
            campaignCode: campaign,
            anonymousSessionId: anonSessionId,
          },
        });

        if (result.recorded && result.creatorId) {
          persistCreatorAttribution({
            creatorId: result.creatorId,
            creatorCode: cleanCode,
            campaignId: result.campaignId,
          });

          // Redirect to signup preserving creator context
          const dest =
            result.destinationPath && result.destinationPath !== "/"
              ? result.destinationPath
              : `/auth?mode=signup&creator=${encodeURIComponent(cleanCode)}${campaign ? `&campaign=${encodeURIComponent(campaign)}` : ""}`;

          window.location.href = dest;
        } else {
          setErrorStatus("Creator link is expired, inactive, or not found.");
        }
      } catch (err) {
        console.error("[CreatorLanding] Error recording landing:", err);
        // Fallback: still redirect to signup with creator param
        window.location.href = `/auth?mode=signup&creator=${encodeURIComponent(cleanCode)}`;
      }
    }

    handle();
  }, [creatorCode, campaign]);

  if (errorStatus) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <Sparkles className="size-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Creator Link Notice</h1>
          <p className="text-sm text-muted-foreground">{errorStatus}</p>
          <Button asChild className="mt-4">
            <a href="/auth?mode=signup">
              Continue to SoloOS <ArrowRight className="ml-2 size-4" />
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground font-medium">
        Connecting to SoloOS Creator Partner…
      </p>
    </div>
  );
}
