/**
 * Phase 14 — Upgrade timing prediction.
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function predictUpgradeTiming(query: string): { timing01: number; label: string } {
  const q = query.toLowerCase();
  let timing01 = 0.2;
  if (/\b(upgrade|newer|latest|pro max|gen)\b/.test(q)) timing01 += 0.45;
  if (/\b(replace|switch from)\b/.test(q)) timing01 += 0.25;
  timing01 = round4(Math.min(1, timing01));
  const label = timing01 > 0.55 ? "upgrade_imminent" : timing01 > 0.3 ? "upgrade_considering" : "no_upgrade_signal";
  return { timing01, label };
}
