/** Institutional intelligence language — presentation layer only. */

export const INTEL_TERMS = {
  retailSource: "Retail source",
  marketEntry: "Market entry",
  trustLayer: "Trust layer",
  decisionConfidence: "Decision confidence",
  intelligenceAsset: "Intelligence asset",
  marketAlternative: "Market alternative",
  intelligenceResults: "Intelligence results",
  riskLayer: "Risk layer",
  priceValidation: "Price validation",
  retailValidation: "Retail validation",
  marketPulse: "Market pulse",
  signalEngine: "Signal engine",
  trustNetwork: "Trust network",
  decisionRadar: "Decision radar",
  retailGraph: "Retail graph",
  confidenceEngine: "Confidence engine",
  opportunityLayer: "Opportunity layer",
  retailIntelligence: "Retail intelligence",
  executiveBrief: "Executive decision brief",
  leadRecommendation: "Lead intelligence recommendation",
  topAlternatives: "Top market alternatives",
  marketWatchlist: "Market watchlist",
  lowConfidence: "Low confidence options",
  whyQuantAIChose: "Why QuantAI chose this",
  openDecisionBrief: "Open decision brief",
  openRetailSource: "Open retail source",
} as const;

export function merchantActionLabel(store: string): string {
  return `Open ${store.trim() || "retailer"} →`;
}
