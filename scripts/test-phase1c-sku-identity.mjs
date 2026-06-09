#!/usr/bin/env node
/**
 * Phase 1C — SKU identity layer tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  normalizeMerchantKey,
  extractMerchantListingId,
  listingsShareCanonicalSku,
  groupResolvedIdentitiesBySku,
} from "../lib/truth/crossMerchantLinking.ts";
import { buildProductFingerprint } from "../lib/truth/productFingerprint.ts";
import { extractStructuredIdentifiers, resolveSkuIdentity } from "../lib/truth/skuResolver.ts";
import { attachSkuIdsToRefreshTargets } from "../lib/truth/refreshQueueSku.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("skuIdentity"), "UI not wired to SKU layer");
const searchRoute = readFileSync(join(process.cwd(), "app/api/search/route.ts"), "utf8");
assert.ok(!searchRoute.includes("resolveAndPersistSkuIdentity"), "search route unchanged");
const truthGate = readFileSync(join(process.cwd(), "lib/truth/truthConfidenceGate.ts"), "utf8");
assert.ok(!truthGate.includes("skuResolver"), "truth gate unchanged");
pass("no_ui_search_verdict_wiring");

const productBase = {
  id: 1,
  title: "Apple AirPods Pro 2 USB-C",
  price: 219,
  displayPrice: "€219",
  rating: 4.8,
  image: "",
  reviewsCount: 500,
  shipping: "Free delivery",
  availability: "In stock",
  oldPrice: null,
  priceTrend: "stable",
  extensions: ["In stock"],
};

const amazon = {
  ...productBase,
  store: "Amazon.com",
  link: "https://www.amazon.com/dp/B0CHWRXH8B",
};
const walmart = {
  ...productBase,
  store: "Walmart",
  link: "https://www.walmart.com/ip/apple-airpods-pro/123456789",
};
const bestbuy = {
  ...productBase,
  store: "Best Buy",
  link: "https://www.bestbuy.com/site/1234567.p",
};
const targetStore = {
  ...productBase,
  store: "Target",
  link: "https://www.target.com/p/airpods/-/A-87654321",
};
const ebay = {
  ...productBase,
  store: "eBay",
  link: "https://www.ebay.com/itm/123456789012",
};

assert.equal(normalizeMerchantKey("Amazon.com", amazon.link), "amazon");
assert.equal(normalizeMerchantKey("Walmart", walmart.link), "walmart");
assert.equal(normalizeMerchantKey("Best Buy", bestbuy.link), "bestbuy");
assert.equal(normalizeMerchantKey("Target", targetStore.link), "target");
assert.equal(normalizeMerchantKey("eBay", ebay.link), "ebay");
pass("merchant_normalization");

assert.equal(extractMerchantListingId(amazon.link, "amazon"), "B0CHWRXH8B");
assert.equal(extractMerchantListingId(ebay.link, "ebay"), "123456789012");
pass("merchant_listing_ids");

const identities = [amazon, walmart, bestbuy, targetStore, ebay].map((product) =>
  resolveSkuIdentity({ product, listingUrl: product.link })
);
for (let i = 1; i < identities.length; i += 1) {
  assert.ok(
    listingsShareCanonicalSku(identities[0], identities[i]),
    `cross-merchant link failed at index ${i}`
  );
}
pass("cross_merchant_same_canonical_sku");

const gtinProduct = {
  ...productBase,
  title: "Sony WH-1000XM5 Wireless Headphones GTIN 12345678901234",
  store: "Bol.com",
  link: "https://shop.example/sony-xm5",
};
const gtinIds = extractStructuredIdentifiers(gtinProduct);
assert.ok(gtinIds.some((id) => id.kind === "gtin"));
const gtinResolved = resolveSkuIdentity({ product: gtinProduct, listingUrl: gtinProduct.link });
assert.equal(gtinResolved.resolverMethod, "gtin");
assert.ok(gtinResolved.canonicalSkuId.startsWith("gtin:"));
assert.equal(gtinResolved.identityConfidence, 98);
pass("gtin_resolver_priority");

const mpnProduct = {
  ...productBase,
  title: "Dell XPS 15 MPN: XPS9520-7845",
  store: "Dell",
  link: "https://www.dell.com/xps",
};
const mpnResolved = resolveSkuIdentity({ product: mpnProduct, listingUrl: mpnProduct.link });
assert.equal(mpnResolved.resolverMethod, "mpn");
pass("mpn_resolver");

const fingerprint = buildProductFingerprint(amazon);
assert.ok(fingerprint.normalizedTitle.includes("airpods"));
assert.ok(fingerprint.modelTokens.length > 0);
assert.ok(fingerprint.fingerprintKey.includes("::"));
pass("product_fingerprint");

const grouped = groupResolvedIdentitiesBySku(identities);
assert.equal(grouped.size, 1);
assert.equal(grouped.get(identities[0].canonicalSkuId)?.length, 5);
pass("group_by_canonical_sku");

const targets = attachSkuIdsToRefreshTargets(
  [
    {
      jobId: "j1",
      listingUrl: amazon.link,
      title: amazon.title,
      store: amazon.store,
      skuId: null,
      searchQuery: null,
      referencePrice: 219,
      source: "watchlist",
      priority: 1,
      lastObservedAt: null,
      freshnessScore: null,
      ageHours: null,
    },
  ],
  new Map([
    [
      amazon.link,
      {
        id: "map-1",
        canonical_sku_id: identities[0].canonicalSkuId,
        listing_url: amazon.link,
        merchant_key: "amazon",
        merchant_listing_id: "B0CHWRXH8B",
        match_confidence: 78,
        resolver_method: "brand_model",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  ])
);
assert.equal(targets[0].skuId, identities[0].canonicalSkuId);
pass("refresh_queue_sku_attach");

console.log(`\nPhase 1C SKU identity: ${passed} checks passed.`);
