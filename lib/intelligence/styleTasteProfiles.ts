/**
 * Style & taste awareness — query + listing alignment for ranking nudges.
 */

import type { CommerceSearchIntents } from "./searchIntentV2";
import type { QuantProduct } from "@/lib/shoppingScore";
import { ratingValue } from "@/lib/shoppingScore";
import type { ProductCategorySlug } from "./types";
import type { HumanIntentProfile } from "./humanIntentEngine";

export type StyleTasteTag =
  | "minimalist"
  | "luxury"
  | "sporty"
  | "elegant"
  | "streetwear"
  | "cozy"
  | "professional"
  | "premium_tech"
  | "feminine"
  | "masculine"
  | "scandinavian"
  | "gamer"
  | "modern_clean";

export type StyleQueryProfile = {
  weights: Partial<Record<StyleTasteTag, number>>;
  dominant: StyleTasteTag[];
};

const TAG_RULES: { tag: StyleTasteTag; re: RegExp }[] = [
  { tag: "minimalist", re: /\b(minimal|clean lines|bare|simple|monochrome|less is)\b/i },
  { tag: "luxury", re: /\b(luxury|designer|haute|prestige|statement)\b/i },
  { tag: "sporty", re: /\b(sport|athletic|gym|running|training|performance fabric)\b/i },
  { tag: "elegant", re: /\b(elegant|refined|tailored|timeless|classic)\b/i },
  { tag: "streetwear", re: /\b(streetwear|urban|hype|drop|sneakerhead)\b/i },
  { tag: "cozy", re: /\b(cozy|soft|warm|hygge|lounge|plush)\b/i },
  { tag: "professional", re: /\b(professional|office|business|boardroom|workplace)\b/i },
  { tag: "premium_tech", re: /\b(premium tech|flagship|pro max|studio display|reference)\b/i },
  { tag: "feminine", re: /\b(feminine|for her|women|ladies|wife|girlfriend)\b/i },
  { tag: "masculine", re: /\b(masculine|for him|men|mens|husband|boyfriend)\b/i },
  { tag: "scandinavian", re: /\b(scandi|scandinavian|nordic|ikea adjacent)\b/i },
  { tag: "gamer", re: /\b(gaming|gamer|rgb|esports)\b/i },
  { tag: "modern_clean", re: /\b(modern|sleek|contemporary|streamlined)\b/i },
];

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Query-side style vector from language + taste graph. */
export function inferQueryStyleProfile(query: string, intents: CommerceSearchIntents): StyleQueryProfile {
  const q = query.toLowerCase();
  const weights: Partial<Record<StyleTasteTag, number>> = {};
  const t = intents.taste.tagStrength;

  const bump = (tag: StyleTasteTag, v: number) => {
    weights[tag] = clamp((weights[tag] ?? 0) + v, 0, 1);
  };

  for (const { tag, re } of TAG_RULES) {
    if (re.test(q)) bump(tag, 0.55);
  }

  if ((t.minimal ?? 0) >= 0.35 || intents.minimalistStyle) bump("minimalist", 0.45 + (t.minimal ?? 0) * 0.35);
  if ((t.luxury ?? 0) + (t.quiet_luxury ?? 0) + (t.soft_luxury ?? 0) > 0.4) bump("luxury", 0.42);
  if ((t.streetwear ?? 0) >= 0.35) bump("streetwear", 0.5 + (t.streetwear ?? 0) * 0.3);
  if ((t.elegant ?? 0) + (t.classy ?? 0) > 0.35) bump("elegant", 0.45);
  if ((t.cozy ?? 0) >= 0.35) bump("cozy", 0.48);
  if ((t.gamer_setup ?? 0) >= 0.35 || intents.gaming) bump("gamer", 0.55);
  if ((t.feminine ?? 0) >= 0.35 || intents.feminineStyle) bump("feminine", 0.48);
  if ((t.masculine ?? 0) >= 0.35) bump("masculine", 0.42);
  if ((t.clean_aesthetic ?? 0) >= 0.4) bump("modern_clean", 0.4 + (t.clean_aesthetic ?? 0) * 0.25);
  if (intents.productivity && /\b(desk|monitor|keyboard|office chair)\b/i.test(q)) bump("professional", 0.35);
  if (intents.premium && (/\b(headphone|laptop|phone|tablet)\b/i.test(q) || intents.gaming)) bump("premium_tech", 0.38);

  const dominant = (Object.entries(weights) as [StyleTasteTag, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => k);

  return { weights, dominant };
}

function titleHints(title: string, store: string): Set<StyleTasteTag> {
  const s = `${title} ${store}`.toLowerCase();
  const out = new Set<StyleTasteTag>();
  for (const { tag, re } of TAG_RULES) {
    if (re.test(s)) out.add(tag);
  }
  if (/apple|samsung|sony|bose|dyson|logitech|razer|corsair|steelseries/i.test(s)) out.add("premium_tech");
  if (/nike|adidas|puma|under armour|new balance|asics/i.test(s)) out.add("sporty");
  if (/zara|cos|arket|uniqlo|muji/i.test(s)) out.add("minimalist");
  return out;
}

/**
 * Bounded composite nudge from aesthetic match + style consistency with query intent.
 */
export function productStyleCompositeNudge(
  p: QuantProduct,
  profile: StyleQueryProfile,
  category: ProductCategorySlug,
  human: HumanIntentProfile
): number {
  const hints = titleHints(p.title, p.store);
  let match = 0;
  let wsum = 0;
  for (const [tag, w] of Object.entries(profile.weights) as [StyleTasteTag, number][]) {
    if (w <= 0.08) continue;
    wsum += w;
    if (hints.has(tag)) match += w;
  }
  const align01 = wsum > 0 ? match / wsum : 0;
  let nudge = (align01 - 0.35) * 4.2;

  const catBoost =
    category === "fashion" || category === "beauty"
      ? 0.35 + human.aestheticSensitivity * 0.9
      : category === "home"
        ? 0.22 + human.signals.comfortSeeking * 0.5
        : category === "electronics"
          ? 0.15 + human.signals.productivity * 0.35
          : 0.12;

  nudge *= catBoost;

  if (human.aestheticSensitivity >= 0.55 && align01 < 0.22) nudge -= 1.1;

  const stars = ratingValue(p.rating);
  if (stars >= 4.35 && align01 >= 0.45) nudge += 0.45;

  return clamp(nudge, -2.8, 2.8);
}
