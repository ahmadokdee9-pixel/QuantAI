"use client";

import { useState, type CSSProperties } from "react";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, Loader2, Lock } from "lucide-react";
import {
  PLAN_ACCESS_PRESENTATION,
  QUANT_PLANS,
  type QuantPlanTier,
} from "@/lib/subscription/plans";
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

const LAYER_ORDER: QuantPlanTier[] = ["free", "pro", "premium"];

export default function PricingCards({ currentTier = null, className = "" }: Props) {
  const { isSignedIn } = useUser();
  const [checkoutPlan, setCheckoutPlan] = useState<"pro" | "premium" | null>(null);
  const resolvedTier: QuantPlanTier | null = currentTier ?? (isSignedIn ? "free" : null);

  return (
    <div className={`qi-access-architecture ${className}`}>
      {LAYER_ORDER.map((id, index) => {
        const plan = QUANT_PLANS[id];
        const access = PLAN_ACCESS_PRESENTATION[id];
        const isCurrent = resolvedTier !== null && resolvedTier === id;
        const isIntelligence = id === "pro";
        const isPrivate = id === "premium";

        return (
          <article
            key={id}
            className={`qi-access-layer qi-access-layer--${id} ${
              isIntelligence ? "qi-access-layer--featured" : ""
            } ${isCurrent ? "qi-access-layer--active" : ""}`}
            style={{ "--qi-access-index": index } as CSSProperties}
          >
            <div className="qi-access-layer-glow" aria-hidden />
            <div className="qi-access-layer-rim" aria-hidden />

            <div className="qi-access-layer-inner">
              <header className="qi-access-header">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="qi-access-layer-num">Layer {access.layerLabel}</p>
                    <h3 className="qi-access-name mt-2">{access.accessName}</h3>
                    <p className="qi-access-clearance mt-2">{access.clearance}</p>
                  </div>
                  {isIntelligence ? (
                    <span className="qi-access-badge">Priority clearance</span>
                  ) : isPrivate ? (
                    <Lock className="size-4 shrink-0 text-slate-500/70" strokeWidth={1.5} aria-hidden />
                  ) : null}
                </div>
                <p className="qi-access-invitation mt-5">{access.invitation}</p>
              </header>

              <ul className="qi-access-capabilities">
                {plan.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>

              <footer className="qi-access-footer">
                <div className="qi-access-price-block">
                  <p className="qi-access-price-label">Clearance</p>
                  <p className="qi-access-price">
                    {plan.monthlyPriceEur == null ? "—" : `€${plan.monthlyPriceEur}`}
                    {plan.monthlyPriceEur != null && (
                      <span className="qi-access-price-unit"> / month</span>
                    )}
                  </p>
                  <p className="qi-access-footnote">
                    {plan.searchesPerDay} field reads · {plan.globalDealIntelligence} synthesis
                  </p>
                </div>

                <div className="qi-access-cta-wrap">
                  {id === "free" &&
                    (isSignedIn && isCurrent ? (
                      <Link
                        href="/dashboard"
                        onClick={() =>
                          trackEvent(QuantAnalyticsEvents.PRICING_CTA_DASHBOARD, { plan: "free" })
                        }
                        className="qi-access-cta qi-access-cta--ghost flex w-full items-center justify-center gap-2 py-3.5"
                      >
                        Active workspace
                        <ArrowRight className="size-4 opacity-50" aria-hidden />
                      </Link>
                    ) : isSignedIn ? (
                      <span className="flex w-full items-center justify-center py-3.5 text-sm text-slate-600">
                        Current access
                      </span>
                    ) : (
                      <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                        <button type="button" className="qi-access-cta qi-access-cta--ghost w-full py-3.5">
                          Enter access layer
                        </button>
                      </SignUpButton>
                    ))}
                  {id === "pro" &&
                    (isCurrent ? (
                      <Link
                        href="/billing?plan=pro&focus=manage"
                        className="qi-access-cta flex w-full items-center justify-center gap-2 py-3.5"
                      >
                        Manage clearance
                        <ArrowRight className="size-4 opacity-50" aria-hidden />
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
                        className="qi-access-cta flex w-full items-center justify-center gap-2 py-3.5 disabled:opacity-60"
                      >
                        {checkoutPlan === "pro" ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <>
                            Request intelligence clearance
                            <ArrowRight className="size-4 opacity-50" aria-hidden />
                          </>
                        )}
                      </button>
                    ) : (
                      <SignInButton mode="modal" forceRedirectUrl="/pricing">
                        <button type="button" className="qi-access-cta w-full py-3.5">
                          Sign in to request
                        </button>
                      </SignInButton>
                    ))}
                  {id === "premium" &&
                    (isCurrent ? (
                      <Link
                        href="/billing?plan=premium&focus=manage"
                        className="qi-access-cta qi-access-cta--private flex w-full items-center justify-center gap-2 py-3.5"
                      >
                        Manage private clearance
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
                        className="qi-access-cta qi-access-cta--private flex w-full items-center justify-center gap-2 py-3.5 disabled:opacity-60"
                      >
                        {checkoutPlan === "premium" ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : (
                          "Request private clearance"
                        )}
                      </button>
                    ) : (
                      <SignInButton mode="modal" forceRedirectUrl="/pricing">
                        <button
                          type="button"
                          className="qi-access-cta qi-access-cta--private w-full py-3.5"
                        >
                          Sign in to request
                        </button>
                      </SignInButton>
                    ))}
                </div>
              </footer>
            </div>
          </article>
        );
      })}

      {!isSignedIn && (
        <p className="qi-access-disclaimer">
          Existing clearance?{" "}
          <SignInButton mode="modal" forceRedirectUrl="/dashboard">
            <button
              type="button"
              className="text-slate-400 underline-offset-4 hover:text-slate-300 hover:underline"
            >
              Authenticate
            </button>
          </SignInButton>
        </p>
      )}
    </div>
  );
}
