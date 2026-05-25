/**
 * Phase 17 — Emotional commerce ontology.
 */

export type EmotionalOntologyNode = {
  nodeId: string;
  concept: string;
  weight01: number;
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildEmotionalCommerceOntology(query: string): EmotionalOntologyNode[] {
  const q = query.toLowerCase();
  const nodes: EmotionalOntologyNode[] = [
    { nodeId: "taste", concept: "human_taste", weight01: 0.5 },
    { nodeId: "emotion", concept: "purchase_emotion", weight01: 0.48 },
    { nodeId: "identity", concept: "buyer_identity", weight01: 0.42 },
  ];
  if (/\b(luxury|premium)\b/.test(q)) {
    nodes.push({ nodeId: "luxury", concept: "luxury_psychology", weight01: 0.55 });
  }
  if (/\b(minimal|maximal|style)\b/.test(q)) {
    nodes.push({ nodeId: "aesthetic", concept: "aesthetic_preference", weight01: 0.52 });
  }
  return nodes.slice(0, 8).map((n) => ({ ...n, weight01: round4(n.weight01) }));
}
