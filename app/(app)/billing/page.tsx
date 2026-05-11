"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CreditCard, ExternalLink } from "lucide-react";
import { QUANT_PLANS, type QuantPlanTier } from "@/lib/subscription/plans";

type SubPayload = {
  tier?: string;
  billing?: { status?: string; message?: string; manageUrl?: string | null };
};

function BillingInner() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const focus = searchParams.get("focus");

  const [data, setData] = useState<SubPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/billing/subscription", { credentials: "same-origin" });
        const json = (await res.json()) as SubPayload;
        if (!cancelled) {
          if (!res.ok) setErr("Could not load subscription.");
          else setData(json);
        }
      } catch {
        if (!cancelled) setErr("Could not load subscription.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const highlighted = useMemo(() => {
    const p = planParam?.toLowerCase();
    if (p === "pro" || p === "premium") return p as QuantPlanTier;
    return null;
  }, [planParam]);

  const tier = (data?.tier as QuantPlanTier) ?? "free";

  return (
    <div className="space-y-8">
      <section className="cockpit-glass-panel p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
              Billing &amp; subscription
            </p>
            <h1 className="cockpit-display mt-2 text-2xl text-white sm:text-3xl">Stripe-ready preview</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
              Your plan is stored in Clerk <code className="text-cyan-200/90">publicMetadata.subscriptionTier</code>{" "}
              (values: <span className="text-slate-300">free</span>, <span className="text-slate-300">pro</span>,{" "}
              <span className="text-slate-300">premium</span>). Wire Stripe webhooks to update that field and this
              page becomes your customer portal shell.
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/[0.1]"
          >
            Compare plans
            <ExternalLink className="size-3.5 opacity-70" aria-hidden />
          </Link>
        </div>

        {err && (
          <p className="mt-4 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {err}
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.08] bg-black/30 p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Current tier</p>
            <p className="mt-2 text-2xl font-semibold capitalize text-white">{tier}</p>
            {focus === "manage" && (
              <p className="mt-2 text-xs text-slate-500">
                Manage flows will open Stripe Customer Portal when configured.
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-black/30 p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Checkout intent</p>
            <p className="mt-2 text-sm text-slate-300">
              {highlighted
                ? `You opened billing with interest in ${QUANT_PLANS[highlighted].name}.`
                : "Pick a plan on the pricing page to see upgrade paths here."}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-2.5 text-sm font-semibold text-slate-950 opacity-60"
            title="Connect Stripe to enable"
          >
            <CreditCard className="size-4" aria-hidden />
            Start checkout (Stripe)
          </button>
          <button
            type="button"
            disabled
            className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-medium text-slate-400"
            title="Connect Stripe Customer Portal"
          >
            Open customer portal
          </button>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Environment: set <code className="text-slate-400">STRIPE_SECRET_KEY</code>, price IDs, and webhook secret.
          Do not remove Clerk—metadata is the bridge until hosted checkout ships.
        </p>
      </section>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="cockpit-glass-panel p-8 text-center text-sm text-slate-400">Loading billing…</div>
      }
    >
      <BillingInner />
    </Suspense>
  );
}
