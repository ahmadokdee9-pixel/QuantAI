/**
 * Phase 17 — Taste cognition graph.
 */

import type { TasteCognitionNode } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildTasteCognitionGraph(args: {
  minimalist01: number;
  maximalist01: number;
  aestheticScore01: number;
  personality: string;
}): TasteCognitionNode[] {
  return [
    { nodeId: "minimal", trait: "minimalism", score01: round4(args.minimalist01) },
    { nodeId: "maximal", trait: "maximalism", score01: round4(args.maximalist01) },
    { nodeId: "aesthetic", trait: "aesthetic_pull", score01: round4(args.aestheticScore01) },
    { nodeId: "personality", trait: args.personality, score01: round4((args.minimalist01 + args.maximalist01) / 2) },
  ];
}
