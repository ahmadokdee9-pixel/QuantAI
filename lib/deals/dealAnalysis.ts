import { scoreDeliverySpeed } from "@/lib/intelligence/deliveryScore";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";
import { buildListingDealReasoning } from "./dealNarrative";
import { canonicalClusterTitle } from "./clusterEngine";
import type {
  BuyVsWait,
  ClusterPicks,
  DealClusterDTO,
  DealVerdict,
  FakeDiscountRisk,
  ListingDealInsight,
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
  if (/free return|30[\s-]*day return|money[-\s]?back|easy return/i.test(blob)) {
    return "Return-friendly language detected in feed.";
  }
  if (/final sale|no return|non[-\s]?returnable/i.test(blob)) {
    return "Final-sale tone—returns may be restricted.";
  }
  return "Return policy not explicit in feed—verify on retailer checkout.";
}

function peerPriceMedianExcluding(listings: QuantProduct[], excludeLink: string): number {
  const prices = listings
    .filter((x) => x.link !== excludeLink && x.price > 0)
    .map((x) => x.price);
  return median(prices);
}

export function fakeDiscountRisk(
  p: QuantProduct,
  listings: QuantProduct[],
  discount: number | null
): FakeDiscountRisk {
  if (discount == null || discount < 18) return "low";
  const peerMed = peerPriceMedianExcluding(listings, p.link);
  if (peerMed <= 0) return discount > 55 ? "medium" : "low";
  const inflated = p.oldPrice != null && p.oldPrice > peerMed * 1.42;
  const extreme = discount > 62;
  if (inflated && extreme) return "high";
  if (inflated || extreme) return "medium";
  return "low";
}

export function dealVerdictFor(
  p: QuantProduct,
  listings: QuantProduct[],
  fair: number,
  fake: FakeDiscountRisk,
  discount: number | null
): DealVerdict {
  const trust = getStoreTrustScore(p.store);
  const r = ratingValue(p.rating);
  const comp = getFinalComposite(p, listings);
  const prices = listings.map((x) => x.price).filter((x) => x > 0);
  const cheapest = prices.length ? Math.min(...prices) : p.price;
  const priceyVsFair = fair > 0 && p.price > fair * 1.12;
  const cheapVsFair = fair > 0 && p.price < fair * 0.9;

  if (fake === "high") return "Suspicious discount";
  if (fake === "medium" && discount != null && discount > 35) return "Suspicious discount";
  if (priceyVsFair && r < 4.15) return "Overpriced";
  if (priceyVsFair && comp < 62) return "Wait for lower pricing";
  if (cheapVsFair && trust >= 72 && r >= 4.0 && fake === "low") return "Real deal";
  if (discount != null && discount >= 15 && fake === "low" && trust >= 68) return "Strong value";
  if (p.price === cheapest && trust >= 65 && r >= 3.95) return "Strong value";
  if (comp >= 78 && !priceyVsFair) return "Strong value";
  if (priceyVsFair) return "Overpriced";
  if (comp < 60) return "Wait for lower pricing";
  return "Compare carefully";
}

function buyVsWaitFor(
  p: QuantProduct,
  listings: QuantProduct[],
  verdict: DealVerdict,
  comp: number
): BuyVsWait {
  if (verdict === "Suspicious discount" || verdict === "Overpriced" || verdict === "Wait for lower pricing") {
    return "wait";
  }
  if (verdict === "Real deal" && comp >= 80) return "buy_now";
  if (verdict === "Strong value" && comp >= 74) return "buy_now";
  if (listings.length >= 3 && comp < 70) return "compare";
  return "compare";
}

function dealQualityScore(
  p: QuantProduct,
  listings: QuantProduct[],
  fake: FakeDiscountRisk,
  verdict: DealVerdict
): number {
  const comp = getFinalComposite(p, listings);
  const trust = getStoreTrustScore(p.store);
  const del = p.qiSignals?.delivery ?? scoreDeliverySpeed(p.shipping) * 100;
  const disc = discountPct(p);
  let s = comp * 0.52 + trust * 0.22 + del * 0.12;
  if (disc != null && disc >= 10 && fake === "low") s += 6;
  if (fake === "high") s -= 18;
  if (fake === "medium") s -= 8;
  if (verdict === "Suspicious discount") s -= 10;
  if (verdict === "Real deal" || verdict === "Strong value") s += 4;
  return Math.min(100, Math.max(0, Math.round(s)));
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

function buildPicks(listings: QuantProduct[]): ClusterPicks {
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
    bestLongTermValue: pickBy(safe, (p) => p.qiSignals?.pricePerformance ?? getFinalComposite(p, listings), true),
  };
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

function advisorSummaryText(listings: QuantProduct[], picks: ClusterPicks, fair: number): string {
  const top = listings.find((p) => p.link === picks.bestOverall);
  const cheap = listings.find((p) => p.link === picks.bestBudget);
  if (!top || !cheap) return "QuantAI mapped this bundle—open the table to compare stores.";
  const spread =
    top.price > 0 && cheap.price > 0 ? Math.round(((top.price - cheap.price) / cheap.price) * 100) : 0;
  return `Fair-market read ≈ €${Math.round(fair)} across ${listings.length} stores. Best overall QI leans ${top.store}; leanest checkout is ${cheap.store} (~${spread}% vs overall pick).`;
}

export function analyzeDealCluster(id: string, listings: QuantProduct[]): DealClusterDTO {
  const prices = listings.map((p) => p.price).filter((p) => p > 0);
  const fair = prices.length ? median(prices) : 0;
  const minP = prices.length ? Math.min(...prices) : 0;
  const maxP = prices.length ? Math.max(...prices) : 0;
  const spreadPct = maxP > 0 ? Math.round(((maxP - minP) / maxP) * 100) : 0;
  const picks = buildPicks(listings);
  const peerCheapest = minP;

  const listingInsights: ListingDealInsight[] = listings.map((p) => {
    const disc = discountPct(p);
    const fake = fakeDiscountRisk(p, listings, disc);
    const verdict = dealVerdictFor(p, listings, fair, fake, disc);
    const savingsVsFair = fair > 0 && p.price > 0 ? Math.round(fair - p.price) : null;
    return {
      link: p.link,
      dealVerdict: verdict,
      dealQualityScore: dealQualityScore(p, listings, fake, verdict),
      reasoning: buildListingDealReasoning(p, verdict, fake, savingsVsFair, peerCheapest, listings.length),
      fakeDiscountRisk: fake,
      buyVsWait: buyVsWaitFor(p, listings, verdict, getFinalComposite(p, listings)),
      discountPct: disc,
      returnPolicyHint: returnPolicyHint(p),
      stockUrgency: stockUrgency(p),
      savingsVsFair,
    };
  });

  return {
    id,
    canonicalTitle: canonicalClusterTitle(listings),
    listings,
    fairMarketEstimate: Math.round(fair),
    priceSpreadPct: spreadPct,
    volatilityNote: volatilityNote(listings),
    picks,
    listingInsights,
    advisorSummary: advisorSummaryText(listings, picks, fair),
  };
}
