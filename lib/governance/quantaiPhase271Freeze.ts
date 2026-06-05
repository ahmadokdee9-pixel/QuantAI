/**
 * QUANTAI_PHASE_27_1_STABLE_FROZEN
 *
 * Freeze lock for Phase 27.1 decision distribution + confidence spread authority.
 * Do not modify locked modules without an explicit unfreeze protocol.
 *
 * Phase 26.1/26.2 verdict and reason authority modules remain separately frozen.
 * UI consumers may wire presentation only — distribution/spread logic stays locked.
 */

export const QUANTAI_PHASE_27_1_STABLE_FROZEN = "QUANTAI_PHASE_27_1_STABLE_FROZEN" as const;

export type QuantaiPhase271FreezeLock =
  | "decision_distribution_authority"
  | "confidence_spread_engine"
  | "compare_fallback_removal"
  | "dynamic_confidence_generation"
  | "buy_wait_avoid_balancing";

export const QUANTAI_PHASE_27_1_LOCKED: readonly QuantaiPhase271FreezeLock[] = [
  "decision_distribution_authority",
  "confidence_spread_engine",
  "compare_fallback_removal",
  "dynamic_confidence_generation",
  "buy_wait_avoid_balancing",
] as const;

/** Presentation surfaces protected by this freeze (no layout/size/hierarchy changes). */
export const QUANTAI_PHASE_27_1_PROTECTED = [
  "layout",
  "card_size",
  "visual_hierarchy",
  "routing",
  "search_architecture",
  "phase_26_1_unified_verdict_authority",
  "phase_26_2_verdict_reason_authority",
  "phase_27_alternative_authority",
] as const;

/**
 * Files that implement frozen distribution/spread authority.
 * Stabilization tests assert freeze markers and required anchors in each path.
 */
export const QUANTAI_PHASE_27_1_FROZEN_FILES = [
  "lib/governance/quantaiPhase271Freeze.ts",
  "lib/ui/decisionDistributionAuthority.ts",
  "lib/ui/confidenceSpreadEngine.ts",
  "lib/ui/phase271PresentationActivation.ts",
] as const;

export const QUANTAI_PHASE_27_1_FREEZE_MARKER =
  "QUANTAI_PHASE_27_1_STABLE_FROZEN" as const;

/** Required anchors per frozen file (structural guards — not intelligence logic). */
export const QUANTAI_PHASE_27_1_FILE_ANCHORS: Record<
  (typeof QUANTAI_PHASE_27_1_FROZEN_FILES)[number],
  readonly string[]
> = {
  "lib/governance/quantaiPhase271Freeze.ts": [
    QUANTAI_PHASE_27_1_STABLE_FROZEN,
    "QUANTAI_PHASE_27_1_LOCKED",
    "QUANTAI_PHASE_27_1_FROZEN_FILES",
  ],
  "lib/ui/decisionDistributionAuthority.ts": [
    QUANTAI_PHASE_27_1_FREEZE_MARKER,
    "resolveDecisionDistribution",
    "compareViable",
    "COMPARE is not the default fallback",
  ],
  "lib/ui/confidenceSpreadEngine.ts": [
    QUANTAI_PHASE_27_1_FREEZE_MARKER,
    "resolveConfidenceSpread",
    "VERDICT_RANGES",
    "confidenceWithinVerdictBand",
  ],
  "lib/ui/phase271PresentationActivation.ts": [
    QUANTAI_PHASE_27_1_FREEZE_MARKER,
    "buildPhase271ProductMap",
    "resolveUnifiedTrayVerdictFromPhase271",
    "activatePhase271TrayPresentation",
    "activatePhase271ProductPresentation",
  ],
};
