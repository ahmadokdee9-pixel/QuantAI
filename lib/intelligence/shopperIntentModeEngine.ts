/**
 * Phase 38 — Shopper Intent Mode Detection.
 */

export type ShopperIntentMode =
  | "Budget Buyer"
  | "Value Buyer"
  | "Premium Buyer"
  | "Urgent Buyer"
  | "Quality Buyer"
  | "Best Deal Hunter";

export type ShopperIntentProfile = {
  version: 1;
  primaryMode: ShopperIntentMode;
  secondaryMode: ShopperIntentMode | null;
  confidence: number;
  signals: string[];
};

/** Detect shopper intent mode from search query. */
export function detectShopperIntentMode(searchQuery: string): ShopperIntentProfile {
  const q = searchQuery.toLowerCase();
  const signals: string[] = [];
  const scores = new Map<ShopperIntentMode, number>();

  const bump = (mode: ShopperIntentMode, n: number, signal: string) => {
    scores.set(mode, (scores.get(mode) ?? 0) + n);
    if (n >= 2) signals.push(signal);
  };

  if (/cheap|budget|affordable|under \€|\$|deal|discount|lowest price|best price/i.test(q)) {
    bump("Budget Buyer", 4, "budget_price_language");
    bump("Best Deal Hunter", 3, "deal_hunt_language");
  }
  if (/best value|value for money|worth it|good deal/i.test(q)) bump("Value Buyer", 5, "value_language");
  if (/luxury|premium|pro max|designer|high end|flagship/i.test(q)) bump("Premium Buyer", 5, "premium_language");
  if (/urgent|today|now|fast|immediate|same day|quick/i.test(q)) bump("Urgent Buyer", 5, "urgency_language");
  if (/quality|durable|reliable|best quality|long lasting/i.test(q)) bump("Quality Buyer", 5, "quality_language");
  if (/discount|sale|clearance|lowest|cheapest|best deal|coupon/i.test(q)) bump("Best Deal Hunter", 4, "deal_hunter");

  if (scores.size === 0) bump("Value Buyer", 3, "default_purchase_intent");

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const primaryMode = ranked[0]?.[0] ?? "Value Buyer";
  const secondaryMode = ranked[1] && ranked[1][1] >= (ranked[0]?.[1] ?? 0) * 0.7 ? ranked[1][0] : null;

  return {
    version: 1,
    primaryMode,
    secondaryMode,
    confidence: Math.min(95, 55 + (ranked[0]?.[1] ?? 0) * 8),
    signals,
  };
}

/** Weight buy score by shopper intent mode. */
export function intentModeBuyBoost(mode: ShopperIntentMode, args: {
  priceAdvantagePct: number;
  qualityScore: number;
  discountStrength: number;
  trustScore: number;
}): number {
  switch (mode) {
    case "Budget Buyer":
      return args.priceAdvantagePct * 0.4 + args.discountStrength * 0.2;
    case "Premium Buyer":
      return args.qualityScore * 0.15 + args.trustScore * 0.1;
    case "Urgent Buyer":
      return args.trustScore * 0.12 + 6;
    case "Quality Buyer":
      return args.qualityScore * 0.2;
    case "Best Deal Hunter":
      return args.discountStrength * 0.25 + args.priceAdvantagePct * 0.3;
    default:
      return args.priceAdvantagePct * 0.2 + args.qualityScore * 0.08;
  }
}
