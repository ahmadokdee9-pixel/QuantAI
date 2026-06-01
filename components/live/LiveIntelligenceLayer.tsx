"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { QuantProduct } from "@/lib/shoppingScore";
import { buildLiveTerminalSignals } from "@/lib/liveSignals/simulatedTerminalSignals";
import { buildQualitativeMarketRibbon } from "@/lib/liveSignals/qualitativeRibbon";
import type { MarketPulseSnapshot } from "@/lib/intelligence/marketPulseEngine";
import type { UnifiedCardInsight } from "@/lib/intelligence/unifiedMarketMatching";
import { toUnifiedDecision, trayLeadDecision } from "@/lib/ui/decisionLanguage";

type Props = {
  query: string;
  products: QuantProduct[];
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

/** Bloomberg-style live signal rail — single infrastructure strip. */
export default function LiveIntelligenceLayer({
  query,
  products,
  marketPulse = null,
  familyInsight = null,
}: Props) {
  const reduce = useReducedMotion();
  const mounted = useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);
  const [terminalIndex, setTerminalIndex] = useState(0);

  const terminal = useMemo(() => buildLiveTerminalSignals(query, products), [query, products]);
  const ribbon = useMemo(() => buildQualitativeMarketRibbon(products), [products]);

  useEffect(() => {
    if (!mounted || reduce || terminal.length <= 1) return;
    const id = window.setInterval(() => {
      setTerminalIndex((i) => (i + 1) % terminal.length);
    }, 7200);
    return () => window.clearInterval(id);
  }, [mounted, reduce, terminal.length]);

  const active = terminal.length ? terminal[terminalIndex % terminal.length]! : null;

  const leadDecision = trayLeadDecision(products);

  const pulseHeadline = marketPulse
    ? `${String(toUnifiedDecision(marketPulse.trendMomentum))} · ${marketPulse.dailyOpportunityScore}/100`
    : null;

  const familyDetail = familyInsight
    ? `${familyInsight.storeCount} lanes · ${familyInsight.bestTrustedStore || "—"}${familyInsight.bestTrustedPrice > 0 ? ` · €${familyInsight.bestTrustedPrice}` : ""}`
    : null;

  const headline = `${leadDecision} · ${products.length} signals`;
  const detail =
    familyDetail ??
    pulseHeadline ??
    ribbon?.detail ??
    active?.headline ??
    "Intelligence mesh scanning";

  if (!mounted || !products.length) return null;

  return (
    <div className="qa-ref-signal-rail mb-6" aria-label="Live intelligence rail">
      <div className="qa-ref-signal-rail__scan" aria-hidden />
      <div className="qa-ref-signal-rail__live" aria-hidden />
      <span className="qa-ref-signal-rail__tag">LIVE</span>
      <motion.p
        key={`${headline}-${terminalIndex}`}
        className="qa-ref-signal-rail__headline"
        initial={reduce ? false : { opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.28 }}
      >
        {headline}
      </motion.p>
      {detail ? <p className="qa-ref-signal-rail__detail">{detail}</p> : null}
      <span className="qa-ref-signal-rail__count tabular-nums">{products.length}</span>
    </div>
  );
}
