/**
 * Mission intelligence — aggregates real Living Decision overlays only.
 * No fabricated savings or confidence.
 */

import type {
  Mission,
  MissionDecisionItem,
  MissionIntelligence,
  MissionDashboard,
} from "@/lib/missions/types";

function num(n: number | null | undefined): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return n;
}

export function computeMissionIntelligence(mission: Mission): MissionIntelligence {
  const decisions = mission.decisions || [];
  const decisionCount = decisions.length;
  const completedCount = decisions.filter((d) => d.status === "completed").length;
  const pendingCount = decisions.filter(
    (d) => d.status === "pending" || d.status === "active" || d.status === "blocked"
  ).length;
  const activeCount = decisions.filter((d) => d.status === "active").length;
  const completionPct =
    decisionCount === 0 ? 0 : Math.round((completedCount / decisionCount) * 100);

  const priced = decisions
    .map((d) => num(d.living?.price))
    .filter((p): p is number => p != null && p > 0);
  const moneySpentTracked = priced.reduce((a, b) => a + b, 0);

  const budget = num(mission.budget);
  const moneyRemaining =
    budget != null ? Math.max(0, Math.round(budget - moneySpentTracked)) : null;

  // estimatedSavings is attached upstream from real price-drop change history only.
  const confidences = decisions
    .map((d) => num(d.living?.confidence))
    .filter((c): c is number => c != null);
  const overallConfidence =
    confidences.length > 0
      ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
      : null;

  const criticalAlerts = decisions.filter(
    (d) =>
      d.priority === "critical" &&
      (d.status === "pending" || d.status === "blocked" || (d.living?.changesCount ?? 0) > 0)
  ).length;

  let missionHealth: MissionIntelligence["missionHealth"] = "unknown";
  if (decisionCount === 0) missionHealth = "unknown";
  else if (criticalAlerts >= 3 || (overallConfidence != null && overallConfidence < 40)) {
    missionHealth = "at_risk";
  } else if (completionPct >= 60 && (overallConfidence == null || overallConfidence >= 55)) {
    missionHealth = "strong";
  } else {
    missionHealth = "stable";
  }

  const avoidOrLow = decisions.find(
    (d) =>
      d.living?.action === "AVOID" ||
      (d.living?.confidence != null && d.living.confidence < 40)
  );
  const highestRiskDecision = avoidOrLow
    ? {
        id: avoidOrLow.id,
        title: avoidOrLow.title,
        reason:
          avoidOrLow.living?.action === "AVOID"
            ? "Living Decision recommends AVOID"
            : `Low confidence (${Math.round(avoidOrLow.living!.confidence!)}%)`,
      }
    : decisions.find((d) => d.priority === "critical" && d.status === "pending")
      ? (() => {
          const d = decisions.find((x) => x.priority === "critical" && x.status === "pending")!;
          return { id: d.id, title: d.title, reason: "Critical decision still pending" };
        })()
      : null;

  const buyReady = decisions.find(
    (d) => d.living?.action === "BUY" && (d.living.confidence ?? 0) >= 60 && d.status !== "completed"
  );
  const bestOpportunityToday = buyReady
    ? {
        id: buyReady.id,
        title: buyReady.title,
        reason: `BUY at ${Math.round(buyReady.living!.confidence!)}% confidence`,
      }
    : decisions.find((d) => (d.living?.changesCount ?? 0) > 0 && d.status !== "completed")
      ? (() => {
          const d = decisions.find(
            (x) => (x.living?.changesCount ?? 0) > 0 && x.status !== "completed"
          )!;
          return {
            id: d.id,
            title: d.title,
            reason: "Living Decision has new changes",
          };
        })()
      : null;

  const urgent =
    decisions.find((d) => d.priority === "critical" && d.status === "pending") ||
    decisions.find((d) => d.status === "blocked") ||
    null;
  const mostUrgentAction = urgent
    ? {
        id: urgent.id,
        title: urgent.title,
        reason:
          urgent.status === "blocked"
            ? "Blocked — unblock to continue mission"
            : "Critical pending decision",
      }
    : bestOpportunityToday;

  const todaysOpportunities = decisions
    .filter(
      (d) =>
        d.living?.action === "BUY" ||
        ((d.living?.changesCount ?? 0) > 0 && d.status !== "completed")
    )
    .slice(0, 5)
    .map((d) => ({
      id: d.id,
      title: d.title,
      reason:
        d.living?.action === "BUY"
          ? `BUY signal · ${Math.round(d.living.confidence ?? 0)}%`
          : "Recent living change",
    }));

  const upcomingDecisions = decisions
    .filter((d) => d.status === "pending" || d.status === "active")
    .slice(0, 8)
    .map((d) => ({ id: d.id, title: d.title, domain: d.domain }));

  const recentChanges = decisions
    .filter((d) => (d.living?.changesCount ?? 0) > 0 && d.living?.lastUpdatedAt)
    .sort((a, b) =>
      String(a.living!.lastUpdatedAt) < String(b.living!.lastUpdatedAt) ? 1 : -1
    )
    .slice(0, 6)
    .map((d) => ({
      id: d.id,
      title: d.title,
      summary: `${d.living?.changesCount} change(s) · ${d.living?.action ?? "updated"}`,
      at: d.living!.lastUpdatedAt!,
    }));

  return {
    completionPct,
    decisionCount,
    completedCount,
    pendingCount,
    activeCount,
    criticalAlerts,
    moneySpentTracked: Math.round(moneySpentTracked),
    moneyRemaining,
    estimatedSavings: null,
    overallConfidence,
    missionHealth,
    highestRiskDecision,
    bestOpportunityToday,
    mostUrgentAction,
    todaysOpportunities,
    upcomingDecisions,
    recentChanges,
  };
}

/** When living price drops are known from episode history, call this to attach savings. */
export function attachEstimatedSavings(
  intel: MissionIntelligence,
  savings: number | null
): MissionIntelligence {
  if (savings == null || !Number.isFinite(savings) || savings <= 0) return intel;
  return { ...intel, estimatedSavings: Math.round(savings) };
}

export function buildMissionDashboard(
  missions: Array<Mission & { intelligence: MissionIntelligence }>
): MissionDashboard {
  const active = missions.filter((m) => m.status === "active" || m.status === "paused");
  const completionAvg =
    active.length === 0
      ? 0
      : Math.round(
          active.reduce((a, m) => a + m.intelligence.completionPct, 0) / active.length
        );

  const moneySaved = active.reduce(
    (a, m) => a + (m.intelligence.estimatedSavings ?? 0),
    0
  );

  const remainingParts = active
    .map((m) => m.intelligence.moneyRemaining)
    .filter((n): n is number => n != null);
  const moneyRemaining =
    remainingParts.length > 0 ? remainingParts.reduce((a, b) => a + b, 0) : null;

  return {
    missions,
    totals: {
      activeMissions: active.length,
      completionAvg,
      moneySaved,
      moneyRemaining,
      pendingDecisions: active.reduce((a, m) => a + m.intelligence.pendingCount, 0),
      completedDecisions: active.reduce((a, m) => a + m.intelligence.completedCount, 0),
      criticalChanges: active.reduce((a, m) => a + m.intelligence.criticalAlerts, 0),
    },
  };
}

export function groupDecisions(decisions: MissionDecisionItem[]) {
  const map = new Map<string, { key: string; label: string; items: MissionDecisionItem[] }>();
  for (const d of decisions) {
    const g = map.get(d.groupKey) || {
      key: d.groupKey,
      label: d.groupLabel,
      items: [] as MissionDecisionItem[],
    };
    g.items.push(d);
    map.set(d.groupKey, g);
  }
  return [...map.values()];
}
