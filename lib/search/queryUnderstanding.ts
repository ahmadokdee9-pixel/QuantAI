/**
 * QuantAI Semantic Search Brain v1 — compact human-commerce query understanding.
 * Search-only layer: meaning, intent, style, budget, purpose, and Arabic/English mixed language.
 */

import { fixCommonCommerceTypos } from "@/lib/search/conversationalQueryLayer";
import {
  arabicIntentGlossTokens,
  latinSkeletonForMatching,
  normalizeEasternDigitsInString,
} from "@/lib/search/queryScriptNormalize";

export type SemanticProductCategory =
  | "shoes"
  | "phone"
  | "laptop"
  | "audio"
  | "furniture"
  | "fragrance"
  | "watch"
  | "desk_setup"
  | "fashion"
  | "beauty"
  | "home"
  | "electronics"
  | "unknown";

export type SemanticAestheticDirection =
  | "minimal_clean"
  | "premium_luxury"
  | "sporty"
  | "cozy_home"
  | "bold_statement"
  | "neutral";

export type SemanticQueryUnderstanding = {
  raw: string;
  rewritten: string;
  envelope: string;
  languages: ("arabic" | "english")[];
  productCategory: SemanticProductCategory;
  productPurpose: string[];
  styleIntent: string[];
  budgetIntent01: number;
  premiumIntent01: number;
  urgency01: number;
  emotionalIntent01: number;
  aestheticDirection: SemanticAestheticDirection;
  usageContext: string[];
  alternativeIntent: {
    active: boolean;
    anchor: string;
    cheaper: boolean;
  };
  qualityExpectation: "cheap" | "value" | "premium" | "luxury" | "balanced";
  semanticKeywords: string[];
};

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

function uniq(xs: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of xs) {
    const t = x.trim().toLowerCase();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function detectLanguages(raw: string): ("arabic" | "english")[] {
  const out: ("arabic" | "english")[] = [];
  if (/[\u0600-\u06FF]/.test(raw)) out.push("arabic");
  if (/[a-z]/i.test(raw)) out.push("english");
  return out.length ? out : ["english"];
}

function buildEnvelope(raw: string): string {
  const fixed = fixCommonCommerceTypos(normalizeEasternDigitsInString(raw));
  const gloss = arabicIntentGlossTokens(fixed);
  const latin = latinSkeletonForMatching(fixed);
  return `${fixed} ${latin} ${gloss}`
    .toLowerCase()
    .replace(/[^\p{L}\p{N}€$£\s+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(s: string, rx: RegExp): boolean {
  return rx.test(s);
}

function detectCategory(s: string): SemanticProductCategory {
  if (hasAny(s, /\b(yeezy|jordan|dunk|air force|samba|gazelle|adidas|nike|sneakers?|trainers?|shoes?|boots?|بوط|حذاء)\b/i)) return "shoes";
  if (hasAny(s, /(iphone|ايفون|آيفون|\bgalaxy\b|\bpixel\b|\bphone\b|\bsmartphone\b|هاتف|جوال|موبايل)/i)) return "phone";
  if (hasAny(s, /\b(laptop|notebook|macbook|thinkpad|لابتوب)\b/i)) return "laptop";
  if (hasAny(s, /\b(headphones?|earbuds?|airpods?|bose|سماعات?)\b/i)) return "audio";
  if (hasAny(s, /\b(clean desk|minimal desk|desk setup|workspace)\b/i)) return "desk_setup";
  if (hasAny(s, /\b(sofa|sofa bed|sectional|loveseat|settee|couch|corner sofa|recliner|chaise|hoekbank|bankstel|loungebank|fauteuil|chair|stoel|desk|table|tafel|garden table|tuin tafel|tuinmeubel|loungeset|furniture|meubel|meubels|كنبة|طاولة|اثاث|أثاث)\b/i)) return "furniture";
  if (hasAny(s, /\b(perfume|fragrance|parfum|cologne|eau de parfum|eau de toilette|aftershave|عطر)\b/i)) return "fragrance";
  if (hasAny(s, /\b(watch|smartwatch|ساعة)\b/i)) return "watch";
  if (hasAny(s, /\b(makeup|skincare|beauty|serum|cream|cosmetic|verzorging)\b/i)) return "beauty";
  if (hasAny(s, /\b(jacket|winter jacket|jas|winterjas|coat|dress|hoodie|shirt|fashion|outfit|kleding|ملابس|جاكيت)\b/i)) return "fashion";
  if (hasAny(s, /\b(coffee machine|espresso machine|koffiezetapparaat|koffiemachine|air fryer|vacuum|stofzuiger|blender|microwave|baby stroller|stroller|pram|buggy|kinderwagen|home|kitchen|bedroom|living room|decor|appliance|apparaat|keuken|عربة\s+اطفال|عربة\s+أطفال)\b/i)) return "home";
  if (hasAny(s, /\b(gpu|gaming monitor|monitor|beeldscherm|scherm|tv|camera|tablet|console|electronics?|elektronica)\b/i)) return "electronics";
  return "unknown";
}

function detectAesthetic(s: string): SemanticAestheticDirection {
  if (hasAny(s, /\b(clean|minimal|minimalist|simple|scandi|monochrome|هادئ|بسيط)\b/i)) return "minimal_clean";
  if (hasAny(s, /\b(premium looking|luxury feel|luxury|fancy|expensive look|quiet luxury|فخم|فاخر)\b/i)) return "premium_luxury";
  if (hasAny(s, /\b(sporty|gym|running|streetwear|athletic|رياضي)\b/i)) return "sporty";
  if (hasAny(s, /\b(cozy|soft|warm|living room|comfortable|مريح)\b/i)) return "cozy_home";
  if (hasAny(s, /\b(bold|statement|colorful|rgb|loud|viral)\b/i)) return "bold_statement";
  return "neutral";
}

function detectStyles(s: string, aesthetic: SemanticAestheticDirection): string[] {
  const styles: string[] = [];
  if (aesthetic !== "neutral") styles.push(aesthetic);
  if (hasAny(s, /\b(premium looking|luxury feel|expensive look|فخم|فاخر)\b/i)) styles.push("premium_look");
  if (hasAny(s, /\b(clean|minimal|minimalist|desk setup)\b/i)) styles.push("clean_minimal");
  if (hasAny(s, /\b(streetwear|yeezy|jordan|sneakerhead)\b/i)) styles.push("streetwear");
  if (hasAny(s, /\b(ثابت|long lasting|lasts long|projection|sillage)\b/i)) styles.push("long_lasting");
  if (hasAny(s, /\b(cheap but good|cheap but premium|budget luxury|ارخص|أرخص)\b/i)) styles.push("budget_premium_balance");
  return uniq(styles);
}

function detectUsageContext(s: string): string[] {
  const ctx: string[] = [];
  if (hasAny(s, /\b(gaming|gamer|rtx|playstation|xbox|قيمنق|جيمنق|ألعاب)\b/i)) ctx.push("gaming");
  if (hasAny(s, /\b(work|office|productivity|business|wfh)\b/i)) ctx.push("work");
  if (hasAny(s, /\b(student|school|college|university|جامعة|مدرسة)\b/i)) ctx.push("student");
  if (hasAny(s, /\b(travel|commute|portable|not heavy|lightweight|خفيف)\b/i)) ctx.push("travel");
  if (hasAny(s, /\b(home|living room|bedroom|desk|بيت|غرفة)\b/i)) ctx.push("home");
  if (hasAny(s, /\b(gift|present|هدية)\b/i)) ctx.push("gift");
  return uniq(ctx);
}

function detectProductPurpose(category: SemanticProductCategory, s: string, usage: string[]): string[] {
  const purpose = [...usage];
  if (category === "fragrance" && hasAny(s, /\b(ثابت|long lasting|date night|office|daily)\b/i)) purpose.push("scent_performance");
  if (category === "furniture" && hasAny(s, /\b(premium looking|comfortable|living room|cheap but premium)\b/i)) purpose.push("home_aesthetic");
  if (category === "shoes" && hasAny(s, /\b(yeezy|streetwear|running|gym|daily)\b/i)) purpose.push("style_reference");
  if (category === "laptop" && hasAny(s, /\b(not heavy|lightweight|portable)\b/i)) purpose.push("portable_power");
  if (category === "desk_setup") purpose.push("workspace_aesthetic");
  return uniq(purpose);
}

function detectAlternative(s: string): SemanticQueryUnderstanding["alternativeIntent"] {
  const active = hasAny(s, /\b(like|similar to|alternative|dupe|يشبه|شبيه|بديل)\b/i);
  const cheaper = hasAny(s, /\b(cheaper|less expensive|budget|affordable|ارخص|أرخص)\b/i);
  const anchor =
    s.match(/\b(?:like|similar to|alternative to)\s+([a-z0-9\s+-]{2,32})\b/i)?.[1]?.trim() ??
    s.match(/\b(?:يشبه|شبيه|بديل)\s+([a-z0-9\s+-]{2,32})\b/i)?.[1]?.trim() ??
    "";
  return { active, cheaper, anchor };
}

function semanticKeywordsFor(q: {
  category: SemanticProductCategory;
  aesthetic: SemanticAestheticDirection;
  styles: string[];
  usage: string[];
  alternative: SemanticQueryUnderstanding["alternativeIntent"];
  envelope: string;
}): string[] {
  const words: string[] = [];
  if (q.category === "shoes") words.push("shoe", "sneaker", "trainer", "footwear", "boot");
  if (q.category === "phone") words.push("phone", "smartphone", "iphone", "galaxy", "pixel");
  if (q.category === "laptop") words.push("laptop", "notebook", "ultrabook", "portable", "computer");
  if (q.category === "audio") words.push("headphone", "earbud", "wireless", "audio", "noise cancelling");
  if (q.category === "furniture") words.push("sofa", "couch", "chair", "furniture", "living room");
  if (q.category === "fragrance") words.push("perfume", "fragrance", "parfum", "cologne", "eau");
  if (q.category === "watch") words.push("watch", "smartwatch", "wearable", "wrist");
  if (q.category === "desk_setup") words.push("desk", "workspace", "monitor", "keyboard", "minimal");
  if (q.category === "home") words.push("home", "kitchen", "appliance", "coffee", "machine", "stroller", "baby");
  if (q.category === "fashion") words.push("fashion", "clothing", "jacket", "coat", "style");
  if (q.category === "beauty") words.push("beauty", "skincare", "cosmetic", "care");
  if (q.aesthetic === "minimal_clean") words.push("clean", "minimal", "simple", "white", "black", "wood", "matte");
  if (q.aesthetic === "premium_luxury") words.push("premium", "luxury", "pro", "leather", "metal", "designer");
  if (q.styles.includes("long_lasting")) words.push("long lasting", "intense", "eau de parfum", "parfum");
  if (q.styles.includes("budget_premium_balance")) words.push("premium", "value", "affordable", "quality");
  if (q.usage.includes("gaming")) words.push("gaming", "rtx", "refresh", "performance");
  if (q.usage.includes("travel")) words.push("lightweight", "portable", "compact", "thin");
  if (q.alternative.anchor) words.push(...q.alternative.anchor.split(/\s+/));
  words.push(...q.envelope.split(/\s+/).filter((x) => x.length >= 4).slice(0, 12));
  return uniq(words).slice(0, 32);
}

export function buildSearchQueryUnderstanding(rawQuery: string): SemanticQueryUnderstanding {
  const raw = rawQuery.trim();
  const envelope = buildEnvelope(raw);
  const rewritten = fixCommonCommerceTypos(normalizeEasternDigitsInString(raw)).replace(/\s+/g, " ").trim();
  const category = detectCategory(envelope);
  const aesthetic = detectAesthetic(envelope);
  const styleIntent = detectStyles(envelope, aesthetic);
  const usageContext = detectUsageContext(envelope);
  const alternativeIntent = detectAlternative(envelope);
  const budgetIntent01 = clamp01(
    (hasAny(envelope, /\b(cheap|budget|affordable|under|discount|sale|ارخص|أرخص|رخيص)\b/i) ? 0.58 : 0.08) +
      (alternativeIntent.cheaper ? 0.26 : 0) +
      (hasAny(envelope, /\b(cheap but good|worth the money|value|safe buy)\b/i) ? 0.16 : 0)
  );
  const premiumIntent01 = clamp01(
    (hasAny(envelope, /\b(premium|luxury|pro|max|ultra|designer|فخم|فاخر)\b/i) ? 0.58 : 0.1) +
      (aesthetic === "premium_luxury" ? 0.22 : 0) +
      (hasAny(envelope, /\b(premium looking|luxury feel|expensive look)\b/i) ? 0.2 : 0)
  );
  const urgency01 = clamp01(hasAny(envelope, /\b(now|today|asap|urgent|fast|quick|اليوم|سريع)\b/i) ? 0.72 : 0.08);
  const emotionalIntent01 = clamp01(
    (hasAny(envelope, /\b(gift|safe buy|worth the money|regret|treat|هدية|آمن|موثوق)\b/i) ? 0.34 : 0.12) +
      (premiumIntent01 > 0.55 && budgetIntent01 > 0.45 ? 0.18 : 0)
  );
  const qualityExpectation =
    premiumIntent01 >= 0.72 && budgetIntent01 < 0.42
      ? "luxury"
      : premiumIntent01 >= 0.56
        ? "premium"
        : budgetIntent01 >= 0.62 && premiumIntent01 >= 0.42
          ? "value"
          : budgetIntent01 >= 0.62
            ? "cheap"
            : "balanced";
  const productPurpose = detectProductPurpose(category, envelope, usageContext);
  const semanticKeywords = semanticKeywordsFor({
    category,
    aesthetic,
    styles: styleIntent,
    usage: usageContext,
    alternative: alternativeIntent,
    envelope,
  });

  return {
    raw,
    rewritten,
    envelope,
    languages: detectLanguages(raw),
    productCategory: category,
    productPurpose,
    styleIntent,
    budgetIntent01,
    premiumIntent01,
    urgency01,
    emotionalIntent01,
    aestheticDirection: aesthetic,
    usageContext,
    alternativeIntent,
    qualityExpectation,
    semanticKeywords,
  };
}
