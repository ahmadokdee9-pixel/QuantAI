/**
 * QuantAI Semantic Query Brain v1 — NL shopping asks → structured commerce hints (no UI).
 */

export type SemanticGeoFocus = "nl" | "eu" | "us" | "uk" | null;

export type SemanticQualityLevel = "budget" | "mid" | "premium" | "luxury";

export type SemanticTrustSensitivity = "normal" | "high";

export type SemanticDiscountIntent = "none" | "real_only" | "deal_hunt";

export type SemanticUrgency = "none" | "low" | "high";

export type SemanticCommerceQueryBrain = {
  /** Original ask after light trim (for logs / echo only). */
  rawTrimmed: string;
  /** Detected brand tokens (lowercase canonical). */
  brandsDetected: string[];
  /** Coarse product / category noun if found. */
  productTypeHint: string | null;
  budgetMaxAmount: number | null;
  budgetCurrency: "EUR" | "USD" | "GBP" | null;
  geoFocus: SemanticGeoFocus;
  qualityLevel: SemanticQualityLevel;
  trustSensitivity: SemanticTrustSensitivity;
  discountIntent: SemanticDiscountIntent;
  urgency: SemanticUrgency;
  /** Short machine summary for memo / ranking fingerprints. */
  intentSignature: string;
};

const BRAND_RX: { rx: RegExp; id: string }[] = [
  { rx: /\bnike\b/i, id: "nike" },
  { rx: /\badidas\b/i, id: "adidas" },
  { rx: /\bapple\b|\biphone\b|\bipad\b|\bmacbook\b|\bairpods?\b/i, id: "apple" },
  { rx: /\bsamsung\b|\bgalaxy\b/i, id: "samsung" },
  { rx: /\bdyson\b/i, id: "dyson" },
  { rx: /\bsony\b|\bplaystation\b|\bps5\b/i, id: "sony" },
  { rx: /\bbose\b/i, id: "bose" },
  { rx: /\blasus\b|\brog\b/i, id: "asus" },
  { rx: /\bdell\b|\balienware\b/i, id: "dell" },
  { rx: /\blenovo\b|\bthinkpad\b/i, id: "lenovo" },
  { rx: /\bhp\b|\bomen\b/i, id: "hp" },
  { rx: /\bmsi\b/i, id: "msi" },
  { rx: /\brazer\b/i, id: "razer" },
  { rx: /\bphilips\b/i, id: "philips" },
  { rx: /\bair\s*force\b/i, id: "nike" },
  { rx: /\bzara\b/i, id: "zara" },
  { rx: /\bh\s*&\s*m\b|\bhm\b/i, id: "hm" },
];

const TYPE_RX: { rx: RegExp; hint: string }[] = [
  { rx: /\b(laptop|notebook|ultrabook|macbook)\b/i, hint: "laptop" },
  { rx: /\b(gaming\s+)?(pc|desktop)\b/i, hint: "desktop_pc" },
  { rx: /\b(phone|smartphone|iphone|android\s+phone)\b/i, hint: "phone" },
  { rx: /\b(shoe|sneaker|trainer|footwear)\b/i, hint: "shoes" },
  { rx: /\b(perfume|fragrance|parfum|cologne|eau\s+de)\b/i, hint: "perfume" },
  { rx: /\b(sofa|couch|furniture|desk|table|chair)\b/i, hint: "furniture" },
  { rx: /\b(monitor|display)\b/i, hint: "monitor" },
  { rx: /\b(gpu|graphics\s+card)\b/i, hint: "gpu" },
  { rx: /\b(headphones?|earbuds?)\b/i, hint: "audio" },
];

function parseBudget(s: string): { amount: number | null; cur: SemanticCommerceQueryBrain["budgetCurrency"] } {
  const euro =
    /(?:under|below|max|up\s+to|less\s+than|at\s+most)\s*€\s*(\d{1,6})|(?:under|below|max)\s+(\d{1,6})\s*(?:euros?|eur)\b/i;
  const usd = /(?:under|below|max|up\s+to|less\s+than)\s*\$?\s*(\d{1,6})(?:\s*(?:usd|dollars?))?|\$(\d{1,6})\s*(?:max|cap)?/i;
  const gbp = /(?:under|below|max|up\s+to)\s*£\s*(\d{1,6})|£(\d{1,6})/i;
  let m = s.match(euro);
  if (m) return { amount: Number(m[1] ?? m[2]), cur: "EUR" };
  m = s.match(usd);
  if (m) return { amount: Number(m[1] ?? m[2]), cur: "USD" };
  m = s.match(gbp);
  if (m) return { amount: Number(m[1] ?? m[2]), cur: "GBP" };
  return { amount: null, cur: null };
}

function parseGeo(s: string): SemanticGeoFocus {
  if (/\b(netherlands|nederland|nl\b|dutch|amsterdam|rotterdam)\b/i.test(s)) return "nl";
  if (/\b(united\s+states|usa?\b|u\.s\.|america)\b/i.test(s)) return "us";
  if (/\b(uk|britain|england|scotland|wales|london)\b/i.test(s)) return "uk";
  if (/\b(eu|europe|germany|france|spain|italy|belgium)\b/i.test(s)) return "eu";
  return null;
}

function parseQuality(s: string): SemanticQualityLevel {
  if (/\b(luxury|designer|haute|boutique)\b/i.test(s)) return "luxury";
  if (/\b(premium|flagship|pro\b|max\b|ultra|oled|high.end)\b/i.test(s)) return "premium";
  if (/\b(cheap|budget|affordable|lowest|save|discount|clearance)\b/i.test(s)) return "budget";
  return "mid";
}

export function parseSemanticCommerceQuery(raw: string): SemanticCommerceQueryBrain {
  const rawTrimmed = raw.replace(/\s+/g, " ").trim();
  const s = rawTrimmed.toLowerCase();
  const brands = new Set<string>();
  for (const { rx, id } of BRAND_RX) {
    if (rx.test(rawTrimmed)) brands.add(id);
  }
  let productTypeHint: string | null = null;
  for (const { rx, hint } of TYPE_RX) {
    if (rx.test(rawTrimmed)) {
      productTypeHint = hint;
      break;
    }
  }
  const { amount, cur } = parseBudget(s);
  const geoFocus = parseGeo(s);
  const qualityLevel = parseQuality(s);
  const trustSensitivity: SemanticTrustSensitivity =
    /\b(trusted|reputable|safe\s+seller|official|authorized|no\s+scam|peace\s+of\s+mind)\b/i.test(s) ? "high" : "normal";
  let discountIntent: SemanticDiscountIntent = "none";
  if (/\b(real|genuine|actual)\s+discount|not\s+fake|no\s+fake\s+sale\b/i.test(s)) discountIntent = "real_only";
  else if (/\b(deal|discount|sale|markdown|clearance|best\s+price)\b/i.test(s)) discountIntent = "deal_hunt";
  const urgency: SemanticUrgency =
    /\b(asap|urgent|today|tonight|now|ship\s+today|this\s+week)\b/i.test(s) ? "high" : /\b(soon|quickly|fast)\b/i.test(s) ? "low" : "none";
  const intentSignature = [
    [...brands].sort().join("+") || "-",
    productTypeHint ?? "-",
    amount != null ? `${amount}${cur ?? ""}` : "-",
    geoFocus ?? "-",
    qualityLevel,
    trustSensitivity,
    discountIntent,
    urgency,
  ].join("|");
  return {
    rawTrimmed,
    brandsDetected: [...brands],
    productTypeHint,
    budgetMaxAmount: amount,
    budgetCurrency: cur,
    geoFocus,
    qualityLevel,
    trustSensitivity,
    discountIntent,
    urgency,
    intentSignature,
  };
}

export function semanticQueryFingerprint(sem: SemanticCommerceQueryBrain | null | undefined): string {
  return sem?.intentSignature ?? "";
}
