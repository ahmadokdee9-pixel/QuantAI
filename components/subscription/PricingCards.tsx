"use client";

import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { QUANT_PLANS, type QuantPlanTier } from "@/lib/subscription/plans";

const glassCard = "cockpit-glass-card";

type Props = {
  /** Current Clerk-backed tier (from subscription API). */
  currentTier?: QuantPlanTier | null;
  className?: string;
};

export default function PricingCards({ currentTier = null, className = "" }: Props) {
  const { isSignedIn } = useUser();
  /** Signed-out visitors have no tier until they subscribe — avoid marking Free as "current" for everyone. */
  const resolvedTier: QuantPlanTier | null = currentTier ?? (isSignedIn ? "free" : null);
  const order: QuantPlanTier[] = ["free", "pro", "premium"];

  return (
    <div className={`grid gap-6 lg:grid-cols-3 lg:gap-5 lg:items-stretch ${className}`}>
      {order.map((id) => {
        const plan = QUANT_PLANS[id];
        const isCurrent = resolvedTier !== null && resolvedTier === id;
        const isPro = id === "pro";

        return (
          <div
            key={id}
            className={`relative flex flex-col ${glassCard} p-8 transition duration-500 hover:border-white/15 ${
              isPro ? "border-cyan-400/25 shadow-[0_40px_100px_-40px_rgba(34,211,238,0.2)] lg:scale-[1.02] lg:z-[1]" : ""
            }`}
          >
            {isPro && (
              <span className="absolute right-6 top-6 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-950">
                Most popular
              </span>
            )}
            <h3 className="text-lg font-semibold text-white/95">{plan.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>
            <p className="mt-8 text-4xl font-semibold tracking-tight text-white/95">
              {plan.monthlyPriceEur == null ? "—" : `€${plan.monthlyPriceEur}`}
              {plan.monthlyPriceEur != null && (
                <span className="text-base font-medium text-slate-500">/mo</span>
              )}
            </p>
            <ul className="mt-8 flex-1 space-y-2.5 text-sm text-slate-300">
              {plan.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                    <Check className="size-2.5" strokeWidth={2.5} aria-hidden />
                  </span>
                  {h}
                </li>
              ))}
              <li className="flex gap-2 text-slate-400">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-500">
                  <Check className="size-2.5" strokeWidth={2} aria-hidden />
                </span>
                <span>
                  Searches · <span className="tabular-nums text-slate-200">{plan.searchesPerDay}</span>
                  /day
                </span>
              </li>
              <li className="flex gap-2 text-slate-400">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-500">
                  <Check className="size-2.5" strokeWidth={2} aria-hidden />
                </span>
                <span>
                  AI intelligence ·{" "}
                  <span className="tabular-nums text-slate-200">{plan.aiIntelligencePerDay}</span>/day
                </span>
              </li>
              <li className="flex gap-2 text-slate-400">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-500">
                  <Check className="size-2.5" strokeWidth={2} aria-hidden />
                </span>
                Watchlist ·{" "}
                {plan.watchlistMax == null ? (
                  <span className="text-slate-200">Unlimited</span>
                ) : (
                  <span className="tabular-nums text-slate-200">Up to {plan.watchlistMax}</span>
                )}
              </li>
              <li className="flex gap-2 text-slate-400">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-500">
                  <Check className="size-2.5" strokeWidth={2} aria-hidden />
                </span>
                Saved ·{" "}
                {plan.savedProductsMax == null ? (
                  <span className="text-slate-200">Unlimited</span>
                ) : (
                  <span className="tabular-nums text-slate-200">Up to {plan.savedProductsMax}</span>
                )}
              </li>
              <li className="flex gap-2 text-slate-400">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-500">
                  <Check className="size-2.5" strokeWidth={2} aria-hidden />
                </span>
                Compare · <span className="tabular-nums text-slate-200">{plan.compareMax}</span> listings
              </li>
              <li className="flex gap-2 text-slate-400">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-500">
                  <Check className="size-2.5" strokeWidth={2} aria-hidden />
                </span>
                Global intelligence ·{" "}
                <span className="capitalize text-slate-200">{plan.globalDealIntelligence}</span>
              </li>
              <li className="flex gap-2 text-slate-400">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-500">
                  <Check className="size-2.5" strokeWidth={2} aria-hidden />
                </span>
                Premium alerts · {plan.premiumAlerts ? "Yes" : "Roadmap"}
              </li>
            </ul>

            <div className="mt-8">
              {id === "free" && (
                <>
                  {isSignedIn && isCurrent ? (
                    <Link
                      href="/dashboard"
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
              {id === "pro" && (
                <Link
                  href={`/billing?plan=pro${isCurrent ? "&focus=manage" : ""}`}
                  className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition ${
                    isCurrent
                      ? "border border-cyan-400/35 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
                      : "bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 text-slate-950 shadow-[0_0_32px_-6px_rgba(34,211,238,0.45)] hover:brightness-105"
                  }`}
                >
                  {isCurrent ? "Manage Pro" : "Upgrade to Pro"}
                  <ArrowRight className="size-4 opacity-80" aria-hidden />
                </Link>
              )}
              {id === "premium" && (
                <Link
                  href={`/billing?plan=premium${isCurrent ? "&focus=manage" : ""}`}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  {isCurrent ? "Manage Power Buyer" : "Go Power Buyer"}
                  <ArrowRight className="size-4 opacity-70" aria-hidden />
                </Link>
              )}
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
