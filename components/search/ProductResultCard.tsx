"use client";

import { memo, useId, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  Check,
  ChevronDown,
  Copy,
  ImageIcon,
  Minus,
  PanelRight,
  PauseCircle,
  Scale,
  Shield,
  Sparkles,
  Star,
  Store,
  Truck,
} from "lucide-react";
import MagneticSurface from "@/components/motion/MagneticSurface";
import { calculateAIScore } from "@/app/api/search/lib/aiScoring";
import {
  currencySymbolFromListing,
  deliveryConfidencePct,
  formatListingPrice,
  longTermValueHint,
  marketplaceVerifiedLabel,
  retailerMonogram,
  riskHintFromProduct,
  shippingEstimateLabel,
  stockConfidencePct,
} from "@/lib/commerce/cues";
import { buildProductSnapshot, copyText } from "@/lib/share/intelligenceExport";
import { recordViewedProductLink } from "@/lib/personalization/localSignals";
import type { QuantProduct } from "@/lib/shoppingScore";
import {
  getProfessionalBadge,
  getStoreTrustScore,
  ratingValue,
} from "@/lib/shoppingScore";
import {
  buildProductBuyDecision,
  buildVerdictExpansion,
  type BuyStance,
} from "@/lib/intelligence/productBuyDecision";

function badgeChipClass(key: string): string {
  switch (key) {
    case "ai_pick":
      return "border-cyan-400/22 bg-cyan-500/[0.08] text-cyan-100/85";
    case "best_value":
      return "border-emerald-400/22 bg-emerald-400/[0.07] text-emerald-100/80";
    case "top_rated":
      return "border-amber-400/22 bg-amber-400/[0.07] text-amber-100/80";
    case "budget_pick":
      return "border-sky-400/22 bg-sky-400/[0.07] text-sky-100/80";
    case "premium_choice":
      return "border-violet-400/22 bg-violet-400/[0.07] text-violet-100/80";
    default:
      return "border-white/12 bg-white/[0.04] text-slate-300/85";
  }
}

function qiConfidenceTier(score: number): "high" | "good" | "mid" | "low" {
  if (score >= 78) return "high";
  if (score >= 62) return "good";
  if (score >= 45) return "mid";
  return "low";
}

function qiRingGradientStops(tier: ReturnType<typeof qiConfidenceTier>): [string, string, string] {
  switch (tier) {
    case "high":
      return ["#34d399", "#22d3ee", "#a5f3fc"];
    case "good":
      return ["#22d3ee", "#67e8f9", "#a78bfa"];
    case "mid":
      return ["#fbbf24", "#f472b6", "#a78bfa"];
    default:
      return ["#fb7185", "#94a3b8", "#64748b"];
  }
}

function qiCenterLabelClass(tier: ReturnType<typeof qiConfidenceTier>): string {
  switch (tier) {
    case "high":
      return "text-emerald-100";
    case "good":
      return "text-cyan-100";
    case "mid":
      return "text-amber-100";
    default:
      return "text-slate-200";
  }
}

function stancePresentation(stance: BuyStance): {
  border: string;
  bg: string;
  text: string;
  Icon: typeof Check;
} {
  switch (stance) {
    case "buy":
      return {
        border: "border-emerald-400/30",
        bg: "bg-emerald-500/[0.08]",
        text: "text-emerald-100/95",
        Icon: Check,
      };
    case "wait":
      return {
        border: "border-amber-400/28",
        bg: "bg-amber-500/[0.08]",
        text: "text-amber-100/90",
        Icon: PauseCircle,
      };
    case "avoid":
      return {
        border: "border-rose-400/30",
        bg: "bg-rose-500/[0.08]",
        text: "text-rose-100/90",
        Icon: Ban,
      };
    default:
      return {
        border: "border-cyan-400/25",
        bg: "bg-cyan-500/[0.07]",
        text: "text-cyan-50/95",
        Icon: Scale,
      };
  }
}

function TrendIcon({ trend }: { trend: QuantProduct["priceTrend"] }) {
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-200/70">
        <ArrowDownRight className="size-3 opacity-80" strokeWidth={2} aria-hidden />
        Below reference
      </span>
    );
  }
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-rose-200/65">
        <ArrowUpRight className="size-3 opacity-80" strokeWidth={2} aria-hidden />
        Above reference
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-500/85">
      <Minus className="size-3 opacity-70" strokeWidth={2} aria-hidden />
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
  /** Mobile / touch: skip magnetic tilt and heavy hover motion. */
  lowPower?: boolean;
};

const btnRow =
  "min-h-[2.625rem] shrink-0 rounded-full text-[11px] font-semibold tracking-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400/40";

function CardProductImage({ src, reduceMotion }: { src: string; reduceMotion: boolean | null }) {
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div
        className="flex aspect-[4/3] max-h-[8.5rem] min-h-[6.75rem] w-full flex-col items-center justify-center gap-2 rounded-[1.05rem] border border-dashed border-white/[0.12] bg-gradient-to-br from-slate-900/80 via-[#0a1220]/95 to-slate-900/90 text-center"
        aria-hidden
      >
        <ImageIcon className="size-8 text-slate-600" strokeWidth={1.25} />
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-600">No preview</span>
      </div>
    );
  }
  return (
    <div className="relative aspect-[4/3] max-h-[8.5rem] min-h-[6.75rem] w-full overflow-hidden rounded-[1.05rem] border border-white/[0.09] bg-gradient-to-b from-white/[0.14] to-slate-900/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
      {!loaded && (
        <div className="qi-image-shimmer absolute inset-0 z-[1] rounded-[inherit]" aria-hidden />
      )}
      <motion.img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setErr(true)}
        className="relative z-[2] mx-auto h-full w-full max-h-[8.25rem] object-contain object-center p-2.5 drop-shadow-[0_14px_28px_rgba(0,0,0,0.38)]"
        initial={false}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        whileHover={
          reduceMotion ? undefined : { scale: 1.03, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } }
        }
      />
    </div>
  );
}

function ProductResultCard({
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
  lowPower = false,
}: Props) {
  const reduceMotion = useReducedMotion();
  const lite = reduceMotion || lowPower;
  const ringGradId = useId().replace(/:/g, "");
  const [intelOpen, setIntelOpen] = useState(false);
  const [cardCopyFlash, setCardCopyFlash] = useState(false);
  const ai = calculateAIScore(p, list);
  const score = p.qiComposite != null && Number.isFinite(p.qiComposite) ? p.qiComposite : ai.score;
  const scoreNorm = Math.min(100, Math.max(0, Number(score) || 0));
  const qiTier = qiConfidenceTier(scoreNorm);
  const [g0, g1, g2] = qiRingGradientStops(qiTier);
  const badge = getProfessionalBadge(p, list, rank);
  const trust = getStoreTrustScore(p.store);
  const inCompare = compareLinks.includes(p.link);
  const sym = currencySymbolFromListing(p);
  const delPct = deliveryConfidencePct(p);
  const stockPct = stockConfidencePct(p);
  const shipEst = shippingEstimateLabel(p);
  const mkt = marketplaceVerifiedLabel(p);
  const riskHint = riskHintFromProduct(p);
  const ltHint = longTermValueHint(p, list);
  const ringR = 22;
  const ringC = 2 * Math.PI * ringR;
  const ringDash = ringC * (1 - scoreNorm / 100);

  const buyDecision = useMemo(() => buildProductBuyDecision(p, list, rank), [p, list, rank]);
  const analystFrame = useMemo(() => buildVerdictExpansion(p, list, buyDecision), [p, list, buyDecision]);
  const stanceUi = stancePresentation(buyDecision.stance);
  const StanceIcon = stanceUi.Icon;

  const transition = lite
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 400, damping: 34 };

  return (
    <MagneticSurface className="h-full min-w-0" strength={0.08} disabled={lite}>
      <motion.article
        layout={!lite}
        initial={lite ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transition, delay: lite ? 0 : Math.min(index * 0.032, 0.38) }}
        whileHover={
          lite
            ? undefined
            : {
                y: -4,
                transition: { type: "spring", stiffness: 380, damping: 26 },
              }
        }
        className={`qi-product-card-shell group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[1.55rem] p-px ${
          scoreNorm >= 78
            ? "bg-gradient-to-br from-cyan-400/14 via-white/[0.08] to-violet-500/12"
            : "bg-gradient-to-br from-white/[0.1] via-cyan-400/6 to-violet-500/10"
        }`}
      >
        <div className="qi-product-card-inner relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.48rem] border border-white/[0.07] bg-gradient-to-b from-white/[0.08] via-white/[0.03] to-[#040912]/98 backdrop-blur-2xl transition-[border-color,box-shadow,transform] duration-500 group-hover:border-cyan-400/18 group-hover:shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_24px_48px_-28px_rgba(34,211,238,0.18)]">
          <div className="pointer-events-none absolute -right-20 -top-20 size-48 rounded-full bg-cyan-400/8 blur-3xl opacity-0 transition duration-700 group-hover:opacity-100" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 size-44 rounded-full bg-violet-500/8 blur-3xl opacity-0 transition duration-700 group-hover:opacity-45" />

          <div className="relative z-[2] flex items-start justify-between gap-2 px-4 pt-4 sm:px-5 sm:pt-5">
            <span
              className={`max-w-[min(100%,12rem)] truncate rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${badgeChipClass(badge.key)}`}
            >
              {badge.label}
            </span>
            <button
              type="button"
              onClick={() => toggleCompare(p.link)}
              disabled={!inCompare && compareLinks.length >= 3}
              aria-pressed={inCompare}
              className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition active:scale-[0.98] ${
                inCompare
                  ? "border-cyan-400/28 bg-cyan-400/12 text-cyan-100/90"
                  : "border-white/10 bg-black/35 text-slate-500 hover:border-white/16 hover:bg-white/[0.05] hover:text-slate-300 disabled:opacity-40"
              }`}
            >
              Compare
            </button>
          </div>

          <div className="relative z-[2] mx-4 mt-4 min-w-0 sm:mx-5">
            {p.image ? (
              <CardProductImage key={`${p.link}-${p.image}`} src={p.image} reduceMotion={lite} />
            ) : (
              <div
                className="flex aspect-[4/3] max-h-[8.5rem] min-h-[6.75rem] w-full flex-col items-center justify-center gap-2 rounded-[1.05rem] border border-dashed border-white/[0.12] bg-gradient-to-br from-slate-900/80 via-[#0a1220]/95 to-slate-900/90 text-center"
                aria-hidden
              >
                <ImageIcon className="size-8 text-slate-600" strokeWidth={1.25} />
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-600">
                  No preview
                </span>
              </div>
            )}
          </div>

          <div className="relative z-[2] flex min-h-0 min-w-0 flex-1 flex-col px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
            <h3 className="text-[15px] font-semibold leading-[1.45] tracking-tight text-white/[0.97] line-clamp-2 sm:text-[16px]">
              {p.title}
            </h3>

            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-relaxed text-slate-500/90">
              <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 font-medium text-slate-400/95">
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[9px] font-bold tracking-tight text-slate-300/90"
                  aria-hidden
                >
                  {retailerMonogram(p.store)}
                </span>
                <Store className="size-3 shrink-0 opacity-55" strokeWidth={1.5} aria-hidden />
                <span className="min-w-0 truncate">{p.store}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 tabular-nums text-slate-500/85">
                <Shield className="size-3 text-slate-500/70" strokeWidth={1.5} aria-hidden />
                <span className="text-slate-500/80">Trust</span>{" "}
                <span className="text-slate-300/95">{trust}</span>
              </span>
            </div>

            <div className="mt-5 flex min-w-0 flex-wrap items-end justify-between gap-4 border-t border-white/[0.06] pt-5">
              <div className="min-w-0 flex-1">
                {p.displayPrice ? (
                  <p className="cockpit-label text-[10px] tracking-[0.1em] text-slate-500/75">
                    {p.displayPrice}
                  </p>
                ) : (
                  <p className="cockpit-label text-[10px] tracking-[0.1em] text-slate-600/90">Listed price</p>
                )}
                <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                  <p className="text-[1.45rem] font-semibold tabular-nums tracking-tight text-white sm:text-[1.55rem]">
                    {formatListingPrice(p.price, sym)}
                  </p>
                  {p.oldPrice != null && p.oldPrice > p.price && (
                    <span className="text-xs text-slate-500 line-through tabular-nums">
                      {formatListingPrice(p.oldPrice, sym)}
                    </span>
                  )}
                </div>
                <div className="mt-1.5">
                  <TrendIcon trend={p.priceTrend} />
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <div className="relative size-[3.5rem] shrink-0 opacity-95">
                  <svg
                    className="size-[3.5rem] -rotate-90"
                    viewBox="0 0 54 54"
                    role="img"
                    aria-label={`QI score ${Math.round(scoreNorm)} of 100`}
                  >
                    <defs>
                      <linearGradient id={ringGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={g0} />
                        <stop offset="50%" stopColor={g1} />
                        <stop offset="100%" stopColor={g2} />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="27"
                      cy="27"
                      r={ringR}
                      fill="none"
                      className="stroke-white/[0.06]"
                      strokeWidth="4"
                    />
                    <motion.circle
                      cx="27"
                      cy="27"
                      r={ringR}
                      fill="none"
                      stroke={`url(#${ringGradId})`}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={ringC}
                      initial={lite ? false : { strokeDashoffset: ringC }}
                      animate={{ strokeDashoffset: ringDash }}
                      transition={
                        lite
                          ? { duration: 0 }
                          : { duration: 1.05, ease: [0.22, 1, 0.36, 1] }
                      }
                    />
                  </svg>
                  <span
                    className={`pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums ${qiCenterLabelClass(qiTier)}`}
                  >
                    {Math.round(scoreNorm)}
                  </span>
                </div>
                <div className="max-w-[5.5rem] text-right">
                  <p className="text-[9px] font-semibold uppercase leading-tight tracking-[0.08em] text-slate-500/80">
                    {p.qiComposite != null ? "QI composite" : "Model layer"}
                  </p>
                  <p className="text-[10px] font-medium leading-tight text-slate-500/80">/ 100</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex min-w-0 flex-wrap gap-2 text-[10px] leading-relaxed">
              <span
                className="rounded-full border border-white/[0.08] bg-black/25 px-2 py-0.5 font-medium tabular-nums text-slate-400/95"
                title="Heuristic delivery confidence from listing + trust"
              >
                Delivery · {delPct}%
              </span>
              <span
                className="rounded-full border border-white/[0.08] bg-black/25 px-2 py-0.5 font-medium tabular-nums text-slate-400/95"
                title="Availability language confidence"
              >
                Stock · {stockPct}%
              </span>
              <span
                className={`max-w-[min(100%,14rem)] truncate rounded-full border border-white/[0.08] bg-black/22 px-2 py-0.5 text-slate-400/95 ${mkt.tone === "high" ? "text-emerald-200/75" : mkt.tone === "mid" ? "text-cyan-200/70" : "text-amber-200/75"}`}
              >
                {mkt.label}
              </span>
              {ratingValue(p.rating) > 0 && (
                <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/[0.08] bg-black/25 px-2 py-0.5 text-slate-400/95">
                  <Star className="size-2.5 shrink-0 text-amber-200/55" strokeWidth={1.5} aria-hidden />
                  {ratingValue(p.rating).toFixed(1)}
                  {p.reviewsCount != null && (
                    <span className="truncate text-slate-500/85">({p.reviewsCount.toLocaleString()})</span>
                  )}
                </span>
              )}
              {shipEst && (
                <span className="inline-flex max-w-[min(100%,11rem)] items-center gap-1 truncate rounded-full border border-white/[0.08] bg-black/22 px-2 py-0.5 text-slate-500/90">
                  <Truck className="size-2.5 shrink-0 opacity-70" strokeWidth={1.5} aria-hidden />
                  {shipEst}
                </span>
              )}
              {p.availability && (
                <span className="rounded-full border border-white/[0.08] bg-black/25 px-2 py-0.5 text-slate-400/95">
                  {p.availability}
                </span>
              )}
              {riskHint && (
                <span className="max-w-full rounded-full border border-amber-400/18 bg-amber-500/[0.07] px-2 py-0.5 text-amber-100/75">
                  {riskHint}
                </span>
              )}
              {ltHint && (
                <span className="max-w-full rounded-full border border-white/[0.08] bg-black/22 px-2 py-0.5 text-slate-400/90">
                  {ltHint}
                </span>
              )}
            </div>

            <div className="mt-4 min-w-0 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-black/30 px-3 py-3 sm:px-3.5">
              <div className="flex min-w-0 flex-wrap items-start gap-2">
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${stanceUi.border} ${stanceUi.bg} ${stanceUi.text}`}
                >
                  <StanceIcon className="size-3.5 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
                  {buyDecision.stanceLabel}
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap gap-1" aria-hidden>
                  {(["buy", "wait", "compare", "avoid"] as const).map((s) => {
                    const on = buyDecision.stance === s;
                    const short =
                      s === "buy" ? "Buy" : s === "wait" ? "Wait" : s === "compare" ? "Compare" : "Avoid";
                    return (
                      <span
                        key={s}
                        className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                          on
                            ? "border-cyan-400/35 bg-cyan-500/15 text-cyan-100/95"
                            : "border-white/[0.05] bg-black/20 text-slate-600"
                        }`}
                      >
                        {short}
                      </span>
                    );
                  })}
                </div>
              </div>
              <p className="cockpit-body mt-2 text-[11px] leading-relaxed text-slate-400 [overflow-wrap:anywhere]">
                {buyDecision.stanceDetail}
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500/90 [overflow-wrap:anywhere]">
                <span className="font-semibold text-slate-400/95">Why this rank · </span>
                {buyDecision.rankWhy}
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-violet-200/80 [overflow-wrap:anywhere]">
                <span className="font-semibold text-violet-200/90">Buyer fit · </span>
                {buyDecision.buyerFit}
              </p>
              <div className="mt-3 grid min-w-0 gap-2.5 border-t border-white/[0.06] pt-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-200/75">Pros</p>
                  <ul className="mt-1.5 space-y-1 text-[10.5px] leading-snug text-slate-400/95">
                    {(buyDecision.pros.length ? buyDecision.pros : ["No standout positive axis vs peers—neutral band."]).map(
                      (line, i) => (
                        <li key={`pro-${i}`} className="flex gap-1.5 [overflow-wrap:anywhere]">
                          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-400/55" aria-hidden />
                          <span>{line}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-rose-200/70">Watch / risk</p>
                  <ul className="mt-1.5 space-y-1 text-[10.5px] leading-snug text-slate-400/95">
                    {(buyDecision.cons.length ? buyDecision.cons : ["No acute flags in heuristics—still verify seller pages."]).map(
                      (line, i) => (
                        <li key={`con-${i}`} className="flex gap-1.5 [overflow-wrap:anywhere]">
                          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-rose-400/50" aria-hidden />
                          <span>{line}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-4 min-w-0 rounded-xl border border-white/[0.06] bg-black/22 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cyan-200/75">QuantAI verdict</p>
              <p className="cockpit-body mt-1.5 text-[12px] font-medium leading-relaxed text-slate-100/95 [overflow-wrap:anywhere] line-clamp-4 sm:line-clamp-3">
                {buyDecision.headlineVerdict}
              </p>
              {(p.qiReason?.trim() || ai.reason) && (
                <p className="cockpit-body mt-2 border-t border-white/[0.05] pt-2 text-[11px] leading-relaxed text-slate-500/90 line-clamp-2 [overflow-wrap:anywhere]">
                  <span className="text-slate-500">Model note · </span>
                  {p.qiReason?.trim() || ai.reason}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIntelOpen((o) => !o)}
              className="mt-4 flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-black/28 px-3 py-2.5 text-left transition hover:border-white/[0.12] hover:bg-white/[0.04]"
              aria-expanded={intelOpen}
            >
              <span className="cockpit-label text-[10px] tracking-[0.1em] text-slate-500/90 group-hover:text-slate-400">
                Signals &amp; transparency
              </span>
              <ChevronDown
                className={`size-4 shrink-0 text-slate-500 transition duration-300 ${intelOpen ? "rotate-180" : ""}`}
                strokeWidth={2}
                aria-hidden
              />
            </button>
            <AnimatePresence initial={false}>
              {intelOpen && (
                <motion.div
                  initial={lite ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: lite ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-4 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] via-black/25 to-transparent px-3.5 py-4 sm:px-4 sm:py-5">
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cyan-200/70">
                        Verdict depth &amp; tradeoffs
                      </p>
                      <p className="cockpit-body text-[11.5px] leading-relaxed text-slate-300/95 [overflow-wrap:anywhere]">
                        {analystFrame.strengths}
                      </p>
                      <p className="cockpit-body text-[11.5px] leading-relaxed text-slate-400/95 [overflow-wrap:anywhere]">
                        {analystFrame.risks}
                      </p>
                      <p className="cockpit-body text-[11.5px] leading-relaxed text-amber-100/85 [overflow-wrap:anywhere]">
                        {analystFrame.verify}
                      </p>
                      <p className="cockpit-body text-[10.5px] leading-relaxed text-slate-500/90 [overflow-wrap:anywhere]">
                        {analystFrame.limits}
                      </p>
                    </div>
                    <div className="space-y-2 border-t border-white/[0.06] pt-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                        Model read
                      </p>
                      <p className="cockpit-body text-[12px] leading-relaxed text-slate-200/95">
                        <span className="font-semibold text-slate-200/95">{ai.label}</span>
                        <span className="text-slate-500"> — </span>
                        {ai.reason}
                      </p>
                    </div>
                    <div className="space-y-2 border-t border-white/[0.06] pt-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500/90">
                        QI narrative
                      </p>
                      <p className="cockpit-body text-[12px] leading-relaxed text-slate-400">
                        {p.qiReason?.trim() ||
                          "Composite index blends price position, review strength, and retailer trust for this result set."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-white/[0.05] pt-4">
                      <span className="rounded-full border border-white/[0.08] bg-black/30 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-slate-400">
                        Rank #{rank + 1}
                      </span>
                      <span className="rounded-full border border-white/[0.08] bg-black/30 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-slate-400">
                        Trust prior {trust}
                      </span>
                      <span className="rounded-full border border-white/[0.08] bg-black/30 px-2.5 py-1 text-[10px] text-slate-500">
                        Heuristics only — not legal advice
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="button"
              onClick={() => {
                recordViewedProductLink(p.link);
                onOpenIntelligence(p);
              }}
              whileTap={{ scale: 0.99 }}
              className="mt-4 flex w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-cyan-400/18 bg-gradient-to-r from-cyan-400/[0.08] to-violet-500/[0.07] py-2.5 text-[11px] font-semibold text-slate-100/95 transition hover:border-cyan-400/26 hover:from-cyan-400/[0.11] hover:to-violet-500/[0.09]"
            >
              <Sparkles className="size-3.5 text-slate-400" strokeWidth={1.5} aria-hidden />
              QuantAI Verdict &amp; tradeoffs
              <PanelRight className="size-3.5 opacity-80" strokeWidth={1.5} aria-hidden />
            </motion.button>

            <div className="mt-4 flex min-w-0 flex-wrap items-stretch justify-center gap-2 sm:gap-2.5">
              <motion.button
                type="button"
                onClick={() => {
                  void (async () => {
                    const ok = await copyText(buildProductSnapshot(p, list));
                    if (ok) {
                      setCardCopyFlash(true);
                      window.setTimeout(() => setCardCopyFlash(false), 2000);
                    }
                  })();
                }}
                whileHover={lite ? undefined : { scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`${btnRow} inline-flex min-w-0 flex-[1_1_5.5rem] items-center justify-center gap-1.5 border border-white/[0.1] bg-white/[0.05] px-3 text-slate-300 hover:border-white/[0.14] hover:bg-white/[0.07]`}
              >
                {cardCopyFlash ? (
                  <Check className="size-3.5 text-emerald-300" aria-hidden />
                ) : (
                  <Copy className="size-3.5 opacity-85" aria-hidden />
                )}
                {cardCopyFlash ? "Copied" : "Export"}
              </motion.button>
              <motion.a
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => recordViewedProductLink(p.link)}
                whileHover={lite ? undefined : { scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`${btnRow} relative flex min-w-[7.5rem] flex-[1.1_1_7rem] items-center justify-center overflow-hidden bg-gradient-to-r from-white via-slate-50 to-white px-4 text-slate-900 shadow-[0_10px_28px_-16px_rgba(15,23,42,0.45)] hover:brightness-[1.02]`}
              >
                <span
                  className="absolute inset-0 bg-gradient-to-r from-cyan-200/0 via-cyan-200/20 to-violet-200/0 opacity-0 transition group-hover:opacity-100"
                  aria-hidden
                />
                <span className="relative">View offer</span>
              </motion.a>
              {addToWatchlist && (
                <motion.button
                  type="button"
                  onClick={() => addToWatchlist(p)}
                  whileHover={lite ? undefined : { scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`${btnRow} border border-violet-400/22 bg-violet-500/10 px-3.5 text-violet-100/90 hover:bg-violet-500/16`}
                  title="Add to watchlist"
                >
                  Watch
                </motion.button>
              )}
              <motion.button
                type="button"
                onClick={() => saveProduct(p)}
                disabled={savedLinks.has(p.link)}
                whileHover={lite ? undefined : { scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`${btnRow} border border-cyan-400/22 bg-cyan-500/[0.1] px-4 text-cyan-50/95 hover:border-cyan-400/30 hover:bg-cyan-500/[0.14] disabled:opacity-45`}
              >
                {savedLinks.has(p.link) ? "Saved" : "Save"}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.article>
    </MagneticSurface>
  );
}

export default memo(ProductResultCard);
