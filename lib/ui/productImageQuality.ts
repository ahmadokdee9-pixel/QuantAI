import type { QuantProduct } from "@/lib/shoppingScore";

export type ProductImageMode = "catalog" | "reference" | "placeholder";

export type ProductImageResolution = {
  src: string | null;
  mode: ProductImageMode;
  caption: string;
  showImage: boolean;
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

/** Attempt to upgrade marketplace thumbnail URLs to catalog-grade resolution. */
function upgradeImageUrl(url: string): string {
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

/** Presentation-only image gate — prioritizes catalog-grade hero assets. */
export function resolveProductImageDisplay(product: QuantProduct): ProductImageResolution {
  const raw = product.image?.trim() ?? "";
  const identityConfidence = product.qiCanonicalIdentity?.identityConfidence ?? 0;
  const listingRisk = product.qiListingIdentity?.listingRisk01 ?? 0;
  const contamination = product.qiListingIdentity?.contaminationRisk01 ?? 0;
  const titleQuality = Number(product.qiProductUnderstanding?.titleQuality ?? 55);
  const suspicious =
    product.qiCommerce?.priceAnomaly === "suspicious_low" ||
    product.qiCommerce?.priceAnomaly === "premium_outlier";

  if (!raw) {
    return {
      src: null,
      mode: "placeholder",
      caption: "Verified catalog imagery pending",
      showImage: false,
    };
  }

  const upgraded = upgradeImageUrl(raw);
  const weakVisual =
    looksLowResolutionUrl(upgraded) ||
    listingRisk > 0.28 ||
    contamination > 0.62 ||
    titleQuality < 38;

  if (weakVisual && suspicious) {
    return {
      src: null,
      mode: "placeholder",
      caption: "Low-confidence seller imagery suppressed",
      showImage: false,
    };
  }

  if (identityConfidence >= 70 && listingRisk <= 0.15) {
    return {
      src: upgraded,
      mode: "catalog",
      caption: "Official catalog reference",
      showImage: true,
    };
  }

  if (weakVisual) {
    return {
      src: null,
      mode: "placeholder",
      caption: "Awaiting verified catalog imagery",
      showImage: false,
    };
  }

  return {
    src: upgraded,
    mode: listingRisk <= 0.14 ? "catalog" : "reference",
    caption: listingRisk <= 0.14 ? "Verified retail imagery" : "Verified retailer reference",
    showImage: true,
  };
}
