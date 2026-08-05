/**
 * Decision Consensus — agreement across independent QuantAI intelligence modules.
 * Not voting. Not a second ranker. Consumes existing engine outputs only.
 */

export type ConsensusStatus =
  | "consensus_strong"
  | "consensus_building"
  | "consensus_weak"
  | "conflicting_evidence"
  | "new_evidence"
  | "confidence_confirmed"
  | "waiting_confirmation"
  | "consensus_lost";

export type ConsensusModuleId =
  | "decision_engine"
  | "decision_analyst"
  | "decision_thesis"
  | "living_decisions"
  | "decision_memory"
  | "decision_feed"
  | "mission_agent"
  | "living_presence";

export type ConsensusModuleStance = "agree" | "disagree" | "neutral" | "unavailable";

export type ConsensusModuleSignal = {
  id: ConsensusModuleId;
  label: string;
  stance: ConsensusModuleStance;
  /** One-line why this module lands here — from real outputs only. */
  reason: string;
};

export type DecisionConsensusBrief = {
  version: 1;
  status: ConsensusStatus;
  /** Short premium label for the card chip. */
  label: string;
  summary: string;
  agreeCount: number;
  disagreeCount: number;
  availableCount: number;
  modules: ConsensusModuleSignal[];
  whyConsensus: string[];
  enginesAgree: string[];
  enginesDisagree: string[];
  missingEvidence: string[];
  expectedConfirmation: string | null;
  confidenceTrend: {
    trend: "Increasing" | "Stable" | "Decreasing" | "Unknown";
    explanation: string;
  };
  /** True when living/thesis signals indicate a material continuity shift. */
  changed: boolean;
};
