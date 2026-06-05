"use client";

import { memo, useEffect, useId, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  Check,
  Minus,
  PauseCircle,
  Percent,
  Scale,
  Shield,
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
import { resolveOfferClickUrl } from "@/lib/commerce/offerClick";
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
import { buildCanonicalQuery } from "@/lib/search/canonicalQuery";
import { buildCardIntelligenceLayer } from "@/lib/ui/cardIntelligenceLayer";
import { deriveCardDecision } from "@/lib/ui/decisionLanguage";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { VerdictSurfaceContext } from "@/lib/ui/verdictSurfaceOptimization";
import type { MarketContextInput } from "@/lib/ui/marketContextActivation";
import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import type { Phase271ProductPresentation } from "@/lib/ui/phase271PresentationActivation";
import type { ActivatedCommerceCoverage } from "@/lib/ui/commerceCoverageActivation";
import { classifyListingOutlier } from "@/lib/ui/listingOutlierFilter";
import IntelligenceCardBody from "./IntelligenceCardBody";
import { recordViewedProductLink } from "@/lib/personalization/localSignals";

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
      return "qa-ui-card-score-value--high";
    case "good":
      return "qa-ui-card-score-value--good";
    case "mid":
      return "qa-ui-card-score-value--mid";
    default:
      return "qa-ui-card-score-value--low";
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
  chipClass: string;
  Icon: typeof Check;
} {
  switch (stance) {
    case "buy":
      return { chipClass: "qa-ui-stance-chip--buy", Icon: Check };
    case "wait":
      return { chipClass: "qa-ui-stance-chip--wait", Icon: PauseCircle };
    case "avoid":
      return { chipClass: "qa-ui-stance-chip--avoid", Icon: Ban };
    default:
      return { chipClass: "qa-ui-stance-chip--neutral", Icon: Scale };
  }
}

function TrendIcon({ trend }: { trend: QuantProduct["priceTrend"] }) {
  if (trend === "down") {
    return (
      <span className="qa-ui-card-trend qa-ui-card-trend--down">
        <ArrowDownRight className="size-3 opacity-80" strokeWidth={2} aria-hidden />
        Below ref
      </span>
    );
  }
  if (trend === "up") {
    return (
      <span className="qa-ui-card-trend qa-ui-card-trend--up">
        <ArrowUpRight className="size-3 opacity-80" strokeWidth={2} aria-hidden />
        Above ref
      </span>
    );
  }
  return (
    <span className="qa-ui-card-trend">
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
  decisionBrief?: DecisionBriefDTO | null;
  verdictSurface?: VerdictSurfaceContext | null;
  marketContext?: MarketContextInput | null;
  coherentDecision?: CoherentProductDecision | null;
  commerceCoverage?: ActivatedCommerceCoverage | null;
  /** Phase 27.1 — decision distribution + confidence spread overlay. */
  phase271Presentation?: Phase271ProductPresentation | null;
};

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
  decisionBrief = null,
  verdictSurface = null,
  marketContext = null,
  coherentDecision = null,
  commerceCoverage = null,
  phase271Presentation = null,
}: Props) {
  const isTrayFocused = trayFocusLink === p.link;
  const isTrayDimmed = Boolean(trayFocusLink && trayFocusLink !== p.link);
  const reduceMotion = useReducedMotion();
  const lite = reduceMotion || lowPower;
  const ringGradId = useId().replace(/:/g, "");
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
  const canonicalQueryMemo = useMemo(
    () => (searchQuery.trim() ? buildCanonicalQuery(searchQuery) : null),
    [searchQuery]
  );
  const buyDecision = useMemo(
    () =>
      buildProductBuyDecision(p, list, rank, {
        humanSearchIntent,
        canonicalQuery: canonicalQueryMemo,
      }),
    [p, list, rank, humanSearchIntent, canonicalQueryMemo]
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

  const derived = useMemo(
    () =>
      deriveCardDecision({
        trustScore: trust,
        weakRetailer,
        pricePosture: cardIntel.posture.price,
        suspiciousPrice:
          classifyListingOutlier(p, list) != null ||
          p.qiCommerce?.priceAnomaly === "suspicious_low" ||
          p.qiCommerce?.priceAnomaly === "premium_outlier",
        peerCount: list.length,
        reasonFallback: clip(cardIntel.buyingThesis, 120) || undefined,
      }),
    [trust, weakRetailer, cardIntel.posture.price, cardIntel.buyingThesis, p, list]
  );

  const verdictLabel = coherentDecision?.verdict ?? derived.verdict;
  const reasonLine = coherentDecision?.reasonLine ?? derived.reason;
  const alignmentScore = coherentDecision?.alignmentScore ?? derived.alignmentScore;
  const trustMicro = coherentDecision?.trustMicro ?? derived.trustMicro;

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
    <MagneticSurface className="h-full min-h-0 w-full min-w-0" strength={0.08} disabled={lite}>
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
        className={`qa-ui-product-card qa-ref-product-card qa-ref-product-card--os qa-ref-intel-card qa-ref-intel-card--uniform group relative flex h-full min-w-0 flex-col overflow-hidden ${
          isTrayDimmed ? "qi-tray-peer-dim" : ""
        } ${isTrayFocused ? "qi-tray-focus-active" : ""} ${
          lite ? "" : "will-change-transform [transform:translateZ(0)]"
        }`}
      >
        <div className="qi-product-object-bezel pointer-events-none absolute inset-0 z-[1] rounded-[inherit]" aria-hidden />
        <div className="qa-ref-intel-card__inner qi-product-card-inner relative flex h-full min-h-0 flex-col overflow-hidden">
          <IntelligenceCardBody
            product={p}
            list={list}
            rank={rank}
            sym={sym}
            trust={trust}
            trustMicro={trustMicro}
            deal={deal}
            verdictLabel={verdictLabel}
            reasonLine={reasonLine}
            alignmentScore={alignmentScore}
            inCompare={inCompare}
            saved={savedLinks.has(p.link)}
            compareDisabled={!inCompare && compareLinks.length >= 3}
            imagePriority={imagePriority}
            onOpenBrief={() => {
              recordViewedProductLink(p.link);
              onOpenIntelligence(p);
            }}
            onToggleCompare={() => toggleCompare(p.link)}
            onSave={() => saveProduct(p)}
            decisionBrief={coherentDecision?.decisionBrief ?? decisionBrief}
            verdictSurface={verdictSurface}
            marketContext={coherentDecision?.marketContext ?? marketContext}
            coherentDecision={coherentDecision}
            commerceCoverage={commerceCoverage}
            phase271Presentation={phase271Presentation}
          />
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

function commerceCoverageFingerprint(c: ActivatedCommerceCoverage | null | undefined): string {
  if (!c) return "";
  return `${c.merchantCount}|${c.lowestPrice}|${c.bestTrustedLink}|${c.offers.length}|${c.viewAllOffersEnabled}`;
}

function coherentDecisionFingerprint(d: CoherentProductDecision | null | undefined): string {
  if (!d) return "";
  const exposure = d.intelligenceExposure;
  return `${d.verdict}|${d.reasonLine}|${d.alignmentScore}|${d.isLeadProduct}|${d.rankingRationaleLine}|${d.drawerRankingLine}|${d.summaryLines.join(";;")}|${d.expandedSignals.join(";;")}|${d.smartDecisionLines.join(";;")}|${d.decisionBrief?.explanation ?? ""}|${d.discountTruth?.verdict ?? ""}|${d.discountTruth?.confidence ?? ""}|${d.buyWait?.verdict ?? ""}|${d.buyWait?.confidence ?? ""}|${d.priceTarget?.targetBuyPrice ?? ""}|${d.priceTarget?.opportunityScore ?? ""}|${d.alternativeAdvantage?.leadAdvantageScore ?? ""}|${d.categoryIntelligence?.categoryScore ?? ""}|${d.categoryIntelligence?.segment ?? ""}|${d.intentIntelligence?.intentMatchScore ?? ""}|${d.intentIntelligence?.intentLabel ?? ""}|${d.trustRisk?.trustScore ?? ""}|${d.trustRisk?.riskScore ?? ""}|${d.unifiedDecision?.finalDecision ?? ""}|${d.unifiedDecision?.finalConfidence ?? ""}|${d.unifiedDecision?.decisionSummary ?? ""}|${exposure?.chips.map((c) => c.label).join(",") ?? ""}|${exposure?.expandSlots.join(";;") ?? ""}`;
}

function productResultCardPropsEqual(a: Props, b: Props): boolean {
  if (a.product.link !== b.product.link) return false;
  if (a.rank !== b.rank || a.index !== b.index) return false;
  if (a.lowPower !== b.lowPower || a.imagePriority !== b.imagePriority) return false;
  if (coherentDecisionFingerprint(a.coherentDecision) !== coherentDecisionFingerprint(b.coherentDecision))
    return false;
  if (commerceCoverageFingerprint(a.commerceCoverage) !== commerceCoverageFingerprint(b.commerceCoverage))
    return false;
  if ((a.decisionBrief?.explanation ?? "") !== (b.decisionBrief?.explanation ?? "")) return false;
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
