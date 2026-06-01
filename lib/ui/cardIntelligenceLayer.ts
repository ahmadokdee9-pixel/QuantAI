/**
 * Card intelligence layer — rich commerce signals in luxury presentation.
 * Uses existing engine outputs only; enforces label consistency with verdict.
 */

import type { CommerceBrainFinalCode } from "@/lib/intelligence/commerceDecisionBrain";
import type { FinalCommerceDecision } from "@/lib/intelligence/finalCommerceDecision";
import type { ProductDealIntelligence } from "@/lib/intelligence/dealIntelligenceEngine";
import type { MarketAwarenessTray } from "@/lib/intelligence/marketAwareness";
import type { QuantProduct } from "@/lib/shoppingScore";

export type CardSignalPill = {
  label: string;
  cls: string;
  primary?: boolean;
};

export type CardIntelligenceLayer = {
  primaryLabel: string;
  decisionSurfaceClass: string;
  posture: {
    trust: string;
    price: string;
    market: string;
    risk: string;
  };
  reasonLines: string[];
  buyingThesis: string;
  pills: CardSignalPill[];
};

const BUY_FAMILY: CommerceBrainFinalCode[] = ["BUY_READY", "STRONG_BUY", "SAFE_BUY"];
const CAUTION_FAMILY: CommerceBrainFinalCode[] = ["WAIT", "COMPARE_ALTERNATIVES", "AVOID"];

const POSITIVE_CHIP =
  /^(BUY|SAFE|STRONG|HIDDEN VALUE|LOW RISK|BEST MATCH|VERIFIED VALUE|LIVE DEAL)/i;
const NEGATIVE_CHIP = /^(AVOID|WAIT|RISK|VOLATILE|FAKE|OVERPRICED)/i;

function formatDecisionLabel(label: string): string {
  return label.replace(/-/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
}

function decisionSurfaceClass(code: CommerceBrainFinalCode): string {
  switch (code) {
    case "STRONG_BUY":
    case "BUY_READY":
    case "SAFE_BUY":
      return "qa-ui-verdict-block--positive";
    case "WAIT":
    case "COMPARE_ALTERNATIVES":
      return "qa-ui-verdict-block--caution";
    case "AVOID":
      return "qa-ui-verdict-block--risk";
    default:
      return "qa-ui-verdict-block--neutral";
  }
}

function trustPosture(trust: number, weak: boolean): string {
  if (weak || trust < 52) return "Weak seller route";
  if (trust >= 78) return "Trusted seller";
  if (trust >= 62) return "Solid trust";
  return "Moderate trust";
}

function pricePosture(deal: ProductDealIntelligence, code: CommerceBrainFinalCode): string {
  if (code === "AVOID" && (deal.fakeDiscountRisk === "high" || deal.suspiciousDiscountRisk >= 0.5)) {
    return "Deal hygiene weak";
  }
  if (deal.overpricedVsTray) return "Above tray median";
  if (deal.savingsVsFair != null && deal.savingsVsFair > 0) return "Below fair band";
  if (deal.hasDiscount && deal.fakeDiscountRisk === "low") return "Credible markdown";
  if (deal.hasDiscount) return "Discount — verify anchor";
  if (CAUTION_FAMILY.includes(code)) return "Price may move";
  return "Near fair range";
}

function marketPosture(
  product: QuantProduct,
  market: MarketAwarenessTray,
  marketLine: string
): string {
  const pulse = product.qiMarketPulse;
  if (
    pulse?.trendMomentum === "hot" ||
    pulse?.trendMomentum === "rising" ||
    market.marketHeat === "hot" ||
    market.marketHeat === "overheated"
  ) {
    return "Market heating";
  }
  if (pulse?.trendMomentum === "cold") return "Market cooling";
  if (market.categoryVolatility === "high") return "Volatile field";
  if (marketLine) return clipShort(marketLine.replace(/^Context ·\s*/i, ""), 42);
  return "Stable field";
}

function riskPosture(code: CommerceBrainFinalCode, riskReason: string, trust: number): string {
  if (code === "AVOID") return clipShort(riskReason || "Elevated checkout risk", 48);
  if (code === "WAIT") return clipShort(riskReason || "Timing risk — patience", 48);
  if (BUY_FAMILY.includes(code) && trust >= 70) return "Low–moderate risk";
  if (trust < 58) return "Trust risk elevated";
  return clipShort(riskReason || "Standard diligence", 48);
}

function clipShort(s: string, max: number): string {
  const t = s.trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function pillConflictsVerdict(code: CommerceBrainFinalCode, label: string): boolean {
  const u = label.toUpperCase();
  if (CAUTION_FAMILY.includes(code) && POSITIVE_CHIP.test(u)) return true;
  if (code === "AVOID" && !NEGATIVE_CHIP.test(u) && POSITIVE_CHIP.test(u)) return true;
  if (BUY_FAMILY.includes(code) && /^AVOID/.test(u)) return true;
  if (code === "WAIT" && (u.includes("BUY READY") || u.includes("BUY-READY") || u === "SAFE BUY")) return true;
  if (BUY_FAMILY.includes(code) && u.includes("PRICE DROPPING")) return true;
  return false;
}

function buildReasonLines(args: {
  code: CommerceBrainFinalCode;
  trust: number;
  deal: ProductDealIntelligence;
  resolved: FinalCommerceDecision;
  marketLine: string | null;
}): string[] {
  const lines: string[] = [];
  const { code, trust, deal, resolved, marketLine } = args;

  if (deal.overpricedVsTray && BUY_FAMILY.includes(code)) {
    lines.push("Price runs high vs peers — verdict capped.");
  } else if (deal.savingsVsFair != null && deal.savingsVsFair > 0) {
    lines.push("Price sits under fair estimate in this tray.");
  } else if (deal.hasDiscount && deal.discountPct != null) {
    lines.push(`Markdown ~${deal.discountPct}% — ${deal.fakeDiscountRisk === "low" ? "reads authentic" : "verify anchor"}.`);
  }

  if (trust >= 74) lines.push("Seller trust supports checkout.");
  else if (trust < 56) lines.push("Seller trust is thin — extra verification advised.");
  else lines.push("Seller trust is acceptable, not exceptional.");

  if (marketLine) lines.push(clipShort(marketLine.replace(/^Context ·\s*/i, ""), 72));
  else if (resolved.marketContextLine) lines.push(clipShort(resolved.marketContextLine, 72));

  if (resolved.riskReason && !lines.some((l) => l.toLowerCase().includes(resolved.riskReason.toLowerCase().slice(0, 12)))) {
    lines.push(clipShort(resolved.riskReason, 72));
  } else if (code === "WAIT" && lines.length < 4) {
    lines.push("Timing favors patience over immediate checkout.");
  }

  return lines.slice(0, 2);
}

export function buildCardIntelligenceLayer(args: {
  product: QuantProduct;
  resolved: FinalCommerceDecision;
  deal: ProductDealIntelligence;
  market: MarketAwarenessTray;
  trust: number;
  weakRetailer: boolean;
  buyingThesisFallback: string;
  marketWhisper: string | null;
  timingSupportLine: string | null;
}): CardIntelligenceLayer {
  const { product, resolved, deal, market, trust, weakRetailer, buyingThesisFallback, marketWhisper } = args;
  const code = resolved.commerceBrainCode;
  const primaryLabel = formatDecisionLabel(resolved.commerceBrainChipLabel);

  const pills: CardSignalPill[] = [
    {
      label: primaryLabel,
      cls: `qi-signal-pill qi-signal-pill--primary ${commerceBrainPillTone(code)}`,
      primary: true,
    },
  ];

  for (const chip of resolved.secondaryChips) {
    if (pills.length >= 2) break;
    if (pillConflictsVerdict(code, chip.label)) continue;
    if (pills.some((p) => p.label === chip.label.toUpperCase())) continue;
    pills.push({
      label: formatDecisionLabel(chip.label),
      cls: `qi-signal-pill ${signalPillToneForLabel(chip.label)}`,
    });
  }

  if (resolved.predictiveBadge) {
    const pl = formatDecisionLabel(resolved.predictiveBadge.text);
    if (!pillConflictsVerdict(code, pl) && !pills.some((p) => p.label === pl)) {
      pills.push({
        label: pl,
        cls: `qi-signal-pill qi-signal-pill--timing qi-signal-pill--${resolved.predictiveBadge.tone}`,
      });
    }
  }

  if (resolved.contextChip && !pillConflictsVerdict(code, resolved.contextChip.label)) {
    pills.push({
      label: formatDecisionLabel(resolved.contextChip.label),
      cls: `qi-signal-pill ${signalPillToneForLabel(resolved.contextChip.label)}`,
    });
  }

  const buyingThesis = clipShort(
    resolved.whyThisProduct ||
      resolved.buySurface.stanceDetail ||
      buyingThesisFallback ||
      resolved.analystLine,
    110
  );

  return {
    primaryLabel,
    decisionSurfaceClass: decisionSurfaceClass(code),
    posture: {
      trust: trustPosture(trust, weakRetailer),
      price: pricePosture(deal, code),
      market: marketWhisper ? clipShort(marketWhisper, 42) : marketPosture(product, market, resolved.marketContextLine),
      risk: riskPosture(code, resolved.riskReason, trust),
    },
    reasonLines: buildReasonLines({
      code,
      trust,
      deal,
      resolved,
      marketLine: args.timingSupportLine,
    }),
    buyingThesis,
    pills: pills.slice(0, 5),
  };
}

function signalPillToneForLabel(label: string): string {
  const u = formatDecisionLabel(label);
  if (/AVOID|FAKE|OVERPRICED|HIGH RISK/.test(u)) return "qi-signal-pill--avoid";
  if (/WAIT|PRICE DROP|VOLATILE|SEASONAL DEAL/.test(u)) return "qi-signal-pill--wait";
  if (/COMPARE/.test(u)) return "qi-signal-pill--compare";
  if (/SAFE|LOW RISK|VERIFIED|BEST TRUSTED/.test(u)) return "qi-signal-pill--safe";
  if (/MARKET HOT|MARKET MOVING|LIVE DEAL/.test(u)) return "qi-signal-pill--compare";
  if (/STRONG VALUE|HIDDEN VALUE|BEST MATCH|BUY/.test(u)) return "qi-signal-pill--buy";
  return "qi-signal-pill--neutral";
}

function commerceBrainPillTone(code: CommerceBrainFinalCode): string {
  switch (code) {
    case "STRONG_BUY":
    case "BUY_READY":
      return "qi-signal-pill--buy";
    case "SAFE_BUY":
      return "qi-signal-pill--safe";
    case "WAIT":
      return "qi-signal-pill--wait";
    case "COMPARE_ALTERNATIVES":
      return "qi-signal-pill--compare";
    case "AVOID":
      return "qi-signal-pill--avoid";
    default:
      return "qi-signal-pill--neutral";
  }
}
