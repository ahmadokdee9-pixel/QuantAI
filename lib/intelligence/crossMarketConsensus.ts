/**
 * QuantAI cross-market consensus — one analyst line fusing spread, trust, and identity glue.
 */

export function buildCrossMarketConsensusLine(args: {
  spreadPct: number;
  medianPrice: number;
  groupConfidence01: number;
  duplicateSpamPenalty: number;
  listingCount: number;
  storeCount: number;
}): string {
  const { spreadPct, medianPrice, groupConfidence01, duplicateSpamPenalty, listingCount, storeCount } = args;
  const idGlue = groupConfidence01 >= 0.82 ? "tight same-SKU glue" : "softer cross-store glue—verify model strings";
  const spam = duplicateSpamPenalty >= 0.18 ? "duplicate/noise pressure in this cluster" : "cleaner duplicate surface";
  const spread =
    spreadPct >= 26
      ? `wide ${spreadPct}% spread on ~${Math.round(medianPrice || 0)} median`
      : spreadPct >= 14
        ? `moderate ${spreadPct}% spread`
        : "tight pricing band";
  return `Cross-market: ${idGlue}, ${spread}, ${spam} across ${storeCount} stores / ${listingCount} listings.`.slice(
    0,
    220
  );
}
