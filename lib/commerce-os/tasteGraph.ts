/**
 * QuantAI Taste Graph — stable aesthetic / emotional commerce tags from language + listing text.
 * Tray-local heuristics only; no ML contract.
 */

import type { QuantProduct } from "@/lib/shoppingScore";

type CommerceCategorySlug = "electronics" | "fashion" | "home" | "beauty" | "sports" | "toys" | "general";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Stable ids exposed in universalCommerce + internal ranking. */
export const TASTE_TAXONOMY = [
  "luxury",
  "quiet_luxury",
  "feminine",
  "masculine",
  "minimal",
  "cozy",
  "premium_perception",
  "gym_aesthetic",
  "dark_aesthetic",
  "clean_aesthetic",
  "expensive_looking",
  "soft_luxury",
  "streetwear",
  "gamer_setup",
  "elegant",
  "classy",
  "rich_smelling",
  "niche_fragrance",
  "loud_luxury",
  "futuristic",
  "mature",
  "sensual",
  "old_money",
] as const;

export type TasteTagId = (typeof TASTE_TAXONOMY)[number];

export type TasteEmotionalBand = "calm" | "bold" | "playful" | "neutral";

export type TasteGraphSignals = {
  /** 0–1 per detected tag (query-side). */
  tagStrength: Partial<Record<TasteTagId, number>>;
  /** Top tags by strength for fast checks. */
  dominantTags: TasteTagId[];
  band: TasteEmotionalBand;
  /** User expects premium / expensive visual or brand feel. */
  visualPremiumExpect01: number;
  /** Perfume / scent richness or niche intent. */
  olfactoryRichIntent01: number;
  /** Any taste node fired beyond noise. */
  hasTasteLayer: boolean;
};

type TagRule = { id: TasteTagId; patterns: RegExp[]; weight: number };

const TAG_RULES: readonly TagRule[] = [
  {
    id: "quiet_luxury",
    weight: 1,
    patterns: [/\bquiet\s+luxury\b/i, /\bstealth\s+wealth\b/i, /\bunderstated\s+luxury\b/i],
  },
  {
    id: "old_money",
    weight: 0.95,
    patterns: [/\bold\s+money\b/i, /\bheritage\s+(brand|house)\b/i, /\bpreppy\s+luxury\b/i],
  },
  {
    id: "luxury",
    weight: 1,
    patterns: [
      /\b(luxury|luxe|haute|designer|boutique)\b/i,
      /\blimited\s+edition\b/i,
      /\bcollector'?s?\b/i,
    ],
  },
  {
    id: "feminine",
    weight: 1,
    patterns: [
      /\b(feminine|for\s+her|women'?s|womens|lad(y|ies)|wife|girlfriend|mother'?s)\b/i,
      /\bclean\s+girl\b/i,
      /\bsoft\s+girl\b/i,
    ],
  },
  {
    id: "masculine",
    weight: 1,
    patterns: [/\b(masculine|for\s+him|men'?s|mens|husband|boyfriend|dad|father'?s)\b/i, /\bdad\s+scent\b/i],
  },
  {
    id: "minimal",
    weight: 1,
    patterns: [
      /\b(minimal|minimalist|clean\s+lines|monochrome|less\s+is\s+more|japandi|scandi)\b/i,
      /\bno[\s-]?makeup\s+makeup\b/i,
    ],
  },
  {
    id: "cozy",
    weight: 1,
    patterns: [/\b(cozy|cosy|hygge|warm\s+aesthetic|soft\s+textures|snug)\b/i, /\bcomfy\s+vibes\b/i],
  },
  {
    id: "premium_perception",
    weight: 0.9,
    patterns: [/\b(premium\s+feel|premium\s+vibe|high.end\s+look|upscale\s+look)\b/i, /\bflagship\s+vibes?\b/i],
  },
  {
    id: "gym_aesthetic",
    weight: 1,
    patterns: [
      /\b(gym\s+aesthetic|athleisure|that\s+girl\s+gym|workout\s+aesthetic|fitness\s+aesthetic)\b/i,
      /\b(gym\s+outfit|yoga\s+look)\b/i,
    ],
  },
  {
    id: "dark_aesthetic",
    weight: 1,
    patterns: [/\b(dark\s+aesthetic|matte\s+black|all\s+black\s+setup|blackout\s+setup)\b/i, /\bgothic\s+lite\b/i],
  },
  {
    id: "clean_aesthetic",
    weight: 1,
    patterns: [
      /\b(clean\s+aesthetic|clean\s+setup|clean\s+desk)\b/i,
      /\b(clean\s+makeup|minimal\s+makeup)\b/i,
    ],
  },
  {
    id: "expensive_looking",
    weight: 1,
    patterns: [
      /\b(looks?\s+expensive|expensive[\s-]?looking|looks?\s+designer|looks?\s+rich|bougie\s+on\s+a\s+budget)\b/i,
      /\b(bag|watch|shoes?)\s+that\s+looks?\s+expensive\b/i,
    ],
  },
  {
    id: "soft_luxury",
    weight: 1,
    patterns: [/\b(soft\s+luxury|creamy\s+luxury|cashmere\s+vibe|plush\s+luxury)\b/i],
  },
  {
    id: "streetwear",
    weight: 1,
    patterns: [/\b(streetwear|hype(beast)?|sneakerhead|urban\s+wear|drip)\b/i],
  },
  {
    id: "gamer_setup",
    weight: 1,
    patterns: [/\b(gamer\s+setup|rgb\s+setup|battlestation|gaming\s+desk)\b/i, /\besports\s+setup\b/i],
  },
  {
    id: "elegant",
    weight: 1,
    patterns: [/\b(elegant|chic|sophisticated\s+look|refined\s+look)\b/i],
  },
  {
    id: "classy",
    weight: 1,
    patterns: [/\b(classy|timeless|tasteful|polished)\b/i],
  },
  {
    id: "rich_smelling",
    weight: 1,
    patterns: [
      /\b(smells?\s+rich|rich[\s-]?smelling|expensive\s+smell|smells?\s+expensive|luxury\s+scent\s+dna)\b/i,
      /\bperfume\s+that\s+smells\s+(rich|expensive|luxury)\b/i,
    ],
  },
  {
    id: "niche_fragrance",
    weight: 1,
    patterns: [/\b(niche\s+(fragrance|perfume)|indie\s+perfume|artisan\s+(fragrance|scent))\b/i, /\bhouse\s+niche\b/i],
  },
  {
    id: "loud_luxury",
    weight: 1,
    patterns: [/\b(loud\s+luxury|logo\s+mania|statement\s+luxury|flex\s+piece)\b/i],
  },
  {
    id: "futuristic",
    weight: 1,
    patterns: [/\b(futuristic|cyber(punk)?\s+aesthetic|sci[\s-]?fi\s+look|techwear)\b/i],
  },
  {
    id: "mature",
    weight: 0.85,
    patterns: [/\b(mature\s+scent|grown\s+woman|grown\s+man|sophisticated\s+adult)\b/i],
  },
  {
    id: "sensual",
    weight: 0.85,
    patterns: [/\b(sexy\s+scent|seductive|date\s+night\s+perfume|alluring)\b/i],
  },
];

/** Title / listing blob hints for tray-relative aesthetic alignment. */
const TITLE_HINTS: Partial<Record<TasteTagId, RegExp[]>> = {
  luxury: [/\b(luxury|luxe|haute|designer|boutique|limited)\b/i],
  quiet_luxury: [/\b(heritage|quiet|understated|stealth|linen|cashmere|wool\s+silk)\b/i],
  old_money: [/\b(heritage|tweed|loafer|pearl|classic\s+cut)\b/i],
  feminine: [/\b(women|womens|lady|ladies|her|she|eau\s+de|parfum|floral|rose|peony)\b/i],
  masculine: [/\b(men|mens|him|he|cologne|oud|woody|leather)\b/i],
  minimal: [/\b(minimal|minimalist|slim|thin|matte\s+silver|space\s*grey|monochrome)\b/i],
  cozy: [/\b(cozy|soft|plush|velvet|fleece|warm|hygge|chunky\s+knit)\b/i],
  premium_perception: [/\b(premium|flagship|pro\b|studio|oled|titanium|ceramic)\b/i],
  gym_aesthetic: [/\b(gym|fitness|athletic|training|yoga|sport|compression|runner)\b/i],
  dark_aesthetic: [/\b(blackout|matte\s+black|midnight|carbon|obsidian|stealth)\b/i],
  clean_aesthetic: [/\b(clean|pure|fresh|white\s+case|nude\s+shade|no\s+makeup)\b/i],
  expensive_looking: [/\b(designer|boutique|handcrafted|18k|gold\s+plated|saffiano|grained\s+leather)\b/i],
  soft_luxury: [/\b(cashmere|silk|satin|velvet|luxe\s+soft)\b/i],
  streetwear: [/\b(street|hype|sneaker|jordan|yeezy|hoodie|cargo|graphic\s+tee)\b/i],
  gamer_setup: [/\b(gaming|rgb|mechanical\s+keyboard|esports|rtx|geforce|steam)\b/i],
  elegant: [/\b(elegant|chic|evening|cocktail|satin\s+gown|tailored)\b/i],
  classy: [/\b(classic|timeless|heritage|refined|tailored|pearl)\b/i],
  rich_smelling: [/\b(par|perfume|eau|fragrance|oud|amber|saffron|niche|extrait)\b/i],
  niche_fragrance: [/\b(niche|artisan|house|extrait|attar|single\s+note)\b/i],
  loud_luxury: [/\b(monogram|logo|statement|limited|collab|hype)\b/i],
  futuristic: [/\b(cyber|futuristic|rgb|magnetic|wireless\s+charging|oled|spatial)\b/i],
  mature: [/\b(mature|sophisticated|vintage|classic\s+scent)\b/i],
  sensual: [/\b(seductive|amber|vanilla\s+musk|night|intense)\b/i],
};

export function extractTasteGraphSignals(intentEnvelope: string, rawQuery: string): TasteGraphSignals {
  const s = intentEnvelope.toLowerCase();
  const tagStrength: Partial<Record<TasteTagId, number>> = {};

  for (const rule of TAG_RULES) {
    let hits = 0;
    for (const re of rule.patterns) {
      if (re.test(s) || re.test(rawQuery)) hits += 1;
    }
    if (hits > 0) {
      tagStrength[rule.id] = clamp01(0.42 + Math.min(3, hits) * 0.18 * rule.weight);
    }
  }

  const dominantTags = (Object.entries(tagStrength) as [TasteTagId, number][])
    .filter(([, v]) => v >= 0.4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => k);

  const vLux = Math.max(
    tagStrength.luxury ?? 0,
    tagStrength.quiet_luxury ?? 0,
    tagStrength.old_money ?? 0,
    tagStrength.loud_luxury ?? 0,
    tagStrength.soft_luxury ?? 0,
    tagStrength.premium_perception ?? 0,
    tagStrength.expensive_looking ?? 0
  );
  const vOlf = Math.max(tagStrength.rich_smelling ?? 0, tagStrength.niche_fragrance ?? 0, tagStrength.sensual ?? 0);

  let band: TasteEmotionalBand = "neutral";
  if (
    (tagStrength.loud_luxury ?? 0) >= 0.5 ||
    (tagStrength.streetwear ?? 0) >= 0.5 ||
    (tagStrength.gamer_setup ?? 0) >= 0.5 ||
    (tagStrength.futuristic ?? 0) >= 0.55
  ) {
    band = "bold";
  } else if (
    (tagStrength.cozy ?? 0) >= 0.45 ||
    (tagStrength.quiet_luxury ?? 0) >= 0.45 ||
    (tagStrength.minimal ?? 0) >= 0.5 ||
    (tagStrength.clean_aesthetic ?? 0) >= 0.45
  ) {
    band = "calm";
  } else if ((tagStrength.gym_aesthetic ?? 0) >= 0.5 || (tagStrength.sensual ?? 0) >= 0.45) {
    band = "playful";
  }

  const hasTasteLayer = dominantTags.length > 0;

  return {
    tagStrength,
    dominantTags,
    band,
    visualPremiumExpect01: clamp01(vLux),
    olfactoryRichIntent01: clamp01(vOlf),
    hasTasteLayer,
  };
}

export function tasteProductAlignment01(p: QuantProduct, taste: TasteGraphSignals): number {
  if (!taste.hasTasteLayer) return 0;
  const blob = `${p.title} ${p.extensions.join(" ")}`.toLowerCase();
  let num = 0;
  let den = 0;
  for (const id of taste.dominantTags) {
    const w = taste.tagStrength[id] ?? 0.5;
    den += w;
    const hints = TITLE_HINTS[id];
    if (!hints) continue;
    if (hints.some((re) => re.test(blob))) num += w;
  }
  if (den <= 0) return 0;
  return clamp01((num / den) * 1.12);
}

/**
 * Bounded composite lift from taste match (per listing). Product alignment is critical to avoid blind boosts.
 */
export function tasteCompositeLift(
  taste: TasteGraphSignals,
  category: CommerceCategorySlug,
  trustNorm: number,
  productAlignment01: number,
  priceVsMedian?: number
): number {
  if (!taste.hasTasteLayer) return 0;
  const a = clamp01(productAlignment01);
  if (a < 0.14) return 0;

  let lift = 0.018 * a;
  const trustGate = trustNorm >= 0.62 ? 1 : trustNorm >= 0.52 ? 0.72 : 0.45;

  if (taste.visualPremiumExpect01 >= 0.45 && (category === "fashion" || category === "beauty" || category === "electronics")) {
    lift += 0.012 * taste.visualPremiumExpect01 * a * trustGate;
  }
  if (taste.olfactoryRichIntent01 >= 0.45 && (category === "beauty" || category === "fashion")) {
    lift += 0.014 * taste.olfactoryRichIntent01 * a * trustGate;
  }
  if ((taste.tagStrength.quiet_luxury ?? 0) >= 0.5 || (taste.tagStrength.old_money ?? 0) >= 0.45) {
    lift += 0.01 * a * (trustNorm >= 0.7 ? 1 : 0.75);
  }
  if ((taste.tagStrength.gamer_setup ?? 0) >= 0.5 && category === "electronics") {
    lift += 0.012 * a;
  }
  if ((taste.tagStrength.clean_aesthetic ?? 0) >= 0.45 && (category === "electronics" || category === "home" || category === "beauty")) {
    lift += 0.009 * a;
  }
  if ((taste.tagStrength.expensive_looking ?? 0) >= 0.45 && priceVsMedian != null && priceVsMedian > 0) {
    lift += 0.008 * a * Math.min(1, priceVsMedian * 4);
  }
  if ((taste.tagStrength.streetwear ?? 0) >= 0.45 && category === "fashion") {
    lift += 0.009 * a;
  }

  return Math.min(0.052, lift * trustGate);
}

export function tasteTagListForApi(taste: TasteGraphSignals): string[] {
  return [...taste.dominantTags];
}
