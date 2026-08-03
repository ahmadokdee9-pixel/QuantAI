export type { DecisionThesis } from "@/lib/decisionThesis/types";
export type { DecisionThesisSnapshot } from "@/lib/decisionThesis/snapshot";
export {
  buildDecisionThesis,
  withDecisionThesis,
} from "@/lib/decisionThesis/buildDecisionThesis";
export {
  buildThesisSnapshot,
  detectThesisContinuityChanges,
  extractThesisSnapshot,
  thesisContinuityHeadline,
  withThesisEvidence,
  THESIS_EVIDENCE_ID,
} from "@/lib/decisionThesis/snapshot";
