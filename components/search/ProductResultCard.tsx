"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  Minus,
  PanelRight,
  Shield,
  Sparkles,
  Star,
  Store,
  Truck,
} from "lucide-react";
import { calculateAIScore } from "@/app/api/search/lib/aiScoring";
import type { QuantProduct } from "@/lib/shoppingScore";
import {
  getProfessionalBadge,
  getStoreTrustScore,
  ratingValue,
} from "@/lib/shoppingScore";

function badgeChipClass(key: string): string {
  switch (key) {
    case "ai_pick":
      return "border-cyan-400/40 bg-gradient-to-r from-cyan-400/20 to-violet-500/15 text-cyan-100 shadow-[0_0_20px_-4px_rgba(34,211,238,0.4)]";
    case "best_value":
      return "border-emerald-400/35 bg-emerald-400/10 text-emerald-100";
    case "top_rated":
      return "border-amber-400/35 bg-amber-400/10 text-amber-100";
    case "budget_pick":
      return "border-sky-400/35 bg-sky-400/10 text-sky-100";
    case "premium_choice":
      return "border-violet-400/35 bg-violet-400/10 text-violet-100";
    default:
      return "border-white/15 bg-white/[0.06] text-slate-200";
  }
}

function TrendIcon({ trend }: { trend: QuantProduct["priceTrend"] }) {
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-300">
        <ArrowDownRight className="size-3" strokeWidth={2} aria-hidden />
        Below reference
      </span>
    );
  }
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-rose-300">
        <ArrowUpRight className="size-3" strokeWidth={2} aria-hidden />
        Above reference
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-500">
      <Minus className="size-3" strokeWidth={2} aria-hidden />
      Flat vs reference
    </span>
  );
}

type Props = {
  product: QuantProduct;
  list: QuantProduct[];
  index: number;
  rank: number;
  compareLinks: string[];
  toggleCompare: (link: string) => void;
  saveProduct: (p: QuantProduct) => void;
  savedLinks: Set<string>;
  addToWatchlist?: (p: QuantProduct) => void;
  onOpenIntelligence: (p: QuantProduct) => void;
};

export default function ProductResultCard({
  product: p,
  list,
  index,
  rank,
  compareLinks,
  toggleCompare,
  saveProduct,
  savedLinks,
  addToWatchlist,
  onOpenIntelligence,
}: Props) {
  const reduceMotion = useReducedMotion();
  const ringGradId = useId().replace(/:/g, "");
  const [intelOpen, setIntelOpen] = useState(false);
  const ai = calculateAIScore(p, list);
  const score = p.qiComposite != null && Number.isFinite(p.qiComposite) ? p.qiComposite : ai.score;
  const scoreNorm = Math.min(100, Math.max(0, Number(score) || 0));
  const badge = getProfessionalBadge(p, list, rank);
  const trust = getStoreTrustScore(p.store);
  const inCompare = compareLinks.includes(p.link);
  const ringR = 21;
  const ringC = 2 * Math.PI * ringR;
  const ringDash = ringC * (1 - scoreNorm / 100);

  const transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 34 };

  return (
    <motion.article
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transition, delay: Math.min(index * 0.035, 0.4) }}
      whileHover={
        reduceMotion
          ? undefined
          : {
              y: -3,
              transition: { type: "spring", stiffness: 400, damping: 28 },
            }
      }
      className="cockpit-card-lift group relative flex flex-col overflow-hidden rounded-[1.5rem] p-px bg-gradient-to-br from-white/[0.14] via-cyan-400/10 to-violet-500/16 shadow-[0_24px_70px_-32px_rgba(0,0,0,0.88)]"
    >
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.45rem] border border-white/[0.07] bg-gradient-to-b from-white/[0.08] to-[#060b14]/98 backdrop-blur-2xl transition-[box-shadow,border-color] duration-500 group-hover:border-cyan-400/22 group-hover:shadow-[0_32px_90px_-28px_rgba(34,211,238,0.18)]">
        <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-cyan-400/10 blur-3xl opacity-0 transition duration-700 group-hover:opacity-100" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 size-40 rounded-full bg-violet-500/10 blur-3xl opacity-0 transition duration-700 group-hover:opacity-50" />

        <div className="flex items-start justify-between gap-2 px-4 pt-4">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badgeChipClass(badge.key)}`}
          >
            {badge.label}
          </span>
          <button
            type="button"
            onClick={() => toggleCompare(p.link)}
            disabled={!inCompare && compareLinks.length >= 3}
            aria-pressed={inCompare}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition active:scale-95 ${
              inCompare
                ? "border-cyan-400/45 bg-cyan-400/18 text-cyan-100 shadow-[0_0_20px_-6px_rgba(34,211,238,0.45)]"
                : "border-white/12 bg-black/35 text-slate-400 hover:border-white/22 hover:text-slate-200 disabled:opacity-40"
            }`}
          >
            Compare
          </button>
        </div>

        {p.image && (
          <div className="mx-4 mt-3 overflow-hidden rounded-[1.05rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.12] to-white p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
            <motion.img
              src={p.image}
              alt=""
              loading="lazy"
              decoding="async"
              className="mx-auto h-[7.25rem] w-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
              whileHover={
                reduceMotion
                  ? undefined
                  : { scale: 1.045, transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } }
              }
            />
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3">
          <h3 className="text-[14px] font-semibold leading-snug tracking-tight text-white/95 line-clamp-2">
            {p.title}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-400">
            <span className="inline-flex min-w-0 items-center gap-1 font-medium text-slate-300">
              <Store className="size-3 shrink-0 opacity-70" strokeWidth={1.5} aria-hidden />
              <span className="truncate">{p.store}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
              <Shield className="size-3 text-cyan-400/55" strokeWidth={1.5} aria-hidden />
              <span className="text-slate-400">Trust</span>{" "}
              <span className="text-slate-200">{trust}</span>
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-white/[0.06] pt-3">
            <div className="min-w-0">
              {p.displayPrice ? (
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {p.displayPrice}
                </p>
              ) : (
                <p className="text-[10px] text-slate-600">Listed price</p>
              )}
              <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
                <p className="text-xl font-semibold tabular-nums tracking-tight text-white">€{p.price}</p>
                {p.oldPrice != null && p.oldPrice > p.price && (
                  <span className="text-xs text-slate-500 line-through tabular-nums">€{p.oldPrice}</span>
                )}
              </div>
              <div className="mt-0.5">
                <TrendIcon trend={p.priceTrend} />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <div className="relative size-[3.35rem] shrink-0">
                <svg
                  className="size-[3.35rem] -rotate-90"
                  viewBox="0 0 52 52"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id={ringGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="55%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="26"
                    cy="26"
                    r={ringR}
                    fill="none"
                    className="stroke-white/[0.08]"
                    strokeWidth="4"
                  />
                  <circle
                    cx="26"
                    cy="26"
                    r={ringR}
                    fill="none"
                    stroke={`url(#${ringGradId})`}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={ringC}
                    strokeDashoffset={ringDash}
                    className="transition-[stroke-dashoffset] duration-700 ease-out"
                  />
                </svg>
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums text-cyan-100">
                  {Math.round(scoreNorm)}
                </span>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {p.qiComposite != null ? "QI composite" : "Model layer"}
                </p>
                <p className="text-[10px] font-medium text-cyan-200/80">/ 100 signal</p>
              </div>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px]">
            {ratingValue(p.rating) > 0 && (
              <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-amber-200/90">
                <Star className="size-2.5 shrink-0" strokeWidth={1.5} aria-hidden />
                {ratingValue(p.rating).toFixed(1)}
                {p.reviewsCount != null && (
                  <span className="truncate text-slate-500">({p.reviewsCount.toLocaleString()})</span>
                )}
              </span>
            )}
            {p.shipping && (
              <span className="inline-flex max-w-[min(100%,11rem)] items-center gap-1 truncate rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-slate-400">
                <Truck className="size-2.5 shrink-0" strokeWidth={1.5} aria-hidden />
                {p.shipping}
              </span>
            )}
            {p.availability && (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-emerald-200/90">
                {p.availability}
              </span>
            )}
          </div>

          <p className="mt-2.5 text-[11px] font-normal leading-relaxed text-slate-400 line-clamp-2">
            {p.qiReason?.trim() || ai.reason}
          </p>

          <button
            type="button"
            onClick={() => setIntelOpen((o) => !o)}
            className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 transition hover:border-cyan-400/20 hover:text-slate-200"
            aria-expanded={intelOpen}
          >
            <span>Signal depth</span>
            <ChevronDown
              className={`size-3.5 shrink-0 text-cyan-300/70 transition ${intelOpen ? "rotate-180" : ""}`}
              strokeWidth={2}
              aria-hidden
            />
          </button>
          <AnimatePresence initial={false}>
            {intelOpen && (
              <motion.div
                initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-2 rounded-xl border border-cyan-400/15 bg-gradient-to-b from-cyan-500/[0.06] to-transparent px-3 py-2.5 text-[11px] leading-relaxed text-slate-300">
                  <p>
                    <span className="font-semibold text-cyan-100/90">Model read · </span>
                    <span className="text-cyan-50/90">{ai.label}</span>
                    <span className="text-slate-500"> — </span>
                    {ai.reason}
                  </p>
                  <p className="text-slate-400">
                    <span className="font-semibold text-white/80">QI narrative · </span>
                    {p.qiReason?.trim() ||
                      "Composite index blends price position, review strength, and retailer trust for this result set."}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-slate-300">
                      Rank #{rank + 1} in tray
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-slate-300">
                      Store trust {trust}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={() => onOpenIntelligence(p)}
            whileTap={{ scale: 0.98 }}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-gradient-to-r from-cyan-400/[0.12] to-violet-500/[0.1] py-2 text-[11px] font-semibold text-cyan-50/95 shadow-[0_0_24px_-12px_rgba(34,211,238,0.35)] transition hover:border-cyan-400/40 hover:from-cyan-400/[0.16] hover:to-violet-500/[0.14]"
          >
            <Sparkles className="size-3.5 text-cyan-200/90" strokeWidth={1.5} aria-hidden />
            QuantAI Verdict &amp; tradeoffs
            <PanelRight className="size-3.5 opacity-80" strokeWidth={1.5} aria-hidden />
          </motion.button>

          <div className="mt-3 flex flex-wrap gap-2">
            <motion.a
              href={p.link}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={reduceMotion ? undefined : { scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative flex min-w-[108px] flex-1 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-white via-slate-50 to-white py-2 text-[12px] font-semibold text-slate-900 shadow-[0_6px_24px_-10px_rgba(255,255,255,0.3)]"
            >
              <span
                className="absolute inset-0 bg-gradient-to-r from-cyan-200/0 via-cyan-200/25 to-violet-200/0 opacity-0 transition group-hover:opacity-100"
                aria-hidden
              />
              <span className="relative">View offer</span>
            </motion.a>
            {addToWatchlist && (
              <motion.button
                type="button"
                onClick={() => addToWatchlist(p)}
                whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="rounded-full border border-violet-400/35 bg-violet-500/15 px-2.5 py-2 text-[11px] font-semibold text-violet-100 transition hover:bg-violet-500/25"
                title="Watchlist foundation"
              >
                Watch
              </motion.button>
            )}
            <motion.button
              type="button"
              onClick={() => saveProduct(p)}
              disabled={savedLinks.has(p.link)}
              whileHover={reduceMotion ? undefined : { scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-full border border-cyan-400/40 bg-gradient-to-br from-cyan-400/20 to-cyan-500/5 px-3.5 py-2 text-[12px] font-semibold text-cyan-50 shadow-[0_0_20px_-8px_rgba(34,211,238,0.35)] transition hover:border-cyan-300/50 disabled:opacity-45"
            >
              {savedLinks.has(p.link) ? "Saved" : "Save"}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
