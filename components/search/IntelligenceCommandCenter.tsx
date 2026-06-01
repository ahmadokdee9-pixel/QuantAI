"use client";

import { useMemo } from "react";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";
import { buildMarketSummary } from "@/lib/ui/marketSummary";
import LiveIntelligenceRail from "./LiveIntelligenceRail";

type Props = {
  products: QuantProduct[];
  searchQuery?: string;
  searchIntelligence?: SearchIntelligenceDTO | null;
  marketComparison?: {
    merchantCount?: number;
    trustedMerchantCount?: number;
  } | null;
};

/** Live processing rail for active scan — compact status only. */
export default function IntelligenceCommandCenter({
  products,
  searchQuery = "",
  searchIntelligence = null,
  marketComparison = null,
}: Props) {
  const summary = useMemo(
    () => buildMarketSummary(products, searchIntelligence, marketComparison),
    [products, searchIntelligence, marketComparison],
  );

  const stageIndex = useMemo(() => {
    if (!products.length || !summary) return 0;

    const prices = products.map((p) => p.price).filter((p) => p > 0);
    const min = prices.length ? Math.min(...prices) : 0;
    const max = prices.length ? Math.max(...prices) : 0;
    const hasTrust = products.some((p) => getStoreTrustScore(p.store) >= 72);
    const hasSeller = summary.trustedSellerCount >= 1;
    const hasPrice = min > 0 && max >= min;
    const hasConfidence = summary.confidence > 0;
    const hasSynthesis = Boolean(summary.recommendedAction);

    if (hasSynthesis) return 5;
    if (hasConfidence) return 4;
    if (hasPrice) return 3;
    if (hasSeller) return 2;
    if (hasTrust) return 1;
    return 0;
  }, [products, summary]);

  if (!summary || !products.length) return null;

  return (
    <LiveIntelligenceRail live searchQuery={searchQuery} stageIndex={stageIndex} />
  );
}
