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
    <div className="relative min-h-screen overflow-x-hidden bg-[#020617] text-slate-100">
      <AmbientBackdrop />
      <div className="relative z-10">
        <LandingNav />
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/75">
            Plans
          </p>
          <h1 className="cockpit-display mt-4 text-center text-3xl text-white sm:text-4xl lg:text-5xl">
            Clarity that scales <span className="cockpit-gradient-text">with your cart.</span>
          </h1>
          <p className="cockpit-body mx-auto mt-5 max-w-2xl text-center text-base text-slate-400/95">
            Upgrade when you want more daily runway and richer intelligence. Checkout uses Stripe when configured;
            otherwise you can still preview billing safely.
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
