"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";
import TrustRibbon from "@/components/trust/TrustRibbon";
import { apiErrorText, isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";
import { QUANT_PLANS, type QuantPlanTier } from "@/lib/subscription/plans";

type SubPayload = {
  tier?: string;
  billing?: { status?: string; message?: string; manageUrl?: string | null };
};

function BillingInner() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const focus = searchParams.get("focus");
  const checkout = searchParams.get("checkout");

  const [data, setData] = useState<SubPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/billing/subscription", { credentials: "same-origin" });
        const parsed = await readApiJson<SubPayload>(res);
        if (!cancelled) {
          if (!res.ok || isApiFailure(parsed) || !parsed.data) {
            setErr(apiErrorText(parsed, "Could not load subscription."));
          } else {
            setData(parsed.data);
            setErr(null);
          }
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
            <h1 className="cockpit-display mt-2 text-2xl text-white sm:text-3xl">Billing constellation</h1>
            <p className="cockpit-body mt-3 max-w-2xl text-sm text-slate-400">
              Live tier reads from Clerk{" "}
              <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-cyan-200/90">publicMetadata.subscriptionTier</code>{" "}
              (<span className="text-slate-300">free</span>, <span className="text-slate-300">pro</span>,{" "}
              <span className="text-slate-300">premium</span>). Stripe Checkout and Customer Portal routes are wired—add
              keys to go live.
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

        {checkout === "success" && (
          <p className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Checkout completed in Stripe. Finalize webhooks to sync tier into Clerk—until then, set metadata manually to
            test premium surfaces.
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
            disabled={checkoutBusy}
            onClick={() => {
              const plan = highlighted ?? "pro";
              setCheckoutBusy(true);
              void (async () => {
                try {
                  const res = await fetch("/api/stripe/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify({ plan }),
                  });
                  const parsed = await readApiJson<{ url?: string; redirectUrl?: string }>(res);
                  const json = parsed.data;
                  if (json?.url) window.location.href = json.url;
                  else if (json?.redirectUrl) window.location.href = json.redirectUrl;
                  else if (!res.ok || isApiFailure(parsed)) {
                    setErr(apiErrorText(parsed, "Checkout could not start."));
                  }
                } finally {
                  setCheckoutBusy(false);
                }
              })();
            }}
            className="cockpit-cta inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-2.5 text-sm text-slate-950 transition hover:brightness-105 disabled:opacity-60"
          >
            {checkoutBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CreditCard className="size-4" aria-hidden />}
            {highlighted ? `Checkout · ${QUANT_PLANS[highlighted].name}` : "Start Stripe checkout"}
          </button>
          <button
            type="button"
            disabled={portalBusy}
            onClick={() => {
              setPortalBusy(true);
              void (async () => {
                try {
                  const res = await fetch("/api/stripe/portal", {
                    method: "POST",
                    credentials: "same-origin",
                  });
                  const parsed = await readApiJson<{ url?: string; redirectUrl?: string }>(res);
                  const json = parsed.data;
                  if (json?.url) window.location.href = json.url;
                  else if (json?.redirectUrl) window.location.href = json.redirectUrl;
                  else if (!res.ok || isApiFailure(parsed)) {
                    setErr(apiErrorText(parsed, "Customer portal could not open."));
                  }
                } finally {
                  setPortalBusy(false);
                }
              })();
            }}
            className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06] disabled:opacity-50"
          >
            {portalBusy ? "Opening…" : "Customer portal"}
          </button>
          <Link
            href="/pricing"
            className="inline-flex items-center rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-400 transition hover:text-white"
          >
            All plans
          </Link>
        </div>
        <p className="cockpit-body mt-4 text-xs text-slate-500">
          Required env: <code className="text-slate-400">STRIPE_SECRET_KEY</code>,{" "}
          <code className="text-slate-400">STRIPE_PRICE_ID_PRO</code>,{" "}
          <code className="text-slate-400">STRIPE_PRICE_ID_PREMIUM</code>, optional{" "}
          <code className="text-slate-400">STRIPE_WEBHOOK_SECRET</code>,{" "}
          <code className="text-slate-400">NEXT_PUBLIC_APP_URL</code>. Portal needs a stored Stripe customer id per user.
        </p>
        <div className="mt-8">
          <TrustRibbon />
        </div>
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
