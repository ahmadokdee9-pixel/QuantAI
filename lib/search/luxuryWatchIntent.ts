/**
 * Luxury watch intent — rule-based routing and listing classification (no embeddings, no brand boosts).
 */

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

/** 0–1 strength of luxury/collector watch intent (not generic smartwatch shopping). */
export function luxuryWatchIntent01(text: string): number {
  const s = text.toLowerCase();
  if (!/\b(watch|watches|horloge|horloges|timepiece|wristwatch|chronograph|ساعة)\b/i.test(s)) {
    return 0;
  }

  let score = 0.08;

  if (
    /\b(luxury|premium|elegant|prestige|refined|quiet luxury|high end|designer|couture|collector|haute horlogerie)\b/i.test(
      s
    )
  ) {
    score += 0.34;
  }
  if (/\b(automatic|mechanical|swiss|sapphire|dress watch|complication|geneva|manual wind|self wind)\b/i.test(s)) {
    score += 0.28;
  }
  if (/\b(men's watch|mens watch|ladies watch|heren horloge|homme montre)\b/i.test(s)) score += 0.12;
  if (/\b(rolex|omega|tag heuer|cartier|breitling|tudor|panerai|iwc|jaeger|grand seiko|seiko presage|longines)\b/i.test(s)) {
    score += 0.22;
  }
  if (/\b(alternative to|similar to|like|alternative)\b/i.test(s) && /\bwatch\b/i.test(s)) score += 0.2;
  if (/\b(vs|versus|compare)\b/i.test(s) && /\bwatch\b/i.test(s)) score += 0.18;
  if (/(?:فخم|فاخر|راقية|ساعة\s*فاخرة|ماركة|شكلها\s*luxury|شكلها\s*فخم)/i.test(s)) score += 0.36;
  if (/\b(under|below|max|tot|onder)\s*(?:€|eur|\$|£)?\s*\d{2,5}\b/i.test(s) && score >= 0.35) score += 0.08;

  if (/\b(fitness tracker|fitbit only|galaxy fit|sports band|running watch|gym watch)\b/i.test(s) && score < 0.35) {
    score *= 0.35;
  }

  return clamp01(score);
}

export function hasLuxuryWatchIntent(text: string): boolean {
  return luxuryWatchIntent01(text) >= 0.42;
}

/** Consumer fitness / budget smart-band lane — not institutional luxury watch. */
export function isConsumerFitnessWatchListing(text: string): boolean {
  const t = text.toLowerCase();
  if (/\b(fitness tracker|activity tracker|fitbit|mi band|smart band|amazfit band|whoop|sports watch)\b/i.test(t)) {
    return true;
  }
  if (/\bgalaxy\s+fit\b/i.test(t) || /\bfit\s*3\b/i.test(t) && /\b(galaxy|samsung)\b/i.test(t)) {
    return true;
  }
  if (/\b(garmin|polar|coros)\b/i.test(t) && !/\b(luxury|titanium|sapphire|dress|automatic|mechanical|prestige)\b/i.test(t)) {
    return true;
  }
  if (
    /\b(smartwatch|smart watch|wearable)\b/i.test(t) &&
    !/\b(automatic|mechanical|chronograph|swiss made|dress|sapphire|steel bracelet|luxury|prestige|timepiece)\b/i.test(t)
  ) {
    if (/\b(galaxy watch|apple watch|fitbit|amazfit|huawei watch|xiaomi watch)\b/i.test(t)) return true;
  }
  return false;
}

export function isLuxuryWatchListingEvidence(text: string): boolean {
  return /\b(automatic|mechanical|chronograph|swiss|dress watch|sapphire|stainless steel|timepiece|horloge|prestige|luxury|collector|complication|geneva|tourbillon|moonphase|dress|bracelet watch)\b/i.test(
    text
  );
}
