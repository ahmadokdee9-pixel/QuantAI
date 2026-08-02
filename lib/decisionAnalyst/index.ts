export type {
  AnalystDecisionBrief,
  BuyingWindow,
  ChangeProbabilityHorizon,
  ConfidenceTrendLabel,
  DecisionSignal,
  ExplainedScore,
  IntelligenceTimelineSlot,
} from "@/lib/decisionAnalyst/types";

export {
  buildProductAnalystBrief,
  buildUniversalAnalystBrief,
  withAnalystBrief,
} from "@/lib/decisionAnalyst/buildAnalystBrief";
