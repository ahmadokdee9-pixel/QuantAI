/**
 * Phase 18 — Commerce heuristic evolution (deterministic, bounded).
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function evolveCommerceHeuristics(args: {
  query: string;
  upstreamDelta01: number;
}): { heuristicId: string; delta01: number; label: string } {
  const q = args.query.toLowerCase();
  let heuristicId = "balanced_heuristic";
  let delta01 = round4(Math.min(0.08, args.upstreamDelta01 * 0.5));
  if (/\b(compare|vs|which)\b/.test(q)) {
    heuristicId = "comparison_heuristic";
    delta01 = round4(Math.min(0.08, delta01 + 0.03));
  }
  if (/\b(deal|sale|discount)\b/.test(q)) {
    heuristicId = "value_heuristic";
    delta01 = round4(Math.min(0.08, delta01 + 0.02));
  }
  const label = delta01 > 0.05 ? "heuristic_adapting" : "heuristic_stable";
  return { heuristicId, delta01, label };
}
