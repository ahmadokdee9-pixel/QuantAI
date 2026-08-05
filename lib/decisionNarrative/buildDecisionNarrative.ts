/**
 * Build Decision Narrative from already-computed intelligence outputs.
 * No ranking. No new scores. Premium analyst structure only.
 */

import type { AnalystDecisionBrief } from "@/lib/decisionAnalyst/types";
import type { DecisionConsensusBrief } from "@/lib/decisionConsensus/types";
import type { LivingPresenceSnapshot } from "@/lib/decisionMemory/livingPresence";
import type {
  DecisionNarrativeBrief,
  NarrativeBlock,
  NarrativeBlockId,
} from "@/lib/decisionNarrative/types";
import { thesisContinuityHeadline } from "@/lib/decisionThesis/snapshot";
import type { LivingDecisionThread } from "@/lib/livingDecision/types";

type ExecutiveAction = "BUY" | "WAIT" | "COMPARE" | "AVOID";

const BLOCK_TITLES: Record<NarrativeBlockId, string> = {
  situation: "Why",
  current_reality: "What changed",
  key_forces: "Key forces",
  main_opportunity: "Main opportunity",
  main_risk: "Main risk",
  why_waiting: "Why waiting could help",
  why_acting: "Why acting now could help",
  confidence: "How certain",
  what_would_change: "What would invalidate this",
  expected_next: "Watch next",
  missing_evidence: "Missing evidence",
};

function clean(line: string | null | undefined): string | null {
  if (!line) return null;
  const t = line.trim().replace(/\s+/g, " ");
  if (!t) return null;
  // Keep analyst tone: strip soft marketing openers if they leak in.
  return t
    .replace(/^(unlock|discover|revolutionize|game[- ]?changing)\b[:\s-]*/i, "")
    .trim();
}

function linesOf(
  values: Array<string | null | undefined>,
  max = 4
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const line = clean(raw);
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line.endsWith(".") ? line : `${line}.`);
    if (out.length >= max) break;
  }
  return out;
}

function block(id: NarrativeBlockId, values: Array<string | null | undefined>): NarrativeBlock {
  return {
    id,
    title: BLOCK_TITLES[id],
    lines: linesOf(values, 4),
  };
}

function actionSense(action: ExecutiveAction): string {
  switch (action) {
    case "BUY":
      return "commitment is favored now";
    case "WAIT":
      return "patience is the stronger posture";
    case "COMPARE":
      return "comparison still earns its keep";
    case "AVOID":
      return "avoidance is the responsible call";
  }
}

export function buildDecisionNarrative(args: {
  action: ExecutiveAction;
  confidence: number;
  analyst: AnalystDecisionBrief;
  consensus: DecisionConsensusBrief;
  livingThread?: LivingDecisionThread | null;
  presence?: LivingPresenceSnapshot | null;
  missionLinked?: boolean | null;
  missionPendingCritical?: number | null;
  productTitle?: string | null;
}): DecisionNarrativeBrief {
  const {
    action,
    confidence,
    analyst,
    consensus,
    livingThread = null,
    presence = null,
    missionLinked = null,
    missionPendingCritical = null,
    productTitle = null,
  } = args;

  const thesis = analyst.thesis ?? null;
  const continuity = livingThread?.recentChanges?.length
    ? thesisContinuityHeadline(livingThread.recentChanges)
    : null;
  const nowSlot = analyst.intelligenceTimeline.find((s) => s.phase === "Now");
  const pastSlot = analyst.intelligenceTimeline.find((s) => s.phase === "Past");
  const nextSlot = analyst.intelligenceTimeline.find((s) => s.phase === "Expected Next");
  const topSignals = analyst.signals.slice(0, 3);

  const situation = block("situation", [
    productTitle
      ? `${productTitle}: ${actionSense(action)} at ${Math.round(confidence)}% confidence`
      : `Executive call ${action} at ${Math.round(confidence)}% confidence — ${actionSense(action)}`,
    thesis?.coreThesis || analyst.executiveDecisionSummary || null,
    consensus.label ? `${consensus.label}: ${consensus.summary}` : null,
  ]);

  const currentReality = block("current_reality", [
    nowSlot?.headline || null,
    nowSlot?.detail || null,
    continuity,
    livingThread?.recentChanges?.[0]
      ? `Latest living change: ${livingThread.recentChanges[0].label || livingThread.recentChanges[0].kind}`
      : null,
    presence?.statusKicker || null,
    pastSlot?.headline ? `Prior context: ${pastSlot.headline}` : null,
  ]);

  const keyForces = block("key_forces", [
    ...topSignals.map((s) => `${s.name}: ${s.state}${s.explanation ? ` — ${s.explanation}` : ""}`),
    analyst.expectedPriceMovement.direction !== "unknown"
      ? `Price posture ${analyst.expectedPriceMovement.direction}: ${analyst.expectedPriceMovement.explanation}`
      : null,
    analyst.recommendationStability.score != null
      ? `Recommendation stability ${analyst.recommendationStability.score}/100 — ${analyst.recommendationStability.explanation}`
      : null,
    missionLinked
      ? missionPendingCritical && missionPendingCritical > 0
        ? `Mission context active with ${missionPendingCritical} critical pending item(s)`
        : "Mission context links this decision to a broader commitment"
      : null,
  ]);

  const mainOpportunity = block("main_opportunity", [
    analyst.opportunity.score != null
      ? `Opportunity ${analyst.opportunity.score}/100 — ${analyst.opportunity.label}`
      : null,
    analyst.opportunity.explanation || null,
    ...(analyst.opportunity.evidence || []).slice(0, 2),
    analyst.bestBuyingWindow.label
      ? `Best window: ${analyst.bestBuyingWindow.label}. ${analyst.bestBuyingWindow.explanation}`
      : null,
  ]);

  const mainRisk = block("main_risk", [
    analyst.risk.score != null
      ? `Risk ${analyst.risk.score}/100 — ${analyst.risk.label}`
      : null,
    analyst.risk.explanation || null,
    analyst.regret.score != null
      ? `Regret if acting today ${analyst.regret.score}/100 — ${analyst.regret.explanation}`
      : null,
    thesis?.counterThesis || null,
    ...(analyst.risk.evidence || []).slice(0, 1),
  ]);

  const whyWaiting = block("why_waiting", [
    analyst.waiting.score != null
      ? `Waiting value ${analyst.waiting.score}/100 — ${analyst.waiting.label}`
      : null,
    analyst.waiting.explanation || null,
    analyst.expectedPriceMovement.direction === "down"
      ? analyst.expectedPriceMovement.explanation
      : null,
    analyst.changeProbabilities.find((h) => h.horizon === "7d")?.explanation || null,
    action === "WAIT" || action === "COMPARE"
      ? "Holding preserves optionality until confirming evidence arrives"
      : null,
  ]);

  const whyActing = block("why_acting", [
    action === "BUY"
      ? `Acting now aligns with ${action} at ${Math.round(confidence)}% confidence`
      : null,
    analyst.opportunity.score != null && analyst.opportunity.score >= 55
      ? analyst.opportunity.explanation
      : null,
    analyst.regret.score != null && analyst.regret.score < 40
      ? `Regret pressure is contained (${analyst.regret.score}/100)`
      : null,
    analyst.bestBuyingWindow.explanation || null,
    consensus.agreeCount >= 2 && consensus.disagreeCount === 0
      ? `${consensus.agreeCount} independent modules already align on ${action}`
      : null,
    action === "AVOID"
      ? "Acting now means declining the commitment — that is the decision"
      : null,
  ]);

  const confidenceBlock = block("confidence", [
    thesis?.confidenceExplanation || analyst.confidenceTrend.explanation,
    `Trend ${analyst.confidenceTrend.trend}`,
    consensus.status === "confidence_confirmed" || consensus.status === "consensus_strong"
      ? consensus.summary
      : null,
    analyst.recommendationStability.explanation || null,
  ]);

  const whatWouldChange = block("what_would_change", [
    ...(thesis?.invalidationSignals || []).slice(0, 2),
    ...(analyst.invalidators || []).slice(0, 2),
    thesis?.failureScenarios?.[0] || null,
    consensus.enginesDisagree[0] || null,
  ]);

  const missingEvidence = block("missing_evidence", [
    ...(thesis?.missingEvidence || []).slice(0, 3),
    ...(consensus.missingEvidence || []).slice(0, 2),
    analyst.opportunity.score == null ? "Opportunity score not yet evidenced" : null,
    !livingThread ? "No living continuity yet for this decision" : null,
  ]);

  const expectedNext = block("expected_next", [
    thesis?.nextExpectedEvent || null,
    nextSlot?.headline || null,
    nextSlot?.detail || null,
    consensus.expectedConfirmation || null,
    analyst.watchEvents[0] || null,
    ...(thesis?.confirmationSignals || []).slice(0, 1),
  ]);

  const blocks = [
    situation,
    currentReality,
    confidenceBlock,
    expectedNext,
    whatWouldChange,
    missingEvidence,
    keyForces,
    mainOpportunity,
    mainRisk,
    whyWaiting,
    whyActing,
  ].filter((b) => b.lines.length > 0);

  const lead =
    clean(thesis?.coreThesis) ||
    clean(analyst.executiveDecisionSummary) ||
    `${action} at ${Math.round(confidence)}% — ${consensus.label}.`;

  return {
    version: 1,
    lead: lead.endsWith(".") ? lead : `${lead}.`,
    blocks,
  };
}
