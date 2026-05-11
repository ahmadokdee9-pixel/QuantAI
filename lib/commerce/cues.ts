import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";

/** Infer listing currency from merchant display string (region-aware display, not FX conversion). */
export function currencySymbolFromListing(p: QuantProduct): string {
  const d = p.displayPrice || "";
  if (d.includes("£")) return "£";
  if (d.includes("€")) return "€";
  if (/\$\s*\d|\d\s*USD/i.test(d) || (d.includes("$") && !d.includes("€"))) return "$";
  return "€";
}

export function formatListingPrice(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/** Two-letter monogram for avatar chip (not a logo—production logos need brand agreements). */
export function retailerMonogram(store: string): string {
  const t = store.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

/** Heuristic delivery confidence 0–100 from fulfillment language + trust. */
export function deliveryConfidencePct(p: QuantProduct): number {
  const trust = getStoreTrustScore(p.store);
  const ship = (p.shipping || "").toLowerCase();
  let base = 42 + Math.round(trust * 0.35);
  if (/same|today|express|overnight|1\s*-?\s*day/i.test(ship)) base += 18;
  else if (/free|standard|business/i.test(ship)) base += 8;
  if (!p.shipping) base -= 12;
  return Math.min(96, Math.max(28, base));
}

/** Stock / availability confidence from listing text. */
export function stockConfidencePct(p: QuantProduct): number {
  const a = (p.availability || "").toLowerCase();
  if (/out of stock|unavailable|sold out/i.test(a)) return 22;
  if (/in stock|available|ships/i.test(a)) return 88;
  if (a.length > 3) return 72;
  return 55;
}

export function shippingEstimateLabel(p: QuantProduct): string | null {
  if (p.shipping?.trim()) return p.shipping.trim();
  const d = deliveryConfidencePct(p);
  if (d >= 78) return "Delivery · likely fast (inferred)";
  if (d >= 55) return "Delivery · verify at checkout";
  return null;
}

export function marketplaceVerifiedLabel(p: QuantProduct): { label: string; tone: "high" | "mid" | "low" } {
  const t = getStoreTrustScore(p.store);
  if (t >= 82) return { label: "Verified-tier retailer signal", tone: "high" };
  if (t >= 68) return { label: "Recognized storefront pattern", tone: "mid" };
  return { label: "Higher variance — verify seller", tone: "low" };
}

/** Non-judgmental fraud/risk hint from discount quality + trust (when signals exist). */
export function riskHintFromProduct(p: QuantProduct): string | null {
  const dq = p.qiSignals?.discountQuality;
  const trust = getStoreTrustScore(p.store);
  if (dq != null && dq < 35 && trust < 70) {
    return "Discount narrative weak vs. peers—verify list price.";
  }
  if (trust < 58) {
    return "Unfamiliar seller—use protected checkout when available.";
  }
  return null;
}

export function longTermValueHint(p: QuantProduct, list: QuantProduct[]): string | null {
  if (list.length < 2) return null;
  const pp = p.qiSignals?.pricePerformance;
  const r = ratingValue(p.rating);
  if (pp != null && pp >= 72 && r >= 4.2) return "Strong long-term value signal in this tray.";
  if (pp != null && pp < 40) return "Value fragile vs. alternatives—compare warranty.";
  return null;
}
