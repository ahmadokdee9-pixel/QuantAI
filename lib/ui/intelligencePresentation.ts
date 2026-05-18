/**
 * Calm Futuristic Intelligence — premium strategist language for UI surfaces.
 * Presentation only; engine signals stay unchanged.
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
        label: "High Confidence Purchase",
        whisper: "Price, trust, and timing align.",
        surfaceClass: "qi-decision-surface--positive",
      };
    case "SAFE_TRUSTED_OFFER":
      return {
        label: "Trusted Fulfillment Path",
        whisper: "Seller profile supports a safer entry.",
        surfaceClass: "qi-decision-surface--calm",
      };
    case "BEST_REGIONAL_DEAL":
      return {
        label: "Regional Market Edge",
        whisper: "Local fit outperforms the wider field.",
        surfaceClass: "qi-decision-surface--positive",
      };
    case "HIDDEN_VALUE":
      return {
        label: "Undervalued Opportunity",
        whisper: "Priced below comparable quality in this tray.",
        surfaceClass: "qi-decision-surface--accent",
      };
    case "STRONG_VALUE":
      return {
        label: "Exceptional Market Position",
        whisper: "Strong balance of price and trust.",
        surfaceClass: "qi-decision-surface--calm",
      };
    case "WAIT_FOR_DROP":
    case "DISCOUNT_LIKELY_SOON":
      return {
        label: "Timing Favors Patience",
        whisper: "Current pricing conditions may improve.",
        surfaceClass: "qi-decision-surface--caution",
      };
    case "PREMIUM_PRICING":
      return {
        label: "Premium Market Band",
        whisper: "Above fair range — justify on safety or spec.",
        surfaceClass: "qi-decision-surface--accent",
      };
    case "RISKY_SELLER":
      return {
        label: "Elevated Seller Risk",
        whisper: "Verify fulfillment before committing.",
        surfaceClass: "qi-decision-surface--risk",
      };
    case "HIGH_VOLATILITY":
      return {
        label: "Market Instability Detected",
        whisper: "Wide spread — compare before you decide.",
        surfaceClass: "qi-decision-surface--caution",
      };
    default:
      return {
        label: "Compare Before Committing",
        whisper: "The market currently favors stronger alternatives.",
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
  const base = `${args.storeCount} routes · ${args.spreadPct}% spread`;
  if (args.isBestTrusted) return `${base} · best trusted path`;
  if (args.cheaperStore) return `${base} · stronger at ${args.cheaperStore}`;
  return base;
}
