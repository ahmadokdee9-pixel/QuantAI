import { listingTextQuality01 } from "@/lib/commerce/listingQuality";
import { scoreDeliverySpeed } from "@/lib/intelligence/deliveryScore";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";
import { getMarketplaceSellerRiskTier } from "@/lib/retailTrust";
import {
  buildGroupingRationale,
  buildHiddenRisksNote,
  buildMatchSignalsSummary,
  buildPrimaryRecommendation,
  buildRetailTrustNote,
  buildUncertaintyNote,
  buildWhenCheapestNotBest,
  imageSimilarityPlaceholder,
} from "./clusterNarrative";
import { canonicalClusterTitle } from "./clusterEngine";
import { getCategoryPricingEconomics } from "@/lib/intelligence/adaptiveDealPricing";
import type { ProductCategorySlug } from "@/lib/intelligence/types";
import { getDealQualityBlend, inferDealMarketSegment } from "./dealCategoryWeights";
import { buildListingDealReasoning } from "./dealNarrative";
import { extractProductIdentity } from "./productIdentity";
import { combinedTitleSimilarity } from "./normalizeTitle";
import type {
  BuyVsWait,
  ClusterPicks,
  DataCompleteness,
  DealClusterDTO,
  DealVerdict,
  FakeDiscountRisk,
  ListingDealInsight,
  MarketplaceSellerRisk,
  PrimaryDealAction,
} from "./types";

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function discountPct(p: QuantProduct): number | null {
  if (p.oldPrice == null || p.oldPrice <= p.price || p.price <= 0) return null;
  return Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
}

function stockUrgency(p: QuantProduct): ListingDealInsight["stockUrgency"] {
  const blob = `${p.availability ?? ""} ${p.extensions.join(" ")}`.toLowerCase();
  if (/limited|low stock|only \d|few left|almost gone|hurry|ends (today|soon)/i.test(blob)) {
    return "elevated";
  }
  if (/last|selling fast|while supplies/i.test(blob)) return "low";
  return "none";
}

function returnPolicyHint(p: QuantProduct): string {
  const blob = `${p.extensions.join(" ")} ${p.shipping ?? ""}`.toLowerCase();
  if (/free return|30[\s-]*day return|money[-\s]?back|easy return|warranty/i.test(blob)) {
    return "Return- or warranty-friendly language detected in feed.";
  }
  if (/final sale|no return|non[-\s]?returnable/i.test(blob)) {
    return "Final-sale tone—returns may be restricted.";
  }
  return "Return policy not explicit in feed—verify on retailer checkout.";
}

export function peerPriceMedianExcluding(listings: QuantProduct[], excludeLink: string): number {
  const prices = listings
    .filter((x) => x.link !== excludeLink && x.price > 0)
    .map((x) => x.price);
  return median(prices);
}

function reviewDepth01(p: QuantProduct, maxReviews: number): number {
  const r = p.reviewsCount ?? 0;
  if (maxReviews <= 0) return r > 0 ? 0.45 : 0.25;
  return Math.min(1, Math.log10(r + 1) / Math.log10(maxReviews + 1));
}

function priceOutlierFactor(p: QuantProduct, listings: QuantProduct[]): number {
  const prices = listings.map((x) => x.price).filter((x) => x > 0).sort((a, b) => a - b);
  if (prices.length < 3) return 1;
  const q1 = prices[Math.floor(prices.length * 0.25)]!;
  const q3 = prices[Math.floor(prices.length * 0.75)]!;
  const iqr = Math.max(q3 - q1, 1);
  const z = Math.abs(p.price - median(prices)) / iqr;
  return z > 2.2 ? 1.35 : z > 1.6 ? 1.12 : 1;
}

export function fakeDiscountRisk(
  p: QuantProduct,
  listings: QuantProduct[],
  discount: number | null,
  maxReviews: number
): FakeDiscountRisk {
  if (discount == null || discount < 16) return "low";
  const peerMed = peerPriceMedianExcluding(listings, p.link);
  const trust = getStoreTrustScore(p.store);
  const depth = reviewDepth01(p, maxReviews);
  const outlier = priceOutlierFactor(p, listings);
  const lq = listingTextQuality01(p.title);

  const inflated = p.oldPrice != null && peerMed > 0 && p.oldPrice > peerMed * 1.38;
  const extreme = discount > 58;
  const weakTrust = trust < 54;
  const thinReviews = depth < 0.22 && (p.reviewsCount ?? 0) < 18;
  const tooSteepVsPeers = peerMed > 0 && p.price < peerMed * 0.58 && discount > 38;
  const noisyTitleSteepDisc = discount > 36 && lq < 0.34 && trust < 62;
  const ebayLowProof =
    /\bebay\b/i.test(p.store) && (p.reviewsCount ?? 0) < 14 && lq < 0.44 && discount != null && discount > 22;

  if (inflated && extreme) return "high";
  if (tooSteepVsPeers && (thinReviews || weakTrust)) return "high";
  if (noisyTitleSteepDisc && (inflated || thinReviews)) return "high";
  if (discount > 50 && trust < 60 && depth < 0.3) return "medium";
  if (ebayLowProof && (inflated || thinReviews)) return "medium";
  if (inflated || extreme || (discount > 42 && weakTrust && thinReviews)) return "medium";
  if (noisyTitleSteepDisc) return "medium";
  if (discount > 48 && outlier > 1.1 && thinReviews) return "medium";
  return "low";
}

export type DealVerdictContext = {
  category?: ProductCategorySlug;
  /** 0–100 from scoring engine when available (tray-relative price performance). */
  pricePerformance?: number;
};

export function dealVerdictFor(
  p: QuantProduct,
  listings: QuantProduct[],
  fair: number,
  fake: FakeDiscountRisk,
  discount: number | null,
  maxReviews: number,
  ctx?: DealVerdictContext
): DealVerdict {
  const trust = getStoreTrustScore(p.store);
  const r = ratingValue(p.rating);
  const comp = getFinalComposite(p, listings);
  const prices = listings.map((x) => x.price).filter((x) => x > 0);
  const cheapest = prices.length ? Math.min(...prices) : p.price;
  const econ = getCategoryPricingEconomics(ctx?.category ?? "general");
  const priceyMul = 1.12 + econ.priceyFairHeadroom;
  const priceyVsFair = fair > 0 && p.price > fair * priceyMul;
  const cheapVsFair = fair > 0 && p.price < fair * econ.cheapVsFairRatio;
  const depth = reviewDepth01(p, maxReviews);
  const peerMed = peerPriceMedianExcluding(listings, p.link);
  const suspiciousCheap = peerMed > 0 && p.price < peerMed * 0.55 && (discount ?? 0) > 40;

  if (fake === "high") return "Suspicious discount";
  if (fake === "medium" && discount != null && discount > 32) return "Suspicious discount";
  if (suspiciousCheap && (depth < 0.25 || trust < 58)) return "Suspicious discount";
  if (priceyVsFair && r < 4.12) return "Overpriced";
  if (priceyVsFair && comp < 62) return "Wait for lower pricing";
  if (cheapVsFair && trust >= 72 && r >= 4.0 && fake === "low" && depth >= 0.2) return "Real deal";
  if (discount != null && discount >= 14 && fake === "low" && trust >= 66 && depth >= 0.18) {
    return "Strong value";
  }
  if (p.price === cheapest && trust >= 64 && r >= 3.92) return "Strong value";
  if (comp >= 78 && !priceyVsFair && fake === "low") return "Strong value";
  if (
    discount != null &&
    discount >= 22 &&
    fake === "low" &&
    trust >= 76 &&
    peerMed > 0 &&
    p.price <= peerMed * 0.93 &&
    depth >= 0.26 &&
    r >= 4.08
  ) {
    return "Real deal";
  }
  if (priceyVsFair) return "Overpriced";

  const pp = ctx?.pricePerformance ?? comp;
  const valueDenseLane =
    cheapVsFair &&
    !priceyVsFair &&
    trust >= 60 &&
    fake === "low" &&
    !suspiciousCheap &&
    (comp >= 52 || (peerMed > 0 && p.price <= peerMed * 0.93) || pp >= 72);

  if (valueDenseLane) {
    if (comp >= 64 && r >= 3.95 && trust >= 66) return "Strong value";
    if (discount != null && discount >= 10 && trust >= 62) return "Strong value";
    return "Compare carefully";
  }

  const compositeHardWait = comp < 44 && !(cheapVsFair && trust >= 62 && fake === "low");
  const compositeSoftWait =
    (econ.lane === "budget" ? comp < 50 : comp < 56) && trust < 56 && !cheapVsFair;
  if (compositeHardWait || compositeSoftWait) return "Wait for lower pricing";
  if (comp < 62 && trust < 60 && !cheapVsFair) return "Wait for lower pricing";
  return "Compare carefully";
}

function buyVsWaitFor(
  p: QuantProduct,
  listings: QuantProduct[],
  verdict: DealVerdict,
  comp: number,
  fake: FakeDiscountRisk,
  tooGood: boolean
): BuyVsWait {
  if (tooGood || fake === "high") return "compare";
  if (verdict === "Suspicious discount" || verdict === "Overpriced" || verdict === "Wait for lower pricing") {
    return "wait";
  }
  if (verdict === "Real deal" && comp >= 80) return "buy_now";
  if (verdict === "Strong value" && comp >= 74) return "buy_now";
  if (listings.length >= 3 && comp < 68) return "compare";
  return "compare";
}

function ratingAuthenticityHint(p: QuantProduct, maxReviews: number): string {
  const r = ratingValue(p.rating);
  const n = p.reviewsCount ?? 0;
  const depth = reviewDepth01(p, maxReviews);
  if (r >= 4.9 && n < 22) {
    return "Near-perfect stars on thin review volume—possible early-rater bias; read recent text reviews.";
  }
  if (r >= 4.75 && depth < 0.26) {
    return "High rating with shallow proof—QuantAI discounts star power until depth catches up.";
  }
  if (r <= 3.45 && n > 180) {
    return "Large voter base with muted stars—more trustworthy as a caution flag than a hype score.";
  }
  return "Stars look ordinary for this tray—still scan for SKU-specific complaints and photos.";
}

function listingDataGaps(p: QuantProduct): string[] {
  const g: string[] = [];
  if (p.oldPrice == null) g.push("No list / anchor price in feed");
  if (!p.shipping?.trim()) g.push("Shipping text missing");
  if ((p.reviewsCount ?? 0) < 8) g.push("Thin review depth");
  if (ratingValue(p.rating) <= 0) g.push("Rating missing");
  return g;
}

function tooGoodToBeTrue(
  p: QuantProduct,
  listings: QuantProduct[],
  discount: number | null,
  maxReviews: number
): boolean {
  const peer = peerPriceMedianExcluding(listings, p.link);
  const depth = reviewDepth01(p, maxReviews);
  if (peer <= 0 || p.price <= 0) return false;
  return p.price < peer * 0.62 && (discount ?? 0) > 42 && depth < 0.28;
}

function clusterDataCompleteness(listings: QuantProduct[]): DataCompleteness {
  let pts = 0;
  const max = listings.length * 4;
  for (const p of listings) {
    if (ratingValue(p.rating) > 0) pts++;
    if ((p.reviewsCount ?? 0) >= 6) pts++;
    if (p.oldPrice != null) pts++;
    if (p.shipping?.trim()) pts++;
  }
  const r = pts / Math.max(1, max);
  if (r >= 0.72) return "high";
  if (r >= 0.45) return "medium";
  return "low";
}

function clusterTitleSimilarityMedian(listings: QuantProduct[]): number {
  const sims: number[] = [];
  for (let i = 0; i < listings.length; i++) {
    for (let j = i + 1; j < listings.length; j++) {
      sims.push(combinedTitleSimilarity(listings[i]!.title, listings[j]!.title));
    }
  }
  return sims.length ? median(sims) : 0;
}

function computeClusterDealConfidence(args: {
  listings: QuantProduct[];
  identities: ReturnType<typeof extractProductIdentity>[];
  insights: ListingDealInsight[];
  spreadPct: number;
  titleSimMedian: number;
  completeness: DataCompleteness;
}): number {
  const { listings, identities, insights, spreadPct, titleSimMedian, completeness } = args;
  let c = 36 + Math.min(22, listings.length * 7);
  if (titleSimMedian >= 0.48) c += 12;
  else if (titleSimMedian >= 0.34) c += 6;

  let idPairs = 0;
  for (let i = 0; i < identities.length; i++) {
    for (let j = i + 1; j < identities.length; j++) {
      const shared = identities[i]!.identifiers.some((x) => identities[j]!.identifiers.includes(x));
      if (shared) idPairs++;
    }
  }
  if (idPairs) c += Math.min(18, 6 + idPairs * 4);

  if (spreadPct > 52) c -= 9;
  if (spreadPct > 70) c -= 6;
  if (insights.some((i) => i.fakeDiscountRisk === "high")) c -= 10;
  if (insights.filter((i) => i.fakeDiscountRisk === "medium").length >= 2) c -= 5;
  if (completeness === "low") c -= 12;
  else if (completeness === "medium") c -= 5;

  return Math.min(100, Math.max(18, Math.round(c)));
}

function dealQualityScore(
  p: QuantProduct,
  listings: QuantProduct[],
  fake: FakeDiscountRisk,
  verdict: DealVerdict,
  fair: number,
  spreadPct: number,
  blend: ReturnType<typeof getDealQualityBlend>,
  returnHint: string
): number {
  const comp = getFinalComposite(p, listings);
  const trust = getStoreTrustScore(p.store);
  const del = p.qiSignals?.delivery ?? scoreDeliverySpeed(p.shipping) * 100;
  const r = ratingValue(p.rating);
  const maxRev = Math.max(...listings.map((x) => x.reviewsCount ?? 0), 1);
  const depth = reviewDepth01(p, maxRev) * 100;
  const disc = discountPct(p);
  const savings01 =
    fair > 0 && p.price > 0 ? Math.min(1, Math.max(-0.35, (fair - p.price) / fair)) : 0;
  const savingsSignal = Math.max(0, Math.min(100, 52 + savings01 * 85));
  const discAuth =
    fake === "low" ? (disc != null && disc >= 8 ? 74 : 56) : fake === "medium" ? 40 : 20;
  const volPen = Math.min(26, spreadPct * 0.2);
  const fakePen = fake === "high" ? 30 : fake === "medium" ? 15 : 0;
  const ret =
    /restricted|final|not explicit/i.test(returnHint) ? 44 : /friendly|warranty/i.test(returnHint) ? 80 : 58;
  const stockSig = stockUrgency(p) === "elevated" ? 22 : stockUrgency(p) === "low" ? 12 : 6;

  let s =
    comp * blend.composite +
    trust * blend.trust +
    Math.min(100, r * 20) * blend.rating +
    depth * blend.reviewDepth +
    del * blend.delivery +
    discAuth * blend.discountAuth +
    savingsSignal * blend.savingsVsFair +
    ret * blend.returnClarity +
    stockSig * blend.stockUrgency;

  s -= volPen * 0.45;
  s -= fakePen * 0.85;
  if (verdict === "Suspicious discount") s -= 12;
  if (verdict === "Real deal" || verdict === "Strong value") s += 4;

  return Math.min(100, Math.max(0, Math.round(s)));
}

function buyerConfidence(
  p: QuantProduct,
  listings: QuantProduct[],
  fake: FakeDiscountRisk,
  dealQ: number,
  dataGaps: string[],
  mkt: MarketplaceSellerRisk
): number {
  const trust = getStoreTrustScore(p.store);
  const depth = reviewDepth01(p, Math.max(...listings.map((x) => x.reviewsCount ?? 0), 1));
  let c = dealQ * 0.55 + trust * 0.25 + depth * 100 * 0.2;
  if (fake !== "low") c -= 14;
  if (mkt === "high") c -= 12;
  else if (mkt === "medium") c -= 6;
  c -= Math.min(18, dataGaps.length * 5);
  return Math.min(100, Math.max(0, Math.round(c)));
}

function pickBy(
  listings: QuantProduct[],
  score: (p: QuantProduct) => number,
  preferHigher: boolean
): string {
  let best = listings[0]!;
  let bestS = score(best);
  for (const p of listings) {
    const s = score(p);
    if (preferHigher ? s > bestS : s < bestS) {
      best = p;
      bestS = s;
    }
  }
  return best.link;
}

function buildCorePicks(
  listings: QuantProduct[]
): Omit<ClusterPicks, "riskyButCheap" | "waitForBetterPricing" | "bestWarrantySupport" | "premiumOverpriced"> {
  const safe = listings.filter((p) => p.price > 0);
  if (!safe.length) {
    const z = listings[0]?.link ?? "";
    return {
      bestOverall: z,
      bestBudget: z,
      mostTrusted: z,
      fastestDelivery: z,
      premiumChoice: z,
      bestLongTermValue: z,
    };
  }
  return {
    bestOverall: pickBy(
      safe,
      (p) =>
        getFinalComposite(p, listings) * 0.55 +
        getStoreTrustScore(p.store) * 0.25 +
        (p.qiSignals?.delivery ?? scoreDeliverySpeed(p.shipping) * 100) * 0.12 +
        (p.qiSignals?.pricePerformance ?? 50) * 0.08,
      true
    ),
    bestBudget: pickBy(safe, (p) => p.price, false),
    mostTrusted: pickBy(safe, (p) => getStoreTrustScore(p.store), true),
    fastestDelivery: pickBy(
      safe,
      (p) => p.qiSignals?.delivery ?? scoreDeliverySpeed(p.shipping) * 100,
      true
    ),
    premiumChoice: pickBy(
      safe,
      (p) => {
        const t = getStoreTrustScore(p.store);
        const r = ratingValue(p.rating);
        if (t >= 76 && r >= 4.25) return p.price;
        return p.price * 0.2 + t * 0.4;
      },
      true
    ),
    bestLongTermValue: pickBy(
      safe,
      (p) => p.qiSignals?.pricePerformance ?? getFinalComposite(p, listings),
      true
    ),
  };
}

function insightByLink(insights: ListingDealInsight[]): Map<string, ListingDealInsight> {
  const m = new Map<string, ListingDealInsight>();
  for (const i of insights) m.set(i.link, i);
  return m;
}

function pickRiskyButCheap(listings: QuantProduct[], insights: ListingDealInsight[]): string {
  const safe = listings.filter((p) => p.price > 0);
  if (!safe.length) return listings[0]?.link ?? "";
  const map = insightByLink(insights);
  const scored = safe.map((p) => {
    const i = map.get(p.link);
    const trust = getStoreTrustScore(p.store);
    const risk =
      (100 - trust) * 0.38 +
      (i?.fakeDiscountRisk === "high" ? 34 : i?.fakeDiscountRisk === "medium" ? 16 : 0) +
      ((p.reviewsCount ?? 0) < 16 ? 14 : 0);
    return { p, risk, price: p.price };
  });
  const risky = scored.filter((s) => s.risk > 36 || getStoreTrustScore(s.p.store) < 60);
  const pool = risky.length ? risky : scored;
  pool.sort((a, b) => a.price - b.price || b.risk - a.risk);
  return pool[0]!.p.link;
}

function warrantySupportScore(p: QuantProduct): number {
  const h = returnPolicyHint(p);
  let s = getStoreTrustScore(p.store);
  if (/friendly|warranty|money|return/i.test(h)) s += 24;
  if (/restricted|final|not explicit/i.test(h)) s -= 16;
  return s;
}

function pickBestWarrantySupport(listings: QuantProduct[]): string {
  const safe = listings.filter((p) => p.price > 0);
  if (!safe.length) return listings[0]?.link ?? "";
  return pickBy(safe, (p) => warrantySupportScore(p), true);
}

function pickPremiumOverpriced(listings: QuantProduct[], insights: ListingDealInsight[]): string {
  const safe = listings.filter((p) => p.price > 0);
  if (!safe.length) return listings[0]?.link ?? "";
  const map = insightByLink(insights);
  const over = safe.filter((p) => map.get(p.link)?.dealVerdict === "Overpriced");
  if (over.length) return pickBy(over, (p) => p.price, true);
  const soft = safe.filter((p) => (map.get(p.link)?.dealQualityScore ?? 99) < 58);
  if (soft.length) return pickBy(soft, (p) => p.price, true);
  return pickBy(safe, (p) => p.price, true);
}

function pickWaitForBetter(listings: QuantProduct[], insights: ListingDealInsight[], fair: number): string {
  const safe = listings.filter((p) => p.price > 0);
  if (!safe.length) return listings[0]?.link ?? "";
  const map = insightByLink(insights);
  const bad = safe.filter((p) => {
    const v = map.get(p.link)?.dealVerdict;
    return v === "Wait for lower pricing" || v === "Overpriced";
  });
  const pool = bad.length ? bad : safe;
  return pickBy(
    pool,
    (p) => {
      const fq = map.get(p.link)?.dealQualityScore ?? 50;
      const ratio = fair > 0 ? p.price / fair : 1;
      return ratio * 18 + (100 - fq) * 0.35;
    },
    true
  );
}

function volatilityNote(listings: QuantProduct[]): string {
  const prices = listings.map((p) => p.price).filter((p) => p > 0);
  if (prices.length < 2) return "Single-store cluster—no cross-retailer spread to measure.";
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const varc =
    prices.reduce((a, x) => a + (x - mean) ** 2, 0) / Math.max(1, prices.length - 1);
  const cv = mean > 0 ? Math.sqrt(varc) / mean : 0;
  if (cv < 0.08) return "Tight pricing band across stores—market looks efficient for this title.";
  if (cv < 0.18) return "Moderate dispersion—worth a deliberate store pick, not just the lowest euro.";
  return "Wide price ladder—volatility suggests promos, bundles, or mismatched SKUs; read titles closely.";
}

function advisorSummaryText(
  listings: QuantProduct[],
  picks: ClusterPicks,
  fair: number,
  confidence: number,
  categoryLabel: string
): string {
  const top = listings.find((p) => p.link === picks.bestOverall);
  const cheap = listings.find((p) => p.link === picks.bestBudget);
  if (!top || !cheap) return "QuantAI mapped this bundle—open the table to compare stores.";
  const spreadPct =
    top.price > 0 && cheap.price > 0 ? Math.round(((top.price - cheap.price) / cheap.price) * 100) : 0;
  return `Fair-market read ≈ €${Math.round(fair)} across ${listings.length} stores (${categoryLabel}). Best overall QI leans ${top.store}; leanest checkout is ${cheap.store} (~${spreadPct}% vs overall pick). Cluster confidence ${confidence}/100 is heuristic—confirm SKU parity before you buy.`;
}

export function analyzeDealCluster(id: string, listings: QuantProduct[]): DealClusterDTO {
  const { segment, label: inferredCategoryLabel, slug: clusterCategorySlug } = inferDealMarketSegment(listings);
  const blend = getDealQualityBlend(segment);
  const identities = listings.map(extractProductIdentity);

  const prices = listings.map((p) => p.price).filter((p) => p > 0);
  const fair = prices.length ? median(prices) : 0;
  const minP = prices.length ? Math.min(...prices) : 0;
  const maxP = prices.length ? Math.max(...prices) : 0;
  const avgP = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const spreadPct = maxP > 0 ? Math.round(((maxP - minP) / maxP) * 100) : 0;
  const maxReviews = Math.max(...listings.map((p) => p.reviewsCount ?? 0), 1);

  const discPcts = listings.map((p) => discountPct(p)).filter((x): x is number => x != null);
  const bestDiscountPct = discPcts.length ? Math.max(...discPcts) : null;

  const core = buildCorePicks(listings);
  const titleSimMedian = clusterTitleSimilarityMedian(listings);
  const completeness = clusterDataCompleteness(listings);

  const provisionalInsights: ListingDealInsight[] = listings.map((p) => {
    const disc = discountPct(p);
    const fake = fakeDiscountRisk(p, listings, disc, maxReviews);
    const verdict = dealVerdictFor(p, listings, fair, fake, disc, maxReviews, {
      category: clusterCategorySlug,
      pricePerformance: p.qiSignals?.pricePerformance,
    });
    const returnHint = returnPolicyHint(p);
    const dataGaps = listingDataGaps(p);
    const tg = tooGoodToBeTrue(p, listings, disc, maxReviews);
    const dq = dealQualityScore(p, listings, fake, verdict, fair, spreadPct, blend, returnHint);
    const mkt = getMarketplaceSellerRiskTier(p.store, p.title);
    const buyVsWait = buyVsWaitFor(
      p,
      listings,
      verdict,
      getFinalComposite(p, listings),
      fake,
      tg
    );
    return {
      link: p.link,
      dealVerdict: verdict,
      dealQualityScore: dq,
      buyerConfidence: buyerConfidence(p, listings, fake, dq, dataGaps, mkt),
      reasoning: buildListingDealReasoning(
        p,
        verdict,
        fake,
        fair > 0 && p.price > 0 ? Math.round(fair - p.price) : null,
        minP,
        listings.length,
        inferredCategoryLabel,
        dataGaps,
        tg
      ),
      fakeDiscountRisk: fake,
      buyVsWait,
      discountPct: disc,
      returnPolicyHint: returnHint,
      stockUrgency: stockUrgency(p),
      savingsVsFair: fair > 0 && p.price > 0 ? Math.round(fair - p.price) : null,
      tooGoodToBeTrue: tg,
      dataGaps,
      marketplaceSellerRisk: mkt,
      ratingAuthenticityHint: ratingAuthenticityHint(p, maxReviews),
    };
  });

  const picks: ClusterPicks = {
    ...core,
    riskyButCheap: pickRiskyButCheap(listings, provisionalInsights),
    waitForBetterPricing: pickWaitForBetter(listings, provisionalInsights, fair),
    bestWarrantySupport: pickBestWarrantySupport(listings),
    premiumOverpriced: pickPremiumOverpriced(listings, provisionalInsights),
  };

  const suspiciousDiscountCluster =
    provisionalInsights.some((i) => i.fakeDiscountRisk === "high") ||
    provisionalInsights.filter((i) => i.fakeDiscountRisk === "medium").length >= 2;

  const clusterDealConfidence = computeClusterDealConfidence({
    listings,
    identities,
    insights: provisionalInsights,
    spreadPct,
    titleSimMedian,
    completeness,
  });

  const matchSignalsSummary = buildMatchSignalsSummary(listings, identities);
  const groupingRationale = buildGroupingRationale(listings, identities, inferredCategoryLabel);
  const hiddenRisksNote = buildHiddenRisksNote(listings, provisionalInsights, suspiciousDiscountCluster);
  const retailTrustNote = buildRetailTrustNote(listings);
  const uncertaintyNote = buildUncertaintyNote(listings, completeness);
  const whenCheapestNotBest = buildWhenCheapestNotBest(listings, picks, provisionalInsights);
  const primary = buildPrimaryRecommendation({
    listings,
    insights: provisionalInsights,
    suspiciousCluster: suspiciousDiscountCluster,
    clusterConfidence: clusterDealConfidence,
  });

  return {
    id,
    canonicalTitle: canonicalClusterTitle(listings),
    listings,
    fairMarketEstimate: Math.round(fair),
    minPrice: Math.round(minP * 100) / 100,
    maxPrice: Math.round(maxP * 100) / 100,
    avgPrice: Math.round(avgP * 100) / 100,
    priceSpreadPct: spreadPct,
    bestDiscountPct,
    volatilityNote: volatilityNote(listings),
    picks,
    listingInsights: provisionalInsights,
    advisorSummary: advisorSummaryText(listings, picks, fair, clusterDealConfidence, inferredCategoryLabel),
    clusterDealConfidence,
    suspiciousDiscountCluster,
    dataCompleteness: completeness,
    inferredCategoryLabel,
    retailTrustNote,
    groupingRationale,
    hiddenRisksNote,
    whenCheapestNotBest,
    primaryRecommendation: primary.action as PrimaryDealAction,
    primaryRecommendationReason: primary.reason,
    uncertaintyNote,
    matchSignalsSummary,
    imageSimilarityNote: imageSimilarityPlaceholder(),
  };
}
