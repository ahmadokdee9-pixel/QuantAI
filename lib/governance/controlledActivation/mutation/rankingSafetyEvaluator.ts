/**
 * Ranking safety evaluator — drift + diversity before mutation.
 */

import { countRankingTopDrift } from "@/lib/governance/replayKernel";
import type { QuantProduct } from "@/lib/shoppingScore";

export type RankingSafetyResult = {
  safe: boolean;
  topDrift: number;
  merchantDiversity01: number;
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function evaluateRankingSafety(args: {
  preLinks: string[];
  products: QuantProduct[];
}): RankingSafetyResult {
  const postLinks = args.products.slice(0, 5).map((p) => p.link);
  const topDrift = countRankingTopDrift(args.preLinks, postLinks);
  const stores = new Set(args.products.map((p) => p.store.trim().toLowerCase()));
  const merchantDiversity01 = round4(
    Math.min(1, stores.size / Math.max(1, args.products.length))
  );
  const safe = topDrift <= 1 && merchantDiversity01 >= 0.2;
  return { safe, topDrift, merchantDiversity01 };
}
