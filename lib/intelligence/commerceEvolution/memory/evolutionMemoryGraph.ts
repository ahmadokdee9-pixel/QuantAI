/**
 * Phase 10 — Evolution memory graph (bounded cross-session nodes).
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { IntentTransitionSnapshot } from "../types";
import type { EvolvingTasteProfile } from "../types";
import type { CommerceLifecycleProfile } from "../types";

export type EvolutionMemoryNode = {
  id: string;
  kind: "category" | "brand" | "intent" | "lifecycle" | "taste";
  weight01: number;
};

export type EvolutionMemoryGraph = {
  nodes: EvolutionMemoryNode[];
  edgeCount: number;
};

const MAX_NODES = 20;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildEvolutionMemoryGraph(args: {
  sessionMemory: CommerceSessionMemoryV1;
  lifecycle: CommerceLifecycleProfile;
  intentTransition: IntentTransitionSnapshot;
  tasteEvolution: EvolvingTasteProfile;
}): EvolutionMemoryGraph {
  const nodes: EvolutionMemoryNode[] = [];

  for (const [cat, w] of Object.entries(args.sessionMemory.categoryAffinity).slice(0, 6)) {
    nodes.push({ id: `cat_${cat}`, kind: "category", weight01: round4(Math.min(1, w / 5)) });
  }
  for (const b of args.sessionMemory.preferredBrands.slice(0, 4)) {
    nodes.push({ id: `brand_${b}`, kind: "brand", weight01: 0.45 });
  }
  nodes.push({
    id: `intent_${args.intentTransition.toIntent}`,
    kind: "intent",
    weight01: round4(args.intentTransition.transitionStrength01),
  });
  nodes.push({
    id: `lifecycle_${args.lifecycle.phase}`,
    kind: "lifecycle",
    weight01: round4(args.lifecycle.lifecycleMaturity01),
  });
  nodes.push({
    id: "taste_drift",
    kind: "taste",
    weight01: round4(args.tasteEvolution.tasteDrift01),
  });

  return {
    nodes: nodes.slice(0, MAX_NODES),
    edgeCount: Math.min(MAX_NODES * 2, nodes.length * 2),
  };
}
