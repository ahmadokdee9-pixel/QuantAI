/**
 * Phase 3 — Price sanity engine: penalize rental/subscription/unrealistic listings.
 */

import type { QuantProduct } from "@/lib/shoppingScore";

export type PriceSanityResult = {
  sane: boolean;
  score: number;
  flags: string[];
  penalty: number;
  pricingModel: "purchase" | "rental" | "subscription" | "suspicious" | "unknown";
};

const RENTAL_RX =
  /\b(rent|rental|lease|huur|te huur|per month|\/month|monthly|subscription|abonnement|grover|huurkoop|installment|per\s+maand|\/mo\b|month\s+plan)\b/i;
const LOW_PRICE_CATEGORY_FLOORS: { rx: RegExp; floor: number; label: string }[] = [
  { rx: /\b(tv|television|qled|oled|smart\s+tv|\d+\s*inch)\b/i, floor: 120, label: "television" },
  { rx: /\b(macbook|laptop|notebook|thinkpad)\b/i, floor: 200, label: "laptop" },
  { rx: /\b(galaxy\s+s\d|iphone\s+\d|s24|s25|pixel\s+\d)\b/i, floor: 150, label: "flagship_phone" },
  { rx: /\b(sectional|sofa|couch)\b/i, floor: 80, label: "sofa" },
  { rx: /\b(gaming\s+monitor|monitor\s+\d+\s*inch)\b/i, floor: 60, label: "monitor" },
  { rx: /\b(rtx\s*\d{3,4}|graphics\s+card|geforce)\b/i, floor: 120, label: "gpu" },
  { rx: /\b(robot\s+vacuum|roomba|roborock)\b/i, floor: 50, label: "robot_vacuum" },
];

function median(nums: number[]): number {
  const s = [...nums].filter((n) => n > 0).sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Assess whether a listing price is plausible for its category and tray context. */
export function assessPriceSanity(
  product: QuantProduct,
  trayPrices: number[],
  query?: string
): PriceSanityResult {
  const title = `${product.title} ${product.store}`.toLowerCase();
  const price = product.price;
  const flags: string[] = [];
  let penalty = 0;
  let pricingModel: PriceSanityResult["pricingModel"] = "unknown";

  if (price <= 0) {
    return { sane: false, score: 0.2, flags: ["missing_price"], penalty: 8, pricingModel: "unknown" };
  }

  if (RENTAL_RX.test(title)) {
    flags.push("rental_or_subscription");
    pricingModel = /\bgrover\b/i.test(product.store) ? "subscription" : "rental";
    penalty += 35;
  }

  if (/\bgrover\b/i.test(product.store) && price < 100) {
    flags.push("grover_subscription_price");
    pricingModel = "subscription";
    penalty += 32;
  }

  for (const { rx, floor, label } of LOW_PRICE_CATEGORY_FLOORS) {
    if (rx.test(title) || (query && rx.test(query))) {
      if (price < floor * 0.35) {
        flags.push(`unrealistic_low_${label}`);
        penalty += 35;
        pricingModel = "suspicious";
      }
    }
  }

  const med = median(trayPrices);
  if (med > 0 && price > 0 && price < med * 0.08) {
    flags.push("tray_outlier_low");
    penalty += 22;
    pricingModel = pricingModel === "unknown" ? "suspicious" : pricingModel;
  }

  if (med > 0 && price > med * 4.5) {
    flags.push("tray_outlier_high");
    penalty += 8;
  }

  if (product.oldPrice != null && product.oldPrice > price * 3.5) {
    flags.push("inflated_anchor");
    penalty += 12;
  }

  if (
    /\b(fruugo|ubuy|wish|temu|aliexpress)\b/i.test(`${product.store} ${product.title}`) &&
    med > 0 &&
    price > 0 &&
    price < med * 0.35
  ) {
    flags.push("aggregator_price_outlier");
    penalty += 14;
    pricingModel = pricingModel === "unknown" ? "suspicious" : pricingModel;
  }

  const score = Math.max(0, Math.min(1, 1 - penalty / 50));
  const sane = penalty < 22 && pricingModel !== "rental" && pricingModel !== "subscription";

  return { sane, score, flags, penalty, pricingModel };
}

/** Hard exclude rental/subscription masquerading as purchase in top results. */
export function isHardPriceSanityReject(result: PriceSanityResult): boolean {
  return result.penalty >= 30 || result.pricingModel === "rental" || result.pricingModel === "subscription";
}
