/**
 * Phase 17 — Emotional commerce graph.
 */

import type { EmotionalGraphNode } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildEmotionalCommerceGraph(args: {
  query: string;
  driver: string;
  impulse01: number;
  aspiration01: number;
}): EmotionalGraphNode[] {
  const q = args.query.toLowerCase();
  const nodes: EmotionalGraphNode[] = [
    { nodeId: "driver", emotion: args.driver, intensity01: round4(0.45) },
    { nodeId: "impulse", emotion: "impulse_pull", intensity01: round4(args.impulse01) },
    { nodeId: "aspiration", emotion: "aspiration_pull", intensity01: round4(args.aspiration01) },
  ];
  if (/\b(gift|love|care)\b/.test(q)) {
    nodes.push({ nodeId: "bonding", emotion: "relational_bond", intensity01: 0.62 });
  }
  if (/\b(status|luxury|designer)\b/.test(q)) {
    nodes.push({ nodeId: "status", emotion: "status_signal", intensity01: 0.58 });
  }
  return nodes.slice(0, 8);
}
