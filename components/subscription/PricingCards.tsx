"use client";

import { useState } from "react";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { QUANT_PLANS, type QuantPlanTier } from "@/lib/subscription/plans";
import { QuantAnalyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";
import { apiErrorText, isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";

type Props = {
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
  const resolvedTier: QuantPlanTier | null = currentTier ?? (isSignedIn ? "free" : null);
  const order: QuantPlanTier[] = ["free", "pro", "premium"];

  return (
    <div className={`qi-membership-grid ${className}`}>
      {order.map((id) => {
        const plan = QUANT_PLANS[id];
        const isCurrent = resolvedTier !== null && resolvedTier === id;
        const isPro = id === "pro";

        return (
          <article
            key={id}
            className={`qi-membership-surface relative flex flex-col p-8 sm:p-9 ${
              isPro ? "qi-membership-surface--emphasis" : ""
            }`}
          >
            {isPro ? (
              <span className="qi-membership-ribbon">Recommended</span>
            ) : null}

            <p className="qi-silent-overline">{id === "premium" ? "Private tier" : "Access"}</p>
            <h3 className="qi-editorial-display mt-3 text-2xl text-white/[0.96]">{plan.name}</h3>
            <p className="qi-silent-whisper mt-3 max-w-[18rem]">{plan.tagline}</p>

            <p className="mt-10 text-[2.5rem] font-semibold tabular-nums tracking-[-0.04em] text-white/98">
              {plan.monthlyPriceEur == null ? "—" : `€${plan.monthlyPriceEur}`}
              {plan.monthlyPriceEur != null && (
                <span className="ml-1 text-sm font-normal text-slate-500">/ month</span>
              )}
            </p>

            <ul className="mt-8 flex-1 space-y-3 border-t border-white/[0.06] pt-8">
              {plan.highlights.map((h) => (
                <li key={h} className="qi-silent-whisper text-[13px] text-slate-400/90">
                  {h}
                </li>
              ))}
            </ul>

            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-slate-500/85">
              <div>
                <dt>Searches</dt>
                <dd className="mt-0.5 font-medium tabular-nums text-slate-300/90">{plan.searchesPerDay}/day</dd>
              </div>
              <div>
                <dt>Depth</dt>
                <dd className="mt-0.5 font-medium capitalize text-slate-300/90">
                  {plan.globalDealIntelligence}
                </dd>
              </div>
            </dl>

            <div className="mt-10">
              {id === "free" &&
                (isSignedIn && isCurrent ? (
                  <Link
                    href="/dashboard"
                    onClick={() => trackEvent(QuantAnalyticsEvents.PRICING_CTA_DASHBOARD, { plan: "free" })}
                    className="qi-membership-cta qi-membership-cta--ghost flex w-full items-center justify-center py-3"
                  >
                    Open workspace
                  </Link>
                ) : isSignedIn ? (
                  <span className="flex w-full items-center justify-center py-3 text-sm text-slate-600">
                    Included
                  </span>
                ) : (
                  <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                    <button type="button" className="qi-membership-cta qi-membership-cta--ghost w-full py-3">
                      Begin
                    </button>
                  </SignUpButton>
                ))}
              {id === "pro" &&
                (isCurrent ? (
                  <Link
                    href="/billing?plan=pro&focus=manage"
                    className="qi-membership-cta flex w-full items-center justify-center gap-2 py-3"
                  >
                    Manage
                    <ArrowRight className="size-4 opacity-60" aria-hidden />
                  </Link>
                ) : isSignedIn ? (
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
                    className="qi-membership-cta flex w-full items-center justify-center gap-2 py-3 disabled:opacity-60"
                  >
                    {checkoutPlan === "pro" ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <>
                        Request Pro
                        <ArrowRight className="size-4 opacity-60" aria-hidden />
                      </>
                    )}
                  </button>
                ) : (
                  <SignInButton mode="modal" forceRedirectUrl="/pricing">
                    <button type="button" className="qi-membership-cta w-full py-3">
                      Sign in
                    </button>
                  </SignInButton>
                ))}
              {id === "premium" &&
                (isCurrent ? (
                  <Link
                    href="/billing?plan=premium&focus=manage"
                    className="qi-membership-cta qi-membership-cta--ghost flex w-full items-center justify-center gap-2 py-3"
                  >
                    Manage
                  </Link>
                ) : isSignedIn ? (
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
                    className="qi-membership-cta qi-membership-cta--ghost flex w-full items-center justify-center gap-2 py-3 disabled:opacity-60"
                  >
                    {checkoutPlan === "premium" ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      "Request Power Buyer"
                    )}
                  </button>
                ) : (
                  <SignInButton mode="modal" forceRedirectUrl="/pricing">
                    <button type="button" className="qi-membership-cta qi-membership-cta--ghost w-full py-3">
                      Sign in
                    </button>
                  </SignInButton>
                ))}
            </div>
          </article>
        );
      })}
      {!isSignedIn && (
        <p className="qi-silent-whisper text-center lg:col-span-3">
          Have access?{" "}
          <SignInButton mode="modal" forceRedirectUrl="/dashboard">
            <button type="button" className="text-slate-400 underline-offset-4 hover:text-slate-300 hover:underline">
              Sign in
            </button>
          </SignInButton>
        </p>
      )}
    </div>
  );
}
