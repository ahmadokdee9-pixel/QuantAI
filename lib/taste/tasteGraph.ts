/**
 * Phase 3.1 — Institutional taste graph linking vertical lanes to unified identities.
 * Watches ↔ fragrance ↔ furniture prestige / aesthetic / restraint semantics.
 */

import type { VerticalTasteGrammarLaneId } from "@/lib/taste/verticalTasteContracts";

export type UnifiedTasteIdentityId =
  | "quiet_luxury"
  | "institutional_minimal"
  | "executive_premium"
  | "architectural_modern"
  | "haute_collector"
  | "creative_studio"
  | "performance_technical";

export type TasteGraphVertical = "watch" | "fragrance" | "furniture";

export type TasteGraphEdge = {
  from: VerticalTasteGrammarLaneId | UnifiedTasteIdentityId;
  to: UnifiedTasteIdentityId | VerticalTasteGrammarLaneId;
  weight: number;
  semantics: ("prestige" | "aesthetic" | "restraint")[];
};

/** Vertical lane → primary unified identity (institutional mapping). */
export const VERTICAL_LANE_TO_IDENTITY: Record<VerticalTasteGrammarLaneId, UnifiedTasteIdentityId> = {
  watch_luxury_quiet: "quiet_luxury",
  watch_swiss_dress: "executive_premium",
  watch_mechanical_collector: "haute_collector",
  electronics_focus_deep_work: "performance_technical",
  electronics_audio_reference: "performance_technical",
  electronics_workstation_pro: "performance_technical",
  furniture_premium_minimal_desk: "institutional_minimal",
  furniture_ergonomic_work_setup: "executive_premium",
  furniture_minimal_office: "institutional_minimal",
  furniture_executive_workspace: "executive_premium",
  furniture_ergonomic_premium: "executive_premium",
  furniture_studio_clean: "creative_studio",
  furniture_architectural_minimal: "architectural_modern",
  fragrance_designer_signature: "quiet_luxury",
  fragrance_niche_artisan: "haute_collector",
  fragrance_luxury_haute: "haute_collector",
};

/** Cross-vertical identity affinity (shared prestige / aesthetic / restraint). */
export const IDENTITY_CROSS_VERTICAL_AFFINITY: Record<
  UnifiedTasteIdentityId,
  Record<TasteGraphVertical, number>
> = {
  quiet_luxury: { watch: 0.92, fragrance: 0.88, furniture: 0.74 },
  institutional_minimal: { watch: 0.62, fragrance: 0.58, furniture: 0.94 },
  executive_premium: { watch: 0.86, fragrance: 0.72, furniture: 0.9 },
  architectural_modern: { watch: 0.68, fragrance: 0.55, furniture: 0.96 },
  haute_collector: { watch: 0.9, fragrance: 0.94, furniture: 0.52 },
  creative_studio: { watch: 0.48, fragrance: 0.5, furniture: 0.91 },
  performance_technical: { watch: 0.84, fragrance: 0.38, furniture: 0.56 },
};

/** Shared semantic bridges between vertical families. */
export const TASTE_GRAPH_EDGES: TasteGraphEdge[] = [
  { from: "watch_swiss_dress", to: "quiet_luxury", weight: 0.78, semantics: ["prestige", "restraint"] },
  { from: "watch_luxury_quiet", to: "quiet_luxury", weight: 0.95, semantics: ["prestige", "restraint"] },
  { from: "fragrance_designer_signature", to: "quiet_luxury", weight: 0.9, semantics: ["prestige", "aesthetic"] },
  { from: "furniture_minimal_office", to: "institutional_minimal", weight: 0.93, semantics: ["restraint", "aesthetic"] },
  { from: "furniture_minimal_office", to: "quiet_luxury", weight: 0.72, semantics: ["restraint"] },
  { from: "watch_swiss_dress", to: "executive_premium", weight: 0.91, semantics: ["prestige"] },
  { from: "furniture_executive_workspace", to: "executive_premium", weight: 0.92, semantics: ["prestige", "aesthetic"] },
  { from: "fragrance_luxury_haute", to: "haute_collector", weight: 0.96, semantics: ["prestige"] },
  { from: "watch_mechanical_collector", to: "haute_collector", weight: 0.94, semantics: ["prestige", "aesthetic"] },
  { from: "fragrance_niche_artisan", to: "haute_collector", weight: 0.88, semantics: ["prestige", "aesthetic"] },
  { from: "furniture_architectural_minimal", to: "architectural_modern", weight: 0.97, semantics: ["aesthetic", "restraint"] },
  { from: "furniture_studio_clean", to: "creative_studio", weight: 0.95, semantics: ["aesthetic", "restraint"] },
  { from: "watch_mechanical_collector", to: "performance_technical", weight: 0.78, semantics: ["aesthetic"] },
];

const VERTICAL_BY_LANE: Partial<Record<VerticalTasteGrammarLaneId, TasteGraphVertical>> = {
  watch_luxury_quiet: "watch",
  watch_swiss_dress: "watch",
  watch_mechanical_collector: "watch",
  fragrance_designer_signature: "fragrance",
  fragrance_niche_artisan: "fragrance",
  fragrance_luxury_haute: "fragrance",
  furniture_premium_minimal_desk: "furniture",
  furniture_ergonomic_work_setup: "furniture",
  furniture_minimal_office: "furniture",
  furniture_executive_workspace: "furniture",
  furniture_ergonomic_premium: "furniture",
  furniture_studio_clean: "furniture",
  furniture_architectural_minimal: "furniture",
};

export function verticalForLane(lane: VerticalTasteGrammarLaneId | null): TasteGraphVertical | null {
  if (!lane) return null;
  return VERTICAL_BY_LANE[lane] ?? null;
}

export function identityForLane(lane: VerticalTasteGrammarLaneId | null): UnifiedTasteIdentityId | null {
  if (!lane) return null;
  return VERTICAL_LANE_TO_IDENTITY[lane] ?? null;
}

export function laneIdentityAffinity(
  lane: VerticalTasteGrammarLaneId | null,
  identity: UnifiedTasteIdentityId
): number {
  if (!lane) return 0;
  const primary = identityForLane(lane);
  if (primary === identity) return 0.95;
  const edge = TASTE_GRAPH_EDGES.find(
    (e) => e.from === lane && e.to === identity && typeof e.to === "string"
  );
  return edge?.weight ?? 0.35;
}

/**
 * Cross-vertical alignment when query hints span watch / fragrance / furniture semantics.
 */
export function computeCrossVerticalAlignment(args: {
  identity: UnifiedTasteIdentityId;
  verticalHints: Partial<Record<TasteGraphVertical, number>>;
}): number {
  const { identity, verticalHints } = args;
  const aff = IDENTITY_CROSS_VERTICAL_AFFINITY[identity];
  let weighted = 0;
  let total = 0;
  for (const v of ["watch", "fragrance", "furniture"] as const) {
    const hint = verticalHints[v] ?? 0;
    if (hint <= 0) continue;
    weighted += hint * aff[v];
    total += hint;
  }
  if (total <= 0) return aff.watch;
  return Math.min(1, weighted / total);
}

export function restraintCoherence01(identity: UnifiedTasteIdentityId, violations: string[]): number {
  let penalty = 0;
  const pollutionRx =
    /gaming|rgb|fitness_pollution|inspired_by|dupe|false_luxury|false_minimal|low_material|fake_ergonomic/i;
  for (const v of violations) {
    if (pollutionRx.test(v)) penalty += 0.08;
  }
  if (identity === "institutional_minimal" || identity === "quiet_luxury" || identity === "architectural_modern") {
    if (violations.some((v) => /gaming|rgb|fitness/i.test(v))) penalty += 0.06;
  }
  return Math.max(0.62, 1 - Math.min(0.38, penalty));
}
