import { currencySymbolFromListing, formatListingPrice } from "@/lib/commerce/cues";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";

export type CompareQuickLine = { id: string; title: string; body: string };

/** Pre-verdict analyst snapshot — pure heuristics from pinned rows vs full tray. */
export function buildCompareTrayInsights(products: QuantProduct[], list: QuantProduct[]): CompareQuickLine[] {
  if (products.length < 2) return [];
  const sym = currencySymbolFromListing(products[0]!);
  const rows = products.map((p) => {
    const qi = getFinalComposite(p, list);
    const trust = getStoreTrustScore(p.store);
    const stars = ratingValue(p.rating);
    const rev = p.reviewsCount ?? 0;
    const risk = p.qiCommerce?.retailerRiskScore ?? 40;
    const vfm = p.qiCommerce?.valueForMoney ?? 50;
    return { p, qi, trust, stars, rev, risk, vfm };
  });
  const byQi = [...rows].sort((a, b) => b.qi - a.qi);
  const byTrust = [...rows].sort((a, b) => b.trust - a.trust);
  const byPrice = [...rows].filter((r) => r.p.price > 0).sort((a, b) => a.p.price - b.p.price);
  const byRisk = [...rows].sort((a, b) => b.risk - a.risk);

  const lines: CompareQuickLine[] = [];
  const lead = byQi[0]!;
  lines.push({
    id: "composite",
    title: "Composite leader",
    body: `${lead.p.title.slice(0, 56)}${lead.p.title.length > 56 ? "…" : ""} · QI ${lead.qi} — strongest blended score in your compare set.`,
  });

  const safest = byTrust[0]!;
  if (safest.p.link !== lead.p.link) {
    lines.push({
      id: "trust",
      title: "Safer checkout lane",
      body: `${safest.p.title.slice(0, 48)}… · trust prior ${safest.trust}/100 — calmer if policy anxiety dominates.`,
    });
  }

  if (byPrice[0]) {
    const cheap = byPrice[0]!;
    lines.push({
      id: "price",
      title: "Price floor in selection",
      body: `${cheap.p.title.slice(0, 48)}… at ${formatListingPrice(cheap.p.price, sym)} — sanity-check SKU parity vs higher-QI rows.`,
    });
  }

  const riskiest = byRisk[0]!;
  if (riskiest.risk >= 58) {
    lines.push({
      id: "risk",
      title: "Risk spotlight",
      body: `${riskiest.p.title.slice(0, 48)}… retailer-risk heuristic ${riskiest.risk}/100 — read seller and fulfilment language closely.`,
    });
  }

  const byVfm = [...rows].sort((a, b) => b.vfm - a.vfm);
  const vfmLead = byVfm[0]!;
  if (vfmLead.p.link !== lead.p.link && products.length >= 2) {
    lines.push({
      id: "vfm",
      title: "Value-for-money lean",
      body: `${vfmLead.p.title.slice(0, 48)}… scores higher on modeled value-for-money vs peers you pinned.`,
    });
  }

  return lines.slice(0, 5);
}
