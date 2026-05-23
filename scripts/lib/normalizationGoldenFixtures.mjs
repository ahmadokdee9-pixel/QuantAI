/**
 * Golden-query fixture trays for normalization ranking evaluation (offline, no network).
 */

/** @returns {import("../../lib/shoppingScore.ts").QuantProduct} */
export function fixtureProduct(partial) {
  return {
    id: partial.id ?? 1,
    title: partial.title,
    store: partial.store,
    price: partial.price,
    displayPrice: partial.displayPrice ?? `$${partial.price}`,
    rating: partial.rating ?? 4.5,
    link: partial.link,
    image: partial.image ?? "https://example.com/img.jpg",
    reviewsCount: partial.reviewsCount ?? 120,
    shipping: null,
    availability: null,
    oldPrice: null,
    priceTrend: "stable",
    extensions: partial.extensions ?? [],
    ...partial,
  };
}

/** Duplicate merchants + cross-retailer equivalents — iPhone 15 128GB */
export const IPHONE_DUPLICATE_TRAY = [
  fixtureProduct({
    id: 1,
    title: "Apple iPhone 15 128GB Black",
    store: "Amazon",
    price: 799,
    link: "https://amazon.com/iphone15-a",
  }),
  fixtureProduct({
    id: 2,
    title: "Apple iPhone 15 128GB Black",
    store: "Amazon",
    price: 799,
    link: "https://amazon.com/iphone15-b",
  }),
  fixtureProduct({
    id: 3,
    title: "Apple iPhone 15 128GB Black Unlocked",
    store: "Best Buy",
    price: 789,
    link: "https://bestbuy.com/iphone15",
  }),
  fixtureProduct({
    id: 4,
    title: "Apple iPhone 15 256GB Black",
    store: "Walmart",
    price: 899,
    link: "https://walmart.com/iphone15-256",
  }),
  fixtureProduct({
    id: 5,
    title: "Apple iPhone 15 128GB - Renewed",
    store: "Amazon",
    price: 699,
    link: "https://amazon.com/iphone15-renewed",
    extensions: ["Renewed"],
  }),
];

/** Nike AF1 same-merchant duplicates */
export const NIKE_DUPLICATE_TRAY = [
  fixtureProduct({
    id: 1,
    title: "Nike Air Force 1 White Size 10",
    store: "Foot Locker",
    price: 110,
    link: "https://footlocker.com/af1-a",
  }),
  fixtureProduct({
    id: 2,
    title: "Nike Air Force 1 White Size 10",
    store: "Foot Locker",
    price: 110,
    link: "https://footlocker.com/af1-b",
  }),
  fixtureProduct({
    id: 3,
    title: "Nike Air Force 1 White Men's 10",
    store: "Nike",
    price: 115,
    link: "https://nike.com/af1",
  }),
  fixtureProduct({
    id: 4,
    title: "Nike Air Force 1 Black Size 10",
    store: "JD Sports",
    price: 112,
    link: "https://jdsports.com/af1-black",
  }),
];

export const LIVE_GOLDEN_QUERIES = [
  { id: "iphone-15-pro", query: "iphone 15 pro max", category: "phone" },
  { id: "samsung-s24", query: "samsung galaxy s24 256gb", category: "phone" },
  { id: "nike-af1", query: "nike air force 1 white", category: "shoes" },
  { id: "airpods", query: "airpods pro 2", category: "audio" },
  { id: "ysl-libre", query: "yves saint laurent libre edp 90ml", category: "fragrance" },
  { id: "ps5-controller", query: "ps5 dualsense controller", category: "electronics" },
  { id: "gaming-monitor", query: "gaming monitor 27 inch 144hz", category: "electronics" },
  { id: "office-chair", query: "ergonomic office chair", category: "furniture" },
];

export const GOLDEN_CASES = [
  {
    id: "iphone-15-duplicates",
    query: "iphone 15 128gb black",
    tray: IPHONE_DUPLICATE_TRAY,
    minUniqueTop3Shadow: 1,
    minUniqueTop3Apply: 2,
    minDuplicateListingsDetected: 1,
    expectVariantPreserved: true,
  },
  {
    id: "nike-af1-duplicates",
    query: "nike air force 1 white size 10",
    tray: NIKE_DUPLICATE_TRAY,
    minUniqueTop3Shadow: 1,
    minUniqueTop3Apply: 2,
    minDuplicateListingsDetected: 1,
    expectVariantPreserved: true,
  },
];
