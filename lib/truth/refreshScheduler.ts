/**
 * Phase 1B.3 — Freshness-driven refresh scheduling.
 */

import { computeObservationAgeHours } from "@/lib/truth/freshnessScore";
import { dedupeRefreshJobTargets } from "@/lib/truth/refreshQueue";
import type { RefreshJobTarget, RefreshWorkerConfig } from "@/lib/truth/refreshJobTypes";

/** Whether a listing is stale enough to refresh. */
export function isListingRefreshEligible(
  target: RefreshJobTarget,
  config: RefreshWorkerConfig,
  now: Date = new Date()
): boolean {
  if (!target.lastObservedAt) return true;
  const ageHours = computeObservationAgeHours(target.lastObservedAt, now);
  return ageHours >= config.minRefreshIntervalHours;
}

/** Higher score = scheduled sooner. Stale listings rank first. */
export function computeRefreshJobPriority(
  target: RefreshJobTarget,
  config: RefreshWorkerConfig,
  now: Date = new Date()
): number {
  const sourceBase = config.sourcePriorities[target.source] ?? 0;
  const ageHours =
    target.ageHours ??
    (target.lastObservedAt ? computeObservationAgeHours(target.lastObservedAt, now) : config.staleHours + 1);
  const staleBoost = Math.min(120, ageHours * 2);
  const freshnessPenalty = target.freshnessScore != null ? (100 - target.freshnessScore) * 0.4 : 20;
  return Math.round(sourceBase + staleBoost + freshnessPenalty);
}

/** Filter, dedupe, prioritize, and cap refresh jobs for one worker run. */
export function scheduleRefreshJobs(
  targets: RefreshJobTarget[],
  config: RefreshWorkerConfig,
  now: Date = new Date()
): RefreshJobTarget[] {
  const eligible = targets.filter((target) => isListingRefreshEligible(target, config, now));
  const scored = eligible.map((target) => ({
    ...target,
    priority: computeRefreshJobPriority(target, config, now),
    ageHours:
      target.ageHours ??
      (target.lastObservedAt ? computeObservationAgeHours(target.lastObservedAt, now) : null),
  }));

  scored.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return (b.ageHours ?? 0) - (a.ageHours ?? 0);
  });

  return dedupeRefreshJobTargets(scored).slice(0, config.batchSize);
}
