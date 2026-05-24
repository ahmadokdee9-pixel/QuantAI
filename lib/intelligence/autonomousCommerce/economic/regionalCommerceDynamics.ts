/**
 * Phase 8 — Regional commerce dynamics (deterministic region hints).
 */

import type { EconomicContextProfile } from "../types";

export type RegionalDynamics = {
  regionId: string;
  purchasingPower01: number;
  crossBorder01: number;
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function resolveRegionalDynamics(query: string, economic: EconomicContextProfile): RegionalDynamics {
  const q = query.toLowerCase();
  let regionId = "global";
  if (/\b(nl|netherlands|dutch)\b/.test(q)) regionId = "nl";
  else if (/\b(eu|europe)\b/.test(q)) regionId = "eu";
  else if (/\b(uk|britain)\b/.test(q)) regionId = "uk";
  else if (/\b(us|usa|america)\b/.test(q)) regionId = "us";

  const purchasingPower01 = round4(
    regionId === "us" ? 0.7 : regionId === "nl" || regionId === "eu" ? 0.6 : 0.5
  );
  const crossBorder01 = round4(economic.regionalPattern01 * 0.8);

  return { regionId, purchasingPower01, crossBorder01 };
}
