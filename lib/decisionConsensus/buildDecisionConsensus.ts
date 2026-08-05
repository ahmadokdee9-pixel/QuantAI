/**
 * Build Decision Consensus from already-computed intelligence outputs.
 * No ranking. No new scores. Agreement between independent modules only.
 */

import type { AnalystDecisionBrief } from "@/lib/decisionAnalyst/types";
import type {
  ConsensusModuleSignal,
  ConsensusModuleStance,
  ConsensusStatus,
  DecisionConsensusBrief,
} from "@/lib/decisionConsensus/types";
import type { LivingPresenceSnapshot } from "@/lib/decisionMemory/livingPresence";
import type { LivingDecisionThread } from "@/lib/livingDecision/types";
import { extractThesisSnapshot, thesisContinuityHeadline } from "@/lib/decisionThesis/snapshot";
import type { DecisionThesis } from "@/lib/decisionThesis/types";

type ExecutiveAction = "BUY" | "WAIT" | "COMPARE" | "AVOID";

const STATUS_LABEL: Record<ConsensusStatus, string> = {
  consensus_strong: "Consensus Strong",
  consensus_building: "Consensus Building",
  consensus_weak: "Consensus Weak",
  conflicting_evidence: "Conflicting Evidence",
  new_evidence: "New Evidence Appeared",
  confidence_confirmed: "Confidence Confirmed",
  waiting_confirmation: "Waiting For Confirmation",
  consensus_lost: "Consensus Lost",
};

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

function analystStance(
  action: ExecutiveAction,
  analyst: AnalystDecisionBrief
): ConsensusModuleSignal {
  const opp = analyst.opportunity.score;
  const wait = analyst.waiting.score;
  const regret = analyst.regret.score;
  const risk = analyst.risk.score;
  const alt = analyst.betterAlternativeProbability.score;
  const stability = analyst.recommendationStability.score;

  let stance: ConsensusModuleStance = "neutral";
  let reason = "Analyst scores are mixed relative to the executive call.";

  if (action === "BUY") {
    if ((wait != null && wait >= 55) || (regret != null && regret >= 65)) {
      stance = "disagree";
      reason =
        wait != null && wait >= 55
          ? `Waiting value ${wait}/100 argues against buying now.`
          : `Regret-if-buy-today ${regret}/100 is elevated.`;
    } else if (alt != null && alt >= 62) {
      stance = "disagree";
      reason = `Better-alternative odds ${alt}/100 favor COMPARE.`;
    } else if (opp != null && opp >= 55 && (risk == null || risk < 65)) {
      stance = "agree";
      reason = `Opportunity ${opp}/100 supports BUY${
        stability != null ? ` · stability ${stability}/100` : ""
      }.`;
    } else if (opp == null && wait == null && regret == null) {
      stance = "unavailable";
      reason = "Analyst scores insufficient for stance.";
    }
  } else if (action === "WAIT") {
    if (wait != null && wait >= 50) {
      stance = "agree";
      reason = `Waiting value ${wait}/100 aligns with WAIT.`;
    } else if (opp != null && opp >= 70 && (wait == null || wait < 40)) {
      stance = "disagree";
      reason = `Opportunity ${opp}/100 with weak waiting value challenges WAIT.`;
    } else if (wait == null) {
      stance = "unavailable";
      reason = "No waiting score available.";
    }
  } else if (action === "AVOID") {
    if (risk != null && risk >= 60) {
      stance = "agree";
      reason = `Risk ${risk}/100 supports AVOID.`;
    } else if (opp != null && opp >= 65 && (risk == null || risk < 45)) {
      stance = "disagree";
      reason = `Opportunity ${opp}/100 undercuts AVOID.`;
    } else if (risk == null) {
      stance = "unavailable";
      reason = "No risk score available.";
    }
  } else {
    // COMPARE
    if (alt != null && alt >= 50) {
      stance = "agree";
      reason = `Better-alternative odds ${alt}/100 support COMPARE.`;
    } else if (opp != null && opp >= 68 && (alt == null || alt < 35)) {
      stance = "disagree";
      reason = `Opportunity ${opp}/100 suggests a clearer leader may already exist.`;
    } else if (alt == null && opp == null) {
      stance = "unavailable";
      reason = "No alternative-pressure signal available.";
    }
  }

  return {
    id: "decision_analyst",
    label: "Decision Analyst",
    stance,
    reason,
  };
}

function thesisStance(
  action: ExecutiveAction,
  thesis: DecisionThesis | null | undefined
): ConsensusModuleSignal {
  if (!thesis) {
    return {
      id: "decision_thesis",
      label: "Decision Thesis",
      stance: "unavailable",
      reason: "Thesis not attached to this decision yet.",
    };
  }

  const confirms = thesis.confirmationSignals.length;
  const invalidates = thesis.invalidationSignals.length;
  const counter = thesis.counterThesis.toLowerCase();

  let stance: ConsensusModuleStance = "neutral";
  let reason = thesis.coreThesis;

  const counterOpposes =
    (action === "BUY" && (counter.includes("wait") || counter.includes("compare"))) ||
    (action === "WAIT" && counter.includes("buy")) ||
    (action === "COMPARE" && counter.includes("buy the leader")) ||
    (action === "AVOID" && counter.includes("reopen"));

  if (invalidates >= confirms + 2 || (invalidates > confirms && counterOpposes)) {
    stance = "disagree";
    reason = thesis.invalidationSignals[0] || thesis.counterThesis;
  } else if (confirms >= 2 && confirms > invalidates) {
    stance = "agree";
    reason = thesis.confirmationSignals[0] || thesis.coreThesis;
  } else if (counterOpposes && confirms === 0) {
    stance = "disagree";
    reason = thesis.counterThesis;
  }

  return {
    id: "decision_thesis",
    label: "Decision Thesis",
    stance,
    reason,
  };
}

function livingStance(
  action: ExecutiveAction,
  livingThread: LivingDecisionThread | null | undefined
): ConsensusModuleSignal {
  if (!livingThread?.current) {
    return {
      id: "living_decisions",
      label: "Living Decisions",
      stance: "unavailable",
      reason: "No Living Decision thread for this identity yet.",
    };
  }

  const current = String(livingThread.current.action || "").toUpperCase();
  const continuity = thesisContinuityHeadline(livingThread.recentChanges || []);
  const invalidated = (livingThread.recentChanges || []).some(
    (c) => c.kind === "thesis_invalidated" || c.kind === "decision_changed"
  );
  const confirmed = (livingThread.recentChanges || []).some(
    (c) => c.kind === "thesis_confirmed"
  );

  if (invalidated && current && current !== action) {
    return {
      id: "living_decisions",
      label: "Living Decisions",
      stance: "disagree",
      reason: continuity || `Living action is ${current} vs executive ${action}.`,
    };
  }

  if (current === action) {
    return {
      id: "living_decisions",
      label: "Living Decisions",
      stance: "agree",
      reason: confirmed
        ? continuity || `Living Decision holds ${action}.`
        : `Living Decision current action is ${action}.`,
    };
  }

  if (current && current !== action) {
    return {
      id: "living_decisions",
      label: "Living Decisions",
      stance: "disagree",
      reason: `Living Decision still reflects ${current}.`,
    };
  }

  return {
    id: "living_decisions",
    label: "Living Decisions",
    stance: "neutral",
    reason: continuity || "Living thread present without a clear action match.",
  };
}

function memoryStance(
  action: ExecutiveAction,
  livingThread: LivingDecisionThread | null | undefined
): ConsensusModuleSignal {
  if (!livingThread?.events?.length) {
    return {
      id: "decision_memory",
      label: "Decision Memory",
      stance: "unavailable",
      reason: "No remembered episodes on this identity.",
    };
  }

  const confEvents = livingThread.events.filter((e) => e.kind === "confidence_changed");
  const lastConf = confEvents[confEvents.length - 1];
  const prev =
    typeof lastConf?.previous === "number" ? lastConf.previous : Number(lastConf?.previous);
  const curr =
    typeof lastConf?.current === "number" ? lastConf.current : Number(lastConf?.current);

  const snap = extractThesisSnapshot(
    // thesis may live on latest evidence via current snapshot fields — use continuity kinds
    null
  );
  void snap;

  const sameAction = String(livingThread.current.action || "").toUpperCase() === action;
  if (sameAction && Number.isFinite(prev) && Number.isFinite(curr) && curr > prev) {
    return {
      id: "decision_memory",
      label: "Decision Memory",
      stance: "agree",
      reason: `Remembered confidence rose (${Math.round(prev)}% → ${Math.round(curr)}%).`,
    };
  }
  if (sameAction && livingThread.events.length >= 2) {
    return {
      id: "decision_memory",
      label: "Decision Memory",
      stance: "agree",
      reason: `${livingThread.events.length} remembered events support continuity on ${action}.`,
    };
  }
  if (!sameAction && livingThread.current.action) {
    return {
      id: "decision_memory",
      label: "Decision Memory",
      stance: "disagree",
      reason: `Memory still anchors ${livingThread.current.action}.`,
    };
  }

  return {
    id: "decision_memory",
    label: "Decision Memory",
    stance: "neutral",
    reason: "Memory present without a directional agreement signal.",
  };
}

function feedStance(
  livingThread: LivingDecisionThread | null | undefined
): ConsensusModuleSignal {
  const changes = livingThread?.recentChanges || [];
  if (!changes.length) {
    return {
      id: "decision_feed",
      label: "Decision Feed",
      stance: "unavailable",
      reason: "No feed-grade living changes on this identity.",
    };
  }

  const material = changes.some((c) =>
    [
      "price_changed",
      "fare_changed",
      "decision_changed",
      "thesis_invalidated",
      "thesis_updated",
      "stock_changed",
      "better_alternative",
    ].includes(c.kind)
  );

  if (changes.some((c) => c.kind === "thesis_invalidated" || c.kind === "decision_changed")) {
    return {
      id: "decision_feed",
      label: "Decision Feed",
      stance: "disagree",
      reason: changes[0]?.label || "Feed shows a material decision move.",
    };
  }

  if (changes.some((c) => c.kind === "thesis_confirmed")) {
    return {
      id: "decision_feed",
      label: "Decision Feed",
      stance: "agree",
      reason: "Feed reflects thesis holding through movement.",
    };
  }

  return {
    id: "decision_feed",
    label: "Decision Feed",
    stance: material ? "neutral" : "unavailable",
    reason: material
      ? changes[0]?.label || "New living evidence in the feed path."
      : "No material feed signal.",
  };
}

function presenceStance(
  presence: LivingPresenceSnapshot | null | undefined
): ConsensusModuleSignal {
  if (!presence || presence.episodeCount === 0) {
    return {
      id: "living_presence",
      label: "Living Presence",
      stance: "unavailable",
      reason: "Presence has no historical outcomes yet.",
    };
  }

  if (presence.improvedLast24h > 0) {
    return {
      id: "living_presence",
      label: "Living Presence",
      stance: "agree",
      reason: `${presence.improvedLast24h} decision improvement(s) in the last 24h.`,
    };
  }

  if (presence.watchedCount > 0) {
    return {
      id: "living_presence",
      label: "Living Presence",
      stance: "neutral",
      reason: `Watching ${presence.watchedCount} live signal(s).`,
    };
  }

  return {
    id: "living_presence",
    label: "Living Presence",
    stance: "neutral",
    reason: `Engine presence tracking ${presence.episodeCount} outcome(s).`,
  };
}

function missionStance(args: {
  missionPendingCritical?: number | null;
  missionLinked?: boolean | null;
}): ConsensusModuleSignal {
  if (args.missionLinked == null && args.missionPendingCritical == null) {
    return {
      id: "mission_agent",
      label: "Mission Agent",
      stance: "unavailable",
      reason: "No mission linkage for this decision.",
    };
  }

  if (args.missionPendingCritical != null && args.missionPendingCritical > 0) {
    return {
      id: "mission_agent",
      label: "Mission Agent",
      stance: "neutral",
      reason: `${args.missionPendingCritical} critical mission decision(s) still pending.`,
    };
  }

  if (args.missionLinked) {
    return {
      id: "mission_agent",
      label: "Mission Agent",
      stance: "agree",
      reason: "Decision is linked inside an active mission.",
    };
  }

  return {
    id: "mission_agent",
    label: "Mission Agent",
    stance: "unavailable",
    reason: "No active mission context.",
  };
}

function pickStatus(args: {
  action: ExecutiveAction;
  agree: number;
  disagree: number;
  available: number;
  livingThread?: LivingDecisionThread | null;
  analyst: AnalystDecisionBrief;
  thesis?: DecisionThesis | null;
}): { status: ConsensusStatus; changed: boolean } {
  const changes = args.livingThread?.recentChanges || [];
  const lost = changes.some(
    (c) => c.kind === "thesis_invalidated" || c.kind === "decision_changed"
  );
  const confirmed = changes.some((c) => c.kind === "thesis_confirmed");
  const newEvidence = changes.some((c) =>
    [
      "price_changed",
      "fare_changed",
      "availability_changed",
      "stock_changed",
      "thesis_updated",
      "better_alternative",
    ].includes(c.kind)
  );
  if (lost && args.disagree > 0) {
    return { status: "consensus_lost", changed: true };
  }
  if (args.disagree > 0 && args.agree > 0) {
    return { status: "conflicting_evidence", changed: lost || newEvidence };
  }
  if (lost) {
    return { status: "consensus_lost", changed: true };
  }
  if (newEvidence && args.agree >= args.disagree) {
    return { status: "new_evidence", changed: true };
  }
  if (args.action === "WAIT") {
    return { status: "waiting_confirmation", changed: false };
  }
  if (
    confirmed ||
    (args.analyst.confidenceTrend.trend === "Increasing" &&
      args.agree >= 2 &&
      args.disagree === 0)
  ) {
    return { status: "confidence_confirmed", changed: confirmed };
  }
  if (args.agree >= 3 && args.disagree === 0 && args.available >= 3) {
    return { status: "consensus_strong", changed: false };
  }
  if (args.agree >= 2 && args.disagree === 0) {
    return { status: "consensus_building", changed: false };
  }
  return { status: "consensus_weak", changed: false };
}

export function buildDecisionConsensus(args: {
  action: ExecutiveAction;
  confidence: number;
  analyst: AnalystDecisionBrief;
  livingThread?: LivingDecisionThread | null;
  presence?: LivingPresenceSnapshot | null;
  missionPendingCritical?: number | null;
  missionLinked?: boolean | null;
}): DecisionConsensusBrief {
  const {
    action,
    confidence,
    analyst,
    livingThread = null,
    presence = null,
    missionPendingCritical = null,
    missionLinked = null,
  } = args;
  const thesis = analyst.thesis ?? null;

  const modules: ConsensusModuleSignal[] = [
    {
      id: "decision_engine",
      label: "Decision Engine",
      stance: "agree",
      reason: `Executive call ${action} at ${Math.round(confidence)}% confidence.`,
    },
    analystStance(action, analyst),
    thesisStance(action, thesis),
    livingStance(action, livingThread),
    memoryStance(action, livingThread),
    feedStance(livingThread),
    presenceStance(presence),
    missionStance({ missionPendingCritical, missionLinked }),
  ];

  const available = modules.filter((m) => m.stance !== "unavailable");
  const agree = available.filter((m) => m.stance === "agree");
  const disagree = available.filter((m) => m.stance === "disagree");

  const { status, changed } = pickStatus({
    action,
    agree: agree.length,
    disagree: disagree.length,
    available: available.length,
    livingThread,
    analyst,
    thesis,
  });

  const whyConsensus = unique(
    [
      `${agree.length} independent module${agree.length === 1 ? "" : "s"} align on ${action}.`,
      ...agree.slice(0, 3).map((m) => `${m.label}: ${m.reason}`),
      analyst.recommendationStability.score != null
        ? `Recommendation stability ${analyst.recommendationStability.score}/100.`
        : null,
      thesis?.coreThesis || null,
    ],
    5
  );

  const missingEvidence = unique(
    [
      ...(thesis?.missingEvidence ?? []),
      ...modules
        .filter((m) => m.stance === "unavailable")
        .map((m) => `${m.label} unavailable — ${m.reason}`),
      analyst.opportunity.score == null ? "Opportunity score not emitted." : null,
      !livingThread ? "No Living Decision history for continuity." : null,
    ],
    5
  );

  const expectedConfirmation =
    thesis?.nextExpectedEvent ||
    analyst.watchEvents[0] ||
    (status === "waiting_confirmation"
      ? "Reassess when timing or price evidence improves."
      : null);

  const summary =
    status === "conflicting_evidence"
      ? `${disagree.length} module${disagree.length === 1 ? "" : "s"} conflict with ${agree.length} in agreement.`
      : status === "consensus_lost"
        ? "Prior consensus broke — Living Decision or thesis continuity flipped."
        : status === "waiting_confirmation"
          ? "Consensus is waiting on the next confirming event."
          : status === "new_evidence"
            ? "New living evidence appeared — consensus is being re-checked."
            : `${agree.length}/${available.length} available modules agree on ${action}.`;

  return {
    version: 1,
    status,
    label: STATUS_LABEL[status],
    summary,
    agreeCount: agree.length,
    disagreeCount: disagree.length,
    availableCount: available.length,
    modules,
    whyConsensus,
    enginesAgree: agree.map((m) => `${m.label} — ${m.reason}`),
    enginesDisagree: disagree.map((m) => `${m.label} — ${m.reason}`),
    missingEvidence,
    expectedConfirmation,
    confidenceTrend: {
      trend: analyst.confidenceTrend.trend,
      explanation: analyst.confidenceTrend.explanation,
    },
    changed,
  };
}
