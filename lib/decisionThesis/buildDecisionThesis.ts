/**
 * Decision Thesis Engine — enrich Decision Briefs with a world-class thesis structure.
 * Reuses AnalystDecisionBrief / Living Decision / Universal evidence. Never re-ranks.
 */

import type { AnalystDecisionBrief } from "@/lib/decisionAnalyst/types";
import type { DecisionThesis } from "@/lib/decisionThesis/types";
import type { LivingDecisionThread } from "@/lib/livingDecision/types";

function unique(lines: Array<string | null | undefined>, max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of lines) {
    const line = (raw ?? "").trim().replace(/\s+/g, " ");
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length >= max) break;
  }
  return out;
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function buildCounterThesis(args: {
  action: string;
  analyst: AnalystDecisionBrief;
}): string {
  const { action, analyst } = args;
  const wait = analyst.waiting;
  const regret = analyst.regret;
  const alt = analyst.betterAlternativeProbability;
  const risk = analyst.risk;
  const price = analyst.expectedPriceMovement;

  if (action === "BUY") {
    if (wait.score != null && wait.score >= 50) {
      return `Counter-thesis: WAIT — waiting score ${wait.score}/100 (${wait.label}) suggests timing still has value${
        price.direction === "down" ? ` and price path leans ${price.direction}` : ""
      }.`;
    }
    if (alt.score != null && alt.score >= 55) {
      return `Counter-thesis: COMPARE — better-alternative odds ${alt.score}/100 mean a nearby option may dominate.`;
    }
    if (regret.score != null && regret.score >= 55) {
      return `Counter-thesis: HOLD — regret-if-buy-today ${regret.score}/100 argues against committing immediately.`;
    }
    return `Counter-thesis: The BUY call could be premature if ${
      risk.score != null ? `risk (${risk.score}/100)` : "unmeasured risk"
    } rises or listing conditions flip before checkout.`;
  }

  if (action === "WAIT") {
    if (analyst.opportunity.score != null && analyst.opportunity.score >= 60) {
      return `Counter-thesis: BUY NOW — opportunity ${analyst.opportunity.score}/100 and inventory/timing risk may erase the wait edge.`;
    }
    return `Counter-thesis: Act sooner if stock pressure or upward price path invalidates the wait window (${analyst.worstBuyingWindow.label}).`;
  }

  if (action === "AVOID") {
    return `Counter-thesis: REOPEN if a different merchant/offer clears risk (${
      risk.explanation || "calibrated avoid pressure"
    }) and opportunity improves.`;
  }

  // COMPARE
  if (analyst.opportunity.score != null && analyst.opportunity.score >= 65) {
    return `Counter-thesis: BUY the leader — opportunity ${analyst.opportunity.score}/100 may already separate it from the pack.`;
  }
  return `Counter-thesis: One option may already dominate; continued comparison delays a clear ${
    analyst.bestBuyingWindow.label
  }.`;
}

function buildMissingEvidence(args: {
  analyst: AnalystDecisionBrief;
  livingThread?: LivingDecisionThread | null;
  confidenceReason?: string | null;
}): string[] {
  const { analyst, livingThread = null } = args;
  return unique(
    [
      !livingThread?.events?.length
        ? "No prior Living Decision history for this identity — trend claims are snapshot-limited."
        : null,
      analyst.expectedPriceMovement.direction === "unknown"
        ? "No verified price-path evidence for a directional forecast."
        : null,
      analyst.opportunity.score == null
        ? "Opportunity model did not emit a score for this listing."
        : null,
      analyst.risk.score == null ? "Risk could not be fully scored from available signals." : null,
      analyst.changeProbabilities.some((h) => h.probabilityPct == null)
        ? "Change-probability horizons lack movement evidence for at least one window."
        : null,
      analyst.signals.every((s) => s.id !== "freshness")
        ? "Freshness signal not attached — timing-sensitive claims are weaker."
        : null,
      analyst.confidenceTrend.trend === "Unknown"
        ? "Confidence trend unknown — insufficient prior confidence samples."
        : null,
      analyst.recommendationStability.score == null
        ? "Recommendation stability could not be scored."
        : null,
    ],
    6
  );
}

function buildConfirmationSignals(args: {
  action: string;
  analyst: AnalystDecisionBrief;
  livingThread?: LivingDecisionThread | null;
}): string[] {
  const { action, analyst, livingThread = null } = args;
  const supportingAction =
    action === "BUY"
      ? analyst.opportunity.score != null && analyst.opportunity.score >= 55
      : action === "WAIT"
        ? analyst.waiting.score != null && analyst.waiting.score >= 50
        : action === "AVOID"
          ? analyst.risk.score != null && analyst.risk.score >= 60
          : analyst.betterAlternativeProbability.score != null &&
            analyst.betterAlternativeProbability.score >= 45;

  return unique(
    [
      supportingAction
        ? action === "BUY"
          ? `Opportunity confirms BUY (${analyst.opportunity.score}/100 — ${analyst.opportunity.label}).`
          : action === "WAIT"
            ? `Waiting value confirms WAIT (${analyst.waiting.score}/100 — ${analyst.waiting.label}).`
            : action === "AVOID"
              ? `Risk confirms AVOID (${analyst.risk.score}/100 — ${analyst.risk.label}).`
              : `Alternative pressure confirms COMPARE (${analyst.betterAlternativeProbability.score}/100).`
        : null,
      analyst.confidenceTrend.trend === "Increasing"
        ? "Living/calibration confidence is increasing."
        : analyst.confidenceTrend.trend === "Stable" && action === "BUY"
          ? "Confidence trend is stable under a BUY call."
          : null,
      analyst.recommendationStability.score != null && analyst.recommendationStability.score >= 65
        ? `Recommendation stability ${analyst.recommendationStability.score}/100 supports holding this call.`
        : null,
      ...analyst.signals
        .filter((s) => {
          if (action === "BUY") {
            return (
              (s.id === "historical_positioning" &&
                /low|great|good/i.test(s.state)) ||
              (s.id === "seller_confidence" && (s.intensity ?? 0) >= 60) ||
              (s.id === "discount_credibility" && (s.intensity ?? 0) >= 55)
            );
          }
          if (action === "WAIT") {
            return (
              (s.id === "price_momentum" && s.state === "down") ||
              s.id === "market_volatility"
            );
          }
          return s.id === "freshness" && s.state === "fresh";
        })
        .map((s) => `${s.name}: ${s.state} — ${s.explanation}`),
      livingThread?.recentChanges?.length === 0 && livingThread
        ? "Living Decision recheck showed no material change — thesis still intact."
        : null,
      analyst.bestBuyingWindow.label
        ? `Best window aligns: ${analyst.bestBuyingWindow.label}.`
        : null,
    ],
    6
  );
}

function buildFailureScenarios(args: {
  action: string;
  analyst: AnalystDecisionBrief;
}): string[] {
  const { action, analyst } = args;
  return unique(
    [
      ...analyst.invalidators.slice(0, 3),
      analyst.regret.score != null && analyst.regret.score >= 60 && action === "BUY"
        ? `High buy-today regret (${analyst.regret.score}/100) materializes at checkout.`
        : null,
      analyst.expectedPriceMovement.direction === "down" && action === "BUY"
        ? "Price continues down after purchase — timing failure."
        : null,
      analyst.expectedPriceMovement.direction === "up" && action === "WAIT"
        ? "Price rises while waiting — wait-window failure."
        : null,
      analyst.changeProbabilities.find((h) => h.horizon === "7d")?.probabilityPct != null &&
      (analyst.changeProbabilities.find((h) => h.horizon === "7d")!.probabilityPct as number) >= 55
        ? "Recommendation flips within 7 days as change pressure stays elevated."
        : null,
      action === "COMPARE"
        ? "Comparison paralysis — market moves while the shortlist stays unresolved."
        : null,
    ],
    5
  );
}

/**
 * Build a Decision Thesis from an already-computed Analyst brief (+ optional living thread).
 */
export function buildDecisionThesis(args: {
  action: string;
  confidence: number;
  analyst: AnalystDecisionBrief;
  livingThread?: LivingDecisionThread | null;
  /** Optional calibrated confidence reason from UniversalProductDecision / UniversalDecision. */
  confidenceReason?: string | null;
  /** Optional pre-existing product thesis line (reuse, do not re-rank). */
  existingThesis?: string | null;
}): DecisionThesis {
  const {
    action,
    confidence,
    analyst,
    livingThread = null,
    confidenceReason = null,
    existingThesis = null,
  } = args;

  const why0 = analyst.whyRecommendation[0] || existingThesis || "calibrated Decision Engine evidence";
  const coreThesis =
    (existingThesis && existingThesis.trim()) ||
    `${action} is the calibrated call at ${clampPct(confidence)}% confidence because ${why0.replace(/\.$/, "")}.`;

  const supportingEvidence = unique(
    [
      ...analyst.whyRecommendation,
      analyst.opportunity.score != null
        ? `Opportunity ${analyst.opportunity.score}/100 — ${analyst.opportunity.explanation}`
        : null,
      ...analyst.opportunity.evidence,
      ...analyst.signals.slice(0, 3).map((s) => `${s.name}: ${s.state}`),
      analyst.intelligenceTimeline.find((s) => s.phase === "Now")?.detail || null,
      livingThread?.current
        ? `Living Decision current action ${livingThread.current.action}${
            livingThread.current.confidence != null
              ? ` @ ${Math.round(livingThread.current.confidence)}%`
              : ""
          }`
        : null,
    ],
    6
  );

  const counterThesis = buildCounterThesis({ action, analyst });

  const missingEvidence = buildMissingEvidence({ analyst, livingThread, confidenceReason });

  const confidenceExplanation = unique(
    [
      confidenceReason?.trim() || null,
      `Confidence is calibrated at ${clampPct(confidence)}% from Decision Engine evidence density — not prose volume.`,
      analyst.confidenceTrend.explanation,
      analyst.recommendationStability.score != null
        ? `Stability ${analyst.recommendationStability.score}/100 (${analyst.recommendationStability.label}) bounds how hard this confidence should be trusted over time.`
        : null,
      analyst.changeProbabilities[0]?.probabilityPct != null
        ? `24h flip odds ~${analyst.changeProbabilities[0].probabilityPct}% temper near-term certainty.`
        : null,
    ],
    4
  ).join(" ");

  const criticalAssumptions = unique(analyst.assumptions, 5);

  const failureScenarios = buildFailureScenarios({ action, analyst });

  const confirmationSignals = buildConfirmationSignals({ action, analyst, livingThread });

  const invalidationSignals = unique(
    [
      ...analyst.invalidators,
      ...analyst.watchEvents.slice(0, 2).map((w) => `Watch-triggered invalidation: ${w}`),
      analyst.confidenceTrend.trend === "Decreasing"
        ? "Confidence trend decreasing — thesis weakens if decline continues."
        : null,
      analyst.worstBuyingWindow.explanation
        ? `Worst window: ${analyst.worstBuyingWindow.label} — ${analyst.worstBuyingWindow.explanation}`
        : null,
    ],
    6
  );

  const nextFromTimeline = analyst.intelligenceTimeline.find((s) => s.phase === "Expected Next");
  const nextExpectedEvent =
    nextFromTimeline?.headline ||
    analyst.watchEvents[0] ||
    analyst.bestBuyingWindow.label ||
    "Re-run Decision Engine when price, stock, or Living Decision changes.";

  return {
    version: 1,
    coreThesis: coreThesis.trim().slice(0, 320),
    supportingEvidence:
      supportingEvidence.length > 0
        ? supportingEvidence
        : ["Decision Engine issued an action with limited supporting lines — treat as provisional."],
    counterThesis,
    missingEvidence:
      missingEvidence.length > 0
        ? missingEvidence
        : ["No major evidence gaps flagged — still re-check at checkout."],
    confidenceExplanation:
      confidenceExplanation ||
      `Confidence ${clampPct(confidence)}% from calibrated Decision Engine outputs.`,
    criticalAssumptions:
      criticalAssumptions.length > 0
        ? criticalAssumptions
        : ["Assumes current provider snapshot remains valid through checkout."],
    failureScenarios:
      failureScenarios.length > 0
        ? failureScenarios
        : ["Listing conditions change before commitment."],
    confirmationSignals:
      confirmationSignals.length > 0
        ? confirmationSignals
        : [`Action ${action} stands until watch events fire.`],
    invalidationSignals,
    nextExpectedEvent: [
      nextExpectedEvent,
      nextFromTimeline?.detail && nextFromTimeline.detail !== nextExpectedEvent
        ? nextFromTimeline.detail
        : null,
    ]
      .filter(Boolean)
      .join(" — ")
      .slice(0, 280),
  };
}

/** Attach thesis onto an Analyst brief (immutable enrich). */
export function withDecisionThesis(
  analyst: AnalystDecisionBrief,
  args: {
    action: string;
    confidence: number;
    livingThread?: LivingDecisionThread | null;
    confidenceReason?: string | null;
    existingThesis?: string | null;
  }
): AnalystDecisionBrief {
  const thesis = buildDecisionThesis({
    action: args.action,
    confidence: args.confidence,
    analyst,
    livingThread: args.livingThread,
    confidenceReason: args.confidenceReason,
    existingThesis: args.existingThesis,
  });
  return {
    ...analyst,
    thesis,
    evidenceSystems: unique([...analyst.evidenceSystems, "Decision Thesis Engine"], 10),
  };
}
