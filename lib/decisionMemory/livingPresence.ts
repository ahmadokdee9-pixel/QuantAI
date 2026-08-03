/**
 * Living Intelligence Presence — aggregate REAL Decision Memory / Feed / Mission signals.
 * Never invents counts. Empty engine → honest idle lines only.
 */

import { buildLocalDecisionFeed } from "@/lib/decisionFeed/clientFeed";
import { readVisitSince } from "@/lib/decisionFeed/localVisitBridge";
import {
  listLocalDecisionMemory,
  listLocalDecisionUpdates,
  listLocalWatchedDecisions,
} from "@/lib/decisionMemory/clientMemory";
import type { DecisionMemoryEpisode } from "@/lib/decisionMemory/types";
import { extractThesisSnapshot } from "@/lib/decisionThesis/snapshot";
import { listLocalMissionsDashboard } from "@/lib/missions/clientMissions";

export type PresenceLine = {
  id: string;
  text: string;
  tone: "live" | "calm" | "alert" | "idle";
  /** ISO timestamp that backs this line, when applicable. */
  at?: string | null;
};

export type PresenceNode = {
  id: string;
  label: string;
  value: string;
  meta: string;
  pulse?: boolean;
};

export type LivingPresenceSnapshot = {
  generatedAt: string;
  episodeCount: number;
  watchedCount: number;
  livingThreadCount: number;
  updatesSinceVisit: number;
  improvedLast24h: number;
  evidenceSourceCount: number;
  activeMissions: number;
  feedCritical: number;
  latestEngineAt: string | null;
  latestAction: string | null;
  lines: PresenceLine[];
  nodes: PresenceNode[];
  statusKicker: string;
};

function relativeAge(iso: string | null | undefined, nowMs: number): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const mins = Math.max(0, Math.round((nowMs - t) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function threadKey(ep: DecisionMemoryEpisode): string {
  return (ep.decisionId || ep.memoryIdentity || ep.productLink || ep.id).trim();
}

function countEvidenceSources(episodes: DecisionMemoryEpisode[]): number {
  const keys = new Set<string>();
  for (const ep of episodes.slice(0, 80)) {
    if (ep.merchant) keys.add(`m:${ep.merchant.toLowerCase()}`);
    if (ep.provider) keys.add(`p:${ep.provider.toLowerCase()}`);
    if (Array.isArray(ep.evidence)) {
      for (const item of ep.evidence) {
        if (!item || typeof item !== "object") continue;
        const row = item as { id?: unknown; kind?: unknown; source?: unknown };
        if (row.kind === "fact" && typeof row.id === "string") keys.add(`e:${row.id}`);
        if (typeof row.source === "string" && row.source.trim()) {
          keys.add(`s:${row.source.toLowerCase()}`);
        }
      }
    }
  }
  return keys.size;
}

function improvedInWindow(episodes: DecisionMemoryEpisode[], sinceIso: string): number {
  let n = 0;
  for (const ep of episodes) {
    if (ep.createdAt < sinceIso) continue;
    for (const c of ep.changes || []) {
      if (c.kind === "thesis_confirmed") {
        n += 1;
        continue;
      }
      if (c.kind !== "confidence_changed") continue;
      const prev = typeof c.previous === "number" ? c.previous : Number(c.previous);
      const curr = typeof c.current === "number" ? c.current : Number(c.current);
      if (Number.isFinite(prev) && Number.isFinite(curr) && curr > prev) n += 1;
    }
  }
  return n;
}

function latestWithConfidence(episodes: DecisionMemoryEpisode[]): DecisionMemoryEpisode | null {
  for (const ep of episodes) {
    if (ep.confidence != null) return ep;
  }
  return null;
}

/** Build presence from local Decision Memory / Feed / Missions only. */
export function buildLocalLivingPresence(nowMs = Date.now()): LivingPresenceSnapshot {
  const episodes = listLocalDecisionMemory();
  const watched = listLocalWatchedDecisions();
  const visitSince = readVisitSince();
  const updates = listLocalDecisionUpdates(visitSince);
  const feed = buildLocalDecisionFeed({ limit: 40 });
  const missions = listLocalMissionsDashboard();

  const threads = new Set(episodes.map(threadKey).filter(Boolean));
  const dayAgo = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
  const improvedLast24h = improvedInWindow(episodes, dayAgo);
  const evidenceSourceCount = countEvidenceSources(episodes);
  const latest = episodes[0] ?? null;
  const latestConf = latestWithConfidence(episodes);
  const latestEngineAt = latest?.createdAt ?? latestConf?.createdAt ?? null;
  const age = relativeAge(latestEngineAt, nowMs);

  const lines: PresenceLine[] = [];

  if (latestConf && age) {
    lines.push({
      id: "engine_confidence",
      text: `Engine confidence updated ${age}`,
      tone: "live",
      at: latestConf.createdAt,
    });
  }

  if (watched.length > 0) {
    lines.push({
      id: "watching",
      text: `Watching ${watched.length} live signal${watched.length === 1 ? "" : "s"}`,
      tone: "live",
    });
  }

  if (improvedLast24h > 0) {
    lines.push({
      id: "improved",
      text: `${improvedLast24h} decision${improvedLast24h === 1 ? "" : "s"} improved since yesterday`,
      tone: "calm",
    });
  }

  if (evidenceSourceCount > 0) {
    lines.push({
      id: "evidence",
      text: `Monitoring ${evidenceSourceCount} evidence source${evidenceSourceCount === 1 ? "" : "s"}`,
      tone: "calm",
    });
  }

  if (episodes.length > 0) {
    lines.push({
      id: "learning",
      text: `Learning from ${episodes.length} historical outcome${episodes.length === 1 ? "" : "s"}`,
      tone: "calm",
    });
  }

  if (latestEngineAt && age && (age.includes("minute") || age === "just now" || age.includes("hour"))) {
    const mins = (nowMs - new Date(latestEngineAt).getTime()) / 60_000;
    if (mins <= 90) {
      lines.push({
        id: "memory",
        text: "Memory updated",
        tone: "live",
        at: latestEngineAt,
      });
    }
  }

  // Recent change-derived lines (last 6h)
  const recentCutoff = new Date(nowMs - 6 * 60 * 60 * 1000).toISOString();
  for (const ep of episodes.slice(0, 12)) {
    if (ep.createdAt < recentCutoff) continue;
    for (const c of ep.changes || []) {
      if (c.kind === "thesis_confirmed") {
        lines.push({ id: `confirm_${ep.id}`, text: "New confirmation", tone: "calm", at: ep.createdAt });
      } else if (c.kind === "thesis_invalidated") {
        lines.push({ id: `broke_${ep.id}`, text: "Evidence changed", tone: "alert", at: ep.createdAt });
      } else if (c.kind === "confidence_changed") {
        const prev = typeof c.previous === "number" ? c.previous : Number(c.previous);
        const curr = typeof c.current === "number" ? c.current : Number(c.current);
        if (Number.isFinite(prev) && Number.isFinite(curr) && curr > prev) {
          lines.push({
            id: `conf_up_${ep.id}`,
            text: "Confidence increased",
            tone: "live",
            at: ep.createdAt,
          });
        }
      } else if (
        c.kind === "price_changed" ||
        c.kind === "fare_changed" ||
        c.kind === "availability_changed"
      ) {
        lines.push({
          id: `ev_${ep.id}_${c.kind}`,
          text: "Evidence changed",
          tone: "alert",
          at: ep.createdAt,
        });
      }
    }
    const thesis = extractThesisSnapshot(ep.evidence);
    if (thesis?.nextExpectedEvent && ep.decision === "WAIT") {
      lines.push({
        id: `wait_${ep.id}`,
        text: "Waiting for confirmation",
        tone: "calm",
        at: ep.createdAt,
      });
    } else if (thesis?.nextExpectedEvent) {
      lines.push({
        id: `mon_${ep.id}`,
        text: "Monitoring event",
        tone: "calm",
        at: ep.createdAt,
      });
    }
    if (thesis && ep.createdAt >= recentCutoff) {
      lines.push({
        id: `reason_${ep.id}`,
        text: "Reasoning refreshed",
        tone: "live",
        at: ep.createdAt,
      });
    }
  }

  // Deduplicate by text, keep first (most recent-ish)
  const seen = new Set<string>();
  const uniqueLines = lines.filter((l) => {
    if (seen.has(l.text)) return false;
    seen.add(l.text);
    return true;
  }).slice(0, 6);

  if (uniqueLines.length === 0) {
    uniqueLines.push({
      id: "idle",
      text: "Engine ready — awaiting first Instant Decision",
      tone: "idle",
    });
  }

  const nodes: PresenceNode[] = [];
  if (episodes.length > 0) {
    nodes.push({
      id: "outcomes",
      label: "Historical outcomes",
      value: String(episodes.length),
      meta: "Decision Memory",
      pulse: Boolean(age && (age === "just now" || age.includes("minute"))),
    });
  } else {
    nodes.push({
      id: "outcomes",
      label: "Historical outcomes",
      value: "0",
      meta: "Awaiting first decision",
    });
  }

  nodes.push({
    id: "watching",
    label: "Live signals",
    value: String(watched.length),
    meta: watched.length > 0 ? "Watching" : "None watched yet",
    pulse: watched.length > 0,
  });

  nodes.push({
    id: "updated",
    label: "Engine write",
    value: age || "—",
    meta: latestEngineAt ? "Last confidence / memory write" : "No engine writes yet",
    pulse: Boolean(age && (age === "just now" || age.includes("minute"))),
  });

  nodes.push({
    id: "improved",
    label: "Improved (24h)",
    value: String(improvedLast24h),
    meta:
      improvedLast24h > 0
        ? "Confidence / thesis confirmations"
        : "No improvements recorded today",
    pulse: improvedLast24h > 0,
  });

  if (evidenceSourceCount > 0) {
    // Replace fourth node meta richness — keep 4 nodes; swap improved meta already set.
    // Add evidence into status kicker instead.
  }

  const activeMissions = missions.totals.activeMissions;
  const feedCritical = feed.counts?.critical ?? 0;

  let statusKicker = "Intelligence Engine";
  if (episodes.length === 0) statusKicker = "Engine idle · ready";
  else if (watched.length > 0) statusKicker = `Observing · ${watched.length} watched`;
  else if (updates.length > 0) statusKicker = `Memory active · ${updates.length} update${updates.length === 1 ? "" : "s"}`;
  else if (age) statusKicker = `Engine live · wrote ${age}`;
  else statusKicker = "Engine observing";

  if (activeMissions > 0) {
    statusKicker = `${statusKicker} · ${activeMissions} mission${activeMissions === 1 ? "" : "s"}`;
  }

  return {
    generatedAt: new Date(nowMs).toISOString(),
    episodeCount: episodes.length,
    watchedCount: watched.length,
    livingThreadCount: threads.size,
    updatesSinceVisit: updates.length,
    improvedLast24h,
    evidenceSourceCount,
    activeMissions,
    feedCritical,
    latestEngineAt,
    latestAction: latest?.decision ?? null,
    lines: uniqueLines,
    nodes,
    statusKicker,
  };
}

/** Merge optional server counts (signed-in) onto a local snapshot — never invent. */
export function mergeServerPresenceHints(
  base: LivingPresenceSnapshot,
  hints: {
    episodeCount?: number;
    watchedCount?: number;
    updatesCount?: number;
    activeMissions?: number;
    feedCritical?: number;
  }
): LivingPresenceSnapshot {
  const episodeCount =
    typeof hints.episodeCount === "number" && hints.episodeCount > base.episodeCount
      ? hints.episodeCount
      : base.episodeCount;
  const watchedCount =
    typeof hints.watchedCount === "number" && hints.watchedCount > base.watchedCount
      ? hints.watchedCount
      : base.watchedCount;
  const updatesSinceVisit =
    typeof hints.updatesCount === "number" && hints.updatesCount > base.updatesSinceVisit
      ? hints.updatesCount
      : base.updatesSinceVisit;
  const activeMissions =
    typeof hints.activeMissions === "number"
      ? Math.max(base.activeMissions, hints.activeMissions)
      : base.activeMissions;
  const feedCritical =
    typeof hints.feedCritical === "number"
      ? Math.max(base.feedCritical, hints.feedCritical)
      : base.feedCritical;

  const nodes = base.nodes.map((n) => {
    if (n.id === "outcomes" && episodeCount !== base.episodeCount) {
      return { ...n, value: String(episodeCount), meta: "Decision Memory (synced)" };
    }
    if (n.id === "watching" && watchedCount !== base.watchedCount) {
      return {
        ...n,
        value: String(watchedCount),
        meta: watchedCount > 0 ? "Watching" : n.meta,
        pulse: watchedCount > 0,
      };
    }
    if (n.id === "improved" && updatesSinceVisit > 0 && n.value === "0") {
      // keep improved as local truth; don't fake from updates
      return n;
    }
    return n;
  });

  return {
    ...base,
    episodeCount,
    watchedCount,
    updatesSinceVisit,
    activeMissions,
    feedCritical,
    nodes,
  };
}
