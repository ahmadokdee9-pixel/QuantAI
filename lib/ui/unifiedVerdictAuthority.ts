/**
 * QUANTAI_PHASE_26_2_STABLE_FROZEN — DO NOT MODIFY (verdict authority / pipeline).
 * Phase 26.1 — Unified Verdict Authority.
 * Tray-level verdict derived from the same per-card coherence pipeline (presentation only).
 */

import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import {
  buildTrayReasonNarrative,
  resolveTrayReasonAuthority,
  type VerdictReasonAuthority,
} from "@/lib/ui/verdictReasonAuthority";

export type TrayVerdictClusterCounts = {
  buyReady: number;
  wait: number;
  avoid: number;
  compareExcluded: number;
};

export type UnifiedTrayVerdict = {
  verdict: PrimaryVerdict;
  confidence: number;
  clusterCounts: TrayVerdictClusterCounts;
  reasonAuthority: VerdictReasonAuthority;
  winningReason: string;
  losingReasons: string[];
  marketObservation: string;
};

const BUY_CONFIDENCE_FLOOR = 68;

function clipLine(text: string, max = 220): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function pickDominantVerdict(counts: TrayVerdictClusterCounts): PrimaryVerdict {
  const ranked: Array<{ verdict: PrimaryVerdict; count: number; priority: number }> = [
    { verdict: "AVOID", count: counts.avoid, priority: 0 },
    { verdict: "WAIT", count: counts.wait, priority: 1 },
    { verdict: "BUY READY", count: counts.buyReady, priority: 2 },
  ];
  const max = Math.max(counts.avoid, counts.wait, counts.buyReady);
  const tied = ranked.filter((row) => row.count === max && max > 0);
  if (!tied.length) return "COMPARE";
  tied.sort((a, b) => a.priority - b.priority);
  return tied[0]!.verdict;
}

function buildWinningReason(verdict: PrimaryVerdict, counts: TrayVerdictClusterCounts, confidence: number): string {
  switch (verdict) {
    case "BUY READY":
      return clipLine(
        `${counts.buyReady} listing${counts.buyReady === 1 ? "" : "s"} cleared buy checks with ${confidence}% tray decision confidence.`
      );
    case "WAIT":
      return clipLine(
        `${counts.wait} listing${counts.wait === 1 ? "" : "s"} signal wait — pricing or trust is not ready for checkout.`
      );
    case "AVOID":
      return clipLine(
        `${counts.avoid} listing${counts.avoid === 1 ? "" : "s"} failed trust or discount hygiene — avoid checkout on this tray.`
      );
    case "COMPARE":
      return clipLine(
        counts.compareExcluded > 0
          ? "Listings are comparison-first — narrow to two trusted rows before committing."
          : "Tray signals are mixed — compare trusted alternatives before buying."
      );
  }
}

function buildLosingReasons(
  verdict: PrimaryVerdict,
  counts: TrayVerdictClusterCounts,
  confidence: number
): string[] {
  const lines: string[] = [];
  if (verdict !== "BUY READY" && counts.buyReady > 0) {
    lines.push(
      clipLine(
        `Buy-ready cluster (${counts.buyReady}) did not win tray authority${verdict === "WAIT" ? " — wait signals dominated" : verdict === "AVOID" ? " — risk signals dominated" : ""}.`
      )
    );
  }
  if (verdict !== "WAIT" && counts.wait > 0) {
    lines.push(clipLine(`Wait cluster (${counts.wait}) lost to stronger ${verdict.toLowerCase()} posture.`));
  }
  if (verdict !== "AVOID" && counts.avoid > 0) {
    lines.push(clipLine(`Avoid cluster (${counts.avoid}) was outweighed by ${verdict.toLowerCase()} listings.`));
  }
  if (verdict === "BUY READY" && confidence < 80 && counts.wait + counts.avoid > 0) {
    lines.push(
      clipLine(
        `Competing wait/avoid signals (${counts.wait + counts.avoid}) remain on the tray — validate SKU and seller before checkout.`
      )
    );
  }
  if (counts.compareExcluded > 0) {
    lines.push(
      clipLine(
        `${counts.compareExcluded} compare-only listing${counts.compareExcluded === 1 ? "" : "s"} excluded from final verdict voting.`
      )
    );
  }
  return lines.filter(Boolean).slice(0, 3);
}

function buildMarketObservation(
  verdict: PrimaryVerdict,
  winningReason: string,
  losingReasons: string[]
): string {
  const loss = losingReasons[0];
  if (!loss) return winningReason;
  return clipLine(`${winningReason} ${loss}`, 280);
}

/**
 * Resolve tray authority from card-level coherent decisions.
 * COMPARE listings never vote; BUY READY requires a confident buy cluster.
 */
export function resolveUnifiedTrayVerdict(
  decisions: Iterable<CoherentProductDecision>
): UnifiedTrayVerdict {
  const list = [...decisions];
  const actionable = list.filter((d) => d.verdict !== "COMPARE");
  const compareExcluded = list.length - actionable.length;

  const counts: TrayVerdictClusterCounts = {
    buyReady: 0,
    wait: 0,
    avoid: 0,
    compareExcluded,
  };

  const alignmentByVerdict: Record<"BUY READY" | "WAIT" | "AVOID", number[]> = {
    "BUY READY": [],
    WAIT: [],
    AVOID: [],
  };

  for (const row of actionable) {
    counts.buyReady += row.verdict === "BUY READY" ? 1 : 0;
    counts.wait += row.verdict === "WAIT" ? 1 : 0;
    counts.avoid += row.verdict === "AVOID" ? 1 : 0;
    if (row.verdict !== "COMPARE") {
      alignmentByVerdict[row.verdict].push(row.alignmentScore);
    }
  }

  let verdict = pickDominantVerdict(counts);

  if (verdict === "BUY READY") {
    const buyAlign = alignmentByVerdict["BUY READY"];
    const avgBuy =
      buyAlign.length > 0
        ? Math.round(buyAlign.reduce((sum, value) => sum + value, 0) / buyAlign.length)
        : 0;
    if (buyAlign.length === 0 || avgBuy < BUY_CONFIDENCE_FLOOR) {
      if (counts.wait >= counts.avoid && counts.wait > 0) verdict = "WAIT";
      else if (counts.avoid > 0) verdict = "AVOID";
      else verdict = "COMPARE";
    }
  }

  const activeAlignments =
    verdict === "COMPARE"
      ? actionable.map((row) => row.alignmentScore)
      : alignmentByVerdict[verdict];
  const confidence =
    activeAlignments.length > 0
      ? Math.round(activeAlignments.reduce((sum, value) => sum + value, 0) / activeAlignments.length)
      : list[0]?.alignmentScore ?? 50;

  const reasonAuthority = resolveTrayReasonAuthority(list, verdict);
  const narrative = buildTrayReasonNarrative(reasonAuthority);
  const clusterWinningReason = buildWinningReason(verdict, counts, confidence);
  const clusterLosingReasons = buildLosingReasons(verdict, counts, confidence);
  const winningReason = narrative.winningLine || clusterWinningReason;
  const losingReasons = [
    ...narrative.losingLines,
    ...clusterLosingReasons.filter((line) => !narrative.losingLines.includes(line)),
  ].slice(0, 3);
  const marketObservation =
    narrative.synthesis || buildMarketObservation(verdict, winningReason, losingReasons);

  return {
    verdict,
    confidence,
    clusterCounts: counts,
    reasonAuthority,
    winningReason,
    losingReasons,
    marketObservation,
  };
}

/** Majority actionable-card verdict must match tray authority (validation helper). */
export function trayVerdictMatchesCardMajority(
  decisions: Iterable<CoherentProductDecision>,
  trayVerdict: PrimaryVerdict
): boolean {
  const actionable = [...decisions].filter((d) => d.verdict !== "COMPARE");
  if (!actionable.length) return trayVerdict === "COMPARE";
  const counts: TrayVerdictClusterCounts = {
    buyReady: 0,
    wait: 0,
    avoid: 0,
    compareExcluded: 0,
  };
  for (const row of actionable) {
    if (row.verdict === "BUY READY") counts.buyReady++;
    else if (row.verdict === "WAIT") counts.wait++;
    else if (row.verdict === "AVOID") counts.avoid++;
  }
  const max = Math.max(counts.buyReady, counts.wait, counts.avoid);
  const majority = (["AVOID", "WAIT", "BUY READY"] as const).filter((v) => {
    const n = v === "BUY READY" ? counts.buyReady : v === "WAIT" ? counts.wait : counts.avoid;
    return n === max;
  });
  if (majority.length !== 1) {
    const conservative: PrimaryVerdict =
      counts.avoid === max ? "AVOID" : counts.wait === max ? "WAIT" : "BUY READY";
    return trayVerdict === conservative;
  }
  if (majority[0] === "BUY READY" && trayVerdict === "BUY READY") {
    const buyRows = actionable.filter((d) => d.verdict === "BUY READY");
    const avg =
      buyRows.reduce((s, d) => s + d.alignmentScore, 0) / Math.max(1, buyRows.length);
    return avg >= BUY_CONFIDENCE_FLOOR;
  }
  return trayVerdict === majority[0];
}
