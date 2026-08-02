export type {
  AnalystDecisionBrief,
  BuyingWindow,
  ChangeProbabilityHorizon,
  ConfidenceTrendLabel,
  DecisionSignal,
  ExplainedScore,
  IntelligenceTimelineSlot,
} from "@/lib/decisionAnalyst/types";

export type { DecisionThesis } from "@/lib/decisionThesis/types";

export {
  buildProductAnalystBrief,
  buildUniversalAnalystBrief,
  withAnalystBrief,
} from "@/lib/decisionAnalyst/buildAnalystBrief";

export {
  buildDecisionThesis,
  withDecisionThesis,
} from "@/lib/decisionThesis";