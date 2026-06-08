/**
 * Phase 33/36 — Image Reliability Engine.
 * Validates, upgrades, and chains product imagery before card render.
 */

import type { QuantProduct } from "@/lib/shoppingScore";

export type ImageReliabilityResult = {
  image_confidence: number;
  resolvedUrl: string | null;
  fallbackChain: string[];
  isPlaceholder: boolean;
  isBroken: boolean;
  lazyReloadEligible: boolean;
};

const PLACEHOLDER_PATTERNS = [
  /placeholder/i,
  /no[-_]?image/i,
  /missing/i,
  /default[-_]?product/i,
  /1x1/i,
  /pixel\.gif/i,
  /transparent\.png/i,
  /data:image\/gif;base64,R0lGODlhAQ/i,
];

const BROKEN_URL_PATTERNS = [
  /^$/,
  /^#$/,
  /^javascript:/i,
  /^data:$/i,
  /undefined|null/i,
];

const LOW_QUALITY_HOST_PATTERNS = [
  /encrypted-tbn\d*\.gstatic\.com/i,
  /googleusercontent\.com.*=s\d{1,2}[^0-9]/i,
  /=w\d{1,2}-h\d{1,2}/i,
];

const SHOW_IMAGE_CONFIDENCE_MIN = 28;

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function normalizeTray(tray: QuantProduct[] | unknown): QuantProduct[] {
  return Array.isArray(tray) ? tray : [];
}

function isValidHttpUrl(url: string): boolean {
  if (!url || url.length < 12) return false;
  if (BROKEN_URL_PATTERNS.some((re) => re.test(url))) return false;
  return /^https?:\/\//i.test(url);
}

function isPlaceholderUrl(url: string): boolean {
  return PLACEHOLDER_PATTERNS.some((re) => re.test(url));
}

function looksLowResolutionUrl(url: string): boolean {
  if (url.length < 12) return true;
  return LOW_QUALITY_HOST_PATTERNS.some((re) => re.test(url));
}

/** Attempt to upgrade marketplace thumbnail URLs to catalog-grade resolution. */
export function upgradeImageUrl(url: string): string {
  let next = url;

  if (/googleusercontent\.com/i.test(next) || /gstatic\.com/i.test(next)) {
    next = next.replace(/=s\d+-c/, "=s800-c");
    next = next.replace(/=s\d+(?![0-9])/i, "=s800");
    next = next.replace(/=w\d+-h\d+/, "=w800-h800");
  }

  if (/images-amazon\.com/i.test(next)) {
    next = next.replace(/\._[A-Z0-9_,]+_\./, "._SL800_.");
  }

  if (/ebayimg\.com/i.test(next)) {
    next = next.replace(/s-l\d+/i, "s-l800");
  }

  return next;
}

function storeBrandFallback(title: string, store: string): string | null {
  const blob = `${title} ${store}`.toLowerCase();
  if (/apple|iphone|macbook|ipad/i.test(blob)) {
    return "https://www.apple.com/ac/structured-data/images/knowledge_graph_logo.png";
  }
  if (/samsung|galaxy/i.test(blob)) {
    return "https://images.samsung.com/is/image/samsung/assets/global/about-us/brand/logo/256_144_1.png";
  }
  return null;
}

function categoryFallbackImage(title: string, searchQuery: string): string | null {
  const blob = `${title} ${searchQuery}`.toLowerCase();
  if (/sofa|couch|sectional|furniture|hoekbank/i.test(blob)) {
    return "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop";
  }
  if (/phone|iphone|galaxy|pixel|android/i.test(blob)) {
    return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop";
  }
  if (/laptop|macbook|notebook|ultrabook/i.test(blob)) {
    return "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=600&fit=crop";
  }
  if (/appliance|washer|fridge|oven/i.test(blob)) {
    return "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop";
  }
  if (/fashion|dress|shirt|jacket|shoe|sneaker/i.test(blob)) {
    return "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=600&fit=crop";
  }
  if (/beauty|skincare|makeup|cosmetic/i.test(blob)) {
    return "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=600&fit=crop";
  }
  if (/tool|drill|saw|wrench/i.test(blob)) {
    return "https://images.unsplash.com/photo-1504148455326-c376922a0f12?w=800&h=600&fit=crop";
  }
  if (/sport|gym|fitness|running|bike/i.test(blob)) {
    return "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=600&fit=crop";
  }
  return "https://images.unsplash.com/photo-1560393464-5c6126923271?w=800&h=600&fit=crop";
}

/** Build ordered fallback chain — primary, merchant, tray peer, brand, category. */
export function buildImageFallbackChain(
  product: QuantProduct,
  tray: QuantProduct[] | unknown = [],
  searchQuery = ""
): string[] {
  const peerTray = normalizeTray(tray);
  const chain: string[] = [];
  const seen = new Set<string>();

  const push = (url: string | null | undefined) => {
    const trimmed = url?.trim() ?? "";
    if (!isValidHttpUrl(trimmed) || isPlaceholderUrl(trimmed) || seen.has(trimmed)) return;
    seen.add(trimmed);
    chain.push(trimmed);
  };

  push(product.image);
  push(upgradeImageUrl(product.image?.trim() ?? ""));

  const extensions = product.extensions ?? [];
  for (const ext of extensions) {
    if (/^https?:\/\//i.test(ext)) push(ext);
  }

  const productTokens = new Set(
    `${product.title}`.toLowerCase().split(/\W+/).filter((t) => t.length > 3)
  );
  for (const peer of peerTray) {
    if (peer.link === product.link) continue;
    const peerImage = peer.image?.trim() ?? "";
    if (!isValidHttpUrl(peerImage)) continue;
    const overlap = peer.title
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 3 && productTokens.has(t)).length;
    if (overlap >= 2) push(upgradeImageUrl(peerImage));
  }

  push(storeBrandFallback(product.title, product.store));
  push(categoryFallbackImage(product.title, searchQuery || product.store));

  return chain;
}

/** Compute image confidence 0–100 from URL quality and identity signals. */
export function computeImageConfidence(product: QuantProduct, chain: string[]): number {
  const primary = product.image?.trim() ?? "";
  let score = 0;

  if (chain.length > 0) score += 42;
  if (chain.length > 1) score += 12;
  if (isValidHttpUrl(primary) && !isPlaceholderUrl(primary)) score += 18;

  const upgraded = upgradeImageUrl(primary);
  if (upgraded && !looksLowResolutionUrl(upgraded)) score += 14;

  const identityConfidence = product.qiCanonicalIdentity?.identityConfidence ?? 0;
  const listingRisk = product.qiListingIdentity?.listingRisk01 ?? 0;
  score += clamp(identityConfidence * 0.12, 0, 12);
  score -= clamp(listingRisk * 28, 0, 18);

  if (product.qiCommerce?.priceAnomaly === "suspicious_low") score -= 8;

  const hasCategoryFallback = chain.some((url) => /unsplash\.com/i.test(url));
  if (hasCategoryFallback && score < SHOW_IMAGE_CONFIDENCE_MIN) score = SHOW_IMAGE_CONFIDENCE_MIN;

  return clamp(Math.round(score), 0, 100);
}

/** Resolve image reliability for a product — never returns empty chain without confidence. */
export function resolveImageReliability(
  product: QuantProduct,
  tray: QuantProduct[] | unknown = [],
  searchQuery = ""
): ImageReliabilityResult {
  const peerTray = normalizeTray(tray);
  const fallbackChain = buildImageFallbackChain(product, peerTray, searchQuery);
  const primary = product.image?.trim() ?? "";
  const isBroken = !isValidHttpUrl(primary) || isPlaceholderUrl(primary);
  const resolvedUrl = fallbackChain[0] ?? null;
  const image_confidence = computeImageConfidence(product, fallbackChain);
  const lazyReloadEligible = isBroken && fallbackChain.length <= 1;

  return {
    image_confidence,
    resolvedUrl,
    fallbackChain,
    isPlaceholder: !resolvedUrl,
    isBroken,
    lazyReloadEligible,
  };
}

/** Enrich product with image_confidence and resolved image when chain yields a URL. */
export function enrichProductImageReliability(
  product: QuantProduct,
  tray: QuantProduct[] | unknown = [],
  searchQuery = ""
): QuantProduct {
  const peerTray = normalizeTray(tray);
  const reliability = resolveImageReliability(product, peerTray, searchQuery);
  const nextImage =
    reliability.resolvedUrl && reliability.image_confidence >= SHOW_IMAGE_CONFIDENCE_MIN
      ? reliability.resolvedUrl
      : reliability.resolvedUrl ?? product.image;

  return {
    ...product,
    image: nextImage,
    image_confidence: reliability.image_confidence,
  };
}

/** Enrich every product in a tray with peer-aware image fallback. */
export function enrichTrayImageReliability(
  products: QuantProduct[],
  searchQuery = ""
): QuantProduct[] {
  return products.map((product) => enrichProductImageReliability(product, products, searchQuery));
}

/** Tray-level image coverage metric — share of rows with showable imagery. */
export function trayImageCoverage(
  products: QuantProduct[],
  searchQuery = ""
): {
  coverage: number;
  showable: number;
  total: number;
} {
  const total = products.length;
  if (!total) return { coverage: 1, showable: 0, total: 0 };

  let showable = 0;
  for (const product of products) {
    const reliability = resolveImageReliability(product, products, searchQuery);
    if (reliability.resolvedUrl && reliability.image_confidence >= SHOW_IMAGE_CONFIDENCE_MIN) showable += 1;
  }

  return { coverage: showable / total, showable, total };
}
