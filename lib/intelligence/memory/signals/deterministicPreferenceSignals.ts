/**
 * Phase 6 — Deterministic preference signals (shadow ranking prep — no mutation).
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { DeterministicPreferenceSignals } from "../types";
import type { TasteProfileEngineResult } from "../taste/tasteProfileEngine";
import type { CommerceMemoryKernelResult } from "../memory/commerceMemoryKernel";
import { applyConfidenceDecay } from "./confidenceDecayEngine";
import { trackMemoryStability } from "./memoryStabilityTracker";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function buildDeterministicPreferenceSignals(args: {
  taste: TasteProfileEngineResult;
  memory: CommerceMemoryKernelResult;
  sessionMemory: CommerceSessionMemoryV1;
}): DeterministicPreferenceSignals {
  const stability01 = trackMemoryStability({
    sessionMemory: args.sessionMemory,
    sensitivity: args.taste.sensitivity,
  });

  const rawConfidence = args.taste.confidence01;
  const confidence01 = applyConfidenceDecay({
    rawConfidence01: rawConfidence,
    interactionCount: args.sessionMemory.interactionCount,
  });

  const preferenceScore = round4(
    clamp01(
      confidence01 * 0.35 +
        stability01 * 0.25 +
        args.memory.intentMemory.repeatSearch01 * 0.15 +
        args.memory.interactionGraph.trustSelection01 * 0.15 +
        (1 - args.taste.sensitivity.priceSensitivity01) * 0.1
    ) * 100
  );

  return {
    preferenceScore,
    confidence01,
    stability01,
    decayedWeight01: round4(confidence01 * stability01),
    rankingMutation: false,
  };
}
