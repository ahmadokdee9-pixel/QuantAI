/**
 * QUANTAI_PHASE_26_2_STABLE_FROZEN
 *
 * Freeze lock for Phase 26.0–26.2 presentation authority (verdict + reason pipelines).
 * Do not modify locked modules without an explicit unfreeze protocol.
 *
 * Phase 27.0/27.1 presentation overlays may extend UI consumers only — verdict,
 * reason, distribution, and spread authority modules remain separately frozen.
 */

export const QUANTAI_PHASE_26_2_STABLE_FROZEN = "QUANTAI_PHASE_26_2_STABLE_FROZEN" as const;

export type QuantaiPhase262FreezeLock =
  | "unified_verdict_authority"
  | "verdict_reason_authority"
  | "single_verdict_pipeline"
  | "single_reasoning_pipeline"
  | "card_evidence_filtering"
  | "decision_brief_alignment"
  | "final_verdict_alignment";

export const QUANTAI_PHASE_26_2_LOCKED: readonly QuantaiPhase262FreezeLock[] = [
  "unified_verdict_authority",
  "verdict_reason_authority",
  "single_verdict_pipeline",
  "single_reasoning_pipeline",
  "card_evidence_filtering",
  "decision_brief_alignment",
  "final_verdict_alignment",
] as const;

/** Presentation surfaces protected by this freeze (no layout/size/hierarchy changes). */
export const QUANTAI_PHASE_26_2_PROTECTED = [
  "layout",
  "card_size",
  "visual_hierarchy",
  "intelligence_surface",
  "tray_architecture",
] as const;

/**
 * Files that implement frozen verdict/reason authority.
 * Stabilization tests assert freeze markers and required anchors in each path.
 */
export const QUANTAI_PHASE_26_2_FROZEN_FILES = [
  "lib/governance/quantaiPhase262Freeze.ts",
  "lib/ui/unifiedVerdictAuthority.ts",
  "lib/ui/verdictReasonAuthority.ts",
  "lib/ui/decisionCoherenceActivation.ts",
  "lib/ui/intelligenceExposureActivation.ts",
  "lib/ui/marketSummary.ts",
  "components/search/ProductResultsSurface.tsx",
  "components/search/MarketSummaryBlock.tsx",
  "components/search/ProductIntelligenceDrawer.tsx",
  "components/search/IntelligenceCardBody.tsx",
] as const;

export const QUANTAI_PHASE_26_2_FREEZE_MARKER =
  "QUANTAI_PHASE_26_2_STABLE_FROZEN" as const;

/** Required anchors per frozen file (structural guards — not intelligence logic). */
export const QUANTAI_PHASE_26_2_FILE_ANCHORS: Record<
  (typeof QUANTAI_PHASE_26_2_FROZEN_FILES)[number],
  readonly string[]
> = {
  "lib/governance/quantaiPhase262Freeze.ts": [
    QUANTAI_PHASE_26_2_STABLE_FROZEN,
    "QUANTAI_PHASE_26_2_LOCKED",
    "QUANTAI_PHASE_26_2_FROZEN_FILES",
  ],
  "lib/ui/unifiedVerdictAuthority.ts": [
    QUANTAI_PHASE_26_2_FREEZE_MARKER,
    "resolveUnifiedTrayVerdict",
    "trayVerdictMatchesCardMajority",
    "reasonAuthority",
  ],
  "lib/ui/verdictReasonAuthority.ts": [
    QUANTAI_PHASE_26_2_FREEZE_MARKER,
    "resolveProductReasonAuthority",
    "resolveTrayReasonAuthority",
    "filterChipsForReasonAuthority",
    "surfaceEvidenceSupportsAuthority",
  ],
  "lib/ui/decisionCoherenceActivation.ts": [
    QUANTAI_PHASE_26_2_FREEZE_MARKER,
    "trayVerdictAuthority",
    "reasonAuthority",
    "activateProductDecisionCoherence",
  ],
  "lib/ui/intelligenceExposureActivation.ts": [
    QUANTAI_PHASE_26_2_FREEZE_MARKER,
    "resolveProductReasonAuthority",
    "filterChipsForReasonAuthority",
    "reasonAuthority",
  ],
  "lib/ui/marketSummary.ts": [
    QUANTAI_PHASE_26_2_FREEZE_MARKER,
    "trayVerdict",
    "UnifiedTrayVerdict",
  ],
  "components/search/ProductResultsSurface.tsx": [
    QUANTAI_PHASE_26_2_FREEZE_MARKER,
    "resolveUnifiedTrayVerdict",
    "trayVerdictAuthority",
    "unifiedTrayVerdict",
  ],
  "components/search/MarketSummaryBlock.tsx": [
    QUANTAI_PHASE_26_2_FREEZE_MARKER,
    "trayVerdict",
  ],
  "components/search/ProductIntelligenceDrawer.tsx": [
    QUANTAI_PHASE_26_2_FREEZE_MARKER,
    "reasonAuthority",
    "drawerDecisionLane",
  ],
  "components/search/IntelligenceCardBody.tsx": [
    QUANTAI_PHASE_26_2_FREEZE_MARKER,
    "intelligenceExposure",
    "coherentDecision",
    "summary-line--hero",
  ],
};
