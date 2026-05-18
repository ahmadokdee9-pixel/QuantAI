"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, ChevronDown, Radio } from "lucide-react";
import type { QuantProduct } from "@/lib/shoppingScore";
import { buildLiveTerminalSignals } from "@/lib/liveSignals/simulatedTerminalSignals";
import { buildQualitativeMarketRibbon } from "@/lib/liveSignals/qualitativeRibbon";
import type { MarketPulseSnapshot } from "@/lib/intelligence/marketPulseEngine";
import type { UnifiedCardInsight } from "@/lib/intelligence/unifiedMarketMatching";

type Props = {
  query: string;
  products: QuantProduct[];
  /** Touch / narrow: start collapsed so heavy cards are opt-in. */
  defaultCollapsed?: boolean;
  marketPulse?: MarketPulseSnapshot | null;
  familyInsight?: UnifiedCardInsight | null;
};

function subscribeNoop() {
  return () => {};
}
function getClientSnapshot() {
  return true;
}
function getServerSnapshot() {
  return false;
}

export default function LiveIntelligenceLayer({
  query,
  products,
  defaultCollapsed = false,
  marketPulse = null,
  familyInsight = null,
}: Props) {
  const reduce = useReducedMotion();
  const mounted = useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);
  const [expanded, setExpanded] = useState(!defaultCollapsed);
  const [terminalIndex, setTerminalIndex] = useState(0);
  const terminal = useMemo(() => buildLiveTerminalSignals(query, products), [query, products]);
  const ribbon = useMemo(() => buildQualitativeMarketRibbon(products), [products]);

  useEffect(() => {
    if (!mounted || reduce || !expanded || terminal.length <= 1) return;
    const id = window.setInterval(() => {
      setTerminalIndex((i) => (i + 1) % terminal.length);
    }, 7200);
    return () => window.clearInterval(id);
  }, [mounted, reduce, terminal.length, expanded]);

  const active = terminal.length ? terminal[terminalIndex % terminal.length]! : null;
  const pulseHeadline = marketPulse
    ? `Market pulse ${marketPulse.trendMomentum} · opportunity ${marketPulse.dailyOpportunityScore}/100`
    : null;
  const familyDetail = familyInsight
    ? `${familyInsight.storeCount} stores found for same product family · Cheapest trusted: ${
        familyInsight.bestTrustedStore || "n/a"
      } ${familyInsight.bestTrustedPrice > 0 ? familyInsight.bestTrustedPrice : ""} · Market spread: ${familyInsight.marketSpreadPct}%${
        familyInsight.suspiciousOutlierCount > 0 ? ` · ${familyInsight.suspiciousOutlierCount} suspicious outlier${familyInsight.suspiciousOutlierCount > 1 ? "s" : ""}` : ""
      }`
    : null;

  if (!mounted || !products.length) return null;

  if (!expanded) {
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-black/35 px-3 py-2.5 text-left backdrop-blur-md transition hover:border-cyan-400/25 hover:bg-white/[0.04]"
          aria-expanded={false}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Radio className="size-4 shrink-0 text-cyan-300/80" strokeWidth={1.5} aria-hidden />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Live console</p>
              <p className="truncate text-[12px] font-medium text-white/88">
                {pulseHeadline ?? active?.headline ?? "Tray signals"} · tap to expand
              </p>
            </div>
          </div>
          <ChevronDown className="size-4 shrink-0 text-slate-500" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-8 space-y-3" aria-label="Live intelligence layer">
      <div className="flex justify-end">
        {defaultCollapsed ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 transition hover:text-slate-300"
          >
            Collapse console
          </button>
        ) : null}
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-black/50 via-[#071018]/90 to-black/50 p-3 sm:p-4 backdrop-blur-md">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-cyan-400/0 via-cyan-400/35 to-cyan-400/0 motion-safe:max-md:hidden motion-safe:animate-pulse"
          aria-hidden
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200/90">
              <Radio className="size-4" strokeWidth={1.5} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Live terminal</p>
              {active ? (
                <motion.div
                  key={`${active.id}-${terminalIndex}`}
                  initial={reduce ? false : { opacity: 0.35, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduce ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-1 space-y-1"
                >
                  <p
                    className={`text-sm font-semibold leading-snug ${
                      active.tone === "positive"
                        ? "text-emerald-100/95"
                        : active.tone === "watch"
                          ? "text-amber-100/90"
                          : "text-white/92"
                    }`}
                  >
                    {familyInsight ? `${familyInsight.storeCount} stores found for same product family` : pulseHeadline ?? active.headline}
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    {familyDetail ?? marketPulse?.marketPulseReason ?? active.detail}
                  </p>
                </motion.div>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2 text-[10px] text-slate-500">
            <Activity className="size-3.5 text-cyan-400/70" strokeWidth={1.5} aria-hidden />
            <span className="tabular-nums">Tray scan · {products.length} rows</span>
          </div>
        </div>
      </div>

      {ribbon ? (
        <div className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className="text-[11px] font-semibold text-slate-300">{ribbon.label}</p>
          <p className="text-[11px] leading-relaxed text-slate-500 sm:max-w-[70%] sm:text-right">{ribbon.detail}</p>
        </div>
      ) : null}
</div>
  );
}
