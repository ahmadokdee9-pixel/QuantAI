/**
 * QuantAI Human Intent Psychology — query-level signals for ranking + consensus voice.
 */

import type { CommerceSearchIntents } from "./searchIntentV2";

export type HumanIntentSignals = {
  impulse: number;
  statusLuxury: number;
  comfortSeeking: number;
  budgetAnxiety: number;
  fomo: number;
  gifting: number;
  productivity: number;
  aestheticTaste: number;
  safePractical: number;
  emotionalReward: number;
};

export type HumanIntentProfile = {
  emotionalWeight: number;
  practicalityWeight: number;
  urgencySensitivity: number;
  luxuryPreference: number;
  giftingLikelihood: number;
  aestheticSensitivity: number;
  riskTolerance: number;
  signals: HumanIntentSignals;
  /** Short stable buyer sketches (ranking + copy). */
  likelyBuyerArchetypes: string[];
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

const ARCH_RX: { id: string; re: RegExp }[] = [
  { id: "student", re: /\b(student|uni|university|college|dorm|school)\b/i },
  { id: "gamer", re: /\b(gaming|gamer|rtx|esports|steam|ps5|xbox|nintendo)\b/i },
  { id: "luxury shopper", re: /\b(luxury|designer|haute|boutique|prestige)\b/i },
  { id: "practical buyer", re: /\b(reliable|practical|durable|sensible|no.?frills|workhorse)\b/i },
  { id: "fashion-first buyer", re: /\b(stylish|outfit|aesthetic|look|trend|runway)\b/i },
  { id: "family buyer", re: /\b(family|kids|parent|toddler|baby|household)\b/i },
  { id: "collector", re: /\b(collect|limited edition|numbered|rare\b|grail)\b/i },
  { id: "tech enthusiast", re: /\b(spec|benchmark|ghz|oled|hdr|latency|fps|overclock)\b/i },
  { id: "casual user", re: /\b(simple|easy|everyday|basic needs|not power user)\b/i },
];

export function buildHumanIntentProfile(
  query: string,
  intents: CommerceSearchIntents
): HumanIntentProfile {
  const q = query.toLowerCase().replace(/\s+/g, " ").trim();
  const t = intents.taste.tagStrength;

  const statusLuxury = clamp01(
    (intents.luxury || intents.quietLuxury ? 0.5 : 0.08) +
      ((t.luxury ?? 0) + (t.quiet_luxury ?? 0)) * 0.35 +
      (/\b(status|statement piece|impress)\b/i.test(q) ? 0.28 : 0)
  );

  const signals: HumanIntentSignals = {
    impulse: clamp01(
      (intents.buyNowUrgency ? 0.55 : 0.12) +
        (/\b(impulse|right now|tonight|before it|last one)\b/i.test(q) ? 0.35 : 0)
    ),
    statusLuxury,
    comfortSeeking: clamp01(
      (/\b(comfort|cozy|soft|relax|lounge|ergonomic|pain)\b/i.test(q) ? 0.62 : 0.15) +
        (intents.deliveryCare ? 0.08 : 0)
    ),
    budgetAnxiety: clamp01(
      (intents.budget && intents.qualitySeeking ? 0.72 : 0) +
        (intents.budget ? 0.38 : 0.1) +
        (/\b(cheap but|affordable|without breaking|nervous about price)\b/i.test(q) ? 0.25 : 0)
    ),
    fomo: clamp01(
      (/\b(limited|selling fast|almost gone|trending|viral|hype)\b/i.test(q) ? 0.55 : 0.1) +
        (intents.dealHunter ? 0.12 : 0)
    ),
    gifting: clamp01(
      (intents.giftUse ? 0.62 : 0.1) +
        (/\b(gift|present|for (her|him|wife|husband|girlfriend|boyfriend|mom|dad))\b/i.test(q) ? 0.45 : 0)
    ),
    productivity: clamp01(
      (intents.productivity ? 0.55 : 0.1) +
        (/\b(work|office|wfh|focus|deadline|efficient)\b/i.test(q) ? 0.35 : 0)
    ),
    aestheticTaste: clamp01(
      (intents.aestheticPremium || intents.taste.hasTasteLayer ? 0.48 : 0.12) +
        (/\b(minimal|clean|aesthetic|scandi|monochrome)\b/i.test(q) ? 0.38 : 0) +
        ((t.minimal ?? 0) + (t.clean_aesthetic ?? 0) + (t.expensive_looking ?? 0)) * 0.12
    ),
    safePractical: clamp01(
      (intents.qualitySeeking && intents.riskAvoidance ? 0.55 : 0) +
        (intents.trustedOnly || intents.cheapestTrusted ? 0.28 : 0) +
        (/\b(safe|sensible|boring but|boring is good)\b/i.test(q) ? 0.22 : 0)
    ),
    emotionalReward: clamp01(
      (/\b(treat myself|reward|deserve|splurge|feel good)\b/i.test(q) ? 0.55 : 0.12) +
        (statusLuxury > 0.45 ? 0.2 : 0)
    ),
  };

  const emotionalWeight = clamp01(
    0.22 +
      signals.statusLuxury * 0.18 +
      signals.gifting * 0.14 +
      signals.aestheticTaste * 0.12 +
      signals.emotionalReward * 0.16 +
      signals.fomo * 0.1 -
      signals.safePractical * 0.12
  );
  const practicalityWeight = clamp01(
    0.35 +
      signals.productivity * 0.14 +
      signals.safePractical * 0.2 +
      signals.budgetAnxiety * 0.08 +
      signals.comfortSeeking * 0.08 -
      signals.impulse * 0.1 -
      signals.fomo * 0.06
  );
  const urgencySensitivity = clamp01(
    0.25 + signals.fomo * 0.28 + signals.impulse * 0.22 + (intents.buyNowUrgency ? 0.22 : 0) - signals.safePractical * 0.12
  );
  const luxuryPreference = clamp01(
    0.15 + signals.statusLuxury * 0.35 + (intents.premium ? 0.28 : 0) + (intents.luxury ? 0.22 : 0)
  );
  const giftingLikelihood = clamp01(0.12 + signals.gifting * 0.55 + (intents.giftUse ? 0.25 : 0));
  const aestheticSensitivity = clamp01(0.18 + signals.aestheticTaste * 0.45 + (intents.aestheticPremium ? 0.22 : 0));
  const riskTolerance = clamp01(
    0.45 +
      (intents.riskAvoidance ? -0.28 : 0.12) +
      (intents.trustedOnly ? -0.15 : 0.08) +
      signals.impulse * 0.12 -
      signals.budgetAnxiety * 0.1
  );

  const likelyBuyerArchetypes: string[] = [];
  for (const { id, re } of ARCH_RX) {
    if (re.test(q)) likelyBuyerArchetypes.push(id);
  }
  if (intents.schoolUse && !likelyBuyerArchetypes.includes("student")) likelyBuyerArchetypes.push("student");
  if (intents.gaming && !likelyBuyerArchetypes.includes("gamer")) likelyBuyerArchetypes.push("gamer");
  if (intents.giftUse && !likelyBuyerArchetypes.includes("family buyer")) likelyBuyerArchetypes.unshift("gifting occasion");
  if (likelyBuyerArchetypes.length > 5) likelyBuyerArchetypes.length = 5;

  return {
    emotionalWeight,
    practicalityWeight,
    urgencySensitivity,
    luxuryPreference,
    giftingLikelihood,
    aestheticSensitivity,
    riskTolerance,
    signals,
    likelyBuyerArchetypes,
  };
}

/** Tray-neutral fallback when enrichment has not attached a profile yet. */
export const DEFAULT_HUMAN_INTENT_PROFILE: HumanIntentProfile = {
  emotionalWeight: 0.38,
  practicalityWeight: 0.48,
  urgencySensitivity: 0.35,
  luxuryPreference: 0.22,
  giftingLikelihood: 0.18,
  aestheticSensitivity: 0.28,
  riskTolerance: 0.5,
  signals: {
    impulse: 0.15,
    statusLuxury: 0.12,
    comfortSeeking: 0.2,
    budgetAnxiety: 0.22,
    fomo: 0.15,
    gifting: 0.12,
    productivity: 0.2,
    aestheticTaste: 0.18,
    safePractical: 0.35,
    emotionalReward: 0.15,
  },
  likelyBuyerArchetypes: [],
};
