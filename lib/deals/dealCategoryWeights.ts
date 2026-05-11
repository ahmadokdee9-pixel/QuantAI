import type { QuantProduct } from "@/lib/shoppingScore";
import { inferProductCategory } from "@/lib/intelligence/categoryContext";
import type { ProductCategorySlug } from "@/lib/intelligence/types";

/**
 * Finer market segment for weights + copy — keyword-driven, not hard-wired to one vertical.
 * Unknown products fall back to `general`.
 */
export type DealMarketSegment =
  | "phones"
  | "laptops"
  | "headphones"
  | "monitors"
  | "tvs"
  | "cameras"
  | "watches"
  | "shoes"
  | "gaming"
  | "tools"
  | "accessories"
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

/** Segment from titles + optional server category (universal, keyword-first). */
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
  else if (/(oled tv|qled tv|smart tv|\btv\b|television)/i.test(t)) segment = "tvs";
  else if (/(camera|mirrorless|dslr|lens\b|gopro|canon|nikon|fuji|sony a\d)/i.test(t)) segment = "cameras";
  else if (/(chronograph|timepiece|\bwatch\b|smartwatch|apple watch)/i.test(t)) segment = "watches";
  else if (/(shoe|sneaker|boot|trainer|loafer|heel|sandals)/i.test(t)) segment = "shoes";
  else if (/(gaming|steam deck|ps5|xbox|switch|esports|racing wheel|gaming chair)/i.test(t)) segment = "gaming";
  else if (/(drill|saw\b|wrench|toolbox|multimeter|pliers|hammer|ladder|power tool)/i.test(t)) segment = "tools";
  else if (/(case\b|cover\b|cable|charger|adapter|mount|strap|stand|skin|screen protector|hub\b)/i.test(t))
    segment = "accessories";
  else if (/(fridge|refrigerator|washer|washing machine|dryer|dishwasher|oven|microwave|vacuum cleaner)/i.test(t))
    segment = "appliances";
  else if (slug === "fashion" || /(dress|jacket|jeans|handbag|apparel|clothing)/i.test(t)) segment = "fashion";
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
    tvs: "TVs & home cinema",
    cameras: "Cameras & optics",
    watches: "Watches & wearables",
    shoes: "Shoes & sneakers",
    gaming: "Gaming & consoles",
    tools: "Tools & DIY",
    accessories: "Accessories & peripherals",
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

function normBlend(b: DealQualityBlend): DealQualityBlend {
  const sum =
    b.composite +
    b.trust +
    b.rating +
    b.reviewDepth +
    b.delivery +
    b.discountAuth +
    b.savingsVsFair +
    b.volatilityPenalty +
    b.fakePenalty +
    b.returnClarity +
    b.stockUrgency;
  const f = sum > 0 ? 1 / sum : 1;
  return {
    composite: b.composite * f,
    trust: b.trust * f,
    rating: b.rating * f,
    reviewDepth: b.reviewDepth * f,
    delivery: b.delivery * f,
    discountAuth: b.discountAuth * f,
    savingsVsFair: b.savingsVsFair * f,
    volatilityPenalty: b.volatilityPenalty * f,
    fakePenalty: b.fakePenalty * f,
    returnClarity: b.returnClarity * f,
    stockUrgency: b.stockUrgency * f,
  };
}

/** Category-tuned blend for deep deal scoring (sums ~1 after normalization). */
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

  const patches: Partial<Record<DealMarketSegment, Partial<DealQualityBlend>>> = {
    phones: { trust: 0.17, rating: 0.14, reviewDepth: 0.13, delivery: 0.07, composite: 0.24, discountAuth: 0.09 },
    laptops: { trust: 0.16, rating: 0.14, reviewDepth: 0.13, composite: 0.25, returnClarity: 0.07 },
    headphones: { rating: 0.15, reviewDepth: 0.14, composite: 0.26, delivery: 0.09, discountAuth: 0.1 },
    monitors: { rating: 0.15, reviewDepth: 0.13, composite: 0.26, delivery: 0.08, discountAuth: 0.09 },
    tvs: { delivery: 0.11, trust: 0.15, returnClarity: 0.1, composite: 0.22, savingsVsFair: 0.13 },
    cameras: { reviewDepth: 0.15, trust: 0.15, rating: 0.13, composite: 0.24, returnClarity: 0.08 },
    watches: { trust: 0.18, returnClarity: 0.11, rating: 0.14, composite: 0.2, discountAuth: 0.08 },
    shoes: { trust: 0.17, returnClarity: 0.12, rating: 0.13, reviewDepth: 0.12, composite: 0.2 },
    gaming: { trust: 0.15, delivery: 0.09, composite: 0.26, reviewDepth: 0.12, discountAuth: 0.08 },
    tools: { trust: 0.16, delivery: 0.1, returnClarity: 0.1, composite: 0.22, savingsVsFair: 0.13 },
    accessories: { composite: 0.24, trust: 0.13, discountAuth: 0.11, delivery: 0.09, reviewDepth: 0.11 },
    appliances: { trust: 0.16, delivery: 0.12, savingsVsFair: 0.14, composite: 0.22, returnClarity: 0.1 },
    fashion: { trust: 0.18, returnClarity: 0.12, rating: 0.14, reviewDepth: 0.12, composite: 0.2 },
    furniture: { delivery: 0.12, trust: 0.15, savingsVsFair: 0.14, composite: 0.22, returnClarity: 0.1 },
    home: { composite: 0.22, trust: 0.14, delivery: 0.1, savingsVsFair: 0.13, returnClarity: 0.09 },
    electronics: { trust: 0.15, rating: 0.13, reviewDepth: 0.12, composite: 0.26, discountAuth: 0.09 },
    beauty: { reviewDepth: 0.15, trust: 0.17, rating: 0.15, composite: 0.2, returnClarity: 0.09 },
    sports: { rating: 0.17, trust: 0.14, composite: 0.24, reviewDepth: 0.12, delivery: 0.09 },
    toys: { trust: 0.16, rating: 0.15, composite: 0.22, reviewDepth: 0.11 },
    general: {},
  };

  const patch = patches[segment] ?? {};
  const merged = { ...base, ...patch };
  return normBlend(merged);
}
