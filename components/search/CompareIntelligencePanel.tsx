"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  GitCompare,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import type { CompareIntelligenceSnapshot, CompareSmartSignal } from "@/lib/intelligence/compareIntelligence";
import { COMPARE_VERDICT_LABEL_DISPLAY } from "@/lib/intelligence/compareIntelligence";
import type { CompareVerdictPayload } from "@/lib/intelligence/compareVerdict";
import { buildCompareTrayInsights } from "@/lib/intelligence/compareTrayInsights";
import { currencySymbolFromListing, formatListingPrice } from "@/lib/commerce/cues";
import { getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";
import type { QuantProduct } from "@/lib/shoppingScore";
import InlineSystemNotice from "@/components/system/InlineSystemNotice";

type Props = {
  compareProducts: QuantProduct[];
  sortedProducts: QuantProduct[];
  leaderRecommendationLabel?: string | null;
  intelligence: CompareIntelligenceSnapshot;
  verdict: CompareVerdictPayload | null;
  verdictLoading: boolean;
  verdictError: string | null;
  verdictSource: string | null;
  onRunVerdict: () => void;
  compareExportFlash: boolean;
  onExportCompare: () => void;
  onClearAll: () => void;
  reduceMotion: boolean;
  mobilePerf: boolean;
};

function signalTone(s: CompareSmartSignal["severity"]): string {
  switch (s) {
    case "risk":
      return "qa-ui-signal qa-ui-signal--risk";
    case "warn":
      return "qa-ui-signal qa-ui-signal--warn";
    default:
      return "qa-ui-signal qa-ui-signal--info";
  }
}

export default function CompareIntelligencePanel({
  compareProducts,
  sortedProducts,
  leaderRecommendationLabel = null,
  intelligence,
  verdict,
  verdictLoading,
  verdictError,
  verdictSource,
  onRunVerdict,
  compareExportFlash,
  onExportCompare,
  onClearAll,
  reduceMotion,
  mobilePerf,
}: Props) {
  const systemReduce = useReducedMotion();
  const reduce = systemReduce ?? reduceMotion;
  const [expanded, setExpanded] = useState(true);
  const transition = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 400, damping: 36 };

  const trayInsightLines = useMemo(
    () =>
      buildCompareTrayInsights(compareProducts, sortedProducts, {
        leaderRecommendationLabel,
      }),
    [compareProducts, sortedProducts, leaderRecommendationLabel]
  );

  const primaryBadge = intelligence.verdictBadges.find((b) => b.id === intelligence.primaryVerdictId);

  return (
    <AnimatePresence>
      <motion.div
        id="quantai-compare-lab"
        initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.82 }}
        className="pointer-events-auto fixed bottom-[max(0.5rem,env(safe-area-inset-bottom,0px))] left-2 right-2 z-40 mx-auto max-w-5xl sm:left-4 sm:right-4 md:left-1/2 md:right-auto md:w-[min(100%,64rem)] md:-translate-x-1/2"
        role="region"
        aria-label="Compare intelligence"
      >
        <div className="qa-ui-compare-terminal qa-ui-terminal">
          <div className="qa-ui-terminal-header relative z-[1] flex min-w-0 items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-xl py-1 text-left transition hover:bg-white/[0.04]"
              aria-expanded={expanded}
            >
              <GitCompare className="size-4 shrink-0 text-violet-300" aria-hidden />
              <div className="min-w-0">
                <p className="cockpit-display truncate text-[13px] text-white/95">
                  Compare · {compareProducts.length}/3
                </p>
                <p className="truncate text-[10px] text-slate-500">
                  Confidence {intelligence.comparisonConfidenceScore}%
                  {primaryBadge ? (
                    <span className="text-slate-600">
                      {" "}
                      · {COMPARE_VERDICT_LABEL_DISPLAY[primaryBadge.id]}
                    </span>
                  ) : null}
                </p>
              </div>
              {expanded ? (
                <ChevronDown className="size-4 shrink-0 text-slate-500" aria-hidden />
              ) : (
                <ChevronUp className="size-4 shrink-0 text-slate-500" aria-hidden />
              )}
            </button>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => void onRunVerdict()}
                disabled={verdictLoading}
                className="qa-ui-btn-primary min-h-10 min-w-[7.5rem] px-3 py-1.5 text-[10px] uppercase tracking-wide disabled:opacity-50"
              >
                {verdictLoading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Reading
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5 opacity-90" aria-hidden />
                    Buying recommendation
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onExportCompare}
                className="qa-ui-btn-ghost min-h-10 px-2.5 py-1.5"
              >
                {compareExportFlash ? "Copied" : "Export"}
              </button>
              <button
                type="button"
                onClick={onClearAll}
                className="rounded-full p-2 text-slate-500 transition hover:bg-white/[0.08] hover:text-white"
                aria-label="Clear compare"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div
            className={`relative z-[1] overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
              expanded ? "max-h-[min(72dvh,28rem)] opacity-100 sm:max-h-[min(70vh,32rem)]" : "max-h-0 opacity-0"
            }`}
            aria-hidden={!expanded}
          >
            <div className="max-h-[min(72dvh,28rem)] overflow-y-auto overscroll-contain qa-scroll-touch sm:max-h-[min(70vh,32rem)]">
              <div className="space-y-3 p-3 sm:p-4">
                {intelligence.verdictBadges.length > 0 && (
                  <div className="flex min-w-0 flex-wrap gap-2">
                    {intelligence.verdictBadges.map((b) => (
                      <span
                        key={b.id}
                        className={`qa-ui-badge inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          b.id === intelligence.primaryVerdictId ? "qa-ui-badge--active" : ""
                        }`}
                      >
                        <span className="truncate">{COMPARE_VERDICT_LABEL_DISPLAY[b.id]}</span>
                        <span className="text-slate-600">·</span>
                        <span className="truncate font-normal text-slate-400">{b.pickTitle}</span>
                      </span>
                    ))}
                  </div>
                )}

                {intelligence.smartSignals.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Signal spread
                    </p>
                    <ul className="space-y-2">
                      {intelligence.smartSignals.map((s) => (
                        <li
                          key={s.id}
                          className={`rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed ${signalTone(s.severity)}`}
                        >
                          <p className="font-semibold text-slate-100/95">{s.title}</p>
                          <p className="cockpit-body mt-1 text-slate-400 [overflow-wrap:anywhere]">{s.body}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {trayInsightLines.length > 0 && (
                  <div className="qa-ui-terminal-inset px-3 py-3 sm:px-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Buying recommendation</p>
                    <ul className="mt-2 space-y-2.5">
                      {trayInsightLines.map((line) => (
                        <li key={line.id} className="min-w-0">
                          <p className="text-[11px] font-semibold text-slate-200/95">{line.title}</p>
                          <p className="cockpit-body mt-0.5 text-[11px] leading-relaxed text-slate-400 [overflow-wrap:anywhere]">
                            {line.body}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {compareProducts.map((p, cIdx) => {
                    const trustRank =
                      sortedProducts.findIndex((row) => row.link === p.link) + 1 || null;
                    const trustScore = getStoreTrustScore(p.store);
                    const sym = currencySymbolFromListing(p);
                    return (
                      <motion.div
                        key={p.link}
                        initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...transition, delay: mobilePerf ? 0 : cIdx * 0.03 }}
                        className="qa-ui-terminal-inset min-w-0 p-3.5 sm:p-4"
                      >
                        <p className="cockpit-body text-[12px] font-semibold leading-snug text-white/[0.95] line-clamp-2">
                          {p.title}
                        </p>
                        <p className="cockpit-body mt-1.5 text-[11px] leading-snug text-slate-500 [overflow-wrap:anywhere]">
                          <span className="text-slate-400">{p.store}</span>
                          <span className="text-slate-600"> · </span>
                          <span className="tabular-nums text-slate-300">Trust {trustScore}</span>
                        </p>
                        <div className="mt-3.5 grid grid-cols-2 gap-2 sm:gap-2.5">
                          <div className="qa-ui-terminal-panel rounded-xl px-2.5 py-2">
                            <p className="cockpit-label text-[9px] text-slate-500">Price</p>
                            <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-200/95">
                              {formatListingPrice(p.price, sym)}
                            </p>
                          </div>
                          <div className="qa-ui-terminal-panel rounded-xl px-2.5 py-2">
                            <p className="cockpit-label text-[9px] text-slate-500">Grid rank</p>
                            <p className="qa-ui-compare-stat-value--accent mt-0.5 text-sm tabular-nums">
                              {trustRank && trustRank > 0 ? `#${trustRank}` : "—"}
                            </p>
                          </div>
                          <div className="qa-ui-terminal-panel rounded-xl px-2.5 py-2">
                            <p className="cockpit-label text-[9px] text-slate-500">Trust</p>
                            <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-200">{trustScore}</p>
                          </div>
                          <div className="qa-ui-terminal-panel rounded-xl px-2.5 py-2">
                            <p className="cockpit-label text-[9px] text-slate-500">Rating</p>
                            <p className="mt-0.5 text-sm font-semibold text-amber-200/90">
                              {ratingValue(p.rating) > 0 ? ratingValue(p.rating).toFixed(1) : "—"}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {verdictError ? <InlineSystemNotice message={verdictError} /> : null}

                <details className="qa-ui-terminal-panel group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-[11px] font-semibold transition sm:px-4 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <BarChart3 className="size-3.5 text-violet-300/90" aria-hidden />
                      Intelligence matrix
                    </span>
                    <ChevronDown className="size-4 text-slate-500 transition group-open:rotate-180" aria-hidden />
                  </summary>
                  <div className="border-t border-white/[0.05] px-3 pb-3 pt-1 sm:px-4">
                    <ul className="max-h-[min(40vh,16rem)] space-y-2.5 overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch]">
                      {intelligence.axisInsights.map((row) => (
                        <li key={row.key} className="qa-ui-terminal-panel rounded-lg px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{row.label}</p>
                          <p className="mt-0.5 text-[11px] font-medium text-slate-200/95">
                            <a
                              href={row.leaderLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="qa-ui-drawer-link"
                            >
                              {row.leaderTitleShort}
                            </a>
                          </p>
                          <p className="cockpit-body mt-1 text-[11px] leading-relaxed text-slate-400 [overflow-wrap:anywhere]">
                            {row.insight}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>

                <details className="qa-ui-terminal-panel group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-[11px] font-semibold transition sm:px-4 [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 items-center gap-2">
                      <Sparkles className="size-3.5 shrink-0 text-violet-200/80" aria-hidden />
                      <span className="truncate">Full comparison</span>
                      {verdictSource ? (
                        <span className="qa-ui-compare-source-badge">
                          {verdictSource}
                        </span>
                      ) : null}
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-slate-500 transition group-open:rotate-180" aria-hidden />
                  </summary>
                  <div className="border-t border-white/[0.06] px-3 pb-4 pt-2 sm:px-4">
                    {!verdict ? (
                      <p className="text-[11px] leading-relaxed text-slate-500">
                        Run AI verdict for a tighter narrative on tradeoffs. Matrix above is instant from tray signals.
                      </p>
                    ) : (
                      <>
                        <p className="cockpit-body text-[13px] leading-relaxed text-slate-100/95">{verdict.verdict}</p>
                        <p className="cockpit-body mt-2 text-[11px] leading-relaxed text-slate-400">
                          Winner:{" "}
                          <a
                            href={verdict.winnerLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="qa-ui-drawer-link font-semibold"
                          >
                            {verdict.winnerTitle}
                          </a>
                          <span className="mx-1 text-slate-600">·</span>
                          Model band · {verdict.confidence}
                          <span className="mx-1 text-slate-600">·</span>
                          Decision confidence {verdict.comparisonConfidenceScore}%
                        </p>
                        <ul className="cockpit-body mt-3 list-disc space-y-1.5 pl-4 text-[12px] leading-relaxed text-slate-400">
                          {verdict.rationale.map((r) => (
                            <li key={r} className="[overflow-wrap:anywhere]">
                              {r}
                            </li>
                          ))}
                        </ul>
                        {verdict.tradeoffAnalysis && verdict.tradeoffAnalysis.length > 0 ? (
                          <div className="mt-4 border-t border-white/[0.06] pt-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                              Tradeoff axes
                            </p>
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-slate-400">
                              {verdict.tradeoffAnalysis.map((t) => (
                                <li key={t} className="[overflow-wrap:anywhere]">
                                  {t}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {verdict.bestForPersonas && verdict.bestForPersonas.length > 0 ? (
                          <div className="mt-3 border-t border-white/[0.06] pt-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Best for</p>
                            <ul className="mt-2 space-y-2 text-[11px] text-slate-400">
                              {verdict.bestForPersonas.map((b) => (
                                <li
                                  key={`${b.persona}-${b.pick}`}
                                  className="qa-ui-terminal-panel rounded-lg px-2.5 py-2"
                                >
                                  <span className="font-semibold text-slate-200">{b.persona.replace(/_/g, " ")}</span>
                                  <span className="text-slate-600"> · </span>
                                  <span className="text-slate-300">{b.pick}</span>
                                  <span className="mt-0.5 block text-slate-500">{b.reason}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {(verdict.shortTermPick || verdict.longTermPick) && (
                          <div className="mt-3 grid gap-2 border-t border-white/[0.06] pt-3 sm:grid-cols-2">
                            {verdict.shortTermPick ? (
                              <div className="qa-ui-terminal-panel rounded-lg px-2.5 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
                                  Short-term
                                </p>
                                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{verdict.shortTermPick}</p>
                              </div>
                            ) : null}
                            {verdict.longTermPick ? (
                              <div className="qa-ui-terminal-panel rounded-lg px-2.5 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/80">
                                  Long-term
                                </p>
                                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{verdict.longTermPick}</p>
                              </div>
                            ) : null}
                          </div>
                        )}
                        {verdict.verificationNote ? (
                          <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-500/5 px-2.5 py-2 text-[11px] leading-relaxed text-amber-100/90">
                            {verdict.verificationNote}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
