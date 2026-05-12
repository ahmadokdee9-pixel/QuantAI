import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";

export type SimulatedDealSignal = {
  id: string;
  headline: string;
  detail: string;
  /** Minutes “ago” for display only — derived from tray geometry, not live ticks. */
  recencyMinutes: number;
};

function traySeed(products: QuantProduct[]): number {
  return products.slice(0, 16).reduce((acc, p) => acc + p.link.length + Math.round(p.price), 0);
}

/**
 * Session-safe, deterministic “movement” copy from the current tray only.
 * Framed as interpretive signals — not websocket price feeds.
 */
export function buildSimulatedDealSignals(query: string, products: QuantProduct[]): SimulatedDealSignal[] {
  if (!products.length) return [];
  const seed = traySeed(products);
  const L = products;
  const prices = L.map((p) => p.price).filter((x) => x > 0).sort((a, b) => a - b);
  const minP = prices[0] ?? 0;
  const second = prices.length > 1 ? prices[1]! : minP;
  const gap = Math.max(0, Math.round(second - minP));
  const stores = new Set(L.map((p) => p.store.toLowerCase().trim()));
  const storeCount = stores.size;
  const top = [...L].sort((a, b) => getFinalComposite(b, L) - getFinalComposite(a, L))[0]!;
  const topRev = top.reviewsCount ?? 0;
  const avgRev = L.reduce((s, p) => s + (p.reviewsCount ?? 0), 0) / Math.max(1, L.length);
  const lowTrust = Math.min(...L.map((p) => getStoreTrustScore(p.store)));
  const highTrust = Math.max(...L.map((p) => getStoreTrustScore(p.store)));
  const q = query.trim().slice(0, 48) || "this query";

  const out: SimulatedDealSignal[] = [];

  if (gap > 0 && minP > 0) {
    out.push({
      id: "floor-gap",
      headline: "Price ladder vs floor",
      detail: `Lowest ask sits €${gap} under the next visible rung on “${q}” — useful for anchoring expectations before checkout, not a live exchange feed.`,
      recencyMinutes: 6 + (seed % 18),
    });
  } else if (minP > 0) {
    out.push({
      id: "synthetic-gap",
      headline: "Tight price band",
      detail: `Headline asks cluster near €${minP} — differentiation shifts to trust, fulfilment language, and review depth rather than headline spread.`,
      recencyMinutes: 10 + (seed % 24),
    });
  }

  if (storeCount >= 2) {
    const extra = storeCount >= 4 ? "Broader storefront mix" : "Compact storefront mix";
    out.push({
      id: "stores",
      headline: "Retailer map",
      detail: `${extra}: ${storeCount} distinct storefronts in this tray — compare returns and seller policies, not only list price.`,
      recencyMinutes: 14 + (seed % 30),
    });
  }

  if (topRev > 0 && avgRev > 40) {
    out.push({
      id: "reviews",
      headline: "Review-weighted confidence",
      detail: `Leader row carries ${topRev.toLocaleString()} reviews vs tray average ~${Math.round(avgRev)} — model confidence leans on volume where stars are meaningful.`,
      recencyMinutes: 22 + (seed % 20),
    });
  }

  const withCommerce = L.filter((p) => p.qiCommerce?.confidence != null);
  if (withCommerce.length >= 2) {
    const hi = withCommerce.reduce((a, b) => {
      const ca = a.qiCommerce?.confidence ?? 0;
      const cb = b.qiCommerce?.confidence ?? 0;
      return cb >= ca ? b : a;
    });
    const lo = withCommerce.reduce((a, b) => {
      const ca = a.qiCommerce?.confidence ?? 100;
      const cb = b.qiCommerce?.confidence ?? 100;
      return cb <= ca ? b : a;
    });
    const spread = (hi.qiCommerce?.confidence ?? 0) - (lo.qiCommerce?.confidence ?? 0);
    if (spread >= 12) {
      out.push({
        id: "confidence-spread",
        headline: "Confidence dispersion",
        detail: `Structured commerce confidence spans ~${spread} points across covered rows — worth reading the low-confidence listings with extra seller scrutiny.`,
        recencyMinutes: 18 + (seed % 26),
      });
    }
  }

  if (highTrust - lowTrust >= 18) {
    out.push({
      id: "trust-delta",
      headline: "Retailer trust delta",
      detail: `Trust priors range ${lowTrust}–${highTrust}/100 in-tray — “safest checkout” and “best headline price” may diverge; export a snapshot before you decide.`,
      recencyMinutes: 30 + (seed % 40),
    });
  }

  const stars = ratingValue(top.rating);
  if (stars > 0 && stars < 4.1) {
    out.push({
      id: "rating-context",
      headline: "Rating context on leader",
      detail: `Top composite row shows ~${stars.toFixed(1)}★ — pair stars with review count and store trust before treating rank as endorsement.`,
      recencyMinutes: 12 + (seed % 22),
    });
  }

  return out.slice(0, 6);
}
