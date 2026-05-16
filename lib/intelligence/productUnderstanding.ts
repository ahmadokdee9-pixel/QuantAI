/**
 * QuantAI Product Understanding Engine v1 — listing substance, query fit, condition, and spec depth.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import {
  isSpammyListingTitle,
  isShadyGenericMarketplaceRow,
  listingSignalsRefurbished,
} from "@/lib/commerce/listingQuality";
import { queryListingRelevance01 } from "@/lib/intelligence/queryRelevance";
import { hardCategoryMismatch } from "@/lib/commerce/trayListingFilter";
import type { CommerceSearchIntents } from "@/lib/intelligence/searchIntentV2";
import type { HumanIntentProfile } from "@/lib/intelligence/humanIntentEngine";
import type { StyleQueryProfile } from "@/lib/intelligence/styleTasteProfiles";
import type { ProductCategorySlug } from "@/lib/intelligence/types";
import type { QuantAIRealityTrustLayer } from "@/lib/intelligence/realityTrustTypes";

export type ProductTitleQuality = "excellent" | "good" | "weak" | "spammy";

export type ProductCondition = "new" | "refurbished" | "used" | "unknown";

export type ProductDnaTag =
  | "premium"
  | "budget"
  | "luxury"
  | "minimalist"
  | "gamer"
  | "professional"
  | "cozy"
  | "elegant"
  | "sporty"
  | "feminine"
  | "masculine";

export type ProductUnderstanding = {
  productType: string;
  category: string;
  brand?: string;
  model?: string;
  condition: ProductCondition;
  titleQuality: ProductTitleQuality;
  /** 0–100 */
  specCompleteness: number;
  /** 0–100 higher = riskier listing */
  listingRisk: number;
  /** 0–100 */
  authenticityConfidence: number;
  /** 0–100 query ↔ listing alignment */
  matchQuality: number;
  missingCriticalDetails: string[];
  /** 0–100 holistic product-side confidence */
  productConfidence: number;
  /** 0–1 internal DNA tags for taste / human-intent bridges */
  productDna: Partial<Record<ProductDnaTag, number>>;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function clamp01(n: number): number {
  return clamp(n, 0, 1);
}

const BRAND_RX: { key: string; re: RegExp }[] = [
  { key: "Apple", re: /\bApple\b/i },
  { key: "Samsung", re: /\bSamsung\b/i },
  { key: "Sony", re: /\bSony\b/i },
  { key: "LG", re: /\bLG\b/i },
  { key: "Dell", re: /\bDell\b/i },
  { key: "HP", re: /\bHP\b|\bHewlett[\s-]?Packard\b/i },
  { key: "Lenovo", re: /\bLenovo\b/i },
  { key: "Asus", re: /\bAsus\b|\bASUS\b/i },
  { key: "Acer", re: /\bAcer\b/i },
  { key: "MSI", re: /\bMSI\b/i },
  { key: "Microsoft", re: /\bMicrosoft\b|\bSurface\b/i },
  { key: "Google", re: /\bGoogle\b|\bPixel\b/i },
  { key: "Nike", re: /\bNike\b/i },
  { key: "Adidas", re: /\bAdidas\b/i },
  { key: "Dyson", re: /\bDyson\b/i },
  { key: "Bose", re: /\bBose\b/i },
  { key: "IKEA", re: /\bIKEA\b/i },
];

function extractBrand(title: string): string | undefined {
  for (const { key, re } of BRAND_RX) {
    if (re.test(title)) return key;
  }
  return undefined;
}

function extractModelHint(title: string): string | undefined {
  const m =
    title.match(
      /\b(iPhone\s*(?:SE|Pro\s*Max|Pro|Plus|mini)?\s*\d{1,2}[a-z]?)\b/i
    )?.[1] ??
    title.match(/\b(MacBook\s+Pro|MacBook\s+Air|iPad\s+Pro|iPad\s+Air|AirPods\s+Pro?\s*\d?)\b/i)?.[1] ??
    title.match(/\b(RTX\s*\d{3,4}\s*(?:Ti|SUPER)?)\b/i)?.[1] ??
    title.match(/\b(Ryzen\s*\d[\s\w]*|Intel\s+Core\s+[\w\s-]+|M\d\s+Pro|Ultra\s*\d+)\b/i)?.[1] ??
    title.match(/\b(Galaxy\s+S\d{1,2}\s*(?:Ultra|Plus|FE)?)\b/i)?.[1];
  return m?.slice(0, 48);
}

function emojiDensity01(title: string): number {
  const em = title.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]/gu);
  if (!em?.length) return 0;
  return clamp01(em.length / Math.max(12, title.length / 25));
}

function repetitiveWordPenalty(title: string): number {
  const words = title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4);
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
  let max = 0;
  for (const n of freq.values()) max = Math.max(max, n);
  return max >= 4 ? 0.45 : max === 3 ? 0.22 : 0;
}

function fakeLuxuryNoise01(title: string): number {
  const lux = title.match(/\b(luxury|premium|designer|VIP|haute|exclusive|limited)\b/gi);
  if (!lux) return 0;
  const t = title.length;
  if (t < 28 && lux.length >= 2) return 0.55;
  if (lux.length >= 4) return 0.38;
  return 0.12;
}

function clickbait01(title: string): number {
  if (/\b(BEST|AMAZING|WOW|#1|MUST\s*SEE|HURRY|LAST\s+ONE)\b/i.test(title)) return 0.35;
  if (/\b!!!|!!!\b/.test(title)) return 0.25;
  return 0;
}

function capsNoise01(title: string): number {
  const letters = title.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 14) return 0;
  const up = (title.match(/[A-Z]/g) ?? []).length;
  return up / letters.length > 0.55 ? 0.28 : 0;
}

function classifyTitleQuality(title: string): ProductTitleQuality {
  const t = title.trim();
  if (t.length < 5 || isSpammyListingTitle(t)) return "spammy";
  const bad =
    repetitiveWordPenalty(t) +
    fakeLuxuryNoise01(t) +
    clickbait01(t) +
    capsNoise01(t) +
    emojiDensity01(t) * 0.9;
  if (bad >= 0.62) return "spammy";
  if (bad >= 0.38 || t.length < 18) return "weak";
  if (t.length >= 42 && /[a-z]/.test(t) && /\d/.test(t) && bad < 0.18) return "excellent";
  if (t.length >= 28 && bad < 0.28) return "good";
  return "weak";
}

function inferCondition(p: QuantProduct): ProductCondition {
  const blob = `${p.title} ${p.availability ?? ""} ${p.extensions.join(" ")}`.toLowerCase();
  const refurb = listingSignalsRefurbished(p);
  const explicitUsed = /\b(used|pre[-\s]?owned|second[-\s]?hand)\b/i.test(blob);
  if (explicitUsed) return "used";
  if (refurb) return "refurbished";
  if (p.title.trim().length < 6) return "unknown";
  return "new";
}

function hiddenRefurbRisk(p: QuantProduct): number {
  const refurb = listingSignalsRefurbished(p);
  const shoutsNew = /\b(new|brand new|sealed|factory sealed)\b/i.test(p.title);
  return refurb && shoutsNew ? 0.55 : 0;
}

function duplicateTitle01(title: string, list: QuantProduct[]): number {
  const n = title.toLowerCase().replace(/\s+/g, " ").trim();
  if (n.length < 12) return 0;
  let c = 0;
  for (const o of list) {
    if (o.title.toLowerCase().replace(/\s+/g, " ").trim() === n) c += 1;
  }
  return c >= 3 ? 0.35 : c === 2 ? 0.15 : 0;
}

function inferProductType(category: ProductCategorySlug, title: string): string {
  const t = title.toLowerCase();
  if (/\b(laptop|notebook|macbook)\b/i.test(t)) return "Laptop";
  if (/\b(monitor|display)\b/i.test(t)) return "Monitor";
  if (/\b(headphone|earbud|headset)\b/i.test(t)) return "Headphones";
  if (/\b(perfume|fragrance|parfum|eau de)\b/i.test(t)) return "Fragrance";
  if (/\b(sofa|couch|sectional)\b/i.test(t)) return "Sofa";
  if (/\b(chair|office chair)\b/i.test(t)) return "Chair";
  if (/\b(sneaker|trainer|shoe)\b/i.test(t)) return "Footwear";
  if (/\b(desk)\b/i.test(t)) return "Desk";
  if (category === "electronics") return "Electronics";
  if (category === "fashion") return "Fashion";
  if (category === "beauty") return "Beauty";
  if (category === "home") return "Home";
  if (category === "sports") return "Sports";
  return "Product";
}

function specCompletenessForCategory(
  category: ProductCategorySlug,
  title: string,
  extensions: string[],
  shipping: string | null,
  searchQuery: string
): { score: number; missing: string[] } {
  const blob = `${title} ${extensions.join(" ")} ${shipping ?? ""} ${searchQuery}`.toLowerCase();
  const missing: string[] = [];

  const need = (label: string, re: RegExp) => {
    if (!re.test(blob)) missing.push(label);
  };

  if (category === "electronics") {
    need("RAM / memory", /\b(\d{1,3}\s*gb\s*ram|ddr[45]|unified\s*memory|\d{1,3}\s*gb\s*memory)\b/i);
    need("Storage", /\b(\d{2,4}\s*(gb|tb)\s*(ssd|nvme|storage|emmc)|\d{2,4}\s*gb\b.*\b(ssd|storage)\b)\b/i);
    need("CPU", /\b(intel|amd|apple\s*m\d|ryzen|core\s+i\d|snapdragon)\b/i);
    const wantsGpu = /\b(gaming|rtx|gtx|gpu|graphics|laptop)\b/i.test(blob + searchQuery);
    if (wantsGpu) need("GPU", /\b(rtx|gtx|rx\s*\d|arc\b|uhd\s*graphics|iris|integrated)\b/i);
    const wantsDisplay = /\b(monitor|display|laptop|gaming|hz)\b/i.test(blob + searchQuery);
    if (wantsDisplay) need("Display / refresh", /\b(\d{2,3}\s*hz|oled|retina|qhd|uhd|4k)\b/i);
  } else if (category === "beauty") {
    need("Volume (ml)", /\b(\d{2,4}\s*ml|\d{1,2}\s*fl\.?\s*oz)\b/i);
    need("Concentration", /\b(edt|edp|parfum|eau de toilette|eau de parfum|extrait)\b/i);
    need("Gender / audience", /\b(men|women|unisex|male|female|pour homme|pour femme)\b/i);
  } else if (category === "home") {
    need("Dimensions", /\b(\d{2,4}\s*(cm|mm|m)\b|w\s*\d|h\s*\d|d\s*\d|width|height|depth)\b/i);
    need("Material", /\b(wood|metal|fabric|leather|velvet|mdf|oak|steel|linen)\b/i);
    need("Delivery / assembly hint", /\b(delivery|assembly|flat\s*pack|carrying)\b/i);
  } else if (category === "fashion") {
    need("Material / fabric", /\b(cotton|wool|polyester|leather|suede|linen|denim|mesh)\b/i);
    need("Sizing clarity", /\b(size|eu\s*\d{2}|us\s*\d{1,2}|uk\s*\d{1,2}|cm|inch)\b/i);
    need("Fit", /\b(slim|regular|relaxed|oversized|tailored|fit)\b/i);
  } else if (category === "sports" || category === "toys" || category === "general") {
    if (title.trim().length < 28) missing.push("Descriptive title");
  }

  const maxMissing = category === "electronics" ? 5 : category === "beauty" ? 3 : category === "home" ? 3 : category === "fashion" ? 3 : 2;
  const penalized = missing.slice(0, maxMissing);
  const base = category === "electronics" ? 88 : category === "beauty" ? 82 : 78;
  const per = category === "electronics" ? 14 : 16;
  const score = clamp(base - penalized.length * per, 12, 100);
  return { score, missing: penalized };
}

function styleMismatchPenalty(
  query: string,
  title: string,
  style: StyleQueryProfile,
  intents: CommerceSearchIntents
): number {
  const q = query.toLowerCase();
  const t = title.toLowerCase();
  let pen = 0;
  if (/\b(minimal|clean|scandi|white desk)\b/i.test(q) && /\b(gaming|rgb|led|battlestation)\b/i.test(t) && !/\b(gaming)\b/i.test(q)) {
    pen += 0.38;
  }
  if (intents.gaming === false && /\b(gaming|rgb|rtx)\b/i.test(t) && /\b(office|minimal|clean desk)\b/i.test(q)) {
    pen += 0.28;
  }
  const w = style.weights;
  if ((w.minimalist ?? 0) > 0.4 && /\b(gaming|aggressive|rgb)\b/i.test(t)) pen += 0.22;
  if ((w.gamer ?? 0) > 0.45 && !/\b(gaming|rtx|hz|rgb)\b/i.test(t) && /\b(laptop|pc)\b/i.test(q)) pen += 0.12;
  return clamp01(pen);
}

function buildProductDna(
  title: string,
  intents: CommerceSearchIntents,
  human: HumanIntentProfile
): Partial<Record<ProductDnaTag, number>> {
  const t = title.toLowerCase();
  const dna: Partial<Record<ProductDnaTag, number>> = {};
  const tag = intents.taste.tagStrength;
  if (/\b(premium|pro\b|ultra|studio|flagship)\b/i.test(t)) dna.premium = 0.72;
  if (/\b(budget|entry|basic|essential)\b/i.test(t)) dna.budget = 0.55;
  if ((tag.luxury ?? 0) > 0.35 || /\b(luxury|designer|haute)\b/i.test(t)) dna.luxury = clamp01(0.45 + (tag.luxury ?? 0) * 0.4);
  if ((tag.minimal ?? 0) > 0.35 || /\b(minimal|clean|scandi)\b/i.test(t)) dna.minimalist = clamp01(0.4 + (tag.minimal ?? 0) * 0.45);
  if ((tag.gamer_setup ?? 0) > 0.35 || /\b(gaming|rtx|rgb)\b/i.test(t)) dna.gamer = clamp01(0.42 + (tag.gamer_setup ?? 0) * 0.45);
  if (/\b(office|business|ergonomic|work)\b/i.test(t) || human.signals.productivity > 0.45) dna.professional = 0.55;
  if ((tag.cozy ?? 0) > 0.35 || /\b(cozy|soft|plush)\b/i.test(t)) dna.cozy = 0.5;
  if ((tag.elegant ?? 0) + (tag.classy ?? 0) > 0.35 || /\b(elegant|tailored)\b/i.test(t)) dna.elegant = 0.52;
  if ((tag.gym_aesthetic ?? 0) > 0.35 || /\b(sport|running|training)\b/i.test(t)) dna.sporty = 0.5;
  if ((tag.feminine ?? 0) > 0.35) dna.feminine = 0.48;
  if ((tag.masculine ?? 0) > 0.35) dna.masculine = 0.45;
  return dna;
}

export type BuildProductUnderstandingArgs = {
  product: QuantProduct;
  searchQuery: string;
  category: ProductCategorySlug;
  intents: CommerceSearchIntents;
  humanIntent: HumanIntentProfile;
  styleQuery: StyleQueryProfile;
  list: QuantProduct[];
  reality?: QuantAIRealityTrustLayer;
};

export function buildProductUnderstanding(args: BuildProductUnderstandingArgs): ProductUnderstanding {
  const { product: p, searchQuery, category, intents, humanIntent, styleQuery, list, reality } = args;
  const title = p.title;
  const titleQuality = classifyTitleQuality(title);
  const brand = extractBrand(title);
  const model = extractModelHint(title);
  const productType = inferProductType(category, title);
  const condition = inferCondition(p);

  const { score: specCompleteness, missing: missingCriticalDetails } = specCompletenessForCategory(
    category,
    title,
    p.extensions,
    p.shipping,
    searchQuery
  );

  let listingRisk = 22;
  if (titleQuality === "spammy") listingRisk += 38;
  else if (titleQuality === "weak") listingRisk += 18;
  listingRisk += Math.round(duplicateTitle01(title, list) * 100);
  listingRisk += hiddenRefurbRisk(p) * 42;
  if (isShadyGenericMarketplaceRow(p)) listingRisk += 16;
  if (hardCategoryMismatch(searchQuery, title)) listingRisk += 22;
  if (reality && reality.marketplaceRisk01 > 0.55) listingRisk += Math.round(reality.marketplaceRisk01 * 22);
  listingRisk = clamp(listingRisk, 5, 96);

  let authenticityConfidence = 68;
  if (condition === "refurbished" && /\b(certified|warranty|renewed|official)\b/i.test(title + p.extensions.join(" "))) {
    authenticityConfidence += 14;
  }
  if (condition === "new" && !listingSignalsRefurbished(p)) authenticityConfidence += 10;
  if (hiddenRefurbRisk(p) > 0.3) authenticityConfidence -= 22;
  if (titleQuality === "spammy") authenticityConfidence -= 26;
  if (reality?.tooGoodToBeTrue01 != null && reality.tooGoodToBeTrue01 > 0.45) authenticityConfidence -= 14;
  authenticityConfidence = clamp(authenticityConfidence, 8, 96);

  const lexical = queryListingRelevance01(searchQuery, p);
  const mismatch = styleMismatchPenalty(searchQuery, title, styleQuery, intents);
  let matchQuality = clamp(100 * (lexical * (1 - mismatch * 0.85)), 8, 98);
  if (hardCategoryMismatch(searchQuery, title)) matchQuality = clamp(matchQuality - 28, 5, 92);

  let productConfidence = Math.round(
    0.28 * (titleQuality === "excellent" ? 96 : titleQuality === "good" ? 78 : titleQuality === "weak" ? 52 : 28) +
      0.22 * specCompleteness +
      0.2 * authenticityConfidence +
      0.18 * matchQuality +
      0.12 * (100 - listingRisk)
  );
  productConfidence = clamp(productConfidence, 8, 96);

  const productDna = buildProductDna(title, intents, humanIntent);

  return {
    productType,
    category,
    brand,
    model,
    condition,
    titleQuality,
    specCompleteness,
    listingRisk,
    authenticityConfidence,
    matchQuality: Math.round(matchQuality),
    missingCriticalDetails,
    productConfidence,
    productDna,
  };
}

/** Bounded composite shift from product understanding (tray ranking). */
export function productUnderstandingRankNudge(u: ProductUnderstanding): number {
  let d = 0;
  d += (u.productConfidence - 58) * 0.045;
  d += (u.matchQuality - 62) * 0.035;
  d += (u.specCompleteness - 65) * 0.028;
  d -= (u.listingRisk - 35) * 0.04;
  if (u.titleQuality === "excellent") d += 1.1;
  if (u.titleQuality === "spammy") d -= 3.2;
  if (u.titleQuality === "weak") d -= 1.2;
  if (u.authenticityConfidence < 48) d -= 1.4;
  return clamp(d, -4.2, 3.8);
}
