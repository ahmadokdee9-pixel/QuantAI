"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import AmbientBackdrop from "@/components/cockpit/AmbientBackdrop";
import LandingNav from "@/components/landing/LandingNav";
import PricingCards from "@/components/subscription/PricingCards";
import TrustRibbon from "@/components/trust/TrustRibbon";
import { isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";
import type { QuantPlanTier } from "@/lib/subscription/plans";
import { useCopilotSession } from "@/components/copilot/CopilotContext";
import { defaultCopilotSession } from "@/lib/copilot/sessionTypes";
import type { CopilotSessionPayload } from "@/lib/copilot/sessionTypes";

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const [tier, setTier] = useState<QuantPlanTier | null>(null);
  const { setSession: setCopilotSession } = useCopilotSession();

  useEffect(() => {
    if (!isSignedIn) {
      startTransition(() => setTier(null));
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/billing/subscription", { credentials: "same-origin" });
        const parsed = await readApiJson<{ tier?: string }>(res);
        if (
          !cancelled &&
          !isApiFailure(parsed) &&
          parsed.data &&
          typeof parsed.data.tier === "string"
        ) {
          setTier(parsed.data.tier as QuantPlanTier);
        }
      } catch {
        if (!cancelled) setTier("free");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  const pricingCopilotSession = useMemo((): CopilotSessionPayload => {
    return {
      ...defaultCopilotSession(),
      route: "pricing",
      subscriptionTier: tier ?? "free",
      lastSearchQuery: "pricing",
      memoryHints: ["context:pricing_page"],
    };
  }, [tier]);

  useEffect(() => {
    setCopilotSession(pricingCopilotSession);
  }, [pricingCopilotSession, setCopilotSession]);

  return (
    <div className="qa-page-canvas relative min-h-screen overflow-x-hidden">
      <AmbientBackdrop />
      <div className="relative z-10">
        <LandingNav />
        <section className="qa-ui-section qi-access-page">
          <p className="qi-silent-overline text-center">Private access architecture</p>
          <h1 className="qi-editorial-display mt-6 text-center text-3xl text-white sm:text-4xl lg:text-[2.75rem]">
            Clearance into deeper intelligence
          </h1>
          <p className="qi-silent-whisper mx-auto mt-5 max-w-2xl text-center">
            Three layers of market synthesis — from field access to private buyer clearance. Not
            SaaS tiers. Institutional access to how QuantAI reads commerce.
          </p>
          <div className="mt-14">
            <PricingCards currentTier={tier} />
          </div>
          <div className="mx-auto mt-14 max-w-3xl">
            <TrustRibbon />
          </div>
          <p className="cockpit-body mt-10 text-center text-sm text-slate-500">
            Questions?{" "}
            <Link href="/dashboard" className="font-medium text-cyan-300 hover:underline">
              Command center
            </Link>{" "}
            ·{" "}
            <Link href="/" className="font-medium text-cyan-300 hover:underline">
              Return to search
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
