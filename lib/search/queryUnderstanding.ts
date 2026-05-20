/**
 * QuantAI Semantic Search Brain v1 — compact human-commerce query understanding.
 * Search-only layer: meaning, intent, style, budget, purpose, and Arabic/English mixed language.
 */

import { fixCommonCommerceTypos } from "@/lib/search/conversationalQueryLayer";
import { expandQueryForListingMatch } from "@/lib/search/bilingualMatchTokens";
import {
  arabicIntentGlossTokens,
  latinSkeletonForMatching,
  normalizeEasternDigitsInString,
} from "@/lib/search/queryScriptNormalize";
import { hasLuxuryWatchIntent, luxuryWatchIntent01 } from "@/lib/search/luxuryWatchIntent";

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
  /** Natural-language constraints extracted from the query */
  constraints: {
    maxPrice: number | null;
    platform: string | null;
    useCase: string | null;
    styleReference: string | null;
  };
  comparisonIntent: boolean;
  matchExpansion: string;
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
  return expandQueryForListingMatch(fixCommonCommerceTypos(normalizeEasternDigitsInString(raw)));
}

function detectConstraints(envelope: string): SemanticQueryUnderstanding["constraints"] {
  const priceMatch =
    envelope.match(/(?:under|below|less than|max|tot|onder|below|up to)\s*(?:€|eur|usd|\$|£|gbp)?\s*(\d{2,5})/i) ??
    envelope.match(/(?:تحت|أقل\s*من|اقل\s*من|حتى)\s*(\d{2,5})/i);
  const platform =
    envelope.match(/\b(?:for|with)\s+(ps5|playstation\s*5|xbox|switch|mac|windows|iphone|android)\b/i)?.[1]?.toLowerCase() ??
    envelope.match(/\b(ps5|playstation\s*5|xbox\s*series|nintendo\s*switch)\b/i)?.[0]?.toLowerCase() ??
    null;
  const useCase =
    envelope.match(/\bfor\s+(focus|work|gaming|travel|study|office|gym|running|commute|ps5|playstation)\b/i)?.[1]?.toLowerCase() ??
    (/\b(focus|concentration|noise cancelling|anc)\b/i.test(envelope) ? "focus" : null) ??
    (/\b(gaming|gamer|esports|144hz|240hz)\b/i.test(envelope) ? "gaming" : null) ??
    (/\b(office|work from home|wfh|productivity)\b/i.test(envelope) ? "work" : null);
  const styleReference =
    envelope.match(/\b(?:like|similar to|alternative to)\s+([a-z0-9][a-z0-9\s+-]{2,40})\b/i)?.[1]?.trim() ??
    envelope.match(/\b(?:مثل|شبيه|بديل)\s+([a-z0-9\u0600-\u06FF][a-z0-9\u0600-\u06FF\s+-]{2,40})\b/i)?.[1]?.trim() ??
    null;
  return {
    maxPrice: priceMatch ? Number.parseInt(priceMatch[1]!, 10) : null,
    platform,
    useCase,
    styleReference: styleReference || null,
  };
}

function detectComparisonIntent(envelope: string): boolean {
  return /\b(compare|vs|versus|difference|which is better|مقارنة|فرق\s*بين|أيهما|ايهما)\b/i.test(envelope);
}

function hasAny(s: string, rx: RegExp): boolean {
  return rx.test(s);
}

function detectCategory(s: string): SemanticProductCategory {
  if (/سيروم|فيتامين\s*سي|كريم|مكياج|عناية|مرطب|واقي\s+شمس/.test(s)) return "beauty";
  if (/قلاية\s+هوائية|ماكينة\s+قهوة|مكنسة|روبوت\s+مكنسة|عربة\s+اطفال|عربة\s+أطفال/.test(s)) return "home";
  if (/يد\s+تحكم|كنترولر|بلايستيشن|شاشة|تلفزيون|كاميرا/.test(s)) return "electronics";
  if (hasAny(s, /\b(yeezy|jordan|dunk|air force|samba|gazelle|adidas|nike|sneakers?|trainers?|shoes?|boots?|بوط|حذاء)\b/i)) return "shoes";
  if (hasAny(s, /(iphone|ايفون|آيفون|\bgalaxy\b|\bpixel\b|\bphone\b|\bsmartphone\b|هاتف|جوال|موبايل)/i)) return "phone";
  if (hasAny(s, /\b(gaming laptop|laptop|notebook|macbook|thinkpad|chromebook|ultrabook|لابتوب|لاب\s*توب)\b/i)) return "laptop";
  if (hasAny(s, /\b(headphones?|earbuds?|airpods?|bose|sony wh|noise cancelling|bluetooth speaker|soundbar|سماعات?|ايربودز|headset)\b/i)) return "audio";
  if (hasAny(s, /\b(best\s+premium\s+headphones?|headphones?\s+for\s+focus)\b/i)) return "audio";
  if (hasAny(s, /(?:كرسي|كراسي|كرسي\s*مكتب|مكتب\s*مريح|مكتبي)/i)) return "furniture";
  if (hasAny(s, /(?:كنبة|كنبه|اريكة|أريكة|ركنة|طاولة\s*طعام|طاوله)/i)) return "furniture";
  if (hasAny(s, /\b(office\s+chair|desk\s+chair|ergonomic\s+chair|gaming\s+chair)\b/i)) return "furniture";
  if (
    hasAny(
      s,
      /\b(executive workspace|ergonomic workspace|walnut workspace|architectural office|studio desk|minimal office|premium workspace|oak desk|clean desk|minimal oak desk|workspace setup|standing desk setup|minimal desk setup)\b/i
    ) &&
    !/(?:sofa|couch|كنبة|كنبه)/i.test(s)
  ) {
    return "desk_setup";
  }
  if (hasAny(s, /\b(clean desk|minimal desk|desk setup|workspace\s+setup)\b/i) && !/(?:كرسي|chair|stoel)/i.test(s)) return "desk_setup";
  if (hasAny(s, /\b(sofa|sofa bed|sectional|loveseat|settee|couch|corner sofa|recliner|chaise|hoekbank|bankstel|loungebank|fauteuil|eetkamerstoel|chair|stoel|desk|bureau|table|tafel|garden table|tuin tafel|tuinmeubel|loungeset|furniture|meubel|meubels|كنبة|اريكة|أريكة|ركنة|زاوية|طاولة|اثاث|أثاث)\b/i)) return "furniture";
  if (hasAny(s, /\b(perfume|fragrance|parfum|cologne|eau de parfum|eau de toilette|aftershave|niche fragrance|designer fragrance|libre|edp|edt|ysl|yves saint laurent|عطر|عطور|برفان)\b/i)) return "fragrance";
  if (hasAny(s, /\b(watch|watches|horloge|horloges|wristwatch|timepiece|chronograph|ساعة)\b/i)) return "watch";
  if (hasAny(s, /\b(makeup|skincare|beauty|serum|retinol|vitamin c|moisturizer|cleanser|sunscreen|cream|cosmetic|verzorging|huidverzorging|gezichtscreme|zonnebrand|مكياج|سيروم|كريم|عناية)\b/i)) return "beauty";
  if (hasAny(s, /\b(jacket|winter jacket|puffer|jas|winterjas|coat|dress|hoodie|shirt|jeans|sneaker outfit|fashion|outfit|kleding|dames|heren|ملابس|جاكيت|فستان|هودي)\b/i)) return "fashion";
  if (hasAny(s, /\b(coffee machine|espresso machine|koffiezetapparaat|koffiemachine|air fryer|airfryer|fryer|heteluchtfriteuse|friteuse|vacuum|stofzuiger|robot vacuum|robotstofzuiger|roomba|dreame|roborock|dyson|blender|microwave|dishwasher|wasmachine|droger|baby stroller|stroller|pram|buggy|kinderwagen|home|kitchen|bedroom|living room|decor|appliance|apparaat|keuken|قلاية\s+هوائية|ماكينة\s+قهوة|مكنسة|عربة\s+اطفال|عربة\s+أطفال)\b/i)) return "home";
  if (hasAny(s, /\b(gpu|graphics card|gaming monitor|oled monitor|monitor|beeldscherm|scherm|tv|oled tv|qled|camera|tablet|console|controller|dualsense|gamepad|ps5|playstation|xbox|nintendo|keyboard|mouse|electronics?|elektronica|شاشة|تلفزيون|كاميرا|بلايستيشن)\b/i)) return "electronics";
  return "unknown";
}

function detectAesthetic(s: string): SemanticAestheticDirection {
  if (hasAny(s, /\b(clean|minimal|minimalist|simple|scandi|monochrome|هادئ|بسيط)\b/i)) return "minimal_clean";
  if (hasAny(s, /\b(premium looking|luxury feel|luxury|designer|fancy|expensive look|quiet luxury|high end|luxe|فخم|فاخر|ماركة)\b/i)) return "premium_luxury";
  if (hasAny(s, /\b(sporty|gym|running|streetwear|athletic|رياضي)\b/i)) return "sporty";
  if (hasAny(s, /\b(cozy|soft|warm|living room|comfortable|مريح)\b/i)) return "cozy_home";
  if (hasAny(s, /\b(bold|statement|colorful|rgb|loud|viral)\b/i)) return "bold_statement";
  return "neutral";
}

function detectStyles(s: string, aesthetic: SemanticAestheticDirection): string[] {
  const styles: string[] = [];
  if (aesthetic !== "neutral") styles.push(aesthetic);
  if (hasAny(s, /\b(premium looking|luxury feel|expensive look|designer|quiet luxury|high end|luxe|فخم|فاخر|ماركة)\b/i)) styles.push("premium_look");
  if (hasLuxuryWatchIntent(s)) styles.push("luxury_watch_collector");
  if (hasAny(s, /\b(clean|minimal|minimalist|desk setup)\b/i)) styles.push("clean_minimal");
  if (hasAny(s, /\b(streetwear|yeezy|jordan|sneakerhead)\b/i)) styles.push("streetwear");
  if (hasAny(s, /\b(ثابت|long lasting|lasts long|projection|sillage)\b/i)) styles.push("long_lasting");
  if (hasAny(s, /\b(cheap but good|cheap but premium|budget luxury|best value|worth it|goede deal|aanbieding|ارخص|أرخص|رخيص بس كويس)\b/i)) styles.push("budget_premium_balance");
  return uniq(styles);
}

function detectUsageContext(s: string): string[] {
  const ctx: string[] = [];
  if (hasAny(s, /\b(gaming|gamer|rtx|fps|hz|refresh rate|playstation|xbox|ps5|144hz|240hz|قيمنق|جيمنق|ألعاب)\b/i)) ctx.push("gaming");
  if (hasAny(s, /\b(focus|concentration|study|deep work|noise cancelling|anc)\b/i)) ctx.push("focus");
  if (hasAny(s, /\b(work|office|productivity|business|wfh)\b/i)) ctx.push("work");
  if (hasAny(s, /\b(student|school|college|university|جامعة|مدرسة)\b/i)) ctx.push("student");
  if (hasAny(s, /\b(travel|commute|portable|not heavy|lightweight|خفيف)\b/i)) ctx.push("travel");
  if (hasAny(s, /\b(home|living room|bedroom|desk|بيت|غرفة)\b/i)) ctx.push("home");
  if (hasAny(s, /\b(gift|present|هدية)\b/i)) ctx.push("gift");
  return uniq(ctx);
}

function detectProductPurpose(category: SemanticProductCategory, s: string, usage: string[]): string[] {
  const purpose = [...usage];
  if (category === "fragrance" && hasAny(s, /\b(ثابت|long lasting|date night|office|daily|projection|sillage|summer scent|winter scent)\b/i)) purpose.push("scent_performance");
  if (category === "furniture" && hasAny(s, /\b(premium looking|comfortable|living room|cheap but premium|hoekbank|corner sofa|زاوية)\b/i)) purpose.push("home_aesthetic");
  if (category === "shoes" && hasAny(s, /\b(yeezy|streetwear|running|gym|daily)\b/i)) purpose.push("style_reference");
  if (category === "laptop" && hasAny(s, /\b(not heavy|lightweight|portable)\b/i)) purpose.push("portable_power");
  if (category === "desk_setup") purpose.push("workspace_aesthetic");
  return uniq(purpose);
}

function detectAlternative(s: string): SemanticQueryUnderstanding["alternativeIntent"] {
  const active =
    hasAny(s, /\b(like|similar to|alternative|dupe|يشبه|شبيه|بديل|زي|شبه)\b/i) ||
    /\bأرخص\s*من\b/i.test(s) ||
    /\blike\s+.{2,50}\s+but\s+cheaper\b/i.test(s) ||
    /\bمثل\s+.{2,50}\s+(?:بس|لكن)\s+ارخص\b/i.test(s);
  const cheaper =
    hasAny(s, /\b(cheaper|less expensive|budget|affordable|ارخص|أرخص|رخيص|بس\s+ارخص|بس\s+أرخص)\b/i) ||
    /\bأرخص\s*من\b/i.test(s);
  let anchor =
    s.match(/\b(?:like|similar to|alternative to)\s+([a-z0-9][a-z0-9\s+-]{2,40}?)(?:\s+but|\s+cheaper|\s+under|$)/i)?.[1]?.trim() ??
    s.match(/\b(?:مثل|شبيه|بديل|زي|شبه)\s+([a-z0-9\u0600-\u06FF][\w\s+-]{2,40}?)(?:\s+بس|\s+لكن|\s+ارخص|$)/i)?.[1]?.trim() ??
    "";
  if (!anchor || /\b(cheaper|but|budget|like|shoes|sneakers)\b/i.test(anchor)) {
    const named = s.match(
      /\b(vomero|pegasus|ultraboost|samba|gazelle|air\s+force|dunk|jordan|common\s+projects|achilles|libre|airpods?\s*pro)\b/i
    )?.[0];
    if (named) anchor = named.replace(/\s+/g, " ").trim();
  }
  if (anchor) {
    anchor = anchor
      .replace(/\b(but|cheaper|budget|under|like|shoes|sneakers|trainers)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
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
  const usage = q.usage;
  const words: string[] = [];
  if (q.category === "shoes") words.push("shoe", "sneaker", "trainer", "footwear", "boot");
  if (q.category === "phone") words.push("phone", "smartphone", "iphone", "galaxy", "pixel");
  if (q.category === "laptop") words.push("laptop", "notebook", "ultrabook", "portable", "computer");
  if (q.category === "audio") words.push("headphone", "earbud", "wireless", "audio", "noise cancelling");
  if (q.category === "furniture") words.push("sofa", "couch", "chair", "furniture", "living room", "hoekbank", "corner sofa");
  if (q.category === "fragrance") {
    words.push("perfume", "fragrance", "parfum", "cologne", "eau", "designer", "niche");
    const named = q.envelope.match(/\b(libre|ysl|yves\s+saint\s+laurent|mon\s+paris|black\s+opium|la\s+vie\s+est\s+belle)\b/gi);
    if (named) words.push(...named.map((t) => t.toLowerCase()));
  }
  if (q.category === "watch") words.push("watch", "smartwatch", "wearable", "wrist");
  if (q.category === "desk_setup") words.push("desk", "workspace", "monitor", "keyboard", "minimal");
  if (q.category === "home") words.push("home", "kitchen", "appliance", "coffee", "machine", "stroller", "baby", "air fryer", "airfryer", "vacuum", "robot vacuum", "roomba", "roborock");
  if (q.category === "electronics") words.push("electronics", "monitor", "tv", "gaming", "display", "console", "controller", "dualsense", "playstation");
  if (q.category === "fashion") words.push("fashion", "clothing", "jacket", "coat", "style", "outfit");
  if (q.category === "beauty") words.push("beauty", "skincare", "cosmetic", "serum", "cream", "care");
  if (q.aesthetic === "minimal_clean") words.push("clean", "minimal", "simple", "white", "black", "wood", "matte");
  if (q.aesthetic === "premium_luxury") words.push("premium", "luxury", "pro", "leather", "metal", "designer");
  if (q.styles.includes("long_lasting")) words.push("long lasting", "intense", "eau de parfum", "parfum");
  if (q.styles.includes("budget_premium_balance")) words.push("premium", "value", "affordable", "quality");
  if (q.usage.includes("gaming")) words.push("gaming", "rtx", "refresh", "performance");
  if (q.usage.includes("travel")) words.push("lightweight", "portable", "compact", "thin");
  if (q.alternative.anchor) words.push(...q.alternative.anchor.split(/\s+/).filter((x) => x.length >= 2));
  if (q.usage.includes("focus")) words.push("noise cancelling", "anc", "wireless", "over ear");
  if (q.usage.includes("gaming")) words.push("gaming", "144hz", "240hz", "low latency", "hdmi", "displayport");
  words.push(...q.envelope.split(/\s+/).filter((x) => x.length >= 3).slice(0, 16));
  return uniq(words).slice(0, 36);
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
  const luxuryWatch01 = category === "watch" ? luxuryWatchIntent01(envelope) : 0;
  const premiumIntent01 = clamp01(
    (hasAny(envelope, /\b(premium|luxury|pro|max|ultra|designer|فخم|فاخر)\b/i) ? 0.58 : 0.1) +
      (aesthetic === "premium_luxury" ? 0.22 : 0) +
      (hasAny(envelope, /\b(premium looking|luxury feel|luxury looking|expensive look|quiet luxury)\b/i) ? 0.2 : 0) +
      (hasAny(envelope, /\b(aesthetic|style intent|for focus|headphones for focus)\b/i) ? 0.12 : 0) +
      luxuryWatch01 * 0.35
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
  const constraints = detectConstraints(envelope);
  const comparisonIntent = detectComparisonIntent(envelope);
  const semanticKeywords = semanticKeywordsFor({
    category,
    aesthetic,
    styles: styleIntent,
    usage: usageContext,
    alternative: alternativeIntent,
    envelope,
  });
  if (constraints.styleReference) {
    semanticKeywords.push(...constraints.styleReference.split(/\s+/).filter((x) => x.length >= 2));
  }
  if (constraints.platform) semanticKeywords.push(constraints.platform);
  if (constraints.useCase) semanticKeywords.push(constraints.useCase);

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
    semanticKeywords: uniq(semanticKeywords).slice(0, 36),
    constraints,
    comparisonIntent,
    matchExpansion: envelope,
  };
}
