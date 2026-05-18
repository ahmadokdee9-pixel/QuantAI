/**
 * Silent Intelligence Luxury — restrained strategist language (presentation only).
 */

export type IntelligenceDecisionPresentation = {
  label: string;
  whisper: string;
  surfaceClass: string;
};

export function intelligenceDecisionPresentation(
  action?: string
): IntelligenceDecisionPresentation {
  switch (action) {
    case "BUY_NOW":
      return {
        label: "Clear to buy",
        whisper: "Price, trust, timing align.",
        surfaceClass: "qi-decision-surface--positive",
      };
    case "SAFE_TRUSTED_OFFER":
      return {
        label: "Trusted route",
        whisper: "Seller profile is sound.",
        surfaceClass: "qi-decision-surface--calm",
      };
    case "BEST_REGIONAL_DEAL":
      return {
        label: "Regional edge",
        whisper: "Strong local fit.",
        surfaceClass: "qi-decision-surface--positive",
      };
    case "HIDDEN_VALUE":
      return {
        label: "Undervalued",
        whisper: "Below peers on quality.",
        surfaceClass: "qi-decision-surface--accent",
      };
    case "STRONG_VALUE":
      return {
        label: "Strong position",
        whisper: "Price and trust balance.",
        surfaceClass: "qi-decision-surface--calm",
      };
    case "WAIT_FOR_DROP":
    case "DISCOUNT_LIKELY_SOON":
      return {
        label: "Wait",
        whisper: "Pricing may improve.",
        surfaceClass: "qi-decision-surface--caution",
      };
    case "PREMIUM_PRICING":
      return {
        label: "Premium band",
        whisper: "Above fair range.",
        surfaceClass: "qi-decision-surface--accent",
      };
    case "RISKY_SELLER":
      return {
        label: "Seller risk",
        whisper: "Verify before checkout.",
        surfaceClass: "qi-decision-surface--risk",
      };
    case "HIGH_VOLATILITY":
      return {
        label: "Unstable field",
        whisper: "Wide spread — compare.",
        surfaceClass: "qi-decision-surface--caution",
      };
    default:
      return {
        label: "Compare first",
        whisper: "Stronger options in tray.",
        surfaceClass: "qi-decision-surface--neutral",
      };
  }
}

export function intelligenceDecisionLabel(action?: string): string {
  return intelligenceDecisionPresentation(action).label;
}

export function intelligenceMarketPulseLine(args: {
  storeCount: number;
  spreadPct: number;
  isBestTrusted?: boolean;
  cheaperStore?: string | null;
}): string {
  if (args.isBestTrusted) return `${args.storeCount} routes · trusted lead`;
  if (args.cheaperStore) return `${args.storeCount} routes · lower at ${args.cheaperStore}`;
  return `${args.storeCount} routes · ${args.spreadPct}% spread`;
}
