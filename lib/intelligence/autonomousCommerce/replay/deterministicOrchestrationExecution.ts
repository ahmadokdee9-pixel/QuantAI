/**
 * Phase 8 — Deterministic orchestration execution + replay fingerprint.
 */

import type { AutonomousCommerceOsResult } from "../types";
import { DEFAULT_ORCHESTRATION_REPLAY_CONTRACT, MAX_COGNITION_BYTES } from "./orchestrationReplayContracts";
import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export function buildOrchestrationReplayFingerprint(result: AutonomousCommerceOsResult): string {
  const parts = [
    result.meta.graphNodeCount,
    result.meta.strategyLayerCount,
    Math.round(result.meta.avgStrategicConfidence * 100),
    result.market.pricingPressure01,
    result.economic.valueMigration01,
    ...result.strategicLayers.slice(0, 4).map((l) => l.layerId).sort(),
  ];
  return `aco_${fnv1aHex(parts.join("~"))}`;
}

export function assertOrchestrationReplayDeterministic(
  runA: AutonomousCommerceOsResult,
  runB: AutonomousCommerceOsResult
): { ok: boolean; reason?: string } {
  if (runA.replayFingerprint !== runB.replayFingerprint) {
    return { ok: false, reason: "fingerprint_mismatch" };
  }
  if (runA.meta.strategyLayerCount !== runB.meta.strategyLayerCount) {
    return { ok: false, reason: "layer_count_mismatch" };
  }
  if (runA.meta.safetyBlockedCount !== runB.meta.safetyBlockedCount) {
    return { ok: false, reason: "safety_blocked_mismatch" };
  }
  return { ok: true };
}

export function isOrchestrationExecutionBounded(latencyMs: number): boolean {
  return latencyMs <= DEFAULT_ORCHESTRATION_REPLAY_CONTRACT.maxLatencyMs * 3;
}

export function verifyBoundedCognition(bytes: number): boolean {
  return bytes <= MAX_COGNITION_BYTES;
}
