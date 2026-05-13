"use client";

import { useState } from "react";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import MagneticSurface from "@/components/motion/MagneticSurface";
import { QUANT_PLANS, type QuantPlanTier } from "@/lib/subscription/plans";
import { QuantAnalyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";
import { apiErrorText, isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";

const glassCard = "cockpit-glass-card";

type Props = {
  /** Current Clerk-backed tier (from subscription API). */
  currentTier?: QuantPlanTier | null;
  className?: string;
};

async function startCheckout(plan: "pro" | "premium"): Promise<void> {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ plan }),
  });
  const parsed = await readApiJson<{ url?: string; redirectUrl?: string; error?: string }>(res);
  const data = parsed.data;
  if (isApiFailure(parsed) || !data) {
    throw new Error(apiErrorText(parsed, "Checkout unavailable"));
  }
  if (data.url) {
    window.location.href = data.url;
    return;
  }
  if (data.redirectUrl) {
    window.location.href = data.redirectUrl;
    return;
  }
  throw new Error(apiErrorText(parsed, "Checkout unavailable"));
}

export default function PricingCards({ currentTier = null, className = "" }: Props) {
  const { isSignedIn } = useUser();
  const [checkoutPlan, setCheckoutPlan] = useState<"pro" | "premium" | null>(null);
  /** Signed-out visitors have no tier until they subscribe — avoid marking Free as "current" for everyone. */
  const resolvedTier: QuantPlanTier | null = currentTier ?? (isSignedIn ? "free" : null);
  const order: QuantPlanTier[] = ["free", "pro", "premium"];

  return (
    <div className={`grid gap-6 lg:grid-cols-3 lg:gap-5 lg:items-stretch ${className}`}>
      {order.map((id) => {
        const plan = QUANT_PLANS[id];
        const isCurrent = resolvedTier !== null && resolvedTier === id;
        const isPro = id === "pro";
        const isPremium = id === "premium";

        return (
          <div
            key={id}
            className={`relative flex flex-col ${glassCard} p-8 transition duration-500 hover:border-white/15 ${
              isPro
                ? "border-cyan-400/30 shadow-[0_44px_110px_-48px_rgba(34,211,238,0.28)] ring-1 ring-cyan-400/18 lg:scale-[1.03] lg:z-[1]"
                : ""
            } ${isPremium ? "ring-1 ring-white/10 shadow-[0_36px_90px_-52px_rgba(99,102,241,0.18)]" : ""}`}
          >
            {isPro && (
              <span className="absolute right-6 top-6 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-950 shadow-[0_0_20px_-4px_rgba(34,211,238,0.45)]">
                Popular
              </span>
            )}
            {isPremium && (
              <span className="absolute left-6 top-6 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-100/95">
                For power buyers
              </span>
            )}
            <h3 className="cockpit-display text-lg tracking-tight text-white/95">{plan.name}</h3>
            <p className="cockpit-body mt-2 text-sm leading-snug text-slate-500">{plan.tagline}</p>
            {isPro && (
              <p className="cockpit-body mt-3 text-[12px] leading-snug text-slate-400">
                The calm upgrade when checkout decisions stack up during the week.
              </p>
            )}
            <p className="mt-9 text-4xl font-semibold tracking-tight text-white/95 tabular-nums">
              {plan.monthlyPriceEur == null ? "—" : `€${plan.monthlyPriceEur}`}
              {plan.monthlyPriceEur != null && (
                <span className="text-base font-medium text-slate-500">/mo</span>
              )}
            </p>
            <ul className="mt-8 flex-1 space-y-2.5 text-[13px] leading-snug text-slate-300">
              {plan.highlights.map((h) => (
                <li key={h} className="flex gap-2.5">
                  <span className="mt-1.5 flex size-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-400/18 text-emerald-300/95">
                    <Check className="size-2.5" strokeWidth={2.5} aria-hidden />
                  </span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-white/[0.06] pt-4 text-[11px] leading-snug text-slate-500">
              <span className="font-medium text-slate-400">Throughput · </span>
              <span className="tabular-nums text-slate-300">
                {plan.searchesPerDay} searches
              </span>
              <span className="text-slate-600"> · </span>
              <span className="tabular-nums text-slate-300">{plan.aiIntelligencePerDay} AI</span>
              <span className="text-slate-600"> · </span>
              <span className="tabular-nums text-slate-300">
                Watch {plan.watchlistMax == null ? "∞" : plan.watchlistMax}
              </span>
              <span className="text-slate-600"> · </span>
              <span className="tabular-nums text-slate-300">
                Saves {plan.savedProductsMax == null ? "∞" : plan.savedProductsMax}
              </span>
              <span className="text-slate-600"> · </span>
              <span className="tabular-nums text-slate-300">Compare {plan.compareMax}</span>
              <span className="text-slate-600"> · </span>
              <span className="capitalize text-slate-300">{plan.globalDealIntelligence} layer</span>
              <span className="text-slate-600"> · </span>
              <span className="text-slate-300">Alerts {plan.premiumAlerts ? "on" : "roadmap"}</span>
            </p>

            <div className="mt-10">
              {id === "free" && (
                <>
                  {isSignedIn && isCurrent ? (
                    <Link
                      href="/dashboard"
                      onClick={() => trackEvent(QuantAnalyticsEvents.PRICING_CTA_DASHBOARD, { plan: "free" })}
                      className="flex w-full items-center justify-center rounded-full border border-white/12 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/[0.06]"
                    >
                      Open dashboard
                    </Link>
                  ) : isSignedIn ? (
                    <span className="flex w-full items-center justify-center rounded-full border border-white/10 py-3 text-sm font-medium text-slate-500">
                      Included with your account
                    </span>
                  ) : (
                    <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                      <button
                        type="button"
                        className="w-full rounded-full border border-white/12 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/[0.06]"
                      >
                        Get started free
                      </button>
                    </SignUpButton>
                  )}
                </>
              )}
              {id === "pro" &&
                (isCurrent ? (
                  <Link
                    href="/billing?plan=pro&focus=manage"
                    onClick={() => trackEvent(QuantAnalyticsEvents.PRICING_CTA_DASHBOARD, { plan: "pro_manage" })}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-cyan-400/35 bg-cyan-500/15 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
                  >
                    Manage Pro
                    <ArrowRight className="size-4 opacity-80" aria-hidden />
                  </Link>
                ) : isSignedIn ? (
                  <MagneticSurface className="inline-flex w-full" strength={0.12}>
                    <button
                      type="button"
                      disabled={checkoutPlan !== null}
                      onClick={() => {
                        trackEvent(QuantAnalyticsEvents.PRICING_CTA_CHECKOUT, { plan: "pro" });
                        setCheckoutPlan("pro");
                        void startCheckout("pro")
                          .catch(() => {
                            window.location.href = "/billing?plan=pro";
                          })
                          .finally(() => setCheckoutPlan(null));
                      }}
                      className="cockpit-cta flex w-full min-h-[3rem] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 py-3 text-sm text-slate-950 shadow-[0_0_32px_-6px_rgba(34,211,238,0.45)] transition enabled:hover:brightness-105 disabled:opacity-70"
                    >
                      {checkoutPlan === "pro" ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          Opening checkout…
                        </>
                      ) : (
                        <>
                          Upgrade to Pro
                          <ArrowRight className="size-4 opacity-80" aria-hidden />
                        </>
                      )}
                    </button>
                  </MagneticSurface>
                ) : (
                  <SignInButton mode="modal" forceRedirectUrl="/pricing">
                    <button
                      type="button"
                      className="cockpit-cta flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 py-3 text-sm text-slate-950 shadow-[0_0_32px_-6px_rgba(34,211,238,0.45)]"
                    >
                      Sign in to upgrade
                      <ArrowRight className="size-4 opacity-80" aria-hidden />
                    </button>
                  </SignInButton>
                ))}
              {id === "premium" &&
                (isCurrent ? (
                  <Link
                    href="/billing?plan=premium&focus=manage"
                    onClick={() =>
                      trackEvent(QuantAnalyticsEvents.PRICING_CTA_DASHBOARD, { plan: "premium_manage" })
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    Manage Power Buyer
                    <ArrowRight className="size-4 opacity-70" aria-hidden />
                  </Link>
                ) : isSignedIn ? (
                  <MagneticSurface className="inline-flex w-full" strength={0.1}>
                    <button
                      type="button"
                      disabled={checkoutPlan !== null}
                      onClick={() => {
                        trackEvent(QuantAnalyticsEvents.PRICING_CTA_CHECKOUT, { plan: "premium" });
                        setCheckoutPlan("premium");
                        void startCheckout("premium")
                          .catch(() => {
                            window.location.href = "/billing?plan=premium";
                          })
                          .finally(() => setCheckoutPlan(null));
                      }}
                      className="cockpit-cta flex w-full min-h-[3rem] items-center justify-center gap-2 rounded-full bg-white py-3 text-sm text-slate-900 transition enabled:hover:bg-slate-100 disabled:opacity-70"
                    >
                      {checkoutPlan === "premium" ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          Opening checkout…
                        </>
                      ) : (
                        <>
                          Go Power Buyer
                          <ArrowRight className="size-4 opacity-70" aria-hidden />
                        </>
                      )}
                    </button>
                  </MagneticSurface>
                ) : (
                  <SignInButton mode="modal" forceRedirectUrl="/pricing">
                    <button
                      type="button"
                      className="cockpit-cta flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm text-slate-900"
                    >
                      Sign in to upgrade
                      <ArrowRight className="size-4 opacity-70" aria-hidden />
                    </button>
                  </SignInButton>
                ))}
            </div>
          </div>
        );
      })}
      {!isSignedIn && (
        <p className="lg:col-span-3 text-center text-xs text-slate-500">
          Already have an account?{" "}
          <SignInButton mode="modal" forceRedirectUrl="/dashboard">
            <button type="button" className="font-medium text-cyan-300 hover:underline">
              Sign in
            </button>
          </SignInButton>
        </p>
      )}
    </div>
  );
}
