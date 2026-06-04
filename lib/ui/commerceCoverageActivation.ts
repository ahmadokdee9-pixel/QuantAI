/**
 * Phase 15.0 — Universal Commerce Coverage Layer.
 * Normalizes and aggregates merchant offers for the same product (presentation only).
 */

import { extractProductIdentity } from "@/lib/deals/productIdentity";
import {
  buildUnifiedMarketGroup,
  type UnifiedCardInsight,
  type UnifiedMarketGroup,
} from "@/lib/intelligence/unifiedMarketMatching";
import type { Phase93TrustDiscountMeta } from "@/lib/intelligence/phase93TrustDiscountHardening";
import { getStoreTrustScore, type QuantProduct } from "@/lib/shoppingScore";
import {
  activateDiscountTruth,
  findPhase93AssessmentForProduct,
  type ActivatedDiscountTruth,
} from "@/lib/ui/discountTruthActivation";

export type NormalizedMerchantOffer = {
  link: string;
  store: string;
  normalizedTitle: string;
  price: number;
  displayPrice: string;
  shippingLabel: string;
  availabilityStatus: string;
  discountPct: number | null;
  discountLabel: string;
  trustScore: number;
  isCurrentListing: boolean;
};

export type ActivatedCommerceCoverage = {
  merchantCount: number;
  listingCount: number;
  lowestPrice: number;
  lowestPriceLabel: string;
  highestDiscountPct: number | null;
  highestDiscountLabel: string;
  bestTrustedMerchant: string;
  bestTrustedLink: string;
  availabilityStatus: string;
  coverageSummaryLine: string;
  cardCoverageLine: string;
  drawerOffersSummary: string;
  viewAllOffersEnabled: boolean;
  viewAllOffersLabel: string;
  offers: NormalizedMerchantOffer[];
  familyId: string | null;
};

function clipLine(text: string | undefined | null, max = 112): string {
  if (text == null) return "";
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function formatPrice(price: number, sym = "€"): string {
  if (!Number.isFinite(price) || price <= 0) return "—";
  return `${sym}${Math.round(price)}`;
}

function normalizeTitle(product: QuantProduct): string {
  const normalized = extractProductIdentity(product).normalizedTitle?.trim();
  return clipLine(normalized || product.title, 96);
}

function normalizeStore(store: string): string {
  return store.trim().replace(/\s+/g, " ") || "Unknown merchant";
}

function normalizeShipping(product: QuantProduct): string {
  const shipping = product.shipping?.trim();
  if (shipping) return clipLine(shipping, 48);
  return "Shipping varies by merchant";
}

function normalizeAvailability(product: QuantProduct): string {
  const raw = (product.availability ?? "").trim();
  const lower = raw.toLowerCase();
  if (/out\s*of\s*stock|unavailable|sold\s*out/i.test(lower)) return "Out of stock";
  if (/in\s*stock|available|ready to ship/i.test(lower)) return "In stock";
  if (raw) return clipLine(raw, 32);
  return "Availability unconfirmed";
}

function normalizeDiscount(product: QuantProduct): { pct: number | null; label: string } {
  if (product.oldPrice == null || product.oldPrice <= product.price || product.price <= 0) {
    return { pct: null, label: "No listed discount" };
  }
  const pct = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
  return { pct, label: `${pct}% off` };
}

export function normalizeMerchantOffer(
  product: QuantProduct,
  currentLink: string,
  currencySym = "€",
  discountTruth: ActivatedDiscountTruth | null = null
): NormalizedMerchantOffer {
  const discount = normalizeDiscount(product);
  const discountLabel = discountTruth
    ? clipLine(`${discountTruth.label} · ${discountTruth.confidence}%`, 48)
    : discount.pct != null
      ? discount.label
      : "No listed discount";
  return {
    link: product.link,
    store: normalizeStore(product.store),
    normalizedTitle: normalizeTitle(product),
    price: product.price,
    displayPrice: displayPriceFor(product, currencySym),
    shippingLabel: normalizeShipping(product),
    availabilityStatus: normalizeAvailability(product),
    discountPct: discount.pct,
    discountLabel,
    trustScore: getStoreTrustScore(product.store),
    isCurrentListing: product.link === currentLink,
  };
}

function displayPriceFor(product: QuantProduct, currencySym: string): string {
  const labeled = product.displayPrice?.trim();
  if (labeled) return labeled;
  return formatPrice(product.price, currencySym);
}

function familyAvailabilityStatus(offers: NormalizedMerchantOffer[]): string {
  const inStock = offers.filter((o) => o.availabilityStatus === "In stock").length;
  const outOfStock = offers.filter((o) => o.availabilityStatus === "Out of stock").length;
  if (inStock > 0 && outOfStock === 0) return `In stock across ${inStock} merchant${inStock === 1 ? "" : "s"}`;
  if (inStock > 0 && outOfStock > 0) {
    return `Mixed availability — ${inStock} in stock, ${outOfStock} unavailable`;
  }
  if (outOfStock > 0) return "Mostly unavailable across matched merchants";
  return "Availability varies across matched merchants";
}

function buildCoverageSummary(args: {
  merchantCount: number;
  lowestPriceLabel: string;
  highestDiscountLabel: string;
  bestTrustedMerchant: string;
  availabilityStatus: string;
}): string {
  if (args.merchantCount <= 1) {
    return clipLine(`${args.bestTrustedMerchant} · ${args.lowestPriceLabel} · ${args.availabilityStatus}`);
  }
  return clipLine(
    `${args.merchantCount} merchants · from ${args.lowestPriceLabel} · ${args.highestDiscountLabel} · ${args.bestTrustedMerchant}`
  );
}

function sortOffers(offers: NormalizedMerchantOffer[]): NormalizedMerchantOffer[] {
  return [...offers].sort((a, b) => {
    if (a.price > 0 && b.price > 0 && a.price !== b.price) return a.price - b.price;
    return b.trustScore - a.trustScore;
  });
}

export function resolveFamilyMembers(
  product: QuantProduct,
  products: QuantProduct[],
  groups: UnifiedMarketGroup[]
): QuantProduct[] {
  for (const group of groups) {
    if (!group.memberIndices.some((index) => products[index]?.link === product.link)) continue;
    return group.memberIndices.map((index) => products[index]!).filter(Boolean);
  }
  return [product];
}

/** Activate merchant coverage for one product listing. */
export function activateCommerceCoverage(args: {
  product: QuantProduct;
  familyMembers: QuantProduct[];
  insight: UnifiedCardInsight | null;
  currencySym?: string;
  phase93?: Phase93TrustDiscountMeta | null;
  list?: QuantProduct[];
}): ActivatedCommerceCoverage {
  const { product, familyMembers, insight, currencySym = "€", phase93 = null, list = familyMembers } = args;
  const offers = sortOffers(
    familyMembers.map((member) => {
      const truth = activateDiscountTruth({
        product: member,
        list,
        phase93Assessment: findPhase93AssessmentForProduct(phase93, member),
      });
      return normalizeMerchantOffer(member, product.link, currencySym, truth);
    })
  );
  const merchantCount = new Set(offers.map((offer) => offer.store.toLowerCase())).size;
  const listingCount = offers.length;
  const pricedOffers = offers.filter((offer) => offer.price > 0);
  const lowest = pricedOffers[0] ?? offers[0];
  const lowestPrice = lowest?.price ?? product.price;
  const lowestPriceLabel = lowest ? lowest.displayPrice : formatPrice(product.price, currencySym);
  const discountOffers = offers.filter((offer) => offer.discountPct != null);
  const highestDiscount = discountOffers.sort(
    (a, b) => (b.discountPct ?? 0) - (a.discountPct ?? 0)
  )[0];
  const highestDiscountPct = highestDiscount?.discountPct ?? insight?.highestDiscountPct ?? null;
  const highestDiscountLabel =
    highestDiscountPct != null ? `${highestDiscountPct}% off max` : "No standout discount";
  const trustedSorted = [...offers].sort((a, b) => b.trustScore - a.trustScore);
  const bestTrusted =
    insight?.bestTrustedStore && insight.bestTrustedLink
      ? {
          store: insight.bestTrustedStore,
          link: insight.bestTrustedLink,
        }
      : {
          store: trustedSorted[0]?.store ?? normalizeStore(product.store),
          link: trustedSorted[0]?.link ?? product.link,
        };
  const availabilityStatus =
    merchantCount > 1 ? familyAvailabilityStatus(offers) : normalizeAvailability(product);
  const coverageSummaryLine = buildCoverageSummary({
    merchantCount,
    lowestPriceLabel,
    highestDiscountLabel,
    bestTrustedMerchant: bestTrusted.store,
    availabilityStatus,
  });

  return {
    merchantCount,
    listingCount,
    lowestPrice,
    lowestPriceLabel,
    highestDiscountPct,
    highestDiscountLabel,
    bestTrustedMerchant: bestTrusted.store,
    bestTrustedLink: bestTrusted.link,
    availabilityStatus,
    coverageSummaryLine,
    cardCoverageLine:
      merchantCount > 1
        ? clipLine(`${merchantCount} merchants · from ${lowestPriceLabel}`)
        : coverageSummaryLine,
    drawerOffersSummary: clipLine(
      merchantCount > 1
        ? `${listingCount} matched offers across ${merchantCount} merchants · best trusted ${bestTrusted.store}`
        : `${bestTrusted.store} · ${lowestPriceLabel} · ${availabilityStatus}`
    ),
    viewAllOffersEnabled: merchantCount > 1 || listingCount > 1,
    viewAllOffersLabel: "View all offers",
    offers,
    familyId: insight?.familyId ?? null,
  };
}

/** Build per-link commerce coverage for the current tray. */
export function buildCommerceCoverageTray(
  products: QuantProduct[],
  searchQuery = "",
  currencySym = "€",
  phase93: Phase93TrustDiscountMeta | null = null
): Map<string, ActivatedCommerceCoverage> {
  const map = new Map<string, ActivatedCommerceCoverage>();
  if (!products.length) return map;

  const { byLink, groups } = buildUnifiedMarketGroup(products, searchQuery);
  for (const product of products) {
    const insight = byLink.get(product.link) ?? null;
    const familyMembers = resolveFamilyMembers(product, products, groups);
    map.set(
      product.link,
      activateCommerceCoverage({
        product,
        familyMembers,
        insight,
        currencySym,
        phase93,
        list: products,
      })
    );
  }
  return map;
}

export function mergeCommerceCoverageChip(
  chips: Array<{ label: string; tone: "emerald" | "blue" | "violet" | "amber" | "slate" }>,
  coverage: ActivatedCommerceCoverage | null,
  max = 2
): Array<{ label: string; tone: "emerald" | "blue" | "violet" | "amber" | "slate" }> {
  if (!coverage || coverage.merchantCount < 2) return chips.slice(0, max);
  const chip = {
    label: clipLine(coverage.cardCoverageLine, 42),
    tone: "blue" as const,
  };
  const merged = [chip, ...chips.filter((item) => item.label !== chip.label)];
  return merged.slice(0, max);
}
