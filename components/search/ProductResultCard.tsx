"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  Minus,
  Shield,
  Star,
  Store,
  Truck,
} from "lucide-react";
import { calculateAIScore } from "@/app/api/search/lib/aiScoring";
import type { QuantProduct } from "@/lib/shoppingScore";
import {
  getCompositeScore,
  getHeuristicScore,
  getProfessionalBadge,
  getProsAndCons,
  getStoreTrustScore,
  getWhyQuantAIRecommends,
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
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-300">
        <ArrowDownRight className="size-3" strokeWidth={2} aria-hidden />
        vs ref
      </span>
    );
  }
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-rose-300">
        <ArrowUpRight className="size-3" strokeWidth={2} aria-hidden />
        vs ref
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-500">
      <Minus className="size-3" strokeWidth={2} aria-hidden />
      stable
    </span>
  );
}

type Props = {
  product: QuantProduct;
  list: QuantProduct[];
  index: number;
  rank: number;
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
  compareLinks: string[];
  toggleCompare: (link: string) => void;
  saveProduct: (p: QuantProduct) => void;
  savedLinks: Set<string>;
};

export default function ProductResultCard({
  product: p,
  list,
  index,
  rank,
  expandedId,
  setExpandedId,
  compareLinks,
  toggleCompare,
  saveProduct,
  savedLinks,
}: Props) {
  const reduceMotion = useReducedMotion();
  const ai = calculateAIScore(p, list);
  const score = ai.score;
  const comp = getCompositeScore(p, list);
  const badge = getProfessionalBadge(p, list, rank);
  const trust = getStoreTrustScore(p.store);
  const { pros, cons } = getProsAndCons(p, list);
  const why = getWhyQuantAIRecommends(p, list, comp);
  const expanded = expandedId === p.id;
  const inCompare = compareLinks.includes(p.link);

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
              y: -4,
              transition: { type: "spring", stiffness: 400, damping: 28 },
            }
      }
      className="group relative flex flex-col overflow-hidden rounded-[1.75rem] p-[1px] bg-gradient-to-br from-white/[0.16] via-cyan-400/12 to-violet-500/18 shadow-[0_28px_90px_-36px_rgba(0,0,0,0.88)]"
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[1.7rem] border border-white/[0.07] bg-gradient-to-b from-white/[0.09] to-[#060b14]/98 backdrop-blur-2xl transition-[box-shadow,border-color] duration-500 group-hover:border-cyan-400/25 group-hover:shadow-[0_40px_110px_-28px_rgba(34,211,238,0.22)]">
        <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-cyan-400/12 blur-3xl opacity-0 transition duration-700 group-hover:opacity-100" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 size-48 rounded-full bg-violet-500/10 blur-3xl opacity-0 transition duration-700 group-hover:opacity-60" />

        <div className="flex items-start justify-between gap-2 px-5 pt-5">
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
          <div className="mx-5 mt-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-white p-3 shadow-inner transition duration-500 group-hover:border-white/12 group-hover:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.45)]">
            <motion.img
              src={p.image}
              alt=""
              loading="lazy"
              decoding="async"
              className="mx-auto h-36 w-full object-contain"
              whileHover={
                reduceMotion
                  ? undefined
                  : { scale: 1.06, rotate: -0.8, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }
              }
            />
          </div>
        )}

        <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
          <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-white/95 line-clamp-2">
            {p.title}
          </h3>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-400">
            <span className="inline-flex items-center gap-1 font-medium text-slate-300">
              <Store className="size-3.5 opacity-70" strokeWidth={1.5} aria-hidden />
              {p.store}
            </span>
            <span className="inline-flex items-center gap-1">
              <Shield className="size-3.5 text-cyan-400/60" strokeWidth={1.5} aria-hidden />
              Trust {trust}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-white/[0.06] pt-4">
            <div>
              {p.displayPrice ? (
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  {p.displayPrice}
                </p>
              ) : (
                <p className="text-[11px] text-slate-600">Price</p>
              )}
              <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-white">
                  €{p.price}
                </p>
                {p.oldPrice != null && p.oldPrice > p.price && (
                  <span className="text-sm text-slate-500 line-through tabular-nums">
                    €{p.oldPrice}
                  </span>
                )}
              </div>
              <div className="mt-1">
                <TrendIcon trend={p.priceTrend} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                AI score
              </p>
              <p className="text-xl font-semibold tabular-nums text-cyan-200">{score}%</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            {ratingValue(p.rating) > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-amber-200/90">
                <Star className="size-3" strokeWidth={1.5} aria-hidden />
                {ratingValue(p.rating).toFixed(1)}
                {p.reviewsCount != null && (
                  <span className="text-slate-500">
                    ({p.reviewsCount.toLocaleString()})
                  </span>
                )}
              </span>
            )}
            {p.shipping && (
              <span className="inline-flex max-w-[200px] items-center gap-1 truncate rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-slate-400">
                <Truck className="size-3 shrink-0" strokeWidth={1.5} aria-hidden />
                {p.shipping}
              </span>
            )}
            {p.availability && (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-emerald-200/90">
                {p.availability}
              </span>
            )}
          </div>

          <p className="mt-3 text-[12px] font-normal leading-relaxed text-slate-500 line-clamp-2">
            {ai.reason}
          </p>

          <motion.button
            type="button"
            onClick={() => setExpandedId(expanded ? null : p.id)}
            aria-expanded={expanded}
            whileTap={{ scale: 0.98 }}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 text-[12px] font-medium text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.08] hover:text-white"
          >
            AI reasoning &amp; tradeoffs
            <ChevronDown
              className={`size-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
              aria-hidden
            />
          </motion.button>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-3 rounded-xl border border-white/[0.07] bg-black/35 p-3 text-[12px] leading-relaxed backdrop-blur-sm">
                  <p className="text-slate-300">
                    <span className="font-semibold text-cyan-200/90">
                      Why QuantAI highlights this:{" "}
                    </span>
                    {why}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80">
                        Pros
                      </p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-400">
                        {pros.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-400/80">
                        Cons
                      </p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-400">
                        {cons.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Heuristic {getHeuristicScore(p)} · Composite {comp} · Model {score}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4 flex gap-2">
            <motion.a
              href={p.link}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={reduceMotion ? undefined : { scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative flex flex-1 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-white via-slate-50 to-white py-2.5 text-[13px] font-semibold text-slate-900 shadow-[0_8px_32px_-12px_rgba(255,255,255,0.35)]"
            >
              <span
                className="absolute inset-0 bg-gradient-to-r from-cyan-200/0 via-cyan-200/25 to-violet-200/0 opacity-0 transition group-hover:opacity-100"
                aria-hidden
              />
              <span className="relative">View offer</span>
            </motion.a>
            <motion.button
              type="button"
              onClick={() => saveProduct(p)}
              disabled={savedLinks.has(p.link)}
              whileHover={reduceMotion ? undefined : { scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-full border border-cyan-400/40 bg-gradient-to-br from-cyan-400/20 to-cyan-500/5 px-4 py-2.5 text-[13px] font-semibold text-cyan-50 shadow-[0_0_24px_-8px_rgba(34,211,238,0.35)] transition hover:border-cyan-300/50 hover:shadow-[0_0_32px_-6px_rgba(34,211,238,0.45)] disabled:opacity-45"
            >
              {savedLinks.has(p.link) ? "Saved" : "Save"}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
