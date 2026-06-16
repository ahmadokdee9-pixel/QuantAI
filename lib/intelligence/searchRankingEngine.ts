/**
 * Phase 40 — Search Result Ranking Engine.
 * Intentional rank order with human-readable rank labels.
 */

import type { GlobalWinnerResult } from "@/lib/intelligence/globalWinnerEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { QuantProduct } from "@/lib/shoppingScore";

export type SearchRankLabel =
  | "Best Overall Choice"
  | "Strong Alternative"
  | "Value Champion"
  | "Premium Choice"
  | "Budget Choice"
  | "Compare";

export type SearchRankEntry = {
  version: 1;
  link: string;
  rank: number;
  label: SearchRankLabel;
  rankHeadline: string;
  rankScore: number;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function rankHeadline(rank: number, label: SearchRankLabel): string {
  return `#${rank} ${label}`;
}

/** Rank every search result — never random. */
export function rankSearchResults(args: {
  winner: GlobalWinnerResult;
  rows: Array<{
    link: string;
    product: QuantProduct;
    winnerScore: number;
    opportunityScore: number;
    valueScore: number;
    qualityScore: number;
    trustScore: number;
    verdict: PrimaryVerdict;
    price: number;
    truthRankDelta?: number;
  }>;
}): SearchRankEntry[] {
  const { winner, rows } = args;
  if (!rows.length) return [];

  const prices = rows.map((r) => r.price).filter((p) => p > 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

  const scored = rows
    .map((row) => {
      let rankScore = row.winnerScore * 0.45 + row.opportunityScore * 0.3 + row.valueScore * 0.15 + row.trustScore * 0.1;
      if (row.link === winner.winnerLink) rankScore += 25;
      if (row.verdict === "BUY READY") rankScore += 6;
      if (row.verdict === "AVOID") rankScore -= 20;
      const truthDelta = row.truthRankDelta ?? 0;
      if (Number.isFinite(truthDelta)) rankScore += truthDelta;
      return { ...row, rankScore: clamp(Math.round(rankScore), 0, 100) };
    })
    .sort((a, b) => b.rankScore - a.rankScore);

  const valueChampionLink = [...rows].sort((a, b) => a.price - b.price || b.valueScore - a.valueScore)[0]?.link;
  const premiumLink = [...rows].sort((a, b) => b.qualityScore - a.qualityScore || b.price - a.price)[0]?.link;
  const budgetLink = [...rows].sort((a, b) => a.price - b.price)[0]?.link;

  const usedLabels = new Set<SearchRankLabel>();
  const entries: SearchRankEntry[] = [];

  scored.forEach((row, index) => {
    const rank = index + 1;
    let label: SearchRankLabel = "Compare";

    if (row.link === winner.winnerLink) {
      label = "Best Overall Choice";
    } else if (rank === 2 && !usedLabels.has("Strong Alternative")) {
      label = "Strong Alternative";
    } else if (row.link === valueChampionLink && row.price <= avgPrice && !usedLabels.has("Value Champion")) {
      label = "Value Champion";
    } else if (row.link === premiumLink && row.price >= avgPrice * 0.9 && !usedLabels.has("Premium Choice")) {
      label = "Premium Choice";
    } else if (row.link === budgetLink && row.price === minPrice && !usedLabels.has("Budget Choice")) {
      label = "Budget Choice";
    } else if (row.verdict === "COMPARE" || rank >= 6) {
      label = "Compare";
    } else if (rank <= 5) {
      label = rank === 2 ? "Strong Alternative" : "Compare";
    }

    usedLabels.add(label);
    entries.push({
      version: 1,
      link: row.link,
      rank,
      label,
      rankHeadline: rankHeadline(rank, label),
      rankScore: row.rankScore,
    });
  });

  return entries;
}

export function searchRankOrder(entries: SearchRankEntry[]): string[] {
  return [...entries].sort((a, b) => a.rank - b.rank).map((e) => e.link);
}
