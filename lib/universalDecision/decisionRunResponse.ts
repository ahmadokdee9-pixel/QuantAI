import type { RunUniversalDecisionResult } from "@/lib/universalDecision/runDecision";
import type { UniversalDecision } from "@/lib/universalDecision/types";

const ACTIONS = new Set(["BUY", "WAIT", "COMPARE", "AVOID"]);

/**
 * A complete valid decision requires a decision object with evidence-backed candidates.
 * Never treat insufficientEvidence or empty candidate sets as success.
 */
export function isCompleteValidDecision(
  decision: UniversalDecision | null | undefined,
  candidates: unknown
): decision is UniversalDecision {
  if (!decision || typeof decision !== "object") return false;
  if (decision.insufficientEvidence) return false;
  if (!ACTIONS.has(String(decision.action))) return false;

  const fromDecision = Array.isArray(decision.candidates) ? decision.candidates : [];
  const fromEnvelope = Array.isArray(candidates) ? candidates : [];
  const n = Math.max(fromDecision.length, fromEnvelope.length);
  if (n <= 0) return false;

  // Leader or at least one candidate with an id/title
  const sample = fromDecision[0] ?? fromEnvelope[0];
  if (!sample || typeof sample !== "object") return false;
  const s = sample as { id?: unknown; title?: unknown };
  if (!s.id && !s.title) return false;

  return true;
}

export type DecisionRunFailClosed = {
  ok: false;
  status: 422;
  error: string;
  code: string;
  classification: RunUniversalDecisionResult["classification"];
  decision: null;
  candidates: [];
  routedToProductPipeline: boolean;
};

export type DecisionRunSuccessBody = {
  ok: true;
  classification: RunUniversalDecisionResult["classification"];
  decision: UniversalDecision;
  candidates: NonNullable<RunUniversalDecisionResult["result"]>["candidates"] | [];
  routedToProductPipeline: boolean;
};

/**
 * Map engine outcome to HTTP success vs fail-closed. Never success with decision=null.
 */
export function mapDecisionRunOutcome(
  outcome: RunUniversalDecisionResult
): DecisionRunSuccessBody | DecisionRunFailClosed {
  const candidates = outcome.result?.candidates ?? outcome.decision?.candidates ?? [];

  if (outcome.routedToProductPipeline && !outcome.decision) {
    return {
      ok: false,
      status: 422,
      error: "Product decisions require the live search pipeline",
      code: "PRODUCT_PIPELINE_REQUIRED",
      classification: outcome.classification,
      decision: null,
      candidates: [],
      routedToProductPipeline: true,
    };
  }

  if (outcome.classification.needsClarification && !outcome.decision) {
    return {
      ok: false,
      status: 422,
      error: outcome.classification.clarifyingQuestion || "Clarification required",
      code: "CLARIFICATION_REQUIRED",
      classification: outcome.classification,
      decision: null,
      candidates: [],
      routedToProductPipeline: false,
    };
  }

  if (!isCompleteValidDecision(outcome.decision, candidates)) {
    return {
      ok: false,
      status: 422,
      error: "No evidence-backed decision available",
      code: "DECISION_UNAVAILABLE",
      classification: outcome.classification,
      decision: null,
      candidates: [],
      routedToProductPipeline: outcome.routedToProductPipeline,
    };
  }

  return {
    ok: true,
    classification: outcome.classification,
    decision: outcome.decision,
    candidates: Array.isArray(candidates) ? candidates : [],
    routedToProductPipeline: outcome.routedToProductPipeline,
  };
}
