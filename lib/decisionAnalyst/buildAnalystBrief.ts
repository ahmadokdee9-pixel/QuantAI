/**
 * Build Analyst Decision Brief from real Decision Engine + Living Decision evidence.
 * Deterministic. No random percentages. Null when evidence is missing.
 */

import { confidenceTrend } from "@/lib/decisionMemory/changeDetection";
import { withDecisionThesis } from "@/lib/decisionThesis";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { LivingDecisionThread } from "@/lib/livingDecision/types";
import type {
  AnalystDecisionBrief,
  BuyingWindow,
  ChangeProbabilityHorizon,
  ConfidenceTrendLabel,
  DecisionSignal,
  ExplainedScore,
  IntelligenceTimelineSlot,
} from "@/lib/decisionAnalyst/types";
import type { UniversalDecision } from "@/lib/universalDecision/types";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

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

function scoreOrNull(
  value: number | null | undefined,
  label: string,
  explanation: string,
  evidence: string[]
): ExplainedScore {
  if (value == null || !Number.isFinite(value)) {
    return {
      score: null,
      label: "Insufficient evidence",
      explanation: explanation || `No verified evidence to compute ${label}.`,
      evidence: evidence.length ? evidence : ["No measurable signal available"],
    };
  }
  return {
    score: clampPct(value),
    label,
    explanation,
    evidence: evidence.length ? evidence : ["Derived from Decision Engine signals"],
  };
}

function livingConfidenceSeries(thread: LivingDecisionThread | null | undefined): number[] {
  if (!thread?.events?.length) {
    return thread?.current?.confidence != null ? [thread.current.confidence] : [];
  }
  const confs: number[] = [];
  for (const ev of thread.events) {
    if (ev.kind === "confidence_changed" && typeof ev.current === "number") {
      confs.push(ev.current);
    }
  }
  if (thread.current.confidence != null) confs.push(thread.current.confidence);
  return confs;
}

function mapTrendLabel(
  raw: "Improving" | "Stable" | "Declining" | null
): ConfidenceTrendLabel {
  if (raw === "Improving") return "Increasing";
  if (raw === "Declining") return "Decreasing";
  if (raw === "Stable") return "Stable";
  return "Unknown";
}

function buildChangeProbabilities(args: {
  action: string;
  confidence: number;
  waitDropPct: number | null;
  volatility01: number | null;
  freshnessStale: boolean;
  freshnessPartial: boolean;
  livingChangeCount: number;
  stockRisk: "low" | "medium" | "high" | null;
}): ChangeProbabilityHorizon[] {
  const {
    action,
    confidence,
    waitDropPct,
    volatility01,
    freshnessStale,
    freshnessPartial,
    livingChangeCount,
    stockRisk,
  } = args;

  const hasTiming = waitDropPct != null || volatility01 != null || livingChangeCount > 0;
  if (!hasTiming && !freshnessStale && action === "COMPARE" && confidence < 40) {
    const empty = (horizon: ChangeProbabilityHorizon["horizon"]): ChangeProbabilityHorizon => ({
      horizon,
      probabilityPct: null,
      explanation:
        "Insufficient movement evidence — cannot estimate recommendation change probability.",
      evidence: ["No wait prediction, price volatility, or living history available"],
    });
    return [empty("24h"), empty("7d"), empty("30d")];
  }

  // Base instability from real signals only
  let base = 12;
  const evidenceBase: string[] = [];
  if (freshnessStale) {
    base += 18;
    evidenceBase.push("Source freshness marked stale");
  } else if (freshnessPartial) {
    base += 8;
    evidenceBase.push("Source freshness partial");
  }
  if (volatility01 != null) {
    base += Math.round(volatility01 * 28);
    evidenceBase.push(`Price volatility ${(volatility01 * 100).toFixed(0)}%`);
  }
  if (waitDropPct != null) {
    base += Math.round(waitDropPct * 0.22);
    evidenceBase.push(`Wait drop probability ${waitDropPct}%`);
  }
  if (livingChangeCount > 0) {
    base += Math.min(20, livingChangeCount * 6);
    evidenceBase.push(`${livingChangeCount} recent living change(s)`);
  }
  if (stockRisk === "high") {
    base += 10;
    evidenceBase.push("High stock-loss risk while waiting");
  }
  if (action === "WAIT") {
    base += 8;
    evidenceBase.push("Executive action is WAIT — timing expected to move");
  }
  if (action === "BUY" && confidence >= 75) {
    base = Math.max(8, base - 12);
    evidenceBase.push("High-confidence BUY dampens short-term flip probability");
  }

  const h24 = clampPct(base * 0.55);
  const h7 = clampPct(base * 0.95);
  const h30 = clampPct(Math.min(92, base * 1.25 + (waitDropPct != null ? waitDropPct * 0.15 : 0)));

  return [
    {
      horizon: "24h",
      probabilityPct: h24,
      explanation: `~${h24}% chance the recommendation flips within a day based on freshness, volatility, and living change pressure.`,
      evidence: evidenceBase,
    },
    {
      horizon: "7d",
      probabilityPct: h7,
      explanation: `~${h7}% chance of a material recommendation change this week — wait/promo and listing churn dominate this horizon.`,
      evidence: evidenceBase,
    },
    {
      horizon: "30d",
      probabilityPct: h30,
      explanation: `~${h30}% chance the call revises within a month as seasonal/promo cycles and market position evolve.`,
      evidence: evidenceBase,
    },
  ];
}

function buildBuyingWindows(args: {
  action: string;
  waitValid: boolean;
  waitTimeframe: string | null;
  seasonalHint: string | null;
  historyLabel: string | null;
  priceTrend: string | null;
}): { best: BuyingWindow; worst: BuyingWindow } {
  const { action, waitValid, waitTimeframe, seasonalHint, historyLabel, priceTrend } = args;

  if (action === "BUY" && !waitValid) {
    return {
      best: {
        label: "Now — calibrated purchase window",
        explanation:
          historyLabel === "Historical Low" || historyLabel === "Great Price"
            ? `Current positioning (${historyLabel}) supports acting now rather than delaying.`
            : "Decision Engine shows no strong wait edge — buying now is the better window.",
        evidence: unique(
          [
            historyLabel ? `Price history label: ${historyLabel}` : null,
            priceTrend ? `Trend: ${priceTrend}` : null,
            "Wait prediction not strongly justified",
          ],
          4
        ),
      },
      worst: {
        label: "Indefinite delay",
        explanation:
          stockishWorst(seasonalHint) ||
          "Waiting without a timing edge risks stock loss and misses a fair ask.",
        evidence: unique(
          [seasonalHint ? `Seasonal: ${seasonalHint}` : null, "No validated wait savings"],
          3
        ),
      },
    };
  }

  if (action === "WAIT" || waitValid) {
    return {
      best: {
        label: waitTimeframe || "Next promo / downward trail window",
        explanation:
          "Waiting is justified by price/timing evidence — the best window is the forecasted improvement period.",
        evidence: unique(
          [
            waitTimeframe ? `Forecast: ${waitTimeframe}` : null,
            seasonalHint,
            priceTrend === "down" ? "Downward price trail" : null,
          ],
          4
        ),
      },
      worst: {
        label: "Buying immediately under elevated ask",
        explanation:
          "Forcing a purchase now fights the wait signal and raises overpay/regret risk.",
        evidence: unique(
          [
            waitValid ? "Wait prediction valid" : null,
            historyLabel === "Elevated Price" ? "Elevated vs history" : null,
          ],
          3
        ),
      },
    };
  }

  if (action === "AVOID") {
    return {
      best: {
        label: "After a different offer appears",
        explanation: "Best window is when a non-avoid listing enters the tray.",
        evidence: ["Executive action AVOID"],
      },
      worst: {
        label: "Buying this listing today",
        explanation: "Proceeding against calibrated avoid signals is the worst window.",
        evidence: ["Executive action AVOID"],
      },
    };
  }

  return {
    best: {
      label: "After shortlist comparison",
      explanation: "Compare close alternatives first — the best window opens once tradeoffs are clear.",
      evidence: ["Executive action COMPARE"],
    },
    worst: {
      label: "Blind checkout today",
      explanation: "Committing without resolving close alternatives is the worst window.",
      evidence: ["Executive action COMPARE"],
    },
  };
}

function stockishWorst(seasonal: string | null): string | null {
  if (!seasonal) return null;
  return `Deferring past the next cycle (${seasonal}) is the riskiest delay.`;
}

function buildSignals(args: {
  priceTrend: string | null;
  volatility01: number | null;
  stockRisk: "low" | "medium" | "high" | null;
  merchantScore: number | null;
  merchantLabel: string | null;
  discountLabel: string | null;
  discountScore: number | null;
  historyLabel: string | null;
  freshnessStatus: string | null;
  freshnessStale: boolean;
  demandPressure: string | null;
  trustDelta: string | null;
}): DecisionSignal[] {
  const signals: DecisionSignal[] = [];

  if (args.priceTrend) {
    signals.push({
      id: "price_momentum",
      name: "Price momentum",
      state: args.priceTrend,
      explanation: `Observed price trail is ${args.priceTrend}.`,
      evidence: [`commercePriceHistory.insight.trend=${args.priceTrend}`],
      intensity:
        args.priceTrend === "down" ? 70 : args.priceTrend === "up" ? 65 : 40,
    });
  }

  if (args.stockRisk) {
    const intensity =
      args.stockRisk === "high" ? 80 : args.stockRisk === "medium" ? 50 : 25;
    signals.push({
      id: "inventory_pressure",
      name: "Inventory pressure",
      state: args.stockRisk,
      explanation: `Stock-loss risk while waiting is ${args.stockRisk}.`,
      evidence: [`waitPrediction.stockLossRisk=${args.stockRisk}`],
      intensity,
    });
  }

  if (args.merchantScore != null || args.merchantLabel) {
    signals.push({
      id: "seller_confidence",
      name: "Seller confidence",
      state: args.merchantLabel || `${Math.round(args.merchantScore!)}/100`,
      explanation: "Merchant reliability / trust from Decision Engine seller signals.",
      evidence: unique(
        [
          args.merchantLabel ? `Label: ${args.merchantLabel}` : null,
          args.merchantScore != null ? `Score ${Math.round(args.merchantScore)}/100` : null,
        ],
        3
      ),
      intensity: args.merchantScore != null ? clampPct(args.merchantScore) : null,
    });
  }

  if (args.demandPressure) {
    signals.push({
      id: "demand_pressure",
      name: "Demand pressure",
      state: args.demandPressure,
      explanation: "Market/demand pressure inferred from opportunity and deal rarity signals.",
      evidence: [args.demandPressure],
      intensity: null,
    });
  }

  if (args.volatility01 != null) {
    signals.push({
      id: "market_volatility",
      name: "Market volatility",
      state: `${Math.round(args.volatility01 * 100)}%`,
      explanation: "Price-path volatility from remembered commerce history.",
      evidence: [`volatility01=${args.volatility01.toFixed(2)}`],
      intensity: clampPct(args.volatility01 * 100),
    });
  }

  if (args.historyLabel) {
    signals.push({
      id: "historical_positioning",
      name: "Historical positioning",
      state: args.historyLabel,
      explanation: "Where the current ask sits versus remembered price path.",
      evidence: [`commercePriceHistory.label=${args.historyLabel}`],
      intensity:
        args.historyLabel === "Historical Low" || args.historyLabel === "Great Price"
          ? 78
          : args.historyLabel === "Elevated Price"
            ? 30
            : 55,
    });
  }

  if (args.trustDelta) {
    signals.push({
      id: "trust_changes",
      name: "Trust changes",
      state: args.trustDelta,
      explanation: "Living Decision or merchant trust movement affecting the call.",
      evidence: [args.trustDelta],
      intensity: null,
    });
  }

  if (args.freshnessStatus) {
    signals.push({
      id: "freshness",
      name: "Freshness",
      state: args.freshnessStatus,
      explanation: args.freshnessStale
        ? "Evidence is stale — treat timing-sensitive claims cautiously."
        : "Evidence freshness from the live provider snapshot.",
      evidence: [`sourceFreshness.status=${args.freshnessStatus}`],
      intensity: args.freshnessStale ? 25 : args.freshnessStatus === "fresh" ? 85 : 55,
    });
  }

  if (args.discountLabel || args.discountScore != null) {
    signals.push({
      id: "discount_credibility",
      name: "Discount credibility",
      state: args.discountLabel || `${Math.round(args.discountScore!)}/100`,
      explanation: "Discount authenticity / credibility from the Decision Engine.",
      evidence: unique(
        [
          args.discountLabel,
          args.discountScore != null ? `Score ${Math.round(args.discountScore)}/100` : null,
        ],
        3
      ),
      intensity: args.discountScore != null ? clampPct(args.discountScore) : null,
    });
  }

  return signals.slice(0, 8);
}

function buildExecutiveSummary(args: {
  action: string;
  confidence: number;
  why: string[];
  opportunity: ExplainedScore;
  risk: ExplainedScore;
  waiting: ExplainedScore;
  regret: ExplainedScore;
  bestWindow: BuyingWindow;
  trend: ConfidenceTrendLabel;
  priceMove: string;
}): string {
  const sentences: string[] = [];
  sentences.push(
    `${args.action} at ${clampPct(args.confidence)}% confidence — ${args.why[0] || "calibrated from live Decision Engine evidence"}.`
  );
  if (args.opportunity.score != null) {
    sentences.push(
      `Opportunity ${args.opportunity.score}/100 (${args.opportunity.label}).`
    );
  }
  if (args.risk.score != null) {
    sentences.push(`Risk ${args.risk.score}/100 — ${args.risk.explanation}`);
  }
  if (args.waiting.score != null && args.waiting.score >= 45) {
    sentences.push(`Waiting value ${args.waiting.score}/100 — ${args.bestWindow.label}.`);
  } else if (args.regret.score != null && args.action === "BUY") {
    sentences.push(`Regret-if-buy-today ${args.regret.score}/100 — ${args.regret.label}.`);
  }
  sentences.push(
    `Confidence trend ${args.trend.toLowerCase()}; expected price path ${args.priceMove}.`
  );
  return unique(sentences, 5).join(" ");
}

/** Product Instant Decision path. */
export function buildProductAnalystBrief(args: {
  action: string;
  confidence: number;
  universal: UniversalProductDecision;
  brief?: DecisionBriefDTO | null;
  livingThread?: LivingDecisionThread | null;
  reasons: string[];
  risks: string[];
}): AnalystDecisionBrief {
  const { action, confidence, universal, brief = null, livingThread = null } = args;
  const intel = universal.productIntelligence;
  const wait = intel?.waitPrediction;
  const history = intel?.commercePriceHistory;
  const systems: string[] = ["Decision calibration", "Instant Decision Engine"];

  const why = unique(
    [
      ...args.reasons,
      universal.decisionThesis,
      universal.primaryReason,
      intel?.decisionReasoning?.primaryLine,
      intel?.buyExplanation?.primaryLine,
      brief?.explanationSummary,
    ],
    5
  );

  const assumptions = unique(
    [
      history
        ? "Assumes remembered price path / tray market memory is directionally accurate."
        : "Assumes current listing price and merchant metadata are accurate at fetch time.",
      wait ? "Assumes wait/savings probabilities reflect current market memory signals." : null,
      intel?.merchantReliability || intel?.merchantTrustScore != null
        ? "Assumes merchant reliability signals generalize to checkout experience."
        : null,
      intel?.discountConfidence
        ? "Assumes discount authenticity scoring reflects real vs decorative markdowns."
        : null,
      livingThread
        ? "Assumes Living Decision history for this identity is complete enough to trend."
        : "No prior Living Decision history — trend views are limited to this snapshot.",
      brief?.sparseTrayWarning
        ? "Assumes a sparse tray still contains the relevant competitive set."
        : "Assumes the ranked tray covers the main alternatives for this query.",
    ],
    6
  );

  const invalidators = unique(
    [
      ...args.risks,
      wait?.stockLossRisk === "high" ? "Stock disappears while waiting." : null,
      history?.insight?.trend === "up" ? "Price climbs further before purchase." : null,
      history?.insight?.trend === "down" && action === "BUY"
        ? "A sharper drop arrives after buying — timing invalidates the urgency."
        : null,
      (intel?.alternativeDiscovery?.alternatives?.length ?? 0) > 0 ||
      universal.alternativePressureScore > 55
        ? "A clearly superior alternative appears in-tray."
        : null,
      intel?.dataQuality?.useInsufficientData
        ? "New evidence upgrades data quality and revises confidence."
        : null,
      livingThread?.recentChanges?.some((c) => c.kind === "decision_changed")
        ? "Living Decision already flipped action once — another flip remains possible."
        : null,
    ],
    6
  );

  const watchEvents = unique(
    [
      wait?.expectedTimeframe ? `Watch timing window: ${wait.expectedTimeframe}` : null,
      history?.seasonalHint ? `Watch seasonal: ${history.seasonalHint}` : null,
      wait?.waitValid ? "Watch for validated price drop / promo signals." : null,
      "Watch merchant stock and listing availability.",
      livingThread?.watched ? "Watchlist active — re-check Living Decision changes." : null,
      ...(livingThread?.recentChanges?.map((c) => `Recent change: ${c.label}`) ?? []),
      action === "COMPARE" ? "Watch for a decisive leader to separate from the pack." : null,
      intel?.waitForecastV2?.forecastLine || null,
    ],
    6
  );

  const confSeries = livingConfidenceSeries(livingThread);
  const trendRaw =
    confSeries.length >= 2
      ? confidenceTrend(confSeries[confSeries.length - 2], confSeries[confSeries.length - 1])
      : intel?.calibratedConfidence || intel?.dynamicConfidence
        ? ("Stable" as const)
        : null;
  const trend = mapTrendLabel(trendRaw);
  if (livingThread) systems.push("Living Decisions");
  if (history) systems.push("Price history");
  if (wait) systems.push("Wait / timing intelligence");
  if (intel?.opportunityPriorityV2) systems.push("Opportunity priority");
  if (intel?.merchantReliability) systems.push("Merchant reliability");

  const oppRaw =
    intel?.opportunityPriorityV2?.opportunityScore ??
    intel?.buyOpportunityScore ??
    intel?.marketOpportunityScore ??
    intel?.rankedOpportunity?.opportunityScore ??
    brief?.opportunityScore ??
    null;
  const opportunity = scoreOrNull(
    oppRaw,
    intel?.opportunityLabel?.band ||
      intel?.opportunity?.label ||
      (oppRaw != null && oppRaw >= 70
        ? "Strong opportunity"
        : oppRaw != null && oppRaw >= 45
          ? "Moderate opportunity"
          : oppRaw != null
            ? "Weak opportunity"
            : "Insufficient evidence"),
    intel?.opportunityPriorityV2?.headline ||
      intel?.opportunityLabel?.displayLine ||
      (oppRaw != null
        ? `Opportunity score ${clampPct(oppRaw)} from Decision Engine opportunity models.`
        : "No opportunity model output on this listing."),
    unique(
      [
        oppRaw != null ? `Score ${clampPct(oppRaw)}/100` : null,
        history?.label ? `History: ${history.label}` : null,
        intel?.dealStrength != null ? `Deal strength ${Math.round(intel.dealStrength)}` : null,
      ],
      4
    )
  );

  const trustScore =
    intel?.merchantReliability?.merchantReliabilityScore ??
    intel?.merchantTrustScore ??
    null;
  const riskRawParts: number[] = [];
  if (trustScore != null) riskRawParts.push(100 - trustScore);
  if (wait?.stockLossRisk === "high") riskRawParts.push(72);
  else if (wait?.stockLossRisk === "medium") riskRawParts.push(48);
  if (action === "AVOID") riskRawParts.push(85);
  if (intel?.dataQuality?.useInsufficientData) riskRawParts.push(60);
  if (args.risks.length >= 3) riskRawParts.push(55);
  if (history?.label === "Elevated Price") riskRawParts.push(58);
  const riskRaw =
    riskRawParts.length > 0
      ? riskRawParts.reduce((a, b) => a + b, 0) / riskRawParts.length
      : null;
  const risk = scoreOrNull(
    riskRaw,
    riskRaw != null && riskRaw >= 65
      ? "Elevated risk"
      : riskRaw != null && riskRaw >= 40
        ? "Moderate risk"
        : riskRaw != null
          ? "Contained risk"
          : "Insufficient evidence",
    riskRaw != null
      ? `Risk aggregates merchant, stock, data-quality, and avoid pressure into ${clampPct(riskRaw)}/100.`
      : "Not enough risk signals to score.",
    unique(
      [
        trustScore != null ? `Merchant trust ${Math.round(trustScore)}/100` : null,
        wait?.stockLossRisk ? `Stock risk ${wait.stockLossRisk}` : null,
        action === "AVOID" ? "Action AVOID" : null,
        ...args.risks.slice(0, 2),
      ],
      5
    )
  );

  // Regret if buying today — high when WAIT/AVOID or elevated price / strong wait
  let regretRaw: number | null = null;
  const regretEvidence: string[] = [];
  if (action === "AVOID") {
    regretRaw = 88;
    regretEvidence.push("Action is AVOID");
  } else if (action === "WAIT" && wait?.waitValid) {
    regretRaw = clampPct(55 + (wait.dropProbabilityPct || 0) * 0.35);
    regretEvidence.push(`Valid wait · drop odds ${wait.dropProbabilityPct}%`);
  } else if (action === "BUY") {
    regretRaw = clampPct(
      (100 - confidence) * 0.55 +
        (history?.label === "Elevated Price" ? 25 : 0) +
        (wait?.waitValid ? 18 : 0) +
        (risk.score != null ? risk.score * 0.2 : 0)
    );
    regretEvidence.push(`BUY confidence ${confidence}%`);
    if (history?.label) regretEvidence.push(`History ${history.label}`);
  } else if (action === "COMPARE") {
    regretRaw = 62;
    regretEvidence.push("COMPARE — premature buy raises mismatch regret");
  }

  const regret = scoreOrNull(
    regretRaw,
    regretRaw != null && regretRaw >= 65
      ? "High regret risk"
      : regretRaw != null && regretRaw >= 40
        ? "Moderate regret risk"
        : regretRaw != null
          ? "Low regret risk"
          : "Insufficient evidence",
    regretRaw != null
      ? `Likelihood of regretting a buy-today decision is ${clampPct(regretRaw)}/100.`
      : "Cannot estimate buy-today regret without action and market evidence.",
    regretEvidence
  );

  const waitingRaw = wait?.waitValid
    ? clampPct(
        40 +
          wait.dropProbabilityPct * 0.45 +
          (wait.expectedSavings > 0 ? Math.min(20, wait.expectedSavings / 5) : 0) -
          (wait.stockLossRisk === "high" ? 18 : wait.stockLossRisk === "medium" ? 8 : 0)
      )
    : action === "WAIT"
      ? 58
      : action === "BUY" && !wait?.waitValid
        ? 22
        : null;
  if (wait) {
    // keep
  }
  const waiting = scoreOrNull(
    waitingRaw,
    waitingRaw != null && waitingRaw >= 60
      ? "Waiting is valuable"
      : waitingRaw != null && waitingRaw >= 40
        ? "Mixed waiting value"
        : waitingRaw != null
          ? "Waiting has limited value"
          : "Insufficient evidence",
    wait?.predictionLine ||
      wait?.whyWait ||
      (waitingRaw != null
        ? `Waiting score ${clampPct(waitingRaw)}/100 from timing evidence.`
        : "No wait prediction available."),
    unique(
      [
        wait?.dropProbabilityPct != null
          ? `Drop probability ${wait.dropProbabilityPct}%`
          : null,
        wait?.expectedSavings != null && wait.expectedSavings > 0
          ? `Expected savings ~€${Math.round(wait.expectedSavings)}`
          : null,
        wait?.expectedTimeframe || null,
      ],
      4
    )
  );

  const altPressure = universal.alternativePressureScore;
  const altCount =
    (brief?.alternatives?.length ?? 0) ||
    (intel?.alternativeDiscovery?.alternatives?.length ?? 0) ||
    (intel?.globalAlternatives ? 1 : 0);
  const betterAltRaw =
    action === "COMPARE"
      ? clampPct(55 + Math.min(30, altPressure * 0.3) + (altCount > 0 ? 10 : 0))
      : altPressure > 0 || altCount > 0
        ? clampPct(altPressure * 0.7 + (altCount > 1 ? 15 : 0))
        : action === "BUY"
          ? 18
          : null;
  const betterAlternativeProbability = scoreOrNull(
    betterAltRaw,
    betterAltRaw != null && betterAltRaw >= 60
      ? "Likely better alternative"
      : betterAltRaw != null && betterAltRaw >= 35
        ? "Possible better alternative"
        : betterAltRaw != null
          ? "Unlikely better alternative"
          : "Insufficient evidence",
    betterAltRaw != null
      ? `Probability a better alternative exists nearby is ${clampPct(betterAltRaw)}/100.`
      : "No alternative-pressure evidence on this decision.",
    unique(
      [
        altPressure > 0 ? `Alternative pressure ${Math.round(altPressure)}` : null,
        altCount > 0 ? `${altCount} alternative signal(s)` : null,
        action === "COMPARE" ? "COMPARE action" : null,
      ],
      4
    )
  );

  let priceDir: AnalystDecisionBrief["expectedPriceMovement"]["direction"] = "unknown";
  const priceEvidence: string[] = [];
  if (history?.insight?.trend === "down" || (wait?.waitValid && (wait.dropProbabilityPct ?? 0) >= 50)) {
    priceDir = "down";
    if (history?.insight?.trend === "down") priceEvidence.push("Price trail down");
    if (wait?.dropProbabilityPct != null) {
      priceEvidence.push(`Drop probability ${wait.dropProbabilityPct}%`);
    }
  } else if (history?.insight?.trend === "up") {
    priceDir = "up";
    priceEvidence.push("Price trail up");
  } else if (history?.insight?.trend === "flat") {
    priceDir = "flat";
    priceEvidence.push("Price trail flat");
  } else if (action === "BUY" && !wait?.waitValid) {
    priceDir = "flat";
    priceEvidence.push("No strong wait/drop edge — path treated as flat for timing");
  }

  const expectedPriceMovement: AnalystDecisionBrief["expectedPriceMovement"] = {
    direction: priceDir,
    magnitudeLabel:
      wait?.expectedSavings != null && wait.expectedSavings > 0 && priceDir === "down"
        ? `~€${Math.round(wait.expectedSavings)} potential improvement`
        : priceDir === "up"
          ? "Upward pressure — waiting may cost more"
          : priceDir === "flat"
            ? "Limited expected move"
            : "Unknown — insufficient path evidence",
    explanation:
      wait?.predictionLine ||
      history?.reasoning ||
      (priceDir === "unknown"
        ? "No verified price-path evidence for a directional forecast."
        : `Expected movement ${priceDir} from Decision Engine timing/history signals.`),
    evidence: priceEvidence.length
      ? priceEvidence
      : ["No price history or wait forecast attached"],
  };

  const changeProbabilities = buildChangeProbabilities({
    action,
    confidence,
    waitDropPct: wait?.dropProbabilityPct ?? null,
    volatility01: history?.insight?.volatility01 ?? null,
    freshnessStale: false,
    freshnessPartial: Boolean(intel?.dataQuality?.useInsufficientData),
    livingChangeCount: livingThread?.recentChanges?.length ?? 0,
    stockRisk: wait?.stockLossRisk ?? null,
  });

  const avgChange =
    changeProbabilities
      .map((c) => c.probabilityPct)
      .filter((n): n is number => n != null)
      .reduce((a, b, _, arr) => a + b / arr.length, 0) || null;
  const stabilityRaw =
    avgChange != null ? clampPct(100 - avgChange) : confidence >= 70 ? 68 : null;
  const recommendationStability = scoreOrNull(
    stabilityRaw,
    stabilityRaw != null && stabilityRaw >= 70
      ? "Stable recommendation"
      : stabilityRaw != null && stabilityRaw >= 45
        ? "Moderately stable"
        : stabilityRaw != null
          ? "Unstable recommendation"
          : "Insufficient evidence",
    stabilityRaw != null
      ? `Stability ${clampPct(stabilityRaw)}/100 is the inverse of estimated change pressure across horizons.`
      : "Cannot score stability without change-probability evidence.",
    unique(
      changeProbabilities.map(
        (c) =>
          `${c.horizon}: ${c.probabilityPct != null ? `${c.probabilityPct}%` : "n/a"}`
      ),
      3
    )
  );

  const windows = buildBuyingWindows({
    action,
    waitValid: Boolean(wait?.waitValid),
    waitTimeframe: wait?.expectedTimeframe ?? null,
    seasonalHint: history?.seasonalHint ?? null,
    historyLabel: history?.label ?? null,
    priceTrend: history?.insight?.trend ?? null,
  });

  const intelligenceTimeline: IntelligenceTimelineSlot[] = [
    {
      phase: "Past",
      headline:
        livingThread?.events?.length
          ? `Living Decision has ${livingThread.events.length} recorded event(s)`
          : history?.label
            ? `Price history: ${history.label}`
            : "No prior Living Decision history for this identity",
      detail:
        livingThread?.recentChanges?.[0]?.label ||
        history?.reasoning ||
        history?.insight?.compactTimelineSummary ||
        "This snapshot is the first calibrated call in-session.",
      evidence: unique(
        [
          livingThread?.decisionId ? `decisionId ${livingThread.decisionId}` : null,
          history?.historicalLow != null
            ? `Historical low ~€${Math.round(history.historicalLow)}`
            : null,
          livingThread?.current?.action
            ? `Prior/current action ${livingThread.current.action}`
            : null,
        ],
        4
      ),
    },
    {
      phase: "Now",
      headline: `${action} · ${clampPct(confidence)}% confidence`,
      detail: why[0] || universal.reasonLine || "Calibrated Instant Decision for the current tray.",
      evidence: unique(
        [
          `Action ${action}`,
          opportunity.score != null ? `Opportunity ${opportunity.score}` : null,
          risk.score != null ? `Risk ${risk.score}` : null,
        ],
        4
      ),
    },
    {
      phase: "Expected Next",
      headline: windows.best.label,
      detail:
        changeProbabilities[1]?.explanation ||
        expectedPriceMovement.explanation ||
        watchEvents[0] ||
        "Reassess when watch events fire.",
      evidence: unique(
        [
          changeProbabilities[1]
            ? `7d change odds ${changeProbabilities[1].probabilityPct ?? "n/a"}%`
            : null,
          expectedPriceMovement.magnitudeLabel,
          watchEvents[0] || null,
        ],
        4
      ),
    },
  ];

  const demandPressure =
    intel?.dealRarity != null
      ? `Deal rarity ${Math.round(intel.dealRarity)}`
      : intel?.dealStrength != null
        ? `Deal strength ${Math.round(intel.dealStrength)}`
        : null;

  const trustDelta =
    livingThread?.recentChanges?.find((c) => c.kind === "decision_changed")?.label ||
    (trend === "Decreasing"
      ? "Confidence trending down"
      : trend === "Increasing"
        ? "Confidence trending up"
        : null);

  const signals = buildSignals({
    priceTrend: history?.insight?.trend ?? null,
    volatility01: history?.insight?.volatility01 ?? null,
    stockRisk: wait?.stockLossRisk ?? null,
    merchantScore: trustScore,
    merchantLabel: intel?.merchantReliability?.label ?? null,
    discountLabel: intel?.discountConfidence?.label ?? null,
    discountScore: intel?.discountConfidence?.discountConfidence ?? null,
    historyLabel: history?.label ?? null,
    freshnessStatus: intel?.dataQuality?.useInsufficientData ? "partial" : "fresh",
    freshnessStale: false,
    demandPressure,
    trustDelta,
  });

  const executiveDecisionSummary = buildExecutiveSummary({
    action,
    confidence,
    why,
    opportunity,
    risk,
    waiting,
    regret,
    bestWindow: windows.best,
    trend,
    priceMove: expectedPriceMovement.magnitudeLabel,
  });

  const base: AnalystDecisionBrief = {
    version: 1,
    executiveDecisionSummary,
    whyRecommendation: why,
    assumptions,
    invalidators,
    watchEvents,
    changeProbabilities,
    bestBuyingWindow: windows.best,
    worstBuyingWindow: windows.worst,
    confidenceTrend: {
      trend,
      explanation:
        trend === "Unknown"
          ? "Not enough prior confidence samples to establish a trend."
          : `Confidence trend is ${trend.toLowerCase()} from Living Decision and/or dynamic calibration.`,
      evidence: unique(
        [
          confSeries.length >= 2
            ? `Series ${confSeries
                .slice(-3)
                .map((n) => Math.round(n))
                .join(" → ")}`
            : null,
          intel?.dynamicConfidence
            ? `dynamicConfidence ${Math.round(intel.dynamicConfidence.confidence)}%`
            : null,
          `Current confidence ${clampPct(confidence)}%`,
        ],
        4
      ),
    },
    opportunity,
    risk,
    regret,
    waiting,
    betterAlternativeProbability,
    expectedPriceMovement,
    recommendationStability,
    intelligenceTimeline,
    signals,
    evidenceSystems: unique(systems, 8),
  };

  return withDecisionThesis(base, {
    action,
    confidence,
    livingThread,
    confidenceReason: universal.confidenceReason,
    existingThesis: universal.decisionThesis,
  });
}

/** Universal (flight/hotel/subscription) path. */
export function buildUniversalAnalystBrief(args: {
  decision: UniversalDecision;
  livingThread?: LivingDecisionThread | null;
}): AnalystDecisionBrief {
  const { decision, livingThread = null } = args;
  const action = decision.action;
  const confidence = clampPct(decision.confidence);
  const factEvidence = decision.evidence.filter((e) => e.kind === "fact");
  const systems = unique(
    [
      `Universal Decision · ${decision.domain}`,
      decision.providerStatus === "live" ? "Live provider" : `Provider ${decision.providerStatus}`,
      livingThread ? "Living Decisions" : null,
    ],
    6
  );

  const why = unique([...decision.reasons, decision.executiveSummary], 5);
  const assumptions = unique(
    [
      `Assumes ${decision.domain} provider listings reflect bookable reality at fetch time.`,
      decision.sourceFreshness.stale
        ? "Freshness is stale — timing claims are provisional."
        : `Assumes source freshness status "${decision.sourceFreshness.status}" is accurate.`,
      decision.trust.notes[0] || null,
      livingThread
        ? "Assumes Living Decision history for this identity is usable for trends."
        : "No prior Living Decision history for this identity.",
      decision.insufficientEvidence
        ? "Evidence is incomplete — treat the call as provisional."
        : null,
    ],
    6
  );

  const invalidators = unique(
    [
      ...decision.risks,
      decision.sourceFreshness.stale ? "Newer fare/rate snapshot contradicts this call." : null,
      decision.alternatives.length > 0
        ? "A competing option undercuts price or fit."
        : null,
      "Policy/fee details missing from the listing invalidate a BUY.",
    ],
    6
  );

  const waitPoints = decision.timing.waitPoints ?? [];

  const watchEvents = unique(
    [
      ...waitPoints,
      decision.timing.thisWeek,
      "Watch price/fare movement on this identity.",
      ...(livingThread?.recentChanges?.map((c) => `Recent change: ${c.label}`) ?? []),
      decision.watchable ? "Decision is watchable — re-run when conditions change." : null,
    ],
    6
  );

  const confSeries = livingConfidenceSeries(livingThread);
  const trend = mapTrendLabel(
    confSeries.length >= 2
      ? confidenceTrend(confSeries[confSeries.length - 2], confSeries[confSeries.length - 1])
      : null
  );

  const prices = decision.candidates
    .map((c) => c.price)
    .filter((p): p is number => typeof p === "number" && p > 0);
  let spreadPct: number | null = null;
  if (prices.length >= 2) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    spreadPct = min > 0 ? ((max - min) / min) * 100 : null;
  }

  const opportunity = scoreOrNull(
    action === "BUY"
      ? clampPct(confidence * 0.85)
      : action === "COMPARE" && (spreadPct ?? 0) < 10
        ? 48
        : action === "WAIT"
          ? 35
          : action === "AVOID"
            ? 15
            : factEvidence.length >= 3
              ? clampPct(40 + factEvidence.length * 4)
              : null,
    action === "BUY" ? "Bookable opportunity" : action === "WAIT" ? "Timing opportunity" : "Mixed",
    action === "BUY"
      ? `BUY/BOOK call at ${confidence}% with ${factEvidence.length} fact(s).`
      : spreadPct != null
        ? `Candidate spread ~${Math.round(spreadPct)}% shapes opportunity.`
        : "Opportunity inferred from action, facts, and candidate set.",
    unique(
      [
        `${factEvidence.length} fact evidence items`,
        spreadPct != null ? `Spread ${Math.round(spreadPct)}%` : null,
        decision.leader?.price != null
          ? `Leader ${decision.leader.currency || ""} ${decision.leader.price}`
          : null,
      ],
      4
    )
  );

  const risk = scoreOrNull(
    action === "AVOID"
      ? 82
      : decision.insufficientEvidence
        ? 70
        : decision.risks.length >= 2
          ? clampPct(40 + decision.risks.length * 8)
          : decision.trust.score != null
            ? clampPct(100 - decision.trust.score)
            : null,
    action === "AVOID" ? "Elevated risk" : "Domain risk",
    decision.risks[0] || "Risk from domain constraints and evidence gaps.",
    unique([decision.trust.label, ...decision.risks.slice(0, 2)], 4)
  );

  const regret = scoreOrNull(
    action === "AVOID"
      ? 90
      : action === "WAIT"
        ? 68
        : action === "COMPARE"
          ? 60
          : action === "BUY"
            ? clampPct(100 - confidence)
            : null,
    action === "BUY" ? "Regret if buy/book today" : "Regret if forcing commitment today",
    action === "BUY"
      ? `Regret risk inversely tracks confidence (${confidence}%).`
      : `Forcing commitment under ${action} raises regret odds.`,
    [`Action ${action}`, `Confidence ${confidence}%`]
  );

  const waiting = scoreOrNull(
    action === "WAIT"
      ? 72
      : waitPoints.length > 0
        ? 58
        : action === "BUY"
          ? 24
          : null,
    action === "WAIT" ? "Waiting is the call" : "Waiting value",
    waitPoints[0] || decision.timing.thisWeek || "Timing stance from domain adapter.",
    unique([decision.timing.today, ...waitPoints], 3)
  );

  const betterAlternativeProbability = scoreOrNull(
    decision.alternatives.length > 0
      ? clampPct(40 + Math.min(40, decision.alternatives.length * 12) + (action === "COMPARE" ? 15 : 0))
      : action === "COMPARE"
        ? 55
        : action === "BUY"
          ? 20
          : null,
    decision.alternatives.length > 0 ? "Alternatives present" : "Limited alternative pressure",
    decision.alternatives[0]?.why ||
      (decision.alternatives.length
        ? `${decision.alternatives.length} alternative(s) in set.`
        : "No alternative objects attached."),
    decision.alternatives.slice(0, 2).map((a) => a.title)
  );

  const expectedPriceMovement: AnalystDecisionBrief["expectedPriceMovement"] = {
    direction:
      action === "WAIT" || (spreadPct != null && spreadPct > 25)
        ? "down"
        : action === "BUY"
          ? "flat"
          : "unknown",
    magnitudeLabel:
      spreadPct != null
        ? `Candidate spread ~${Math.round(spreadPct)}%`
        : action === "WAIT"
          ? "Watch for improved fare/rate"
          : "Limited movement evidence",
    explanation: decision.timing.thisWeek,
    evidence: unique(
      [
        spreadPct != null ? `Spread ${Math.round(spreadPct)}%` : null,
        `Freshness ${decision.sourceFreshness.status}`,
      ],
      3
    ),
  };

  const changeProbabilities = buildChangeProbabilities({
    action,
    confidence,
    waitDropPct: action === "WAIT" ? 55 : spreadPct != null && spreadPct > 25 ? 48 : null,
    volatility01: spreadPct != null ? Math.min(1, spreadPct / 80) : null,
    freshnessStale: decision.sourceFreshness.stale,
    freshnessPartial: decision.sourceFreshness.status === "partial",
    livingChangeCount: livingThread?.recentChanges?.length ?? 0,
    stockRisk: null,
  });

  const avgChange =
    changeProbabilities
      .map((c) => c.probabilityPct)
      .filter((n): n is number => n != null)
      .reduce((a, b, _, arr) => a + b / arr.length, 0) || null;

  const recommendationStability = scoreOrNull(
    avgChange != null ? clampPct(100 - avgChange) : null,
    "Recommendation stability",
    avgChange != null
      ? `Stability inversely tracks multi-horizon change odds (avg ~${Math.round(avgChange)}%).`
      : "Insufficient change evidence.",
    changeProbabilities.map(
      (c) => `${c.horizon}: ${c.probabilityPct != null ? `${c.probabilityPct}%` : "n/a"}`
    )
  );

  const windows = buildBuyingWindows({
    action,
    waitValid: action === "WAIT",
    waitTimeframe: decision.timing.thisWeek,
    seasonalHint: null,
    historyLabel: null,
    priceTrend: null,
  });

  const intelligenceTimeline: IntelligenceTimelineSlot[] = [
    {
      phase: "Past",
      headline: livingThread?.events?.length
        ? `${livingThread.events.length} living event(s) on this identity`
        : "No prior living history for this identity",
      detail:
        livingThread?.recentChanges?.[0]?.label ||
        `${decision.domain} decision freshly generated from provider snapshot.`,
      evidence: unique(
        [
          livingThread?.decisionId || null,
          `Provider ${decision.providerStatus}`,
        ],
        3
      ),
    },
    {
      phase: "Now",
      headline: `${action} · ${confidence}%`,
      detail: decision.executiveSummary,
      evidence: why.slice(0, 2),
    },
    {
      phase: "Expected Next",
      headline: decision.timing.thisWeek,
      detail: decision.timing.thisMonth,
      evidence: unique([...waitPoints, watchEvents[0]], 3),
    },
  ];

  const signals = buildSignals({
    priceTrend: null,
    volatility01: spreadPct != null ? Math.min(1, spreadPct / 80) : null,
    stockRisk: null,
    merchantScore: decision.trust.score,
    merchantLabel: decision.trust.label,
    discountLabel: null,
    discountScore: null,
    historyLabel: null,
    freshnessStatus: decision.sourceFreshness.status,
    freshnessStale: decision.sourceFreshness.stale,
    demandPressure:
      spreadPct != null && spreadPct > 25 ? "Wide spread — shoppers can pressure sellers" : null,
    trustDelta:
      livingThread?.recentChanges?.find((c) => c.kind === "decision_changed")?.label || null,
  });

  // Add domain facts as signals when present
  for (const ev of factEvidence.slice(0, 3)) {
    if (signals.length >= 8) break;
    signals.push({
      id: `fact_${ev.id}`,
      name: ev.label,
      state: ev.value,
      explanation: "Fact evidence from the domain Decision Engine adapter.",
      evidence: [ev.source || decision.domain],
      intensity: ev.score != null ? clampPct(ev.score) : null,
    });
  }

  const executiveDecisionSummary = buildExecutiveSummary({
    action,
    confidence,
    why,
    opportunity,
    risk,
    waiting,
    regret,
    bestWindow: windows.best,
    trend,
    priceMove: expectedPriceMovement.magnitudeLabel,
  });

  const base: AnalystDecisionBrief = {
    version: 1,
    executiveDecisionSummary,
    whyRecommendation: why,
    assumptions,
    invalidators,
    watchEvents,
    changeProbabilities,
    bestBuyingWindow: windows.best,
    worstBuyingWindow: windows.worst,
    confidenceTrend: {
      trend,
      explanation:
        trend === "Unknown"
          ? "Not enough prior confidence samples to establish a trend."
          : `Confidence trend is ${trend.toLowerCase()} from Living Decision history.`,
      evidence: unique(
        [
          confSeries.length >= 2
            ? `Series ${confSeries
                .slice(-3)
                .map((n) => Math.round(n))
                .join(" → ")}`
            : null,
          `Current ${confidence}%`,
        ],
        3
      ),
    },
    opportunity,
    risk,
    regret,
    waiting,
    betterAlternativeProbability,
    expectedPriceMovement,
    recommendationStability,
    intelligenceTimeline,
    signals,
    evidenceSystems: systems,
  };

  return withDecisionThesis(base, {
    action,
    confidence,
    livingThread,
    confidenceReason: decision.trust.notes[0] || null,
    existingThesis: decision.executiveSummary,
  });
}

/** Attach analyst brief onto a UniversalDecision (server or client). */
export function withAnalystBrief(
  decision: UniversalDecision,
  livingThread?: LivingDecisionThread | null
): UniversalDecision & { analyst: AnalystDecisionBrief } {
  const analyst = buildUniversalAnalystBrief({ decision, livingThread });
  const summary =
    analyst.thesis?.coreThesis ||
    analyst.executiveDecisionSummary ||
    decision.executiveSummary;
  return {
    ...decision,
    executiveSummary: summary,
    analyst,
  };
}
