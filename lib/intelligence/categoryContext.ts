import type { ProductCategorySlug, CategoryWeightProfile } from "./types";
import { applyIntentAwareCategoryWeights } from "./intentRankingWeights";
import type { CommerceSearchIntents } from "./searchIntentV2";

const DEFAULT_WEIGHTS: CategoryWeightProfile = {
  price: 0.18,
  rating: 0.16,
  reviewDepth: 0.12,
  retailerTrust: 0.14,
  delivery: 0.08,
  popularity: 0.1,
  pricePerformance: 0.14,
  discountQuality: 0.08,
};

const PROFILES: Record<ProductCategorySlug, Partial<CategoryWeightProfile>> = {
  electronics: {
    rating: 0.19,
    retailerTrust: 0.17,
    reviewDepth: 0.15,
    pricePerformance: 0.15,
    price: 0.15,
    delivery: 0.07,
    popularity: 0.08,
    discountQuality: 0.04,
  },
  fashion: {
    retailerTrust: 0.18,
    rating: 0.17,
    reviewDepth: 0.13,
    price: 0.16,
    delivery: 0.07,
    popularity: 0.12,
    pricePerformance: 0.1,
    discountQuality: 0.07,
  },
  home: {
    price: 0.2,
    delivery: 0.1,
    retailerTrust: 0.15,
    rating: 0.15,
    reviewDepth: 0.11,
    popularity: 0.09,
    pricePerformance: 0.12,
    discountQuality: 0.08,
  },
  beauty: {
    rating: 0.19,
    reviewDepth: 0.15,
    retailerTrust: 0.16,
    price: 0.14,
    delivery: 0.06,
    popularity: 0.12,
    pricePerformance: 0.1,
    discountQuality: 0.08,
  },
  sports: {
    rating: 0.17,
    retailerTrust: 0.14,
    pricePerformance: 0.16,
    reviewDepth: 0.12,
    price: 0.17,
    delivery: 0.08,
    popularity: 0.1,
    discountQuality: 0.06,
  },
  toys: {
    retailerTrust: 0.16,
    rating: 0.16,
    price: 0.18,
    reviewDepth: 0.12,
    delivery: 0.08,
    popularity: 0.12,
    pricePerformance: 0.1,
    discountQuality: 0.08,
  },
  general: {},
};

function matchCategory(text: string): ProductCategorySlug {
  const t = text.toLowerCase();
  if (
    /\b(128|256|512|1024)\s*gb\b|\b\d{1,3}\s*(gb|tb)\b|\b\d{2}(\.\d)?\s*("|inch|inches)\b|\b(cm|mm)\b|\b(model|series)\b|\b(20\d{2})\b/i.test(
      t
    )
  ) {
    return "electronics";
  }
  if (
    /samsung|apple|sony|lg\b|dell|hp\b|lenovo|asus|acer|msi|bosch|makita|dewalt|kitchenaid|whirlpool|dyson|canon|nikon|fujifilm|olympus|panasonic|tcl|hisense|anker|jbl|bose|logitech|razer|corsair|steelseries|xiaomi|oneplus|oppo|vivo|huawei/i.test(
      t
    )
  ) {
    return "electronics";
  }
  if (
    /laptop|phone|iphone|android|tablet|gpu|graphics|monitor|tv|oled|qled|headphone|earbud|camera|drone|console|playstation|xbox|nintendo|router|ssd|ram|keyboard|mouse|speaker|smartwatch|charger|cable|usb|hdmi|pc\b|macbook|ipad|steam deck|gaming|mirrorless|dslr|gopro|webcam|microphone|capture card|vr headset|airpods|galaxy watch|pixel\b|nvidia|amd ryzen|intel core|magsafe|powerbank|bluetooth speaker/i.test(
      t
    )
  ) {
    return "electronics";
  }
  if (
    /drill\b|impact driver|circular saw|table saw|wrench|socket set|multimeter|pliers|hammer|toolbox|ladder|screwdriver|angle grinder|oscillating tool/i.test(
      t
    )
  ) {
    return "home";
  }
  if (/\bnike\b|adidas|puma|reebok|under armour|new balance|crocs|vans\b|timberland|zara|hm\b|uniqlo|gucci|prada/i.test(t)) {
    return "fashion";
  }
  if (
    /shoe|sneaker|boot|dress|shirt|jacket|coat|jeans|pants|skirt|handbag|wallet|watch\b|sunglass|jewelry|ring\b|necklace|apparel|fashion|clothing|size\s+(xs|s|m|l|xl|xxl|\d{2,3})|mens|womens|unisex/i.test(
      t
    )
  ) {
    return "fashion";
  }
  if (
    /furniture|sofa|couch|bed\b|mattress|desk|chair|table|lamp|rug|curtain|kitchen|dining|shelf|storage|home decor|garden|patio/i.test(
      t
    )
  ) {
    return "home";
  }
  if (/perfume|skincare|makeup|cosmetic|shampoo|serum|cream|lipstick|beauty/i.test(t)) {
    return "beauty";
  }
  if (
    /bike|bicycle|treadmill|dumbbell|yoga|fitness|golf|tennis|soccer|football|basketball|running|sport/i.test(
      t
    )
  ) {
    return "sports";
  }
  if (/toy|lego|doll|puzzle|board game|plush|kids|child/i.test(t)) {
    return "toys";
  }
  return "general";
}

export function inferProductCategory(searchQuery: string, productTitle: string): ProductCategorySlug {
  const combined = `${searchQuery} ${productTitle}`;
  return matchCategory(combined);
}

export function inferSearchCategory(searchQuery: string): ProductCategorySlug {
  return matchCategory(searchQuery);
}

export function getCategoryWeights(slug: ProductCategorySlug): CategoryWeightProfile {
  const patch = PROFILES[slug] ?? {};
  const merged: CategoryWeightProfile = { ...DEFAULT_WEIGHTS, ...patch };
  const sum =
    merged.price +
    merged.rating +
    merged.reviewDepth +
    merged.retailerTrust +
    merged.delivery +
    merged.popularity +
    merged.pricePerformance +
    merged.discountQuality;
  if (sum <= 0) return DEFAULT_WEIGHTS;
  const f = 1 / sum;
  return {
    price: merged.price * f,
    rating: merged.rating * f,
    reviewDepth: merged.reviewDepth * f,
    retailerTrust: merged.retailerTrust * f,
    delivery: merged.delivery * f,
    popularity: merged.popularity * f,
    pricePerformance: merged.pricePerformance * f,
    discountQuality: merged.discountQuality * f,
  };
}

/** Luxury / gaming / business phrasing nudges weights without new category enums. */
function queryCommercePersonaPatch(searchQuery: string): Partial<CategoryWeightProfile> | null {
  const q = searchQuery.toLowerCase();
  if (
    /\b(gaming|esports|rtx|gtx|\bgpu\b|144hz|165hz|240hz|360hz|steam deck|console|playstation|xbox|nintendo)\b/.test(q)
  ) {
    return { pricePerformance: 0.18, retailerTrust: 0.17, delivery: 0.09, discountQuality: 0.04 };
  }
  if (/\b(luxury|designer|flagship|prestige|limited edition)\b/.test(q)) {
    return { retailerTrust: 0.2, rating: 0.2, reviewDepth: 0.16, discountQuality: 0.05 };
  }
  if (/\b(business|office|workstation|productivity|invoice|warranty)\b/.test(q)) {
    return { retailerTrust: 0.19, delivery: 0.1, rating: 0.17, discountQuality: 0.05 };
  }
  return null;
}

export function getCategoryWeightsForQuery(
  searchQuery: string,
  productTitle: string,
  intents?: CommerceSearchIntents
): CategoryWeightProfile {
  const slug = inferProductCategory(searchQuery, productTitle);
  const base = getCategoryWeights(slug);
  const patch = queryCommercePersonaPatch(searchQuery);
  const merged: CategoryWeightProfile = patch ? { ...base, ...patch } : { ...base };
  const sum0 =
    merged.price +
    merged.rating +
    merged.reviewDepth +
    merged.retailerTrust +
    merged.delivery +
    merged.popularity +
    merged.pricePerformance +
    merged.discountQuality;
  if (sum0 <= 0) return base;
  const f0 = 1 / sum0;
  const normalizedBase: CategoryWeightProfile = {
    price: merged.price * f0,
    rating: merged.rating * f0,
    reviewDepth: merged.reviewDepth * f0,
    retailerTrust: merged.retailerTrust * f0,
    delivery: merged.delivery * f0,
    popularity: merged.popularity * f0,
    pricePerformance: merged.pricePerformance * f0,
    discountQuality: merged.discountQuality * f0,
  };
  if (!intents) return normalizedBase;
  return applyIntentAwareCategoryWeights(normalizedBase, intents, slug);
}
