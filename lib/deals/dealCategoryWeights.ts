import type { QuantProduct } from "@/lib/shoppingScore";
import { inferProductCategory } from "@/lib/intelligence/categoryContext";
import type { ProductCategorySlug } from "@/lib/intelligence/types";

/** Finer market segment for copy + weight tuning (UI label). */
export type DealMarketSegment =
  | "phones"
  | "laptops"
  | "headphones"
  | "monitors"
  | "appliances"
  | "fashion"
  | "furniture"
  | "home"
  | "electronics"
  | "beauty"
  | "sports"
  | "toys"
  | "general";

export type DealQualityBlend = {
  /** 0–1 weights for listing-level deal quality (normalized later). */
  composite: number;
  trust: number;
  rating: number;
  reviewDepth: number;
  delivery: number;
  discountAuth: number;
  savingsVsFair: number;
  volatilityPenalty: number;
  fakePenalty: number;
  returnClarity: number;
  stockUrgency: number;
};

function titleBlob(listings: QuantProduct[]): string {
  return listings.map((p) => p.title).join(" ");
}

/** Segment from titles + optional server category. */
export function inferDealMarketSegment(listings: QuantProduct[]): {
  segment: DealMarketSegment;
  slug: ProductCategorySlug;
  label: string;
} {
  const blob = titleBlob(listings);
  const slugFromQi = listings.find((p) => p.qiCategory)?.qiCategory;
  const slug = slugFromQi ?? inferProductCategory("", blob);

  let segment: DealMarketSegment = "general";
  const t = blob.toLowerCase();

  if (/(iphone|pixel|galaxy s|oneplus|smartphone|android phone|\bphone\b)/i.test(t)) segment = "phones";
  else if (/(macbook|laptop|chromebook|thinkpad|zenbook|notebook)/i.test(t)) segment = "laptops";
  else if (/(headphone|earbud|airpod|headset|wh-1000)/i.test(t)) segment = "headphones";
  else if (/(monitor|display|\d{2,3}\s*hz.*monitor|ultrawide)/i.test(t)) segment = "monitors";
  else if (/(fridge|refrigerator|washer|washing machine|dryer|dishwasher|oven|microwave|vacuum cleaner)/i.test(t))
    segment = "appliances";
  else if (slug === "fashion" || /(shoe|sneaker|jacket|dress|jeans|handbag)/i.test(t)) segment = "fashion";
  else if (/(sofa|couch|mattress|bookshelf|dining table|office chair|wardrobe)/i.test(t)) segment = "furniture";
  else if (slug === "home") segment = "home";
  else if (slug === "beauty") segment = "beauty";
  else if (slug === "sports") segment = "sports";
  else if (slug === "toys") segment = "toys";
  else if (slug === "electronics") segment = "electronics";

  const labels: Record<DealMarketSegment, string> = {
    phones: "Phones & handhelds",
    laptops: "Laptops & notebooks",
    headphones: "Headphones & audio wear",
    monitors: "Monitors & displays",
    appliances: "Appliances",
    fashion: "Fashion & apparel",
    furniture: "Furniture",
    home: "Home & living",
    electronics: "Electronics",
    beauty: "Beauty & care",
    sports: "Sports & fitness",
    toys: "Toys & kids",
    general: "General merchandise",
  };

  return { segment, slug, label: labels[segment] };
}

/** Category-tuned blend for deep deal scoring (sums ~1 before normalization). */
export function getDealQualityBlend(segment: DealMarketSegment): DealQualityBlend {
  const base: DealQualityBlend = {
    composite: 0.28,
    trust: 0.14,
    rating: 0.12,
    reviewDepth: 0.1,
    delivery: 0.08,
    discountAuth: 0.1,
    savingsVsFair: 0.12,
    volatilityPenalty: 0.04,
    fakePenalty: 0.08,
    returnClarity: 0.06,
    stockUrgency: 0.02,
  };

  const patch: Partial<DealQualityBlend> =
    segment === "phones" || segment === "laptops"
      ? { trust: 0.17, rating: 0.14, reviewDepth: 0.13, delivery: 0.07, composite: 0.24, discountAuth: 0.09 }
      : segment === "headphones" || segment === "monitors"
        ? { rating: 0.15, reviewDepth: 0.14, composite: 0.26, delivery: 0.09, discountAuth: 0.1 }
        : segment === "appliances" || segment === "furniture"
          ? { trust: 0.16, delivery: 0.12, savingsVsFair: 0.14, composite: 0.22, returnClarity: 0.1 }
          : segment === "fashion" || segment === "beauty"
            ? { trust: 0.18, returnClarity: 0.12, rating: 0.14, reviewDepth: 0.12, composite: 0.2 }
            : segment === "electronics"
              ? { trust: 0.15, rating: 0.13, reviewDepth: 0.12, composite: 0.26, discountAuth: 0.09 }
              : {};

  const merged = { ...base, ...patch };
  const sum =
    merged.composite +
    merged.trust +
    merged.rating +
    merged.reviewDepth +
    merged.delivery +
    merged.discountAuth +
    merged.savingsVsFair +
    merged.volatilityPenalty +
    merged.fakePenalty +
    merged.returnClarity +
    merged.stockUrgency;
  const f = sum > 0 ? 1 / sum : 1;
  return {
    composite: merged.composite * f,
    trust: merged.trust * f,
    rating: merged.rating * f,
    reviewDepth: merged.reviewDepth * f,
    delivery: merged.delivery * f,
    discountAuth: merged.discountAuth * f,
    savingsVsFair: merged.savingsVsFair * f,
    volatilityPenalty: merged.volatilityPenalty * f,
    fakePenalty: merged.fakePenalty * f,
    returnClarity: merged.returnClarity * f,
    stockUrgency: merged.stockUrgency * f,
  };
}
