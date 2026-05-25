/**
 * Canary activation — deterministic 1% (configurable) traffic allocation.
 */

import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export function allocateTrafficBucket(sessionKey: string): number {
  const hash = fnv1aHex(sessionKey);
  const slice = parseInt(hash.slice(0, 8), 16);
  return Number.isFinite(slice) ? slice % 10_000 : 0;
}

export function isInCanaryBucket(bucket: number, trafficPercent: number): boolean {
  const threshold = Math.floor(trafficPercent * 10_000);
  return bucket < threshold;
}
