import type { QuantProduct } from "@/lib/shoppingScore";
import { resolveImageReliability, upgradeImageUrl } from "@/lib/intelligence/imageReliabilityEngine";

export type ProductImageMode = "catalog" | "reference" | "placeholder";

export type ProductImageResolution = {
  src: string | null;
  mode: ProductImageMode;
  caption: string;
  showImage: boolean;
  image_confidence: number;
};

const LOW_QUALITY_HOST_PATTERNS = [
  /encrypted-tbn\d*\.gstatic\.com/i,
  /googleusercontent\.com.*=s\d{1,2}[^0-9]/i,
  /=w\d{1,2}-h\d{1,2}/i,
];

function looksLowResolutionUrl(url: string): boolean {
  if (url.length < 12) return true;
  return LOW_QUALITY_HOST_PATTERNS.some((re) => re.test(url));
}

/** Presentation-only image gate — prioritizes catalog-grade hero assets with fallback chain. */
export function resolveProductImageDisplay(product: QuantProduct): ProductImageResolution {
  const reliability = resolveImageReliability(product);
  const image_confidence = product.image_confidence ?? reliability.image_confidence;
  const identityConfidence = product.qiCanonicalIdentity?.identityConfidence ?? 0;
  const listingRisk = product.qiListingIdentity?.listingRisk01 ?? 0;
  const titleQuality = Number(product.qiProductUnderstanding?.titleQuality ?? 55);
  const suspicious =
    product.qiCommerce?.priceAnomaly === "suspicious_low" ||
    product.qiCommerce?.priceAnomaly === "premium_outlier";

  const chain = reliability.fallbackChain;
  const primary = chain[0] ?? product.image?.trim() ?? "";
  const upgraded = primary ? upgradeImageUrl(primary) : "";

  if (!upgraded) {
    return {
      src: null,
      mode: "placeholder",
      caption: "Verified catalog imagery pending",
      showImage: false,
      image_confidence,
    };
  }

  const weakVisual =
    looksLowResolutionUrl(upgraded) ||
    listingRisk > 0.28 ||
    titleQuality < 38;

  if (weakVisual && suspicious && image_confidence < 52) {
    const fallback = chain.find((url) => !looksLowResolutionUrl(upgradeImageUrl(url)));
    if (fallback) {
      return {
        src: upgradeImageUrl(fallback),
        mode: "reference",
        caption: "Alternate verified imagery",
        showImage: true,
        image_confidence,
      };
    }
    return {
      src: null,
      mode: "placeholder",
      caption: "Low-confidence seller imagery suppressed",
      showImage: false,
      image_confidence,
    };
  }

  if (identityConfidence >= 70 && listingRisk <= 0.15) {
    return {
      src: upgraded,
      mode: "catalog",
      caption: "Official catalog reference",
      showImage: true,
      image_confidence,
    };
  }

  if (weakVisual && image_confidence < 45) {
    const fallback = chain[1] ? upgradeImageUrl(chain[1]) : null;
    if (fallback && !looksLowResolutionUrl(fallback)) {
      return {
        src: fallback,
        mode: "reference",
        caption: "Fallback catalog imagery",
        showImage: true,
        image_confidence,
      };
    }
    return {
      src: null,
      mode: "placeholder",
      caption: "Awaiting verified catalog imagery",
      showImage: false,
      image_confidence,
    };
  }

  return {
    src: upgraded,
    mode: listingRisk <= 0.14 ? "catalog" : "reference",
    caption: listingRisk <= 0.14 ? "Verified retail imagery" : "Verified retailer reference",
    showImage: true,
    image_confidence,
  };
}
