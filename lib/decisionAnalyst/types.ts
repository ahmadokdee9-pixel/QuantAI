/**
 * Decision Analyst Brief — world-class analyst fields over real Decision Engine evidence.
 * Every score carries an explanation. Null scores mean insufficient evidence (never invented).
 */

export type ConfidenceTrendLabel = "Increasing" | "Stable" | "Decreasing" | "Unknown";

export type ExplainedScore = {
  score: number | null;
  label: string;
  explanation: string;
  evidence: string[];
};

export type ChangeProbabilityHorizon = {
  horizon: "24h" | "7d" | "30d";
  probabilityPct: number | null;
  explanation: string;
  evidence: string[];
};

export type BuyingWindow = {
  label: string;
  explanation: string;
  evidence: string[];
};

export type IntelligenceTimelineSlot = {
  phase: "Past" | "Now" | "Expected Next";
  headline: string;
  detail: string;
  evidence: string[];
};

export type DecisionSignal = {
  id: string;
  name: string;
  state: string;
  explanation: string;
  evidence: string[];
  /** Optional 0–100 intensity when measurable from evidence. */
  intensity: number | null;
};

export type AnalystDecisionBrief = {
  version: 1;
  /** Max 5 short sentences. */
  executiveDecisionSummary: string;
  whyRecommendation: string[];
  assumptions: string[];
  invalidators: string[];
  watchEvents: string[];
  changeProbabilities: ChangeProbabilityHorizon[];
  bestBuyingWindow: BuyingWindow;
  worstBuyingWindow: BuyingWindow;
  confidenceTrend: {
    trend: ConfidenceTrendLabel;
    explanation: string;
    evidence: string[];
  };
  opportunity: ExplainedScore;
  risk: ExplainedScore;
  regret: ExplainedScore;
  waiting: ExplainedScore;
  betterAlternativeProbability: ExplainedScore;
  expectedPriceMovement: {
    direction: "down" | "up" | "flat" | "unknown";
    magnitudeLabel: string;
    explanation: string;
    evidence: string[];
  };
  recommendationStability: ExplainedScore;
  intelligenceTimeline: IntelligenceTimelineSlot[];
  signals: DecisionSignal[];
  /** Systems / engines that contributed evidence (for transparency). */
  evidenceSystems: string[];
  /** Decision Thesis Engine — structured analyst thesis (optional until attached). */
  thesis?: import("@/lib/decisionThesis/types").DecisionThesis;
};
