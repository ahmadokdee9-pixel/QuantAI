/**
 * Phase 18 — Commerce pattern synthesis.
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function synthesizeCommercePatterns(args: {
  query: string;
  vertical: string;
  patternStrength: number;
}): { patternId: string; strength01: number } {
  const q = args.query.toLowerCase();
  let patternId = `pattern_${args.vertical}_browse`;
  if (/\b(bundle|set|kit)\b/.test(q)) patternId = "pattern_bundle_cross_sell";
  if (/\b(upgrade|newer)\b/.test(q)) patternId = "pattern_upgrade_cycle";
  if (/\b(repeat|again|usual)\b/.test(q)) patternId = "pattern_habitual_repeat";
  return { patternId, strength01: round4(Math.min(1, args.patternStrength)) };
}
