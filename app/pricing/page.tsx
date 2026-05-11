"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import AmbientBackdrop from "@/components/cockpit/AmbientBackdrop";
import LandingNav from "@/components/landing/LandingNav";
import PricingCards from "@/components/subscription/PricingCards";
import TrustRibbon from "@/components/trust/TrustRibbon";
import type { QuantPlanTier } from "@/lib/subscription/plans";

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const [tier, setTier] = useState<QuantPlanTier | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      startTransition(() => setTier(null));
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/billing/subscription", { credentials: "same-origin" });
        const data = (await res.json()) as { tier?: string };
        if (!cancelled && res.ok && typeof data.tier === "string") {
          setTier(data.tier as QuantPlanTier);
        }
      } catch {
        if (!cancelled) setTier("free");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#020617] text-slate-100">
      <AmbientBackdrop />
      <div className="relative z-10">
        <LandingNav />
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
            QuantAI plans
          </p>
          <h1 className="cockpit-display mt-4 text-center text-3xl text-white sm:text-4xl lg:text-5xl">
            One cockpit. <span className="cockpit-gradient-text">Three power levels.</span>
          </h1>
          <p className="cockpit-body mx-auto mt-5 max-w-2xl text-center text-base text-slate-400">
            Elevate limits and unlock full-spectrum intelligence when your cart stakes are real. Checkout routes to
            Stripe when keys are set; otherwise you land on a safe billing preview.
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
