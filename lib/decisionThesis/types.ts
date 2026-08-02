/**
 * Decision Thesis Engine — structured analyst thesis over existing Decision evidence.
 * No ranking. No invented facts. Synthesizes Analyst + Living + Universal outputs only.
 */

export type DecisionThesis = {
  version: 1;
  /** One-sentence core claim behind the recommendation. */
  coreThesis: string;
  supportingEvidence: string[];
  /** Best steel-man against the current recommendation. */
  counterThesis: string;
  missingEvidence: string[];
  confidenceExplanation: string;
  criticalAssumptions: string[];
  failureScenarios: string[];
  confirmationSignals: string[];
  invalidationSignals: string[];
  /** Single most important next event to watch. */
  nextExpectedEvent: string;
};
