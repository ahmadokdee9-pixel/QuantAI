/**
 * Phase 17 — Emotional lifecycle graph.
 */

import type { EmotionalLifecycleNode } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildEmotionalLifecycleGraph(args: {
  phase: string;
  continuity01: number;
  urgency01: number;
}): EmotionalLifecycleNode[] {
  return [
    { nodeId: "phase", phase: args.phase, score01: round4(0.5) },
    { nodeId: "continuity", phase: "aesthetic_continuity", score01: round4(args.continuity01) },
    { nodeId: "timing", phase: "emotional_timing", score01: round4(args.urgency01) },
  ];
}
