import type { ProductDealIntelligence } from "@/lib/intelligence/dealIntelligenceEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";

export type SignalTone = "positive" | "neutral" | "warn" | "risk";

export type IntelligenceSignal = {
  id: string;
  label: string;
  value: string;
  tone: SignalTone;
};

export type BriefPreviewTag = {
  label: string;
  active: boolean;
};

export type IntelligenceChip = {
  label: string;
  tone: "emerald" | "blue" | "violet" | "amber" | "slate";
};

type CardIntelArgs = {
  product: QuantProduct;
  list: QuantProduct[];
  trustScore: number;
  deal: ProductDealIntelligence;
  verdict: PrimaryVerdict;
  alignmentScore: number;
};

function avgPrice(list: QuantProduct[]): number {
  const prices = list.map((p) => p.price).filter((p) => p > 0);
  if (!prices.length) return 0;
  return prices.reduce((a, b) => a + b, 0) / prices.length;
}

export function buildIntelligenceSignals(args: {
  product: QuantProduct;
  list: QuantProduct[];
  trustScore: number;
  deal: ProductDealIntelligence;
  verdict: PrimaryVerdict;
  alignmentScore: number;
}): IntelligenceSignal[] {
  const { product: p, list, trustScore, deal, verdict, alignmentScore } = args;
  const avg = avgPrice(list);
  const spread =
    avg > 0 ? Math.round(((p.price - avg) / avg) * 100) : 0;

  let marketPosition = "At market";
  let marketTone: SignalTone = "neutral";
  if (spread <= -8) {
    marketPosition = "Below market";
    marketTone = "positive";
  } else if (spread >= 12) {
    marketPosition = "Above market";
    marketTone = "warn";
  }

  const trustSignal =
    trustScore >= 78 ? "Strong" : trustScore >= 58 ? "Moderate" : "Weak";
  const trustTone: SignalTone =
    trustScore >= 78 ? "positive" : trustScore >= 58 ? "neutral" : "risk";

  const sellerStability =
    p.qiRealityTrust?.weakRetailer || trustScore < 52
      ? "Unstable"
      : trustScore >= 75
        ? "Stable"
        : "Mixed";

  const priceFairness =
    deal.hasDiscount && (deal.discountPct ?? 0) >= 12
      ? "Credible markdown"
      : spread >= 15
        ? "Premium band"
        : spread <= -10
          ? "Fair band"
          : "Market band";

  const inventoryConfidence =
    (p.qiCommerce?.valueForMoney ?? 50) >= 62 ? "High" : "Standard";

  const deliveryReliability =
    p.shipping?.trim() || p.availability?.trim() ? "Verified lane" : "Check at checkout";

  const historicalValue =
    p.priceTrend === "down"
      ? "Improving"
      : p.priceTrend === "up"
        ? "Rising"
        : "Stable";

  const riskDetection =
    verdict === "AVOID"
      ? "Elevated"
      : verdict === "WAIT"
        ? "Moderate"
        : "Low";

  return [
    { id: "market", label: "Market position", value: marketPosition, tone: marketTone },
    { id: "trust", label: "Trust layer", value: trustSignal, tone: trustTone },
    { id: "seller", label: "Retail stability", value: sellerStability, tone: sellerStability === "Stable" ? "positive" : sellerStability === "Unstable" ? "risk" : "warn" },
    { id: "price", label: "Price validation", value: priceFairness, tone: spread <= -8 ? "positive" : spread >= 15 ? "warn" : "neutral" },
    { id: "inventory", label: "Inventory confidence", value: inventoryConfidence, tone: "neutral" },
    { id: "delivery", label: "Fulfillment reliability", value: deliveryReliability, tone: "neutral" },
    { id: "history", label: "Historical value", value: historicalValue, tone: p.priceTrend === "down" ? "positive" : p.priceTrend === "up" ? "warn" : "neutral" },
    { id: "risk", label: "Risk layer", value: riskDetection, tone: riskDetection === "Low" ? "positive" : riskDetection === "Elevated" ? "risk" : "warn" },
    { id: "match", label: "Decision confidence", value: `${Math.round(alignmentScore)}%`, tone: alignmentScore >= 72 ? "positive" : alignmentScore >= 48 ? "neutral" : "warn" },
  ];
}

const CHIP_SUMMARY_EQUIV: Record<string, string> = {
  "Under Market Average": "Under market average",
  "Trusted Retailer": "Trusted retailer",
  "Strong Trust Network": "Strong trust network",
  "Stable Inventory": "Stable inventory",
  "Low Fulfillment Risk": "Low fulfillment risk",
  "Reliable Pricing": "Reliable pricing",
  "Verified Seller": "Verified seller",
};

export function buildWhyQuantAIChoseThis(args: {
  product: QuantProduct;
  list: QuantProduct[];
  trustScore: number;
  deal: ProductDealIntelligence;
  alignmentScore: number;
  verdict: PrimaryVerdict;
}): string[] {
  const { product: p, list, trustScore, deal, verdict } = args;
  const avg = avgPrice(list);
  const scored: { text: string; score: number }[] = [];

  if (avg > 0 && p.price < avg * 0.92) scored.push({ text: "Under market average", score: 95 });
  if (deal.hasDiscount && (deal.discountPct ?? 0) >= 10) scored.push({ text: "Credible markdown", score: 90 });
  if (
    verdict !== "AVOID" &&
    (p.qiListingIdentity?.listingRisk01 ?? 1) <= 0.2 &&
    trustScore >= 65
  ) {
    scored.push({ text: "Low fulfillment risk", score: 88 });
  }
  if (trustScore >= 78) scored.push({ text: "Strong trust network", score: 82 });
  if (trustScore >= 72) scored.push({ text: "Trusted retailer", score: 76 });
  if (trustScore >= 75) scored.push({ text: "Verified seller", score: 74 });
  if ((p.qiCommerce?.valueForMoney ?? 50) >= 58) scored.push({ text: "Stable inventory", score: 70 });
  if (
    p.qiCommerce?.priceAnomaly !== "suspicious_low" &&
    p.qiCommerce?.priceAnomaly !== "premium_outlier"
  ) {
    scored.push({ text: "Reliable pricing", score: 65 });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((row) => row.text);
}

export function buildBriefPreviewTags(args: {
  product: QuantProduct;
  list: QuantProduct[];
  trustScore: number;
  deal: ProductDealIntelligence;
  reason: string;
  alignmentScore: number;
  rank: number;
}): BriefPreviewTag[] {
  const { product: p, list, trustScore, deal, reason, alignmentScore, rank } = args;
  const avg = avgPrice(list);
  const underMarket = avg > 0 && p.price < avg * 0.92;
  const bestTrustInTray = list.every((row) => getStoreTrustScore(row.store) <= trustScore);
  const lowSellerRisk = trustScore >= 72 && (p.qiListingIdentity?.listingRisk01 ?? 1) <= 0.18;
  const priceAnomaly =
    p.qiCommerce?.priceAnomaly === "suspicious_low" ||
    p.qiCommerce?.priceAnomaly === "premium_outlier";
  const highMatch = alignmentScore >= 76;

  return [
    { label: "Why this result", active: reason.length > 12 },
    { label: "Best trust score", active: bestTrustInTray && trustScore >= 70 },
    { label: "Under market price", active: underMarket },
    { label: "Low seller risk", active: lowSellerRisk },
    { label: "Price anomaly detected", active: priceAnomaly },
    { label: "High confidence match", active: highMatch },
    { label: "Top tray rank", active: rank <= 2 },
    { label: "Credible markdown", active: deal.hasDiscount && (deal.discountPct ?? 0) >= 10 },
  ];
}

export function buildIntelligenceChips(args: CardIntelArgs): IntelligenceChip[] {
  const { product: p, list, trustScore, verdict } = args;
  const avg = avgPrice(list);
  const chips: IntelligenceChip[] = [];
  const summaryLines = new Set(buildWhyQuantAIChoseThis(args).map((line) => line.toLowerCase()));

  if (avg > 0 && p.price < avg * 0.92) {
    chips.push({ label: "Under Market Average", tone: "emerald" });
  }
  if (trustScore >= 72) {
    chips.push({ label: "Trusted Retailer", tone: "blue" });
  }
  if (trustScore >= 78) {
    chips.push({ label: "Strong Trust Network", tone: "blue" });
  }
  if ((p.qiCommerce?.valueForMoney ?? 50) >= 58) {
    chips.push({ label: "Stable Inventory", tone: "violet" });
  }
  if (
    verdict !== "AVOID" &&
    (p.qiListingIdentity?.listingRisk01 ?? 1) <= 0.2 &&
    trustScore >= 65
  ) {
    chips.push({ label: "Low Fulfillment Risk", tone: "emerald" });
  }
  if (
    p.qiCommerce?.priceAnomaly !== "suspicious_low" &&
    p.qiCommerce?.priceAnomaly !== "premium_outlier"
  ) {
    chips.push({ label: "Reliable Pricing", tone: "slate" });
  }
  if (trustScore >= 75) {
    chips.push({ label: "Verified Seller", tone: "blue" });
  }

  return chips
    .filter((chip) => {
      const equiv = CHIP_SUMMARY_EQUIV[chip.label];
      return !equiv || !summaryLines.has(equiv.toLowerCase());
    })
    .slice(0, 2);
}

export function buildExpandedSignalLines(args: CardIntelArgs): string[] {
  const picked = buildWhyQuantAIChoseThis(args);
  const fallbacks = ["Market band aligned", "Retail source scanned", "Inventory profile stable"];
  const lines = [...picked];
  for (const line of fallbacks) {
    if (lines.length >= 3) break;
    if (!lines.includes(line)) lines.push(line);
  }
  return lines.slice(0, 3);
}

export function buildSmartDecisionLines(args: CardIntelArgs): string[] {
  const { product: p, list, trustScore, deal, verdict } = args;
  const avg = avgPrice(list);
  const spread = avg > 0 ? ((p.price - avg) / avg) * 100 : 0;
  const decisions: string[] = [];

  if (avg > 0 && p.price < avg * 0.95) decisions.push("Price opportunity");
  if (
    verdict !== "AVOID" &&
    (p.qiListingIdentity?.listingRisk01 ?? 1) <= 0.2 &&
    trustScore >= 65
  ) {
    decisions.push("Low fulfillment risk");
  }
  if (trustScore >= 72) decisions.push("Trust verified");
  if (deal.hasDiscount && (deal.discountPct ?? 0) >= 10) decisions.push("Credible markdown");
  if (spread >= 12) decisions.push("Premium pricing watch");
  if (verdict === "WAIT") decisions.push("Timing favors patience");

  const fallbacks = ["Decision path clear", "Fulfillment lane stable", "Risk surface contained"];
  for (const line of fallbacks) {
    if (decisions.length >= 3) break;
    if (!decisions.includes(line)) decisions.push(line);
  }

  return decisions.slice(0, 3);
}

export function buildQuantAIVerdictNarrative(args: CardIntelArgs): string {
  const { product: p, list, trustScore, verdict } = args;
  const avg = avgPrice(list);
  const spread = avg > 0 ? ((p.price - avg) / avg) * 100 : 0;

  switch (verdict) {
    case "BUY READY":
      if (avg > 0 && p.price < avg * 0.92) return "Best value among trusted sellers.";
      return "Price and seller trust support a confident checkout.";
    case "WAIT":
      return "Wait for better opportunity.";
    case "COMPARE":
      if (trustScore >= 72 && spread >= 10) return "Strong merchant trust but premium pricing.";
      return "Multiple competitive offers — compare before buying.";
    case "AVOID":
      return "Risk profile exceeds acceptable threshold for checkout.";
    case "INSUFFICIENT DATA":
      return "More verified market evidence is needed before checkout.";
  }
  return "Compare verified listings before committing.";
}
