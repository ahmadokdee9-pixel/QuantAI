/**
 * Deterministic activation replay fingerprint.
 */

import type { ControlledActivationResult } from "../types";
import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export function buildActivationReplayFingerprint(result: ControlledActivationResult): string {
  const parts = [
    result.activation.inCanary ? 1 : 0,
    result.governance.approved ? 1 : 0,
    result.shadowMutation.prepared ? 1 : 0,
    result.activation.trafficBucket,
    Math.round(result.governance.confidence01 * 100),
    result.rollback.restoreId,
  ];
  return `act_${fnv1aHex(parts.join("~"))}`;
}

export function assertActivationReplayDeterministic(
  a: ControlledActivationResult,
  b: ControlledActivationResult
): { ok: boolean; reason?: string } {
  if (a.replayFingerprint !== b.replayFingerprint) {
    return { ok: false, reason: "fingerprint_mismatch" };
  }
  if (a.activation.inCanary !== b.activation.inCanary) {
    return { ok: false, reason: "canary_mismatch" };
  }
  return { ok: true };
}
