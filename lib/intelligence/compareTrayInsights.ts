import { currencySymbolFromListing, formatListingPrice } from "@/lib/commerce/cues";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";

export type CompareQuickLine = { id: string; title: string; body: string };

/** Pre-verdict analyst snapshot — grid #1 is always the canonical compare leader. */
export function buildCompareTrayInsights(
  compareProducts: QuantProduct[],
  trustOrderedProducts: QuantProduct[],
  options?: { leaderRecommendationLabel?: string | null }
): CompareQuickLine[] {
  if (compareProducts.length < 2 || trustOrderedProducts.length === 0) return [];

  const gridLeader = trustOrderedProducts[0]!;
  const sym = currencySymbolFromListing(gridLeader);
  const lines: CompareQuickLine[] = [];

  lines.push({
    id: "grid-leader",
    title: "Grid #1 — canonical leader",
    body: `${gridLeader.title.slice(0, 56)}${gridLeader.title.length > 56 ? "…" : ""} · ${options?.leaderRecommendationLabel ? `recommendation ${options.leaderRecommendationLabel} · ` : ""}matches search grid rank #1 and canonical trust order.`,
  });

  const pinnedHasLeader = compareProducts.some((product) => product.link === gridLeader.link);
  if (!pinnedHasLeader) {
    lines.push({
      id: "leader-not-pinned",
      title: "Canonical leader not pinned",
      body: `Grid #1 is not in your compare set — pin it to benchmark alternatives against the canonical leader.`,
    });
  }

  const alternatives = compareProducts.filter((product) => product.link !== gridLeader.link);
  if (alternatives.length > 0) {
    const alt = alternatives.sort((a, b) => a.price - b.price)[0]!;
    if (alt.price > 0 && gridLeader.price > 0 && alt.price < gridLeader.price) {
      lines.push({
        id: "price",
        title: "Lower price in compare set",
        body: `${alt.title.slice(0, 48)}… at ${formatListingPrice(alt.price, sym)} — verify SKU parity vs grid #1 before switching.`,
      });
    }
  }

  const safestAlt = [...compareProducts]
    .filter((product) => product.link !== gridLeader.link)
    .sort((a, b) => getStoreTrustScore(b.store) - getStoreTrustScore(a.store))[0];
  if (safestAlt) {
    const trust = getStoreTrustScore(safestAlt.store);
    if (trust > getStoreTrustScore(gridLeader.store) + 8) {
      lines.push({
        id: "trust",
        title: "Higher-trust pinned alternative",
        body: `${safestAlt.title.slice(0, 48)}… · trust prior ${trust}/100 — still secondary to grid #1 unless you override manually.`,
      });
    }
  }

  const riskiest = [...compareProducts].sort(
    (a, b) => (b.qiCommerce?.retailerRiskScore ?? 40) - (a.qiCommerce?.retailerRiskScore ?? 40)
  )[0];
  if (riskiest && (riskiest.qiCommerce?.retailerRiskScore ?? 40) >= 58) {
    lines.push({
      id: "risk",
      title: "Risk spotlight",
      body: `${riskiest.title.slice(0, 48)}… retailer-risk heuristic ${riskiest.qiCommerce?.retailerRiskScore ?? 40}/100 — read seller terms closely.`,
    });
  }

  const byVfm = [...compareProducts].sort(
    (a, b) => (b.qiCommerce?.valueForMoney ?? 50) - (a.qiCommerce?.valueForMoney ?? 50)
  );
  const vfmLead = byVfm[0];
  if (vfmLead && vfmLead.link !== gridLeader.link && compareProducts.length >= 2) {
    const stars = ratingValue(vfmLead.rating);
    if (stars > 0) {
      lines.push({
        id: "vfm",
        title: "Value signal in pinned set",
        body: `${vfmLead.title.slice(0, 48)}… shows stronger modeled value-for-money vs other pinned rows (grid #1 remains canonical).`,
      });
    }
  }

  return lines.slice(0, 5);
}
