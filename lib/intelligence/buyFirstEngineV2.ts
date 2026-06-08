/**
 * Phase 41 — Buy-First Engine V2.
 * Every valid search surfaces 1–3 BUY READY opportunities when market allows.
 */

import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";

export type BuyFirstResult = {
  version: 2;
  promotedLinks: string[];
  targetBuyReadyMin: number;
  targetBuyReadyMax: number;
  message: string;
};

/** Promote top opportunities to BUY READY when tray lacks buy paths. */
export function applyBuyFirstV2(args: {
  rankedLinks: string[];
  verdictByLink: Map<string, PrimaryVerdict>;
  opportunityScoreByLink: Map<string, number>;
  categoryFitByLink: Map<string, number>;
  trustByLink: Map<string, number>;
  traySize: number;
}): BuyFirstResult {
  const { rankedLinks, verdictByLink, opportunityScoreByLink, categoryFitByLink, trustByLink, traySize } = args;

  const actionable = rankedLinks.filter((link) => {
    const v = verdictByLink.get(link);
    return v !== "AVOID" && v !== "INSUFFICIENT DATA";
  });

  const targetBuyReadyMin = Math.max(1, Math.min(3, Math.ceil(actionable.length * 0.25)));
  const targetBuyReadyMax = Math.max(targetBuyReadyMin, Math.min(3, Math.ceil(actionable.length * 0.5)));

  let buyCount = [...verdictByLink.values()].filter((v) => v === "BUY READY").length;
  const promotedLinks: string[] = [];

  if (buyCount >= targetBuyReadyMin) {
    return {
      version: 2,
      promotedLinks,
      targetBuyReadyMin,
      targetBuyReadyMax,
      message: "Buy-first threshold already met.",
    };
  }

  for (const link of rankedLinks) {
    if (buyCount >= targetBuyReadyMax) break;
    const current = verdictByLink.get(link);
    if (current === "AVOID" || current === "INSUFFICIENT DATA" || current === "BUY READY") continue;

    const opp = opportunityScoreByLink.get(link) ?? 0;
    const fit = categoryFitByLink.get(link) ?? 0;
    const trust = trustByLink.get(link) ?? 0;

    if (opp >= 48 && fit >= 50 && trust >= 52) {
      verdictByLink.set(link, "BUY READY");
      promotedLinks.push(link);
      buyCount += 1;
    }
  }

  return {
    version: 2,
    promotedLinks,
    targetBuyReadyMin,
    targetBuyReadyMax,
    message:
      promotedLinks.length > 0
        ? `Buy-first recovery promoted ${promotedLinks.length} listing(s) to BUY READY.`
        : traySize <= 2
          ? "Sparse tray — best available option surfaced with honest confidence."
          : "Market weak — limited BUY READY promotion applied.",
  };
}
