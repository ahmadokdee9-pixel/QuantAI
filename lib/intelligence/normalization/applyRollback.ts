/**
 * Phase 2 — Offline APPLY simulation + rollback safety verification.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { normalizeCommerceProductTray } from "./normalizeProductTray";
import { detectFalseCollapseIncidents } from "./shadowMetrics";
import { computeTop3DuplicateRate } from "./dedupPipeline";
import { readNormalizationFlags } from "./flags";

function defaultKeyFn(p: QuantProduct): string {
  const n = p.qiNormalizedCommerce;
  if (n?.rankingIdentityKey) return n.rankingIdentityKey;
  return `${p.store}::${p.link}::${p.title.slice(0, 40)}`;
}

function countTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

export type ApplyRollbackVerification = {
  shadowInputCount: number;
  shadowOutputCount: number;
  applyInputCount: number;
  applyOutputCount: number;
  shadowPreservesTray: boolean;
  applyMutatesTray: boolean;
  top5Drift: number;
  top3DupBefore: number;
  top3DupAfterShadow: number;
  top3DupAfterApply: number;
  duplicateReduction: number;
  falseCollapseShadow: number;
  falseCollapseApply: number;
  rollbackSafe: boolean;
  notes: string[];
};

/**
 * Offline verification — does not affect production. Simulates shadow vs dedup+apply on same tray.
 */
export function verifyNormalizationApplyRollback(
  products: QuantProduct[],
  query: string
): ApplyRollbackVerification {
  const notes: string[] = [];
  const preLinks = products.map((p) => p.link || p.title);

  const prev = {
    e: process.env.QUANTAI_NORMALIZATION_ENABLED,
    m: process.env.QUANTAI_NORMALIZATION_MODE,
    a: process.env.QUANTAI_NORMALIZATION_APPLY,
  };

  process.env.QUANTAI_NORMALIZATION_ENABLED = "true";

  process.env.QUANTAI_NORMALIZATION_MODE = "shadow";
  process.env.QUANTAI_NORMALIZATION_APPLY = "false";
  const shadow = normalizeCommerceProductTray(products, query, { mode: "shadow", apply: false });
  const shadowLinks = shadow.products.map((p) => p.link || p.title);

  process.env.QUANTAI_NORMALIZATION_MODE = "dedup";
  process.env.QUANTAI_NORMALIZATION_APPLY = "true";
  const applied = normalizeCommerceProductTray(products, query, { mode: "dedup", apply: true });
  const applyLinks = applied.products.map((p) => p.link || p.title);

  if (prev.e === undefined) delete process.env.QUANTAI_NORMALIZATION_ENABLED;
  else process.env.QUANTAI_NORMALIZATION_ENABLED = prev.e;
  if (prev.m === undefined) delete process.env.QUANTAI_NORMALIZATION_MODE;
  else process.env.QUANTAI_NORMALIZATION_MODE = prev.m;
  if (prev.a === undefined) delete process.env.QUANTAI_NORMALIZATION_APPLY;
  else process.env.QUANTAI_NORMALIZATION_APPLY = prev.a;

  const top3DupBefore = computeTop3DuplicateRate(products, defaultKeyFn);
  const top3DupAfterShadow = computeTop3DuplicateRate(shadow.products, defaultKeyFn);
  const top3DupAfterApply = computeTop3DuplicateRate(applied.products, defaultKeyFn);
  const top5Drift = countTopDrift(preLinks, applyLinks);

  const shadowPreservesTray = shadow.meta.inputCount === shadow.meta.outputCount;
  const applyMutatesTray = applied.meta.outputCount < applied.meta.inputCount;
  const falseCollapseShadow = detectFalseCollapseIncidents(shadow.products, shadow.meta);
  const falseCollapseApply = detectFalseCollapseIncidents(applied.products, applied.meta);

  if (!shadowPreservesTray) notes.push("shadow_tray_size_changed");
  if (falseCollapseShadow > 0) notes.push("false_collapse_in_shadow_groups");
  if (falseCollapseApply > 0) notes.push("false_collapse_under_apply");
  if (top5Drift > 3) notes.push("high_top5_drift_under_apply");

  const flags = readNormalizationFlags();
  if (flags.mode === "shadow" && flags.apply) {
    notes.push("flags_bug_shadow_should_force_apply_false");
  }

  const rollbackSafe =
    shadowPreservesTray &&
    falseCollapseShadow === 0 &&
    falseCollapseApply === 0 &&
    top5Drift <= 3;

  return {
    shadowInputCount: shadow.meta.inputCount,
    shadowOutputCount: shadow.meta.outputCount,
    applyInputCount: applied.meta.inputCount,
    applyOutputCount: applied.meta.outputCount,
    shadowPreservesTray,
    applyMutatesTray,
    top5Drift,
    top3DupBefore,
    top3DupAfterShadow,
    top3DupAfterApply,
    duplicateReduction: Math.max(0, top3DupBefore - top3DupAfterApply),
    falseCollapseShadow,
    falseCollapseApply,
    rollbackSafe,
    notes,
  };
}
