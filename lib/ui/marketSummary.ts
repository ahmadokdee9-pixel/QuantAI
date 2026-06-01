import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import { getStoreTrustScore, type QuantProduct } from "@/lib/shoppingScore";
import { deriveCardDecision, searchIntelActionLabel } from "@/lib/ui/decisionLanguage";

export type MarketSummaryData = {
  averagePrice: number;
  trustedSellerCount: number;
  sourcesScanned: number;
  activeRetailers: number;
  bestValueSeller: string;
  bestValuePrice: number;
  highestTrustSeller: string;
  highestTrustScore: number;
  recommendedAction: string;
  confidence: number;
  marketObservation: string;
};

const TRUSTED_THRESHOLD = 72;

export function buildMarketSummary(
  products: QuantProduct[],
  searchIntelligence?: SearchIntelligenceDTO | null,
  marketComparison?: {
    merchantCount?: number;
    trustedMerchantCount?: number;
  } | null
): MarketSummaryData | null {
  if (products.length === 0) return null;

  const prices = products.map((p) => p.price).filter((p) => p > 0);
  const averagePrice =
    prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0;

  const enriched = products.map((p) => ({
    product: p,
    trust: getStoreTrustScore(p.store),
  }));

  const trusted = enriched.filter((row) => row.trust >= TRUSTED_THRESHOLD);
  const trustedSellerCount =
    marketComparison?.trustedMerchantCount ?? new Set(trusted.map((r) => r.product.store)).size;

  const retailers = new Set(products.map((p) => p.store));
  const activeRetailers = marketComparison?.merchantCount ?? retailers.size;

  const bestValueRow = [...enriched].sort((a, b) => a.product.price - b.product.price)[0];
  const highestTrustRow = [...enriched].sort((a, b) => b.trust - a.trust)[0];

  const lead = enriched[0];
  const leadDecision = lead
    ? deriveCardDecision({
        trustScore: lead.trust,
        weakRetailer: lead.trust < 52,
        pricePosture: "fair",
        peerCount: products.length,
      })
    : null;

  const recommendedAction = searchIntelligence
    ? searchIntelActionLabel(searchIntelligence.finalRecommendation)
    : leadDecision?.verdict ?? "COMPARE";

  const confidence = searchIntelligence
    ? Math.round(Math.max(8, 100 - searchIntelligence.buyerUncertaintyScore))
    : leadDecision?.alignmentScore ?? 50;

  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const spreadPct =
    minPrice > 0 && maxPrice > minPrice ? Math.round(((maxPrice - minPrice) / minPrice) * 100) : 0;

  const marketObservation =
    searchIntelligence?.finalBody?.trim() ||
    (spreadPct > 35
      ? "Price spread remains wide across sellers — compare before committing."
      : trustedSellerCount >= 2
        ? "Multiple trusted sellers found — value and trust signals are usable."
        : "Seller trust is mixed — validate checkout details before buying.");

  return {
    averagePrice,
    trustedSellerCount,
    sourcesScanned: products.length,
    activeRetailers,
    bestValueSeller: bestValueRow?.product.store ?? "—",
    bestValuePrice: bestValueRow?.product.price ?? 0,
    highestTrustSeller: highestTrustRow?.product.store ?? "—",
    highestTrustScore: highestTrustRow?.trust ?? 0,
    recommendedAction,
    confidence,
    marketObservation,
  };
}
