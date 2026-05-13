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
import { getFinalComposite, getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";
import type { QuantProduct } from "@/lib/shoppingScore";

type Props = {
  compareProducts: QuantProduct[];
  sortedProducts: QuantProduct[];
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
      return "border-rose-400/28 bg-rose-500/[0.07]";
    case "warn":
      return "border-amber-400/25 bg-amber-500/[0.06]";
    default:
      return "border-cyan-400/18 bg-cyan-500/[0.05]";
  }
}

export default function CompareIntelligencePanel({
  compareProducts,
  sortedProducts,
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
    () => buildCompareTrayInsights(compareProducts, sortedProducts),
    [compareProducts, sortedProducts]
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
        <div className="relative overflow-hidden rounded-[1.35rem] border border-cyan-400/18 bg-gradient-to-b from-[#0a1224]/98 via-[#050a14]/98 to-[#030712]/99 shadow-[0_0_48px_-20px_rgba(34,211,238,0.28),0_28px_80px_-40px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-[28px] transition-[box-shadow] duration-500 ease-out hover:shadow-[0_0_56px_-18px_rgba(34,211,238,0.22),0_32px_90px_-42px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(255,255,255,0.07)]">
          <div className="pointer-events-none absolute -left-24 top-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-36 w-36 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative z-[1] flex min-w-0 items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5 sm:px-4">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-xl py-1 text-left transition hover:bg-white/[0.04]"
              aria-expanded={expanded}
            >
              <GitCompare className="size-4 shrink-0 text-cyan-300" aria-hidden />
              <div className="min-w-0">
                <p className="cockpit-display truncate text-[13px] text-white/95">
                  Compare Intelligence · {compareProducts.length}/3
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
                className="inline-flex min-h-10 min-w-[7.5rem] items-center justify-center gap-1.5 rounded-full border border-cyan-400/32 bg-cyan-500/[0.14] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-50/95 shadow-[0_0_20px_-10px_rgba(34,211,238,0.35)] transition hover:bg-cyan-500/20 hover:shadow-[0_0_26px_-10px_rgba(34,211,238,0.28)] disabled:opacity-50"
              >
                {verdictLoading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Analyst
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5 text-cyan-200/90" aria-hidden />
                    AI verdict
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onExportCompare}
                className="min-h-10 rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-semibold text-slate-200 transition hover:bg-white/[0.11]"
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
                        className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                          b.id === intelligence.primaryVerdictId
                            ? "border-cyan-400/35 bg-cyan-500/[0.14] text-cyan-50/95"
                            : "border-white/[0.1] bg-black/30 text-slate-300/90"
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
                      Difference scan
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
                  <div className="rounded-2xl border border-white/[0.07] bg-black/35 px-3 py-3 sm:px-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Quick scan</p>
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
                    const qi = getFinalComposite(p, sortedProducts);
                    const trustScore = getStoreTrustScore(p.store);
                    const sym = currencySymbolFromListing(p);
                    return (
                      <motion.div
                        key={p.link}
                        initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...transition, delay: mobilePerf ? 0 : cIdx * 0.03 }}
                        className="min-w-0 rounded-2xl border border-white/[0.09] bg-gradient-to-b from-white/[0.07] to-black/45 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-4"
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
                          <div className="rounded-xl border border-white/[0.07] bg-black/35 px-2.5 py-2">
                            <p className="cockpit-label text-[9px] text-slate-500">Price</p>
                            <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-200/95">
                              {formatListingPrice(p.price, sym)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/[0.07] bg-black/35 px-2.5 py-2">
                            <p className="cockpit-label text-[9px] text-slate-500">QI</p>
                            <p className="mt-0.5 text-sm font-semibold tabular-nums text-cyan-100">{qi}</p>
                          </div>
                          <div className="rounded-xl border border-white/[0.07] bg-black/35 px-2.5 py-2">
                            <p className="cockpit-label text-[9px] text-slate-500">Trust</p>
                            <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-200">{trustScore}</p>
                          </div>
                          <div className="rounded-xl border border-white/[0.07] bg-black/35 px-2.5 py-2">
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

                {verdictError ? (
                  <p className="text-xs text-rose-200/90" role="alert">
                    {verdictError}
                  </p>
                ) : null}

                <details className="group rounded-2xl border border-white/[0.07] bg-black/25 open:border-cyan-400/20">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-[11px] font-semibold text-slate-200 transition hover:bg-white/[0.03] sm:px-4 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <BarChart3 className="size-3.5 text-cyan-300/80" aria-hidden />
                      Intelligence matrix
                    </span>
                    <ChevronDown className="size-4 text-slate-500 transition group-open:rotate-180" aria-hidden />
                  </summary>
                  <div className="border-t border-white/[0.05] px-3 pb-3 pt-1 sm:px-4">
                    <ul className="max-h-[min(40vh,16rem)] space-y-2.5 overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch]">
                      {intelligence.axisInsights.map((row) => (
                        <li key={row.key} className="rounded-lg border border-white/[0.05] bg-black/20 px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{row.label}</p>
                          <p className="mt-0.5 text-[11px] font-medium text-slate-200/95">
                            <a
                              href={row.leaderLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-200/90 underline-offset-2 hover:underline"
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

                <details className="group rounded-2xl border border-violet-400/22 bg-gradient-to-b from-violet-500/[0.06] to-black/20 open:border-violet-400/35">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-[11px] font-semibold text-violet-100/95 transition hover:bg-white/[0.03] sm:px-4 [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 items-center gap-2">
                      <Sparkles className="size-3.5 shrink-0 text-violet-200/80" aria-hidden />
                      <span className="truncate">Analyst report</span>
                      {verdictSource ? (
                        <span className="shrink-0 rounded-full border border-white/10 bg-black/35 px-2 py-0.5 text-[9px] uppercase tracking-wide text-slate-400">
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
                            className="font-semibold text-cyan-200 underline-offset-2 hover:underline"
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
                                  className="rounded-lg border border-white/[0.06] bg-black/25 px-2.5 py-2"
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
                              <div className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
                                  Short-term
                                </p>
                                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{verdict.shortTermPick}</p>
                              </div>
                            ) : null}
                            {verdict.longTermPick ? (
                              <div className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2">
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
