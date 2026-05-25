/**
 * Phase 17 — Comfort / status / utility balancing.
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function balanceComfortStatusUtility(args: {
  query: string;
  status01: number;
  utilityBias: number;
}): { comfort01: number; status01: number; utility01: number } {
  const q = args.query.toLowerCase();
  let comfort01 = /\b(comfort|cozy|soft|ergonomic)\b/.test(q) ? 0.55 : 0.3;
  let status01 = clamp01(args.status01);
  let utility01 = clamp01(args.utilityBias);
  if (/\b(deal|value|budget)\b/.test(q)) utility01 = round4(clamp01(utility01 + 0.2));
  const sum = comfort01 + status01 + utility01;
  if (sum > 0) {
    comfort01 = round4(comfort01 / sum);
    status01 = round4(status01 / sum);
    utility01 = round4(utility01 / sum);
  }
  return { comfort01, status01, utility01 };
}
