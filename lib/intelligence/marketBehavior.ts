/**
 * QuantAI tray market behavior — classifies the current result set’s pricing posture.
 */

import type { QuantProduct } from "@/lib/shoppingScore";

export type MarketBehaviorRegime =
  | "market_hot"
  | "cooling"
  | "stable"
  | "panic_discounting"
  | "artificial_scarcity"
  | "low_inventory_pressure"
  | "mixed";

export type TrayMarketBehavior = {
  regime: MarketBehaviorRegime;
  reasoning: string;
  /** 0–1 “energy” in the tray. */
  heat01: number;
};

function trayCv01(prices: number[]): number {
  const p = prices.filter((x) => x > 0);
  if (p.length < 2) return 0.2;
  const mean = p.reduce((a, b) => a + b, 0) / p.length;
  const v = p.reduce((a, x) => a + (x - mean) ** 2, 0) / Math.max(1, p.length - 1);
  const cv = mean > 0 ? Math.sqrt(v) / mean : 0;
  return Math.min(1, cv / 0.5);
}

function discountShare(products: QuantProduct[]): number {
  if (!products.length) return 0;
  let n = 0;
  for (const p of products) {
    if (p.oldPrice != null && p.oldPrice > p.price && p.price > 0) n++;
  }
  return n / products.length;
}

function urgencyShare(products: QuantProduct[]): number {
  if (!products.length) return 0;
  let n = 0;
  for (const p of products) {
    const b = `${p.availability ?? ""} ${p.extensions.join(" ")}`.toLowerCase();
    if (/limited|low stock|only \d|few left|almost gone|hurry|ends (today|soon)/i.test(b)) n++;
  }
  return n / products.length;
}

export function classifyTrayMarketBehavior(products: QuantProduct[]): TrayMarketBehavior {
  if (products.length === 0) {
    return { regime: "mixed", reasoning: "Empty tray—no market posture to read.", heat01: 0.35 };
  }
  const prices = products.map((p) => p.price).filter((x) => x > 0);
  const cv = trayCv01(prices);
  const disc = discountShare(products);
  const urg = urgencyShare(products);
  const heat01 = Math.min(1, cv * 0.55 + disc * 0.35 + urg * 0.25);

  if (disc >= 0.55 && cv >= 0.42) {
    return {
      regime: "panic_discounting",
      reasoning: "Many headline markdowns on a wide price ladder—often mismatched SKUs or promotional noise.",
      heat01,
    };
  }
  if (urg >= 0.35 && disc < 0.3) {
    return {
      regime: "artificial_scarcity",
      reasoning: "Urgency language clusters without deep discount corroboration—compare before you react.",
      heat01,
    };
  }
  if (urg >= 0.22) {
    return {
      regime: "low_inventory_pressure",
      reasoning: "Several listings signal stock pressure—can be real, sometimes merchandising.",
      heat01,
    };
  }
  if (cv >= 0.52 && disc < 0.35) {
    return { regime: "market_hot", reasoning: "Spread is wide while discounts are uneven—volatile hunting ground.", heat01 };
  }
  if (cv <= 0.28 && disc <= 0.22) {
    return { regime: "stable", reasoning: "Tight asks with few dramatic anchors—tray looks calmer than average.", heat01: Math.max(0.25, heat01) };
  }
  if (cv <= 0.36 && disc >= 0.28) {
    return { regime: "cooling", reasoning: "Markdowns present but dispersion is controlled—less carnival, more catalog.", heat01 };
  }
  return { regime: "mixed", reasoning: "Mixed discount density and price spread—default to compare-first posture.", heat01 };
}
