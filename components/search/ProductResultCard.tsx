"use client";

import { memo, useEffect, useId, useMemo, useState } from "react";
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
  Percent,
  Scale,
  Shield,
  Sparkles,
  Store,
} from "lucide-react";
import MagneticSurface from "@/components/motion/MagneticSurface";
import { calculateAIScore } from "@/app/api/search/lib/aiScoring";
import {
  currencySymbolFromListing,
  deliveryConfidencePct,
  formatListingPrice,
  longTermValueHint,
  marketplaceVerifiedLabel,
  riskHintFromProduct,
  shippingEstimateLabel,
  stockConfidencePct,
} from "@/lib/commerce/cues";
import { buildProductSnapshot, copyText } from "@/lib/share/intelligenceExport";
import { recordViewedProductLink } from "@/lib/personalization/localSignals";
import { isValidHttpOfferUrl, resolveOfferClickUrl } from "@/lib/commerce/offerClick";
import type { PredictiveTimingSignalTone } from "@/lib/intelligence/commerceAnalysisTypes";
import type { QuantProduct } from "@/lib/shoppingScore";
import {
  getStoreTrustScore,
} from "@/lib/shoppingScore";
import type { MarketAwarenessTray } from "@/lib/intelligence/marketAwareness";
import type { UnifiedCardInsight, UnifiedCardOfferRef } from "@/lib/intelligence/unifiedMarketMatching";
import { humanSearchIntentFingerprint, type HumanSearchIntent } from "@/lib/intelligence/searchIntentBrain";
import type { MarketMemoryState } from "@/lib/intelligence/marketMemory";
import { marketMemoryFingerprint } from "@/lib/intelligence/marketMemory";
import { resolveFinalCommerceDecision } from "@/lib/intelligence/finalCommerceDecision";
import { commerceBrainChipClass } from "@/lib/intelligence/commerceDecisionBrain";
import {
  buildProductBuyDecision,
  buildVerdictExpansion,
  type BuyStance,
  type ProductBuyDecision,
} from "@/lib/intelligence/productBuyDecision";
import {
  buildProductDealIntelligence,
  type ProductDealIntelligence,
} from "@/lib/intelligence/dealIntelligenceEngine";
import { buildCommerceTimingSupportLine } from "@/lib/intelligence/commerceDecisionBrain";
import { intelligenceMarketPulseLine } from "@/lib/ui/intelligencePresentation";
import { buildCardIntelligenceLayer } from "@/lib/ui/cardIntelligenceLayer";

function clip(s: string, max: number): string {
  const t = s.trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
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

function predictiveSignalChipClass(tone: PredictiveTimingSignalTone): string {
  switch (tone) {
    case "buy_now":
      return "border-emerald-400/28 bg-emerald-500/[0.1] text-emerald-50/90 shadow-[0_0_16px_-10px_rgba(52,211,153,0.35)]";
    case "wait":
      return "border-amber-400/28 bg-amber-500/[0.09] text-amber-50/90";
    case "risk":
      return "border-rose-400/28 bg-rose-500/[0.1] text-rose-50/90";
    default:
      return "border-violet-400/26 bg-violet-500/[0.09] text-violet-50/88";
  }
}

function worthBuyingHeadline(
  w: ProductDealIntelligence["worthBuyingNow"],
  hasDiscount: boolean
): { headline: string; cls: string } {
  if (w === "yes") {
    return {
      headline: hasDiscount
        ? "Yes — the discount looks credible and the seller signal backs it"
        : "Yes — trust and overall value line up even without a headline discount",
      cls: "text-emerald-200/95",
    };
  }
  if (w === "wait") {
    return {
      headline: hasDiscount
        ? "Wait — we would want clearer proof before trusting this price story"
        : "Wait — value versus peers still looks soft",
      cls: "text-rose-200/90",
    };
  }
  return { headline: "Maybe — worth a quick check on specs and seller terms", cls: "text-amber-100/90" };
}

/** Surface scan — short phrases only. */
function worthBuyingShort(w: ProductDealIntelligence["worthBuyingNow"], hasDiscount: boolean): string {
  if (w === "yes") return hasDiscount ? "Buy thesis · clean discount" : "Buy thesis · value holds";
  if (w === "wait") return hasDiscount ? "Hold thesis · verify markdown" : "Hold thesis · timing soft";
  return "Analyst check · seller terms";
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
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-200/75">
        <ArrowDownRight className="size-3 opacity-80" strokeWidth={2} aria-hidden />
        Below ref
      </span>
    );
  }
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-rose-200/68">
        <ArrowUpRight className="size-3 opacity-80" strokeWidth={2} aria-hidden />
        Above ref
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-500/85">
      <Minus className="size-3 opacity-70" strokeWidth={2} aria-hidden />
      Flat ref
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
  /** Tray deal intelligence (preferred when parent batch-computes). */
  dealIntel?: ProductDealIntelligence;
  /** Shared tray market snapshot for chip arbiter. */
  marketTray: MarketAwarenessTray;
  /** Mobile / touch: skip magnetic tilt and heavy hover motion. */
  lowPower?: boolean;
  /** Above-the-fold images request high fetch priority. */
  imagePriority?: "high" | "low";
  /** Unified market matching — same product across stores (optional). */
  unifiedMarket?: UnifiedCardInsight | null;
  /** Adaptive human shopping intent for this tray (optional). */
  humanSearchIntent?: HumanSearchIntent | null;
  /** Client market memory snapshot for live deal intel (optional). */
  marketMemoryState?: MarketMemoryState | null;
  /** Raw search string — feeds adaptive category economics into consensus (no UI change). */
  searchQuery?: string;
  /** Tray focus mode — dims peer cards when another row is hovered. */
  trayFocusLink?: string | null;
  onTrayFocus?: (link: string | null) => void;
};

const btnRow =
  "min-h-[2.75rem] shrink-0 rounded-full text-[11px] font-semibold tracking-tight transition-transform duration-300 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400/40";

function CardProductImage({
  src,
  reduceMotion,
  fetchPriority,
}: {
  src: string;
  reduceMotion: boolean | null;
  fetchPriority: "high" | "low";
}) {
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div
        className="flex aspect-[4/3] max-h-[9.25rem] min-h-[7.1rem] w-full flex-col items-center justify-center gap-2 rounded-[1.05rem] border border-dashed border-white/[0.12] bg-gradient-to-br from-slate-900/80 via-[#0a1220]/95 to-slate-900/90 text-center"
        aria-hidden
      >
        <ImageIcon className="size-8 text-slate-600" strokeWidth={1.25} />
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-600">No preview</span>
      </div>
    );
  }
  return (
    <motion.div className="qi-museum-frame qi-product-object-frame relative aspect-[4/3] max-h-[11rem] min-h-[7.75rem] w-full">
      <div className="qi-museum-spotlight" aria-hidden />
      {!loaded && (
        <div className="qi-image-shimmer absolute inset-0 z-[1] rounded-[inherit]" aria-hidden />
      )}
      <motion.img
        src={src}
        alt=""
        loading={fetchPriority === "high" ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={fetchPriority}
        onLoad={() => setLoaded(true)}
        onError={() => setErr(true)}
        className="relative z-[2] mx-auto h-full w-full max-h-[9.75rem] object-contain object-center p-5 drop-shadow-[0_28px_56px_rgba(0,0,0,0.62)]"
        initial={false}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        whileHover={
          reduceMotion ? undefined : { scale: 1.02, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } }
        }
      />
    </motion.div>
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
  dealIntel: dealIntelProp,
  marketTray,
  lowPower = false,
  imagePriority = "low",
  unifiedMarket = null,
  humanSearchIntent = null,
  marketMemoryState = null,
  searchQuery = "",
  trayFocusLink = null,
  onTrayFocus,
}: Props) {
  const isTrayFocused = trayFocusLink === p.link;
  const isTrayDimmed = Boolean(trayFocusLink && trayFocusLink !== p.link);
  const reduceMotion = useReducedMotion();
  const lite = reduceMotion || lowPower;
  const ringGradId = useId().replace(/:/g, "");
  const [intelOpen, setIntelOpen] = useState(false);
  const [intelBodyReady, setIntelBodyReady] = useState(false);
  const [cardCopyFlash, setCardCopyFlash] = useState(false);

  useEffect(() => {
    if (!intelOpen) return;
    const id = window.requestAnimationFrame(() => setIntelBodyReady(true));
    return () => window.cancelAnimationFrame(id);
  }, [intelOpen]);

  const toggleIntelOpen = () => {
    setIntelOpen((prev) => {
      if (!prev) {
        setIntelBodyReady(false);
      } else {
        queueMicrotask(() => setIntelBodyReady(false));
      }
      return !prev;
    });
  };
  const ai = calculateAIScore(p, list);
  const score = p.qiComposite != null && Number.isFinite(p.qiComposite) ? p.qiComposite : ai.score;
  const scoreNorm = Math.min(100, Math.max(0, Number(score) || 0));
  const trust = getStoreTrustScore(p.store);
  const offerClickUrl = resolveOfferClickUrl(p);
  const qiTier = qiConfidenceTier(scoreNorm);
  const canonicalConfidenceAura = useMemo((): "high" | "mid" | "low" => {
    const idConf = p.qiCanonicalIdentity?.identityConfidence ?? 72;
    const contam = p.qiListingIdentity?.contaminationRisk01 ?? 0;
    const mismatch = p.qiListingIdentity?.semanticMismatchPenalty01 ?? 0;
    if (idConf >= 79 && contam <= 0.44 && mismatch <= 0.36) return "high";
    if (idConf <= 61 || contam >= 0.64 || mismatch >= 0.54) return "low";
    return "mid";
  }, [
    p.qiCanonicalIdentity?.identityConfidence,
    p.qiListingIdentity?.contaminationRisk01,
    p.qiListingIdentity?.semanticMismatchPenalty01,
  ]);
  const [g0, g1, g2] = qiRingGradientStops(qiTier);
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

  const buyDecision = useMemo(
    () => buildProductBuyDecision(p, list, rank, { humanSearchIntent }),
    [p, list, rank, humanSearchIntent]
  );
  const deal = useMemo(
    () => dealIntelProp ?? buildProductDealIntelligence(p, list, undefined, humanSearchIntent, marketMemoryState),
    [dealIntelProp, p, list, humanSearchIntent, marketMemoryState]
  );
  const resolved = useMemo(
    () =>
      resolveFinalCommerceDecision({
        product: p,
        list,
        dealIntel: deal,
        buyDecision,
        rank,
        qiRounded: Math.round(scoreNorm),
        market: marketTray,
        humanSearchIntent,
        searchQuery,
      }),
    [p, list, deal, buyDecision, rank, scoreNorm, marketTray, humanSearchIntent, searchQuery]
  );
  const mergedBuyDecision = useMemo(
    (): ProductBuyDecision => ({
      ...buyDecision,
      stance: resolved.buySurface.stance,
      stanceLabel: resolved.buySurface.stanceLabel,
      stanceDetail: resolved.buySurface.stanceDetail,
    }),
    [buyDecision, resolved.buySurface]
  );
  const worthSignal = useMemo((): ProductDealIntelligence["worthBuyingNow"] => {
    switch (resolved.commerceBrainCode) {
      case "STRONG_BUY":
      case "BUY_READY":
      case "SAFE_BUY":
        return "yes";
      case "WAIT":
      case "COMPARE_ALTERNATIVES":
        return "wait";
      case "AVOID":
        return "maybe";
      default:
        return deal.worthBuyingNow;
    }
  }, [resolved.commerceBrainCode, deal.worthBuyingNow]);
  const worthLine = useMemo(() => {
    if (resolved.commerceBrainCode === "AVOID") {
      return {
        headline: "Avoid — trust or deal hygiene is too weak to recommend checkout.",
        cls: "text-rose-200/90",
      };
    }
    return worthBuyingHeadline(worthSignal, deal.hasDiscount);
  }, [resolved.commerceBrainCode, worthSignal, deal.hasDiscount]);
  const worthShort = useMemo(() => {
    if (resolved.commerceBrainCode === "AVOID") return "Skip · Capital protection";
    return worthBuyingShort(worthSignal, deal.hasDiscount);
  }, [resolved.commerceBrainCode, worthSignal, deal.hasDiscount]);
  const analystFrame = useMemo(
    () => buildVerdictExpansion(p, list, mergedBuyDecision),
    [p, list, mergedBuyDecision]
  );
  const predictiveBadgeTitle = useMemo(() => {
    if (!resolved.predictiveBadge || !p.qiPredictive) return "";
    return [p.qiPredictive.predictiveTimingLabel, p.qiPredictive.predictiveNarrative]
      .filter(Boolean)
      .join(" — ")
      .slice(0, 240);
  }, [resolved.predictiveBadge, p.qiPredictive]);
  const stanceUi = stancePresentation(mergedBuyDecision.stance);
  const StanceIcon = stanceUi.Icon;
  const decisionConfidence = p.qiBuyingDecision?.confidence ?? p.qiBuyingDecision?.decisionScore ?? Math.round(scoreNorm);
  const weakRetailer = p.qiRealityTrust?.weakRetailer ?? trust < 56;

  const marketWhisper = useMemo(() => {
    if (!unifiedMarket || unifiedMarket.storeCount < 2) return null;
    return intelligenceMarketPulseLine({
      storeCount: unifiedMarket.storeCount,
      spreadPct: unifiedMarket.marketSpreadPct,
      isBestTrusted: unifiedMarket.isBestTrustedInFamily,
      cheaperStore: unifiedMarket.sameItemCheaper?.store ?? null,
    });
  }, [unifiedMarket]);

  const timingSupportLine = useMemo(
    () =>
      buildCommerceTimingSupportLine({
        code: resolved.commerceBrainCode,
        deal,
        pred: p.qiPredictive,
        market: marketTray,
      }),
    [resolved.commerceBrainCode, deal, p.qiPredictive, marketTray]
  );

  const cardIntel = useMemo(
    () =>
      buildCardIntelligenceLayer({
        product: p,
        resolved,
        deal,
        market: marketTray,
        trust,
        weakRetailer,
        buyingThesisFallback: worthShort,
        marketWhisper,
        timingSupportLine,
      }),
    [
      p,
      resolved,
      deal,
      marketTray,
      trust,
      weakRetailer,
      worthShort,
      marketWhisper,
      timingSupportLine,
    ]
  );

  const signalsTerminalRisk = useMemo(() => {
    if (resolved.riskReason) return clip(resolved.riskReason, 112);
    if (riskHint) return clip(riskHint, 112);
    const r = analystFrame.risks.replace(/^Watch ·\s*/, "").trim();
    if (r.length > 8) return clip(r, 112);
    return "Clean risk surface for this field.";
  }, [resolved.riskReason, riskHint, analystFrame.risks]);

  const transition = lite
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 320, damping: 36 };

  return (
    <MagneticSurface className="h-full min-w-0" strength={0.08} disabled={lite}>
      <motion.article
        layout={false}
        initial={lite ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transition, delay: lite ? 0 : Math.min(index * 0.028, 0.34) }}
        onMouseEnter={() => onTrayFocus?.(p.link)}
        onMouseLeave={() => onTrayFocus?.(null)}
        onFocus={() => onTrayFocus?.(p.link)}
        onBlur={() => onTrayFocus?.(null)}
        whileHover={
          lite
            ? undefined
            : {
                y: isTrayFocused ? -3 : canonicalConfidenceAura === "high" ? -2 : -1,
                transition: { type: "spring", stiffness: canonicalConfidenceAura === "high" ? 380 : 360, damping: 36 },
              }
        }
        data-qi-confidence={canonicalConfidenceAura}
        className={`qi-product-card-shell qi-product-object qi-intel-surface group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[1.85rem] p-px transition-[background,box-shadow,opacity,transform] duration-700 ease-out ${
          isTrayDimmed ? "qi-tray-peer-dim" : ""
        } ${isTrayFocused ? "qi-tray-focus-active" : ""} ${
          lite ? "" : "will-change-transform [transform:translateZ(0)]"
        }`}
      >
        <div className="qi-product-object-bezel pointer-events-none absolute inset-0 z-[1] rounded-[inherit]" aria-hidden />
        <div
          className={`qi-product-card-inner qi-product-object-body relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.78rem] border-0 bg-transparent transition-[box-shadow,transform] duration-500 ease-out ${
            isTrayFocused
              ? "shadow-[0_0_0_1px_rgba(34,211,238,0.1),0_28px_64px_-32px_rgba(34,211,238,0.16)]"
              : ""
          }`}
        >
          <div className="pointer-events-none absolute -right-20 -top-20 size-48 rounded-full bg-cyan-400/6 blur-3xl opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-55" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 size-44 rounded-full bg-violet-500/6 blur-3xl opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-28" />

          <div className="relative z-[2] flex justify-end px-4 pt-4 sm:px-5 sm:pt-5">
            <button
              type="button"
              onClick={() => toggleCompare(p.link)}
              disabled={!inCompare && compareLinks.length >= 3}
              aria-pressed={inCompare}
              className={`shrink-0 touch-manipulation rounded-full border px-3.5 py-2.5 text-[11px] font-medium tracking-tight transition duration-300 active:scale-[0.98] min-h-11 sm:min-h-10 ${
                inCompare
                  ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-50/90"
                  : "border-white/[0.07] bg-black/25 text-slate-500/95 hover:border-cyan-400/15 hover:bg-cyan-500/[0.05] hover:text-slate-200/95 disabled:opacity-40"
              }`}
            >
              Compare
            </button>
          </div>

          <div className="relative z-[2] mx-4 mt-3 min-w-0 sm:mx-5">
            {p.image ? (
              <CardProductImage
                key={`${p.link}-${p.image}`}
                src={p.image}
                reduceMotion={lite}
                fetchPriority={imagePriority}
              />
            ) : (
              <div
                className="flex aspect-[4/3] max-h-[9.25rem] min-h-[7.1rem] w-full flex-col items-center justify-center gap-2 rounded-[1.05rem] border border-dashed border-white/[0.12] bg-gradient-to-br from-slate-900/80 via-[#0a1220]/95 to-slate-900/90 text-center"
                aria-hidden
              >
                <ImageIcon className="size-8 text-slate-600" strokeWidth={1.25} />
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-600">
                  No preview
                </span>
              </div>
            )}
          </div>

          <div className="qi-product-object-deck relative z-[2] flex min-h-0 min-w-0 flex-1 flex-col px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
            <h3 className="qi-editorial-title line-clamp-2 text-[15px] sm:text-[16px]">{p.title}</h3>

            <div className="mt-4 flex min-w-0 flex-wrap items-end justify-between gap-3 border-b border-white/[0.05] pb-4">
              <div className="min-w-0 flex-1">
                {p.displayPrice ? (
                  <p className="text-[12px] font-medium text-slate-500/80">{p.displayPrice}</p>
                ) : (
                  <p className="text-[12px] font-medium text-slate-600/85">Listed price</p>
                )}
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <p className="text-[1.55rem] font-semibold tabular-nums tracking-[-0.02em] text-white sm:text-[1.65rem]">
                    {formatListingPrice(p.price, sym)}
                  </p>
                  {p.oldPrice != null && p.oldPrice > p.price && (
                    <span className="text-xs text-slate-500 line-through tabular-nums">
                      {formatListingPrice(p.oldPrice, sym)}
                    </span>
                  )}
                  {deal.hasDiscount && deal.discountPct != null && (
                    <span className="shrink-0 rounded-md border border-emerald-400/28 bg-emerald-500/12 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-emerald-100">
                      −{deal.discountPct}%
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  <TrendIcon trend={p.priceTrend} />
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <div className="qi-qi-ring-luxury relative size-[3.15rem] shrink-0 opacity-[0.97] sm:size-[3.65rem]">
                  <svg
                    className="size-[3.15rem] -rotate-90 sm:size-[3.65rem]"
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
                        lite ? { duration: 0 } : { duration: 1.05, ease: [0.22, 1, 0.36, 1] }
                      }
                    />
                  </svg>
                  <span
                    className={`pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums sm:text-[11px] ${qiCenterLabelClass(qiTier)}`}
                  >
                    {Math.round(scoreNorm)}
                  </span>
                </div>
                <div className="max-w-[4.5rem] text-right sm:max-w-[5.5rem]">
                  <p className="text-[8px] font-semibold uppercase leading-tight tracking-[0.08em] text-slate-500/80 sm:text-[9px]">
                    {p.qiComposite != null ? "QI" : "Model"}
                  </p>
                  <p className="text-[9px] font-medium leading-tight text-slate-500/80 sm:text-[10px]">/ 100</p>
                </div>
              </div>
            </div>

            <div
              className={`qi-decision-surface qi-decision-surface--canvas qi-analyst-verdict mt-4 ${cardIntel.decisionSurfaceClass}`}
            >
              <p className="qi-silent-overline">AI read</p>
              <p className="qi-decision-headline mt-1.5">{cardIntel.primaryLabel}</p>
              <div
                className="qi-confidence-pulse mt-2.5"
                title={`Confidence ${decisionConfidence}%`}
                aria-hidden
              >
                <span style={{ width: `${Math.min(100, Math.max(8, decisionConfidence))}%` }} />
              </div>
            </div>

            {cardIntel.pills.length > 0 ? (
              <motion.div className="qi-signal-cluster mt-3" role="list" aria-label="Live intelligence signals">
                {cardIntel.pills.map((pill) => (
                  <span
                    key={pill.label}
                    role="listitem"
                    className={`truncate ${pill.cls} ${pill.primary ? "qi-signal-pill--primary" : ""}`}
                    title={pill.label}
                  >
                    {pill.label}
                  </span>
                ))}
              </motion.div>
            ) : null}

            <div className="qi-posture-grid">
              <div className="qi-posture-cell qi-posture-dimension qi-posture-dimension--trust">
                <p className="qi-posture-label">Trust</p>
                <p className="qi-posture-value">{cardIntel.posture.trust}</p>
              </div>
              <div className="qi-posture-cell qi-posture-dimension qi-posture-dimension--price">
                <p className="qi-posture-label">Price</p>
                <p className="qi-posture-value">{cardIntel.posture.price}</p>
              </div>
              <div className="qi-posture-cell qi-posture-dimension qi-posture-dimension--market">
                <p className="qi-posture-label">Market</p>
                <p className="qi-posture-value">{cardIntel.posture.market}</p>
              </div>
              <div className="qi-posture-cell qi-posture-dimension qi-posture-dimension--risk">
                <p className="qi-posture-label">Risk</p>
                <p className="qi-posture-value">{cardIntel.posture.risk}</p>
              </div>
            </div>

            <p className="qi-card-thesis">{cardIntel.buyingThesis}</p>

            <div className="qi-trust-illumination mt-3 border-t border-white/[0.04] pt-2.5">
              <span>
                <Store className="size-3 opacity-45" strokeWidth={1.5} aria-hidden />
                {p.store}
              </span>
            </div>

            <button
              type="button"
              onClick={toggleIntelOpen}
              className="qi-expand-trigger qi-analyst-vault-trigger mt-5 flex w-full min-w-0 items-center justify-between gap-2 text-left transition duration-200"
              aria-expanded={intelOpen}
            >
              <span className="qi-silent-overline text-[10px] text-slate-500/80 group-hover:text-slate-400/90">
                Deep analysis
              </span>
              <ChevronDown
                className={`size-4 shrink-0 text-slate-500/90 transition duration-200 ${intelOpen ? "rotate-180" : ""}`}
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
                  transition={{ duration: lite ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  {!intelBodyReady ? (
                    <div className="mt-2 space-y-2 rounded-2xl border border-white/[0.07] bg-black/22 px-3.5 py-5 sm:px-4">
                      <div className="h-3 w-24 rounded-md bg-white/[0.06] animate-pulse" />
                      <div className="h-20 rounded-xl bg-white/[0.05] animate-pulse" />
                      <div className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
                    </div>
                  ) : (
                  <div className="qi-analyst-vault-panel mt-2 rounded-2xl px-3 py-3.5 sm:px-4 sm:py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Purchase read</p>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] ${stanceUi.border} ${stanceUi.bg} ${stanceUi.text}`}
                      >
                        <StanceIcon className="size-3 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
                        {mergedBuyDecision.stanceLabel}
                      </span>
                    </div>
                    {cardIntel.reasonLines.length > 0 ? (
                      <ul className="qi-card-reason mt-2">
                        {cardIntel.reasonLines.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-slate-500">Market fit</p>
                        <p className="text-lg font-semibold tabular-nums text-white">{Math.round(scoreNorm)}</p>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/50">
                          <div className="h-full rounded-full bg-cyan-400/80" style={{ width: `${scoreNorm}%` }} />
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-slate-500">
                          {deal.hasDiscount ? "Markdown trust" : "Seller trust"}
                        </p>
                        <p className="text-lg font-semibold tabular-nums text-slate-100">{deal.discountConfidence}</p>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/50">
                          <div
                            className="h-full rounded-full bg-violet-400/80"
                            style={{ width: `${deal.discountConfidence}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-white/[0.05] pt-2.5">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Risk</p>
                      <p className="mt-0.5 text-[10px] leading-snug text-amber-100/85">{signalsTerminalRisk}</p>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5 text-[9px] text-slate-500">
                      <span className="rounded-full border border-white/[0.07] bg-black/30 px-2 py-0.5 tabular-nums">
                        #{rank + 1}
                      </span>
                      <span className="rounded-full border border-white/[0.07] bg-black/30 px-2 py-0.5 tabular-nums">
                        Trust {trust}
                      </span>
                      <span className="rounded-full border border-white/[0.07] bg-black/30 px-2 py-0.5 tabular-nums">
                        Fulfillment {delPct}%
                      </span>
                      <span className="rounded-full border border-white/[0.07] bg-black/30 px-2 py-0.5 tabular-nums">
                        Stock {stockPct}%
                      </span>
                      <span className="rounded-md border border-white/[0.06] bg-black/25 px-2 py-0.5">{mkt.label}</span>
                    </div>
                    {p.outboundRouteKind ? (
                      <p className="mt-2 text-[9px] leading-snug text-slate-500/90">
                        {p.outboundRouteKind === "direct_merchant"
                          ? "Route: direct merchant"
                          : p.outboundRouteKind === "merchant_search"
                            ? "Route: merchant search"
                            : p.outboundRouteKind === "google_interstitial"
                              ? "Route: shopping bridge"
                              : "Route: fallback"}
                      </p>
                    ) : null}
                    <details className="group mt-3 overflow-hidden rounded-xl border border-white/[0.06] bg-black/25">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 transition hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
                        <span>Analyst depth</span>
                        <ChevronDown
                          className="size-3.5 shrink-0 text-slate-500 transition group-open:rotate-180"
                          strokeWidth={2}
                          aria-hidden
                        />
                      </summary>
                      <div className="space-y-3 border-t border-white/[0.05] px-2.5 pb-3 pt-2.5">
                        <div>
                          <div className="flex items-center justify-between gap-2 text-[9px] font-medium text-slate-500">
                            <span>Deal strength</span>
                            <span className="tabular-nums text-slate-300">{deal.dealStrength}/100</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/50">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-400/85 to-emerald-400/75"
                              style={{ width: `${deal.dealStrength}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 [overflow-wrap:anywhere]">
                          {clip(deal.historicalConfidenceLabel, 110)}
                          {deal.liveRankExplanation ? ` · ${clip(deal.liveRankExplanation, 90)}` : ""}
                        </p>
                        <p className="text-[10px] text-slate-500/90 [overflow-wrap:anywhere]">{clip(buyDecision.rankWhy, 110)}</p>
                        <p className="text-[10px] text-violet-200/75 [overflow-wrap:anywhere]">{clip(buyDecision.buyerFit, 100)}</p>
                        <div className="space-y-2.5 text-[10px] leading-snug text-slate-400/95">
                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Price engine</p>
                            <p className="mt-1 [overflow-wrap:anywhere]">{clip(deal.whyDealGoodOrRisky, 140)}</p>
                            <p className="mt-1 text-slate-500 [overflow-wrap:anywhere]">
                              {clip(
                                `Fair ≈ ${formatListingPrice(deal.fairMarketEstimate, sym)}${
                                  deal.overpricedVsTray
                                    ? " — high vs peers."
                                    : deal.savingsVsFair != null && deal.savingsVsFair > 0
                                      ? ` — ~${formatListingPrice(deal.savingsVsFair, sym)} under median.`
                                      : " — near median."
                                }${deal.inflatedAnchorSuspected ? " Anchor may be inflated." : ""}${
                                  deal.urgencySuspected === "elevated" ? " Urgency wording in feed." : ""
                                }`,
                                180
                              )}
                            </p>
                            <p className="mt-1 text-slate-500 [overflow-wrap:anywhere]">{clip(deal.timingSummary, 96)}</p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <p className="text-[9px] font-semibold uppercase text-emerald-200/70">Pros</p>
                              <ul className="mt-1 space-y-0.5">
                                {(buyDecision.pros.length ? buyDecision.pros : ["No standout edge vs peers."]).map(
                                  (line, i) => (
                                    <li key={`dpro-${i}`} className="[overflow-wrap:anywhere]">
                                      · {clip(line, 100)}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                            <div>
                              <p className="text-[9px] font-semibold uppercase text-rose-200/65">Verify</p>
                              <ul className="mt-1 space-y-0.5">
                                {(buyDecision.cons.length ? buyDecision.cons : ["Confirm seller before checkout."]).map(
                                  (line, i) => (
                                    <li key={`dcon-${i}`} className="[overflow-wrap:anywhere]">
                                      · {clip(line, 100)}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          </div>
                          <p className="text-slate-500 [overflow-wrap:anywhere]">{clip(analystFrame.strengths, 130)}</p>
                          <p className="text-amber-100/80 [overflow-wrap:anywhere]">{clip(analystFrame.verify, 110)}</p>
                          <p className="text-slate-500 [overflow-wrap:anywhere]">
                            {clip(
                              p.qiReason?.trim() ||
                                ai.reason ||
                                "Blend of price, reviews, and seller trust in this set.",
                              140
                            )}
                          </p>
                          {ltHint ? (
                            <p className="text-slate-500 [overflow-wrap:anywhere]">{clip(ltHint, 100)}</p>
                          ) : null}
                          {p.availability ? <p className="text-slate-500">Availability · {p.availability}</p> : null}
                          {shipEst ? <p className="text-slate-500">Ship · {shipEst}</p> : null}
                          <p className="text-[9px] text-slate-600 [overflow-wrap:anywhere]">
                            {clip(deal.liveSignals.historicalPriceMemoryLabel, 100)}
                          </p>
                        </div>
                      </div>
                    </details>
                  </div>
                  )}
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
              Open
              <PanelRight className="size-3.5 opacity-80" strokeWidth={1.5} aria-hidden />
            </motion.button>

            <div className="mt-5 grid min-w-0 grid-cols-2 items-stretch justify-items-stretch gap-x-2 gap-y-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-x-3 sm:gap-y-2">
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
                whileHover={lite ? undefined : { scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                className={`${btnRow} inline-flex min-w-0 flex-[1_1_5.5rem] items-center justify-center gap-1.5 border border-white/[0.1] bg-white/[0.05] px-3.5 text-slate-300 hover:border-white/[0.15] hover:bg-white/[0.08]`}
              >
                {cardCopyFlash ? (
                  <Check className="size-3.5 text-emerald-300" aria-hidden />
                ) : (
                  <Copy className="size-3.5 opacity-85" aria-hidden />
                )}
                {cardCopyFlash ? "Copied" : "Brief"}
              </motion.button>
              {isValidHttpOfferUrl(offerClickUrl) ? (
              <motion.a
                href={offerClickUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => recordViewedProductLink(offerClickUrl)}
                whileHover={lite ? undefined : { scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                title="Opens the retailer page in a new tab"
                className={`${btnRow} relative flex min-w-0 flex-[1.1_1_7rem] items-center justify-center overflow-hidden bg-gradient-to-r from-white via-slate-50 to-white px-4 text-slate-900 shadow-[0_10px_28px_-16px_rgba(15,23,42,0.45)] transition-shadow duration-500 hover:brightness-[1.03]`}
              >
                <span
                  className="absolute inset-0 bg-gradient-to-r from-cyan-200/0 via-cyan-200/20 to-violet-200/0 opacity-0 transition group-hover:opacity-100"
                  aria-hidden
                />
                <span className="relative">View retailer</span>
              </motion.a>
              ) : (
                <motion.button
                  type="button"
                  disabled
                  title="No reliable outbound link from this listing"
                  className={`${btnRow} relative flex min-w-0 flex-[1.1_1_7rem] cursor-not-allowed items-center justify-center overflow-hidden bg-gradient-to-r from-white/40 via-slate-100/50 to-white/40 px-4 text-slate-600 opacity-55`}
                >
                  <span className="relative">View retailer</span>
                </motion.button>
              )}
              {addToWatchlist && (
                <motion.button
                  type="button"
                  onClick={() => addToWatchlist(p)}
                  whileHover={lite ? undefined : { scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  className={`${btnRow} border border-violet-400/22 bg-violet-500/10 px-3.5 text-violet-100/90 hover:bg-violet-500/[0.14]`}
                  title="Track price and timing"
                >
                  Track
                </motion.button>
              )}
              <motion.button
                type="button"
                onClick={() => saveProduct(p)}
                disabled={savedLinks.has(p.link)}
                whileHover={lite ? undefined : { scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                className={`${btnRow} border border-cyan-400/22 bg-cyan-500/[0.1] px-3.5 text-cyan-50/95 hover:border-cyan-400/32 hover:bg-cyan-500/[0.14] disabled:opacity-45`}
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

function offerRefEqual(a: UnifiedCardOfferRef | null | undefined, b: UnifiedCardOfferRef | null | undefined): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a.link === b.link && a.price === b.price && a.store === b.store;
}

function unifiedMarketEqual(
  a: Props["unifiedMarket"],
  b: Props["unifiedMarket"]
): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return (
    a.familyId === b.familyId &&
    a.storeCount === b.storeCount &&
    a.listingCount === b.listingCount &&
    a.bestTrustedPrice === b.bestTrustedPrice &&
    a.bestTrustedStore === b.bestTrustedStore &&
    a.bestTrustedLink === b.bestTrustedLink &&
    a.marketSpreadPct === b.marketSpreadPct &&
    a.offerCount === b.offerCount &&
    a.averageMarketPrice === b.averageMarketPrice &&
    a.highestDiscountPct === b.highestDiscountPct &&
    a.suspiciousOutlierCount === b.suspiciousOutlierCount &&
    a.merchantDiversityScore === b.merchantDiversityScore &&
    a.isSameProductFamily === b.isSameProductFamily &&
    a.isBestTrustedInFamily === b.isBestTrustedInFamily &&
    a.isLowestRiskInFamily === b.isLowestRiskInFamily &&
    a.familyConsensusHeadline === b.familyConsensusHeadline &&
    a.crossMarketHeadline === b.crossMarketHeadline &&
    offerRefEqual(a.sameItemCheaper, b.sameItemCheaper) &&
    offerRefEqual(a.betterValueAlternative, b.betterValueAlternative) &&
    offerRefEqual(a.premiumUpgrade, b.premiumUpgrade) &&
    a.overpricedVsFair === b.overpricedVsFair &&
    a.fairMarketRangeLabel === b.fairMarketRangeLabel
  );
}

function marketTrayEqual(a: Props["marketTray"], b: Props["marketTray"]): boolean {
  return (
    a.categoryDemandTrend === b.categoryDemandTrend &&
    a.marketHeat === b.marketHeat &&
    a.seasonalOpportunity === b.seasonalOpportunity &&
    a.categoryVolatility === b.categoryVolatility &&
    a.buyerMomentum === b.buyerMomentum &&
    a.discountWindow === b.discountWindow &&
    a.dominantCategory === b.dominantCategory
  );
}

function productResultCardPropsEqual(a: Props, b: Props): boolean {
  if (a.product.link !== b.product.link) return false;
  if (a.rank !== b.rank || a.index !== b.index) return false;
  if (a.lowPower !== b.lowPower || a.imagePriority !== b.imagePriority) return false;
  if (!unifiedMarketEqual(a.unifiedMarket, b.unifiedMarket)) return false;
  if (humanSearchIntentFingerprint(a.humanSearchIntent) !== humanSearchIntentFingerprint(b.humanSearchIntent))
    return false;
  if ((a.searchQuery ?? "") !== (b.searchQuery ?? "")) return false;
  if (marketMemoryFingerprint(a.marketMemoryState) !== marketMemoryFingerprint(b.marketMemoryState)) return false;
  if (!marketTrayEqual(a.marketTray, b.marketTray)) return false;
  const pk = (x: QuantProduct) =>
    `${x.price}|${x.title}|${x.store}|${x.rating}|${x.image}|${x.displayPrice}|${x.oldPrice ?? ""}|${x.priceTrend}|${x.qiComposite ?? ""}|${x.availability ?? ""}|${x.shipping ?? ""}|${x.qiRealityTrust?.realityScore ?? ""}|${x.qiRealityTrust == null ? "" : x.qiRealityTrust.weakRetailer ? "1" : "0"}|${x.offerOutboundUrl ?? ""}|${x.outboundRouteKind ?? ""}|${x.qiRegretRiskLevel ?? ""}|${x.qiProductUnderstanding?.productConfidence ?? ""}|${x.qiProductUnderstanding?.titleQuality ?? ""}|${x.qiProductUnderstanding?.matchQuality ?? ""}|${x.qiListingIdentity?.fingerprintCompact ?? ""}|${x.qiListingIdentity?.listingRisk01?.toFixed(2) ?? ""}|${x.qiListingIdentity?.contaminationRisk01?.toFixed(2) ?? ""}|${x.qiListingIdentity?.semanticMismatchPenalty01?.toFixed(2) ?? ""}|${x.qiListingIdentity?.productCompleteness ?? ""}|${x.qiMerchantConfidence01?.toFixed(2) ?? ""}|${x.qiCanonicalIdentity?.canonicalProductId ?? ""}|${x.qiCanonicalIdentity?.identityConfidence ?? ""}|${x.qiCanonicalIdentity?.authenticityConfidence ?? ""}|${x.qiMarketPulse?.dailyOpportunityScore ?? ""}|${x.qiMarketPulse?.trendMomentum ?? ""}|${x.qiDiscovery?.discoveryRole ?? ""}|${x.qiDiscovery?.discoveryScore ?? ""}`;
  if (pk(a.product) !== pk(b.product)) return false;
  if (a.list.length !== b.list.length) return false;
  if (a.list.length > 0) {
    if (a.list[0]?.link !== b.list[0]?.link) return false;
    if (a.list[a.list.length - 1]?.link !== b.list[b.list.length - 1]?.link) return false;
  }
  if (a.compareLinks.includes(a.product.link) !== b.compareLinks.includes(b.product.link)) return false;
  if (a.savedLinks.has(a.product.link) !== b.savedLinks.has(b.product.link)) return false;
  const da = a.dealIntel;
  const db = b.dealIntel;
  if (!da && !db) return true;
  if (!da || !db) return false;
  return (
    da.aiDealVerdict === db.aiDealVerdict &&
    da.dealStrength === db.dealStrength &&
    da.worthBuyingNow === db.worthBuyingNow &&
    da.hasDiscount === db.hasDiscount &&
    (da.discountPct ?? -1) === (db.discountPct ?? -1) &&
    da.discountConfidence === db.discountConfidence &&
    da.liveSignals.suddenDropScore === db.liveSignals.suddenDropScore &&
    da.liveSignals.dealHeat === db.liveSignals.dealHeat &&
    da.liveSignals.buyTimingConfidence === db.liveSignals.buyTimingConfidence &&
    da.liveSignals.rareOpportunity === db.liveSignals.rareOpportunity &&
    da.liveSignals.reboundPricingRisk === db.liveSignals.reboundPricingRisk
  );
}

export default memo(ProductResultCard, productResultCardPropsEqual);
