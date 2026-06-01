"use client";

import { useMemo } from "react";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";
import { currencySymbolFromListing, formatListingPrice } from "@/lib/commerce/cues";
import { buildMarketSummary } from "@/lib/ui/marketSummary";

type Props = {
  products: QuantProduct[];
  searchQuery?: string;
  searchIntelligence?: SearchIntelligenceDTO | null;
  marketComparison?: {
    merchantCount?: number;
    trustedMerchantCount?: number;
  } | null;
};

export default function LiveIntelligenceMetrics({
  products,
  searchQuery = "",
  searchIntelligence = null,
  marketComparison = null,
}: Props) {
  const summary = useMemo(
    () => buildMarketSummary(products, searchIntelligence, marketComparison),
    [products, searchIntelligence, marketComparison]
  );

  const metrics = useMemo(() => {
    if (!products.length) return null;
    const prices = products.map((p) => p.price).filter((p) => p > 0);
    const min = prices.length ? Math.min(...prices) : 0;
    const max = prices.length ? Math.max(...prices) : 0;
    const retailers = new Set(products.map((p) => p.store));
    const trusted = products.filter((p) => getStoreTrustScore(p.store) >= 72).length;
    const action = summary?.recommendedAction ?? "COMPARE";
    const sym = currencySymbolFromListing(products[0]!);

    return [
      {
        label: "Sources scanned",
        value: String(products.length),
        detail: searchQuery.trim() ? `"${searchQuery.trim()}"` : "Live tray",
      },
      {
        label: "Trusted sellers",
        value: String(summary?.trustedSellerCount ?? trusted),
        detail: "Verified merchant read",
      },
      {
        label: "Active retailers",
        value: String(summary?.activeRetailers ?? retailers.size),
        detail: "In this market scan",
      },
      {
        label: "Price band",
        value:
          min > 0 && max > min
            ? `${formatListingPrice(min, sym)} – ${formatListingPrice(max, sym)}`
            : min > 0
              ? formatListingPrice(min, sym)
              : "—",
        detail: "Observed spread",
      },
      {
        label: "Market posture",
        value: action,
        detail: summary ? `${summary.confidence}% confidence` : "Decision read",
        accent: true,
      },
    ];
  }, [products, searchQuery, summary, searchIntelligence]);

  if (!metrics) return null;

  return (
    <section className="qa-ref-live-metrics" aria-label="Live intelligence metrics">
      <div className="qa-ref-live-metrics__head">
        <span className="qa-ref-live-metrics__pulse" aria-hidden />
        <p className="qa-ref-kicker">Live intelligence metrics</p>
      </div>
      <div className="qa-ref-live-metrics__grid">
        {metrics.map((m) => (
          <article
            key={m.label}
            className={`qa-ref-live-metrics__cell${m.accent ? " qa-ref-live-metrics__cell--accent" : ""}`}
          >
            <p className="qa-ref-live-metrics__label">{m.label}</p>
            <p className="qa-ref-live-metrics__value">{m.value}</p>
            <p className="qa-ref-live-metrics__detail">{m.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
