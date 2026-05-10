"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ExternalLink,
  Gauge,
  Minus,
  Scale,
  Shield,
  Sparkles,
  Star,
  Store,
  Truck,
  X,
} from "lucide-react";
import { calculateAIScore } from "@/app/api/search/lib/aiScoring";
import { buildNarrativeConfidence } from "@/lib/intelligence/narrativeEngine";
import {
  betterAlternativesInsight,
  decisionBand,
  deliveryAnalysisParagraph,
  listAveragePrice,
  maxTrustInList,
  pickSimilarAlternatives,
  priceTrendInsightParagraph,
  quantVerdictLead,
  ratingAnalysisParagraph,
  recommendedBuyerProfile,
  trustAnalysisParagraph,
  valueAnalysisParagraph,
} from "@/lib/intelligence/drawerInsights";
import { computeListStats } from "@/lib/intelligence/scoringEngine";
import {
  getFinalComposite,
  getHeuristicScore,
  getProsAndCons,
  getStoreTrustScore,
  getWhyQuantAIRecommends,
  type QuantProduct,
} from "@/lib/shoppingScore";
import { getTrustTierLabel } from "@/lib/retailTrust";

type Props = {
  product: QuantProduct | null;
  list: QuantProduct[];
  open: boolean;
  onClose: () => void;
};

function BandPill({
  active,
  label,
  sub,
}: {
  active: boolean;
  label: string;
  sub: string;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-center transition ${
        active
          ? "border-cyan-400/45 bg-gradient-to-br from-cyan-400/20 to-violet-500/15 shadow-[0_0_28px_-10px_rgba(34,211,238,0.45)]"
          : "border-white/[0.08] bg-white/[0.03]"
      }`}
    >
      <p className={`text-xs font-bold uppercase tracking-[0.14em] ${active ? "text-cyan-100" : "text-slate-500"}`}>
        {label}
      </p>
      <p className="mt-1 text-[11px] font-normal leading-snug text-slate-400">{sub}</p>
    </div>
  );
}

function SignalBar({ value }: { value: number }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-400/90 to-violet-500/85"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

function GlassBlock({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-black/40 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-cyan-200/90">
          {icon}
        </span>
        <h3 className="text-[13px] font-semibold tracking-tight text-white/95">{title}</h3>
      </div>
      <div className="space-y-2 text-[13px] font-normal leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function ProductIntelligenceDrawer({ product: p, list, open, onClose }: Props) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [panelEdge, setPanelEdge] = useState<"bottom" | "right">("bottom");

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () => setPanelEdge(mq.matches ? "right" : "bottom");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || typeof document === "undefined") return null;

  const slideInitial =
    reduceMotion || !p
      ? false
      : panelEdge === "bottom"
        ? { y: "100%", opacity: 0.96 }
        : { x: "100%", opacity: 0.96 };
  const slideExit =
    reduceMotion || !p
      ? undefined
      : panelEdge === "bottom"
        ? { y: "100%", opacity: 0.9 }
        : { x: "100%", opacity: 0.9 };

  const panel = (
    <AnimatePresence>
      {open && p && (
        <motion.div
          key="intel-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-stretch sm:justify-end"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22 }}
        >
          <button
            type="button"
            tabIndex={-1}
            className="absolute inset-0 z-0 bg-black/72 backdrop-blur-[2px] sm:bg-black/65"
            aria-label="Close intelligence panel"
            onClick={onClose}
          />

          <motion.aside
            initial={slideInitial}
            animate={{ y: 0, x: 0, opacity: 1 }}
            exit={slideExit}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 420, damping: 38, mass: 0.85 }
            }
            className="relative z-[2] flex max-h-[min(92dvh,920px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-white/[0.1] border-b-0 bg-[#050912]/98 shadow-[0_-32px_120px_-24px_rgba(0,0,0,0.9)] sm:max-h-none sm:h-full sm:max-w-[min(100vw,26rem)] sm:rounded-none sm:border-l sm:border-t-0 sm:border-r-0 sm:border-b-0 lg:max-w-[min(100vw,34rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_90%_80%_at_50%_0%,rgba(34,211,238,0.14),transparent_70%)]"
              aria-hidden
            />

            <header className="relative flex shrink-0 items-start gap-3 border-b border-white/[0.07] px-4 pb-4 pt-4 sm:px-5 sm:pt-5">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/85">
                  QuantAI intelligence deck
                </p>
                <h2 id={titleId} className="mt-1 text-base font-semibold leading-snug tracking-tight text-white/95 line-clamp-2">
                  {p.title}
                </h2>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Store className="size-3.5 opacity-70" strokeWidth={1.5} aria-hidden />
                    {p.store}
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums text-slate-300">
                    <span className="text-emerald-300/95">€{p.price}</span>
                    {p.oldPrice != null && p.oldPrice > p.price && (
                      <span className="text-slate-500 line-through">€{p.oldPrice}</span>
                    )}
                  </span>
                </p>
              </div>
              {p.image ? (
                <div className="size-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt="" className="size-full object-contain" />
                </div>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/40 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white sm:right-4 sm:top-4"
                aria-label="Close"
              >
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </header>

            <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
              <DrawerBody p={p} list={list} />
            </div>

            <footer className="relative shrink-0 border-t border-white/[0.07] bg-black/40 px-4 py-3 sm:px-5">
              <a
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_32px_-8px_rgba(34,211,238,0.4)] transition hover:brightness-105"
              >
                Open listing
                <ExternalLink className="size-4 opacity-80" strokeWidth={1.5} aria-hidden />
              </a>
            </footer>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(panel, document.body);
}

function DrawerBody({ p, list }: { p: QuantProduct; list: QuantProduct[] }) {
  const ai = calculateAIScore(p, list);
  const comp = getFinalComposite(p, list);
  const band = decisionBand(p, list);
  const { pros, cons } = getProsAndCons(p, list);
  const why = getWhyQuantAIRecommends(p, list, comp);
  const trust = getStoreTrustScore(p.store);
  const bestTrust = maxTrustInList(list);
  const avg = listAveragePrice(list);
  const alternatives = pickSimilarAlternatives(p, list, 4);
  const tier = getTrustTierLabel(p.store);
  const listStats = computeListStats(list);
  const narrativeLayers =
    p.qiSignals != null ? buildNarrativeConfidence(p, list, listStats, p.qiSignals) : null;

  const matrixPrice =
    avg > 0 && p.price > 0
      ? p.price < avg * 0.97
        ? "Below set average"
        : p.price > avg * 1.05
          ? "Above set average"
          : "Near set average"
      : "—";
  const matrixValue =
    (p.qiSignals?.pricePerformance ?? 0) >= 72
      ? "Strong price-to-quality balance"
      : (p.qiSignals?.pricePerformance ?? 0) >= 52
        ? "Balanced price-to-quality"
        : "Strained price-to-quality";

  const signalRows = p.qiSignals
    ? (
        [
          ["Price fit", p.qiSignals.priceFit, "How this ask sits versus the basket median and spread."],
          ["Rating signal", p.qiSignals.rating, "Star strength normalized against the visible band."],
          ["Review depth", p.qiSignals.reviewDepth, "Volume and stability of social proof."],
          ["Retailer trust signal", p.qiSignals.retailerTrust, "Pattern match to known, lower-friction retailers."],
          ["Delivery signal", p.qiSignals.delivery, "Heuristic read of speed / friction from shipping copy."],
          ["Popularity", p.qiSignals.popularity, "Blended reach of reviews and stars."],
          ["Price-to-quality", p.qiSignals.pricePerformance, "Core price-to-quality balance vs peers."],
          ["Discount quality", p.qiSignals.discountQuality, "Honesty and depth of markdown vs reference price."],
        ] as const
      ).map(([label, val, hint]) => ({ label, val, hint }))
    : [];

  return (
    <div className="space-y-4 pb-2">
      <div className="rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-400/[0.12] to-violet-500/[0.08] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/90">QuantAI Verdict</p>
          <span className="rounded-full border border-white/15 bg-black/35 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-cyan-100">
            QI composite {comp}
          </span>
        </div>
        <p className="mt-2 text-[13px] font-normal leading-relaxed text-slate-100/95">{quantVerdictLead(p, list)}</p>
        {p.qiPsychology?.trim() ? (
          <p className="mt-2 border-l-2 border-violet-400/35 pl-3 text-[12px] font-medium leading-snug text-violet-100/95">
            {p.qiPsychology.trim()}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <BandPill
          active={band === "buy"}
          label="Buy"
          sub="Strong purchase clarity for this snapshot."
        />
        <BandPill
          active={band === "compare"}
          label="Compare"
          sub="Balanced—validate peers before checkout."
        />
        <BandPill
          active={band === "wait"}
          label="Wait"
          sub="Signals suggest pausing or reframing the search."
        />
      </div>

      <GlassBlock title="Buyer decision summary" icon={<Scale className="size-4" strokeWidth={1.5} />}>
        <p>{why}</p>
      </GlassBlock>

      <div className="grid gap-3 sm:grid-cols-2">
        <GlassBlock title="Why this is recommended" icon={<Sparkles className="size-4" strokeWidth={1.5} />}>
          <ul className="list-none space-y-2">
            {pros.map((x) => (
              <li key={x} className="flex gap-2 text-slate-300">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400/80" aria-hidden />
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </GlassBlock>
        <GlassBlock title="What to watch out for" icon={<Gauge className="size-4" strokeWidth={1.5} />}>
          <ul className="list-none space-y-2">
            {cons.map((x) => (
              <li key={x} className="flex gap-2 text-slate-300">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400/80" aria-hidden />
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </GlassBlock>
      </div>

      <GlassBlock
        title="Better alternatives may exist if…"
        icon={<BarChart3 className="size-4" strokeWidth={1.5} />}
        className="border-amber-400/15 bg-amber-500/[0.06]"
      >
        <p className="text-amber-50/95">{betterAlternativesInsight(p, list)}</p>
      </GlassBlock>

      {signalRows.length > 0 && (
        <section className="rounded-2xl border border-white/[0.08] bg-black/35 p-4">
          <h3 className="text-[12px] font-semibold tracking-tight text-white/95">AI score breakdown</h3>
          <p className="mt-1 text-[11px] font-normal leading-relaxed text-slate-500">
            Sub-scales are 0–100. Together they form your QI composite for this search only.
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full min-w-[280px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.04] text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2">Signal</th>
                  <th className="px-3 py-2 tabular-nums">Score</th>
                  <th className="hidden px-3 py-2 sm:table-cell">Visual</th>
                </tr>
              </thead>
              <tbody>
                {signalRows.map((row) => (
                  <tr key={row.label} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-3 py-2.5 align-top text-slate-300">
                      <span className="font-medium text-white/90">{row.label}</span>
                      <p className="mt-0.5 text-[11px] font-normal text-slate-500">{row.hint}</p>
                    </td>
                    <td className="px-3 py-2.5 align-top tabular-nums font-semibold text-cyan-200/95">
                      {row.val}
                    </td>
                    <td className="hidden px-3 py-2.5 align-middle sm:table-cell">
                      <SignalBar value={row.val} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-white/[0.08] bg-black/35 p-4">
        <h3 className="text-[12px] font-semibold tracking-tight text-white/95">Price vs value matrix</h3>
        <p className="mt-1 text-[11px] text-slate-500">Purchase clarity improves when price position and value move together—not when cheap means weak trust.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Price position</p>
            <p className="mt-1 text-sm font-semibold text-white/95">{matrixPrice}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Value stance</p>
            <p className="mt-1 text-sm font-semibold text-cyan-100/95">{matrixValue}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-black/35 p-4">
        <h3 className="mb-2 flex items-center gap-2 text-[12px] font-semibold tracking-tight text-white/95">
          <Shield className="size-4 text-cyan-300/80" strokeWidth={1.5} aria-hidden />
          Store trust comparison
        </h3>
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[260px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.04] text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">Lens</th>
                <th className="px-3 py-2">This listing</th>
                <th className="px-3 py-2">Strongest peer</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.04]">
                <td className="px-3 py-2 text-slate-400">Retailer trust signal</td>
                <td className="px-3 py-2 font-semibold tabular-nums text-white/95">{trust}</td>
                <td className="px-3 py-2 font-semibold tabular-nums text-slate-300">
                  {bestTrust.score}
                  <span className="mt-0.5 block text-[11px] font-normal text-slate-500">{bestTrust.store}</span>
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-slate-400">Trust tier</td>
                <td className="px-3 py-2 capitalize text-slate-200">{tier}</td>
                <td className="px-3 py-2 text-slate-500">—</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[13px] text-slate-300">{trustAnalysisParagraph(p, list)}</p>
      </section>

      <GlassBlock title="Value analysis" icon={<BarChart3 className="size-4" strokeWidth={1.5} />}>
        <p>{valueAnalysisParagraph(p, list)}</p>
      </GlassBlock>

      <GlassBlock title="Delivery analysis" icon={<Truck className="size-4" strokeWidth={1.5} />}>
        <p>{deliveryAnalysisParagraph(p)}</p>
      </GlassBlock>

      <GlassBlock title="Rating analysis" icon={<Star className="size-4" strokeWidth={1.5} />}>
        <p>{ratingAnalysisParagraph(p, list)}</p>
      </GlassBlock>

      <GlassBlock title="Price trend insight" icon={<TrendMicroIcon trend={p.priceTrend} />}>
        <p>{priceTrendInsightParagraph(p)}</p>
      </GlassBlock>

      <section className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.07] p-4">
        <h3 className="text-[12px] font-semibold tracking-tight text-violet-100">Confidence &amp; uncertainty</h3>
        {narrativeLayers ? (
          <div className="mt-2 space-y-2 text-[12px] leading-relaxed">
            <p className="text-slate-100/95">{narrativeLayers.confidence}</p>
            <p className="text-slate-400">{narrativeLayers.uncertainty}</p>
            {narrativeLayers.missing.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">Missing data</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-400">
                  {narrativeLayers.missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
            {narrativeLayers.weak.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-200/80">Weak-signal warnings</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-400">
                  {narrativeLayers.weak.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-slate-400">Sub-signals not loaded—run a fresh signed-in search for layered confidence.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] font-medium text-slate-300">
            Heuristic {getHeuristicScore(p)}
          </span>
          <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] font-medium text-slate-300">
            Model layer {p.qiModelLayer ?? ai.score}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-black/40 p-4">
        <h3 className="text-[12px] font-semibold tracking-tight text-white/95">Recommended for</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-200">{recommendedBuyerProfile(p, list)}</p>
      </section>

      {alternatives.length > 0 && (
        <section className="rounded-2xl border border-white/[0.08] bg-black/35 p-4">
          <h3 className="text-[12px] font-semibold tracking-tight text-white/95">Similar alternatives</h3>
          <p className="mt-1 text-[11px] text-slate-500">
            Peer listings from this same search—sorted for purchase clarity, not sponsorship.
          </p>
          <ul className="mt-3 space-y-2">
            {alternatives.map((alt) => (
              <li
                key={alt.link}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-white/90">{alt.title}</p>
                  <p className="truncate text-[11px] text-slate-500">{alt.store}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold tabular-nums text-emerald-300">€{alt.price}</p>
                  <p className="text-[10px] font-medium text-cyan-200/90">QI {getFinalComposite(alt, list)}</p>
                </div>
                <a
                  href={alt.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:border-cyan-400/35 hover:text-cyan-200"
                  aria-label={`Open ${alt.title}`}
                >
                  <ExternalLink className="size-3.5" strokeWidth={1.5} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-center text-[11px] font-normal text-slate-600">
        Tradeoff analysis is informational—not financial advice. Always confirm price, warranty, and seller at checkout.
      </p>
    </div>
  );
}

function TrendMicroIcon({ trend }: { trend: QuantProduct["priceTrend"] }) {
  if (trend === "down") {
    return <ArrowDownRight className="size-4 text-emerald-300/90" strokeWidth={1.5} aria-hidden />;
  }
  if (trend === "up") {
    return <ArrowUpRight className="size-4 text-rose-300/90" strokeWidth={1.5} aria-hidden />;
  }
  return <Minus className="size-4 text-slate-400" strokeWidth={1.5} aria-hidden />;
}
