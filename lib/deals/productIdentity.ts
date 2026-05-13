import type { QuantProduct } from "@/lib/shoppingScore";
import { normalizeProductTitle, titleTokens } from "./normalizeTitle";

/** Known retail brands for lightweight extraction (not exhaustive). */
const BRAND_PATTERNS: { re: RegExp; name: string }[] = [
  { re: /\bapple\b|\biphone\b|\bipad\b|\bmacbook\b|\bairpods?\b/i, name: "apple" },
  { re: /\bsamsung\b|\bgalaxy\b/i, name: "samsung" },
  { re: /\bsony\b|\bplaystation\b|\bps5\b|\bps4\b/i, name: "sony" },
  { re: /\blg\b/i, name: "lg" },
  { re: /\bdell\b|\balienware\b/i, name: "dell" },
  { re: /\bhp\b|\bhewlett\b/i, name: "hp" },
  { re: /\blenovo\b|\bthinkpad\b/i, name: "lenovo" },
  { re: /\basus\b|\brog\b|\bzenbook\b/i, name: "asus" },
  { re: /\bacer\b|\bpredator\b/i, name: "acer" },
  { re: /\bmsi\b/i, name: "msi" },
  { re: /\bgoogle\b|\bpixel\b/i, name: "google" },
  { re: /\bxiaomi\b|\bmi\b|\bredmi\b/i, name: "xiaomi" },
  { re: /\boneplus\b|\boppo\b|\brealme\b/i, name: "bbk" },
  { re: /\bhuawei\b|\bhonor\b/i, name: "huawei" },
  { re: /\bnintendo\b|\bswitch\b/i, name: "nintendo" },
  { re: /\bmicrosoft\b|\bsurface\b|\bxbox\b/i, name: "microsoft" },
  { re: /\bbose\b|\bjbl\b|\bbeats\b|\bsennheiser\b|\bsony\s*wh-?/i, name: "audio-brand" },
  { re: /\bdyson\b|\bphilips\b|\bbosch\b|\bmiele\b|\bsiemens\b/i, name: "appliance-brand" },
  { re: /\bnike\b|\badidas\b|\bpuma\b|\breebok\b|\buniqlo\b|\bzara\b/i, name: "fashion-brand" },
];

const MODEL_PATTERNS = [
  /\b(?:iphone|ipad|macbook|galaxy|pixel|thinkpad|surface|switch|airpods|wh-?1000xm\d|xm\d)\s+[a-z0-9][a-z0-9+.\s-]{0,18}\b/gi,
  /\b(?:rtx|gtx)\s*\d{3,4}\s*(?:ti|super)?\b/gi,
  /\b(?:i[3579]|r[3579]|ultra|pro|max|plus|mini)\b(?=\s|$|[\d])/gi,
  /\b[A-Z]{2,6}[-_]?\d{3,5}[A-Z]?\b/g,
  /\b\d{1,2}\s*(?:gb|tb)\s*(?:ram|ssd|storage|memory)\b/gi,
];

const SPEC_PATTERNS: { key: string; re: RegExp }[] = [
  { key: "ram", re: /\b(\d{1,2})\s*(gb|tb)\s*(?:ram|ddr\d?|memory)\b/i },
  { key: "storage", re: /\b(\d{3,4})\s*gb\s*(?:ssd|storage|nvme|emmc)\b/i },
  { key: "screen", re: /\b(\d{1,2}(?:\.\d)?)\s*(?:inch|"|”|′′)\b/i },
  { key: "panel", re: /\b(oled|qled|ips|va|mini[\s-]?led|hdr\d{3,4})\b/i },
  { key: "refresh", re: /\b(\d{2,3})\s*hz\b/i },
];

const ID_PATTERNS = [
  /\b(?:ean|upc|gtin|sku|mpn|asin|model\s*(?:no\.?|#)?)\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{3,})\b/gi,
  /\b(?:ean|upc|gtin)\s*(\d{12,14})\b/gi,
];

export type ProductIdentity = {
  normalizedTitle: string;
  asciiTitle: string;
  brands: string[];
  models: string[];
  identifiers: string[];
  specHints: Record<string, string>;
  tokenSet: Set<string>;
};

function uniqLower(xs: string[]): string[] {
  const s = new Set<string>();
  for (const x of xs) {
    const t = x.trim().toLowerCase();
    if (t.length > 1) s.add(t);
  }
  return [...s];
}

function uniqUpperIds(xs: string[]): string[] {
  const s = new Set<string>();
  for (const x of xs) {
    const t = x.trim().toUpperCase();
    if (t.length > 3) s.add(t);
  }
  return [...s];
}

function extractBrands(blob: string): string[] {
  const out: string[] = [];
  for (const { re, name } of BRAND_PATTERNS) {
    if (new RegExp(re.source, re.flags).test(blob)) out.push(name);
  }
  return uniqLower(out);
}

function extractModels(blob: string): string[] {
  const raw: string[] = [];
  for (const re of MODEL_PATTERNS) {
    const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
    const r = new RegExp(re.source, flags);
    let m: RegExpExecArray | null;
    while ((m = r.exec(blob)) != null) {
      const piece = (m[0] ?? "").trim();
      if (piece.length >= 3 && piece.length <= 42) raw.push(piece);
    }
  }
  return uniqLower(raw).slice(0, 12);
}

function extractIdentifiers(blob: string): string[] {
  const ids: string[] = [];
  for (const re of ID_PATTERNS) {
    const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
    const r = new RegExp(re.source, flags);
    let m: RegExpExecArray | null;
    while ((m = r.exec(blob)) != null) {
      const id = (m[1] ?? m[0] ?? "").replace(/\s+/g, "").toUpperCase();
      if (id.length >= 4 && id.length <= 32) ids.push(id);
    }
  }
  return uniqUpperIds(ids).slice(0, 8);
}

function extractSpecs(blob: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { key, re } of SPEC_PATTERNS) {
    const m = re.exec(blob);
    if (m) out[key] = m.slice(1).filter(Boolean).join(" ").trim().toLowerCase();
  }
  return out;
}

/**
 * Deterministic identity features for cross-retailer matching.
 * Image embeddings are not available in-feed — see cluster `imageSimilarityNote`.
 */
export function extractProductIdentity(p: QuantProduct): ProductIdentity {
  const blob = `${p.title} ${p.extensions.join(" ")}`;
  const normalizedTitle = normalizeProductTitle(p.title);
  const asciiTitle = normalizeProductTitle(
    p.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  );
  const brands = extractBrands(blob);
  const models = extractModels(blob);
  const identifiers = extractIdentifiers(blob);
  const specHints = extractSpecs(blob);
  const tokenSet = new Set(titleTokens(p.title));
  return {
    normalizedTitle,
    asciiTitle,
    brands,
    models,
    identifiers,
    specHints,
    tokenSet,
  };
}

export function jaccardSets(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter += 1;
  }
  const u = a.size + b.size - inter;
  return u > 0 ? inter / u : 0;
}

export type QueryCommerceHints = {
  brands: string[];
  models: string[];
  identifiers: string[];
};

/** Deterministic tokens from the analyst query for OEM / SKU alignment (no feed image signals). */
export function extractQueryCommerceHints(query: string): QueryCommerceHints {
  const blob = query.trim();
  if (!blob) return { brands: [], models: [], identifiers: [] };
  return {
    brands: extractBrands(blob),
    models: extractModels(blob),
    identifiers: extractIdentifiers(blob),
  };
}
