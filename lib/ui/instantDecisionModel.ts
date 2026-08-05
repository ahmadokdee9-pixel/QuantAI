/**
 * Instant Decision Card — view model from live Decision Engine outputs.
 * No mock data. Degrades gracefully when optional signals are absent.
 */

import { buildProductAnalystBrief } from "@/lib/decisionAnalyst";
import type { AnalystDecisionBrief } from "@/lib/decisionAnalyst/types";
import { buildDecisionConsensus } from "@/lib/decisionConsensus";
import type { DecisionConsensusBrief } from "@/lib/decisionConsensus/types";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import { buildLocalLivingPresence } from "@/lib/decisionMemory/livingPresence";
import type { LivingDecisionThread } from "@/lib/livingDecision/types";
import { listLocalMissionsDashboard } from "@/lib/missions/clientMissions";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type {
  ShopperRecommendationLabel,
  UniversalProductDecision,
} from "@/lib/ui/universalProductDecision";

export type ExecutiveDecisionAction = "BUY" | "WAIT" | "COMPARE" | "AVOID";

export type DecisionTimelineSlot = {
  horizon: "Today" | "This Week" | "This Month";
  stance: "Act" | "Hold" | "Reassess" | "Avoid";
  note: string;
};

export type InstantDecisionTransparencySignal = {
  label: string;
  value: string;
  score?: number;
};

export type InstantDecisionAlternative = {
  title: string;
  store: string;
  link: string;
  price: number | null;
  why: string;
};

export type InstantDecisionViewModel = {
  action: ExecutiveDecisionAction;
  /** Narrower engine label when useful (e.g. BEST VALUE → shown as nuance). */
  actionDetail: string | null;
  confidence: number;
  executiveSummary: string;
  topReasons: string[];
  risks: string[];
  betterAlternatives: InstantDecisionAlternative[];
  waitIntelligence: {
    relevant: boolean;
    headline: string;
    points: string[];
  };
  timeline: DecisionTimelineSlot[];
  /** World-class analyst layer — scores, signals, Past/Now/Next. */
  analyst: AnalystDecisionBrief;
  /** Agreement across independent intelligence modules. */
  consensus: DecisionConsensusBrief;
  product: {
    title: string;
    store: string;
    link: string;
    price: number | null;
    image: string;
  };
  transparency: InstantDecisionTransparencySignal[];
  systemsInvolved: string[];
};

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function uniqueLines(values: Array<string | null | undefined>, max: number): string[] {
  const seen = setOnce();
  const out: string[] = [];
  for (const value of values) {
    const line = (value ?? "").trim().replace(/\s+/g, " ");
    if (!line || seen.has(line.toLowerCase())) continue;
    seen.add(line.toLowerCase());
    out.push(line);
    if (out.length >= max) break;
  }
  return out;
}

function setOnce(): Set<string> {
  return new Set<string>();
}

export function resolveExecutiveAction(
  universal: UniversalProductDecision | null | undefined,
  briefLabel?: string | null
): { action: ExecutiveDecisionAction; actionDetail: string | null } {
  const label = universal?.recommendationLabel;
  const verdict: PrimaryVerdict | undefined = universal?.verdict;

  if (label === "AVOID" || verdict === "AVOID") {
    return { action: "AVOID", actionDetail: null };
  }
  if (verdict === "WAIT") {
    return { action: "WAIT", actionDetail: null };
  }
  if (label === "COMPARE" || verdict === "COMPARE" || verdict === "INSUFFICIENT DATA") {
    return {
      action: "COMPARE",
      actionDetail: verdict === "INSUFFICIENT DATA" ? "Evidence incomplete" : null,
    };
  }
  if (label === "BEST VALUE") {
    return { action: "BUY", actionDetail: "Best value in tray" };
  }
  if (label === "STRONG BUY") {
    return { action: "BUY", actionDetail: "Strong buy" };
  }
  if (label === "BUY" || verdict === "BUY READY") {
    return { action: "BUY", actionDetail: null };
  }

  const brief = (briefLabel ?? "").toUpperCase();
  if (brief.includes("AVOID")) return { action: "AVOID", actionDetail: null };
  if (brief.includes("WAIT")) return { action: "WAIT", actionDetail: null };
  if (brief.includes("COMPARE")) return { action: "COMPARE", actionDetail: null };
  if (brief.includes("BUY") || brief.includes("VALUE") || brief.includes("BEST")) {
    return { action: "BUY", actionDetail: null };
  }

  return { action: "COMPARE", actionDetail: null };
}

function buildExecutiveSummary(args: {
  action: ExecutiveDecisionAction;
  actionDetail: string | null;
  product: QuantProduct;
  universal: UniversalProductDecision;
  brief: DecisionBriefDTO | null;
}): string {
  const { action, actionDetail, product, universal, brief } = args;
  const intel = universal.productIntelligence;
  const thesis =
    universal.decisionThesis?.trim() ||
    universal.primaryReason?.trim() ||
    universal.reasonLine?.trim() ||
    brief?.explanation?.trim() ||
    brief?.buyReasoning?.trim() ||
    brief?.waitReasoning?.trim() ||
    brief?.compareReasoning?.trim() ||
    "";

  const priceBit =
    product.price > 0 ? ` at €${Math.round(product.price)} from ${product.store}` : ` from ${product.store}`;

  const lead =
    action === "BUY"
      ? actionDetail === "Best value in tray"
        ? `Buy this option${priceBit} — it is the strongest value call in this search.`
        : `Buy this option${priceBit}.`
      : action === "WAIT"
        ? `Wait before buying${priceBit}.`
        : action === "AVOID"
          ? `Avoid this option${priceBit}.`
          : `Compare before committing${priceBit}.`;

  const second =
    thesis ||
    intel?.decisionReasoning?.primaryLine ||
    intel?.buyExplanation?.primaryLine ||
    brief?.explanationSummary ||
    universal.summaryLines?.[0] ||
    "QuantAI weighed trust, price realism, fit, and alternatives before issuing this call.";

  const third =
    action === "WAIT"
      ? intel?.waitExplanation?.formattedBlock ||
        intel?.waitPrediction?.predictionLine ||
        brief?.waitReasoning ||
        "Timing or evidence is not strong enough for a confident purchase yet."
      : action === "COMPARE"
        ? brief?.alternativesSummary ||
          universal.summaryLines?.[1] ||
          "Close alternatives remain competitive — verify the tradeoffs before checkout."
        : action === "AVOID"
          ? universal.reasonAuthority?.primaryReason?.line ||
            "Risk, mismatch, or weak evidence outweighs the upside."
          : brief?.confidenceSummary ||
            universal.confidenceReason ||
            `Confidence is calibrated at ${clampPct(universal.confidence)}%.`;

  return uniqueLines([lead, second, third], 3).join(" ");
}

function buildTopReasons(
  universal: UniversalProductDecision,
  brief: DecisionBriefDTO | null
): string[] {
  const intel = universal.productIntelligence;
  const rdr = intel?.rankingDecisionRecord;
  const activated = brief?.keyReasons ?? brief?.topSignals ?? [];
  const authorityReasons = [
    universal.reasonAuthority?.primaryReason?.line,
    ...(universal.reasonAuthority?.secondaryReasons?.map((r) => r.line) ?? []),
  ];

  return uniqueLines(
    [
      universal.primaryReason,
      universal.secondaryReason,
      ...authorityReasons,
      intel?.decisionReasoning?.primaryLine,
      rdr?.whyRanked,
      ...(rdr?.evidenceChain ?? []),
      ...activated,
      ...(brief?.why ?? []),
      ...(intel?.decisionReasoning?.reasoningFocus ?? []),
      universal.summaryLines?.[0],
      universal.summaryLines?.[1],
    ],
    4
  );
}

function buildRisks(
  universal: UniversalProductDecision,
  brief: DecisionBriefDTO | null,
  action: ExecutiveDecisionAction
): string[] {
  const intel = universal.productIntelligence;
  const risks = uniqueLines(
    [
      ...(brief?.riskSignals ?? []),
      ...(brief?.tradeoffs ?? []),
      intel?.commerceReasoning?.whyLost,
      intel?.waitPrediction?.waitValid
        ? `Stock risk while waiting: ${intel.waitPrediction.stockLossRisk}`
        : null,
      intel?.calibrationConsistency && !intel.calibrationConsistency.valid
        ? "Internal signal tension detected — treat confidence cautiously."
        : null,
      intel?.dataQuality?.useInsufficientData
        ? intel.dataQuality.reasoning || "Evidence quality is incomplete for a hard call."
        : null,
      action === "BUY" && universal.confidence < 72
        ? "Confidence is solid but not maximal — verify listing details at checkout."
        : null,
      action === "COMPARE" ? "No single option dominates enough to auto-commit." : null,
      action === "WAIT" && intel?.waitPrediction?.stockLossRisk === "high"
        ? "Waiting carries elevated stock-loss risk on this listing."
        : null,
    ],
    4
  );

  if (risks.length > 0) return risks;
  if (action === "AVOID") return ["Proceeding would fight the calibrated risk signals in this tray."];
  if (action === "WAIT") return ["Buying now may leave value on the table if timing improves."];
  return ["Market and listing conditions can change — re-check before payment."];
}

function buildWaitIntelligence(
  action: ExecutiveDecisionAction,
  universal: UniversalProductDecision,
  brief: DecisionBriefDTO | null
): InstantDecisionViewModel["waitIntelligence"] {
  const intel = universal.productIntelligence;
  const wait = intel?.waitPrediction;
  const waitExp = intel?.waitExplanation;
  const history = intel?.commercePriceHistory;

  const points = uniqueLines(
    [
      waitExp?.whyWait || wait?.whyWait,
      wait?.waitValid && wait.expectedSavings > 0
        ? `Price may improve — expected savings ~€${Math.round(wait.expectedSavings)} (${wait.dropProbabilityPct}% probability)`
        : null,
      wait?.expectedTimeframe ? `Timing window: ${wait.expectedTimeframe}` : null,
      history?.seasonalHint ? `Seasonal signal: ${history.seasonalHint}` : null,
      history?.insight?.trend === "down" ? "Recent price trail trends downward" : null,
      history?.insight?.trend === "up"
        ? "Recent price trail trends upward — waiting may not help"
        : null,
      brief?.marketContextSummary,
      brief?.waitReasoning,
      intel?.waitForecastV2?.forecastLine,
    ],
    5
  );

  if (action === "WAIT") {
    return {
      relevant: true,
      headline: "Waiting is the executive call",
      points:
        points.length > 0
          ? points
          : ["Evidence for waiting is present but incomplete — reassess as prices move."],
    };
  }

  // Do not dilute a BUY/AVOID call with a competing wait lecture.
  if (action === "BUY" || action === "AVOID") {
    return {
      relevant: false,
      headline: "Buying now is acceptable on timing — no strong wait edge detected.",
      points: [],
    };
  }

  if (!wait?.waitValid && points.length < 2) {
    return {
      relevant: false,
      headline: "Buying now is acceptable on timing — no strong wait edge detected.",
      points: [],
    };
  }

  return {
    relevant: true,
    headline: wait?.waitValid
      ? "Timing is mixed — watch before rushing"
      : "Wait signals to consider",
    points: points.slice(0, 4),
  };
}

function buildTimeline(
  action: ExecutiveDecisionAction,
  confidence: number,
  wait: InstantDecisionViewModel["waitIntelligence"]
): DecisionTimelineSlot[] {
  if (action === "BUY") {
    return [
      {
        horizon: "Today",
        stance: confidence >= 70 ? "Act" : "Reassess",
        note:
          confidence >= 70
            ? "Calibrated purchase window is open."
            : "Buyable, but verify listing details first.",
      },
      {
        horizon: "This Week",
        stance: "Act",
        note: "Decision remains strong unless price or stock flips.",
      },
      {
        horizon: "This Month",
        stance: wait.relevant ? "Reassess" : "Act",
        note: wait.relevant
          ? "Re-check if seasonal or promo cycles arrive."
          : "Still a sound default if needs stay the same.",
      },
    ];
  }

  if (action === "WAIT") {
    return [
      { horizon: "Today", stance: "Hold", note: "Do not force a purchase today." },
      {
        horizon: "This Week",
        stance: "Reassess",
        note: wait.points[0] || "Watch price and availability movement.",
      },
      {
        horizon: "This Month",
        stance: "Reassess",
        note: "Resolve once timing or discount evidence improves.",
      },
    ];
  }

  if (action === "AVOID") {
    return [
      { horizon: "Today", stance: "Avoid", note: "Walk away from this option." },
      { horizon: "This Week", stance: "Avoid", note: "Only reopen if a different offer appears." },
      { horizon: "This Month", stance: "Reassess", note: "Re-run search if requirements change." },
    ];
  }

  return [
    { horizon: "Today", stance: "Reassess", note: "Compare the shortlist before checkout." },
    { horizon: "This Week", stance: "Act", note: "Decide once tradeoffs are clear." },
    { horizon: "This Month", stance: "Reassess", note: "Revisit if the market shifts." },
  ];
}

function buildAlternatives(
  leader: QuantProduct,
  tray: QuantProduct[],
  brief: DecisionBriefDTO | null,
  universalByLink: Map<string, UniversalProductDecision>
): InstantDecisionAlternative[] {
  const fromBrief = (brief?.alternatives ?? [])
    .filter((alt) => alt.link && alt.link !== leader.link)
    .slice(0, 2)
    .map((alt) => {
      const product = tray.find((p) => p.link === alt.link);
      const altUniversal = universalByLink.get(alt.link);
      return {
        title: alt.title,
        store: alt.store,
        link: alt.link,
        price: product && product.price > 0 ? product.price : null,
        why:
          altUniversal?.reasonLine ||
          alt.label ||
          "Competitive alternative in this tray",
      };
    });

  if (fromBrief.length > 0) return fromBrief;

  return tray
    .filter((p) => p.link !== leader.link)
    .slice(0, 2)
    .map((p) => {
      const altUniversal = universalByLink.get(p.link);
      const label = altUniversal?.recommendationLabel;
      return {
        title: p.title,
        store: p.store,
        link: p.link,
        price: p.price > 0 ? p.price : null,
        why:
          altUniversal?.reasonLine ||
          (label ? `${label} candidate` : "Next-best option under the same ranking authority"),
      };
    });
}

function buildTransparency(
  universal: UniversalProductDecision,
  product: QuantProduct
): { signals: InstantDecisionTransparencySignal[]; systems: string[] } {
  const intel = universal.productIntelligence;
  const rdr = intel?.rankingDecisionRecord;
  const breakdown = rdr?.compositeBreakdown;
  const trust = getStoreTrustScore(product.store);

  const signals: InstantDecisionTransparencySignal[] = [];

  const push = (label: string, value: string, score?: number) => {
    signals.push({ label, value, score });
  };

  if (breakdown) {
    push("Relevance", `${breakdown.relevance}/100`, breakdown.relevance);
    push("Trust", `${breakdown.trust}/100`, breakdown.trust);
    push("Recommendation fit", `${breakdown.recommendation}/100`, breakdown.recommendation);
    push("Constraints", `${breakdown.constraints}/100`, breakdown.constraints);
  } else {
    push("Seller trust prior", `${trust}/100`, trust);
    push("Decision confidence", `${clampPct(universal.confidence)}%`, universal.confidence);
  }

  if (intel?.trueValue?.trueValueScore != null) {
    push("True value", `${Math.round(intel.trueValue.trueValueScore)}/100`, intel.trueValue.trueValueScore);
  }
  if (intel?.discountConfidence) {
    push(
      "Discount credibility",
      intel.discountConfidence.label ||
        `${Math.round(intel.discountConfidence.discountConfidence)}/100`,
      intel.discountConfidence.discountConfidence
    );
  }
  if (intel?.merchantReliability) {
    push(
      "Seller quality",
      intel.merchantReliability.label ||
        `${Math.round(intel.merchantReliability.merchantReliabilityScore)}/100`,
      intel.merchantReliability.merchantReliabilityScore
    );
  }
  if (intel?.commercePriceHistory?.insight?.trend) {
    push("Price history", `Trend: ${intel.commercePriceHistory.insight.trend}`);
  }
  const ratingNum =
    typeof product.rating === "number"
      ? product.rating
      : Number.parseFloat(String(product.rating ?? ""));
  if (Number.isFinite(ratingNum) && ratingNum > 0) {
    push(
      "Reviews",
      `${ratingNum.toFixed(1)}★${product.reviewsCount ? ` · ${product.reviewsCount} reviews` : ""}`
    );
  }
  if (rdr?.finalRankScore != null) {
    push("Canonical rank score", `${Math.round(rdr.finalRankScore)}`);
  }

  const systems = uniqueLines(
    [
      "Phase A canonical ranking",
      "Decision calibration",
      breakdown ? "Truth / ranking decision record" : null,
      intel?.discountConfidence ? "Discount authenticity" : null,
      intel?.merchantReliability || trust >= 0 ? "Seller trust signals" : null,
      intel?.trueValue ? "True value model" : null,
      intel?.waitPrediction ? "Wait / timing intelligence" : null,
      intel?.commercePriceHistory ? "Price history" : null,
      "Merchant diversity safeguards",
    ],
    8
  );

  return { signals: signals.slice(0, 8), systems };
}

export function buildInstantDecisionViewModel(args: {
  leader: QuantProduct | null | undefined;
  tray: QuantProduct[];
  universal: UniversalProductDecision | null | undefined;
  brief: DecisionBriefDTO | null | undefined;
  universalByLink?: Map<string, UniversalProductDecision>;
  livingThread?: LivingDecisionThread | null;
}): InstantDecisionViewModel | null {
  const {
    leader,
    tray,
    universal,
    brief = null,
    universalByLink = new Map(),
    livingThread = null,
  } = args;
  if (!leader || !universal) return null;

  const { action, actionDetail } = resolveExecutiveAction(universal, brief?.recommendation?.label);
  const confidence = clampPct(universal.confidence);
  const waitIntelligence = buildWaitIntelligence(action, universal, brief);
  const topReasons = buildTopReasons(universal, brief);
  const risks = buildRisks(universal, brief, action);
  const { signals, systems } = buildTransparency(universal, leader);

  const analyst = buildProductAnalystBrief({
    action,
    confidence,
    universal,
    brief,
    livingThread,
    reasons: topReasons,
    risks,
  });

  const executiveSummary =
    analyst.thesis?.coreThesis ||
    analyst.executiveDecisionSummary ||
    buildExecutiveSummary({
      action,
      actionDetail,
      product: leader,
      universal,
      brief,
    });

  // Prefer thesis confidence explanation in transparency when present.
  if (analyst.thesis?.confidenceExplanation) {
    signals.unshift({
      label: "Confidence explanation",
      value: analyst.thesis.confidenceExplanation,
    });
  }

  let presence = null;
  let missionPendingCritical: number | null = null;
  let missionLinked: boolean | null = null;
  try {
    if (typeof window !== "undefined") {
      presence = buildLocalLivingPresence();
      const dash = listLocalMissionsDashboard();
      missionPendingCritical = dash.totals.criticalChanges;
      const link = leader.link;
      const q = (brief?.recommendation?.title || leader.title || "").toLowerCase();
      missionLinked = dash.missions.some((m) =>
        m.decisions.some(
          (d) =>
            (d.productLink && d.productLink === link) ||
            (d.searchQuery &&
              q &&
              (d.searchQuery.toLowerCase().includes(q.slice(0, 18)) ||
                q.includes(d.searchQuery.toLowerCase().slice(0, 18))))
        )
      );
      if (dash.totals.activeMissions === 0) {
        missionLinked = null;
        missionPendingCritical = null;
      }
    }
  } catch {
    presence = null;
  }

  const consensus = buildDecisionConsensus({
    action,
    confidence,
    analyst,
    livingThread,
    presence,
    missionPendingCritical,
    missionLinked,
  });

  return {
    action,
    actionDetail,
    confidence,
    executiveSummary,
    topReasons,
    risks,
    betterAlternatives: buildAlternatives(leader, tray, brief, universalByLink),
    waitIntelligence,
    timeline: buildTimeline(action, confidence, waitIntelligence),
    analyst,
    consensus,
    product: {
      title: leader.title,
      store: leader.store,
      link: leader.link,
      price: leader.price > 0 ? leader.price : null,
      image: leader.image || "",
    },
    transparency: [
      ...signals,
      {
        label: "Opportunity",
        value:
          analyst.opportunity.score != null
            ? `${analyst.opportunity.score}/100 — ${analyst.opportunity.label}`
            : analyst.opportunity.label,
        score: analyst.opportunity.score ?? undefined,
      },
      {
        label: "Risk",
        value:
          analyst.risk.score != null
            ? `${analyst.risk.score}/100 — ${analyst.risk.label}`
            : analyst.risk.label,
        score: analyst.risk.score ?? undefined,
      },
      {
        label: "Regret (buy today)",
        value:
          analyst.regret.score != null
            ? `${analyst.regret.score}/100 — ${analyst.regret.label}`
            : analyst.regret.label,
        score: analyst.regret.score ?? undefined,
      },
      {
        label: "Waiting value",
        value:
          analyst.waiting.score != null
            ? `${analyst.waiting.score}/100 — ${analyst.waiting.label}`
            : analyst.waiting.label,
        score: analyst.waiting.score ?? undefined,
      },
      {
        label: "Stability",
        value:
          analyst.recommendationStability.score != null
            ? `${analyst.recommendationStability.score}/100 — ${analyst.recommendationStability.label}`
            : analyst.recommendationStability.label,
        score: analyst.recommendationStability.score ?? undefined,
      },
    ].slice(0, 12),
    systemsInvolved: uniqueLines([...systems, ...analyst.evidenceSystems], 10),
  };
}

/** Map shopper label → executive action for tests / secondary surfaces. */
export function shopperLabelToExecutiveAction(
  label: ShopperRecommendationLabel | PrimaryVerdict | string
): ExecutiveDecisionAction {
  const u = String(label).toUpperCase();
  if (u.includes("AVOID")) return "AVOID";
  if (u.includes("WAIT")) return "WAIT";
  if (u.includes("COMPARE") || u.includes("INSUFFICIENT")) return "COMPARE";
  if (u.includes("BUY") || u.includes("VALUE") || u.includes("BEST")) return "BUY";
  return "COMPARE";
}
