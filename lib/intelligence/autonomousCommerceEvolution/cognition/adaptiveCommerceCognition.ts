/**
 * Phase 18 — Adaptive commerce cognition (shadow synthesis).
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function adaptCommerceCognition(args: {
  query: string;
  emotionalConfidence01: number;
  universalConfidence01: number;
}): { cognitionLabel: string; adapt01: number } {
  const q = args.query.toLowerCase();
  const adapt01 = round4(
    Math.min(0.1, args.emotionalConfidence01 * 0.04 + args.universalConfidence01 * 0.04)
  );
  let cognitionLabel = "synthesis_stable";
  if (/\b(multi|cross|bundle)\b/.test(q)) cognitionLabel = "cross_domain_synthesis";
  if (adapt01 > 0.06) cognitionLabel = "cognition_adapting";
  return { cognitionLabel, adapt01 };
}
