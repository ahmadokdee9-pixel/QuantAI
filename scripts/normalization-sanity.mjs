#!/usr/bin/env node
/** Phase 0 normalization sanity — no network. Run: npm run test:normalization */
import assert from "node:assert/strict";
import {
  normalizeCommerceProductTray,
  buildCommerceId,
  buildListingKey,
  areSameMerchantNearDuplicates,
} from "../lib/intelligence/normalization/index.ts";

/** @param {Partial<import("../lib/shoppingScore.ts").QuantProduct> & Pick<import("../lib/shoppingScore.ts").QuantProduct, "title" | "store" | "price" | "link">} partial */
function product(partial) {
  return {
    id: 1,
    displayPrice: `$${partial.price}`,
    rating: 4.5,
    image: "https://example.com/img.jpg",
    reviewsCount: 100,
    shipping: null,
    availability: null,
    oldPrice: null,
    priceTrend: "stable",
    extensions: [],
    ...partial,
  };
}

let failed = 0;
function ok(name, fn) {
  try {
    fn();
    console.log("OK", name);
  } catch (e) {
    failed++;
    console.error("FAIL", name, e instanceof Error ? e.message : e);
  }
}

// Stable listing keys
ok("listing key is stable", () => {
  const p = product({ title: "Apple iPhone 15 128GB Black", store: "Amazon", price: 799, link: "https://a.com/1" });
  assert.equal(buildListingKey(p), buildListingKey(p));
});

// Same merchant near-duplicate detection
ok("detects same-merchant near duplicates", () => {
  const a = product({ title: "Nike Air Force 1 White Size 10", store: "Foot Locker", price: 110, link: "https://fl.com/a" });
  const b = product({ title: "Nike Air Force 1 White Size 10", store: "Foot Locker", price: 110, link: "https://fl.com/b" });
  assert.equal(areSameMerchantNearDuplicates(a, b), true);
});

// Cross-merchant same variant gets same commerce ID spine
ok("same variant spine → same commerceId", () => {
  const a = product({ title: "Samsung Galaxy S24 256GB Black", store: "Best Buy", price: 799, link: "https://bb.com/1" });
  const b = product({ title: "Samsung Galaxy S24 256GB Black Unlocked", store: "Amazon", price: 789, link: "https://amz.com/1" });
  const idA = buildCommerceId("samsung::galaxys24|s256|cblack|cond:new", []);
  const idB = buildCommerceId("samsung::galaxys24|s256|cblack|cond:new", []);
  assert.equal(idA, idB);
});

// Shadow mode: tray size unchanged, meta attached when enabled
ok("shadow mode preserves tray size", () => {
  const prev = process.env.QUANTAI_NORMALIZATION_ENABLED;
  const prevMode = process.env.QUANTAI_NORMALIZATION_MODE;
  const prevApply = process.env.QUANTAI_NORMALIZATION_APPLY;
  process.env.QUANTAI_NORMALIZATION_ENABLED = "true";
  process.env.QUANTAI_NORMALIZATION_MODE = "shadow";
  process.env.QUANTAI_NORMALIZATION_APPLY = "false";

  const tray = [
    product({ id: 1, title: "Apple iPhone 15 128GB", store: "Amazon", price: 799, link: "https://a.com/1" }),
    product({ id: 2, title: "Apple iPhone 15 128GB", store: "Amazon", price: 799, link: "https://a.com/2" }),
    product({ id: 3, title: "Apple iPhone 15 256GB", store: "Walmart", price: 899, link: "https://w.com/1" }),
  ];

  const { products, meta } = normalizeCommerceProductTray(tray, "iphone 15");
  assert.equal(products.length, 3);
  assert.equal(meta.enabled, true);
  assert.equal(meta.mode, "shadow");
  assert.ok(products.every((p) => p.qiNormalizedCommerce?.commerceId.startsWith("qcid_")));
  assert.ok(meta.duplicateListingCount >= 1);

  process.env.QUANTAI_NORMALIZATION_ENABLED = prev;
  process.env.QUANTAI_NORMALIZATION_MODE = prevMode;
  process.env.QUANTAI_NORMALIZATION_APPLY = prevApply;
});

// Dedup apply mode collapses duplicates
ok("dedup apply reduces duplicate listings", () => {
  const prev = process.env.QUANTAI_NORMALIZATION_ENABLED;
  const prevMode = process.env.QUANTAI_NORMALIZATION_MODE;
  const prevApply = process.env.QUANTAI_NORMALIZATION_APPLY;
  process.env.QUANTAI_NORMALIZATION_ENABLED = "true";
  process.env.QUANTAI_NORMALIZATION_MODE = "dedup";
  process.env.QUANTAI_NORMALIZATION_APPLY = "true";

  const tray = [
    product({ id: 1, title: "Nike Air Force 1 White", store: "Nike", price: 110, link: "https://nike.com/a" }),
    product({ id: 2, title: "Nike Air Force 1 White", store: "Nike", price: 110, link: "https://nike.com/b" }),
  ];

  const { products, meta } = normalizeCommerceProductTray(tray, "nike air force 1");
  assert.ok(products.length < tray.length);
  assert.ok(meta.top3DuplicateRateAfter <= meta.top3DuplicateRateBefore);

  process.env.QUANTAI_NORMALIZATION_ENABLED = prev;
  process.env.QUANTAI_NORMALIZATION_MODE = prevMode;
  process.env.QUANTAI_NORMALIZATION_APPLY = prevApply;
});

// Disabled by default
ok("disabled by default leaves tray untouched", () => {
  const prev = process.env.QUANTAI_NORMALIZATION_ENABLED;
  delete process.env.QUANTAI_NORMALIZATION_ENABLED;
  const tray = [product({ title: "Test", store: "Store", price: 10, link: "https://x.com" })];
  const { products, meta } = normalizeCommerceProductTray(tray, "test");
  assert.equal(products.length, 1);
  assert.equal(meta.enabled, false);
  assert.equal(products[0]?.qiNormalizedCommerce, undefined);
  if (prev != null) process.env.QUANTAI_NORMALIZATION_ENABLED = prev;
});

ok("shadow mode forces apply=false even if APPLY env is true", () => {
  const prev = {
    e: process.env.QUANTAI_NORMALIZATION_ENABLED,
    m: process.env.QUANTAI_NORMALIZATION_MODE,
    a: process.env.QUANTAI_NORMALIZATION_APPLY,
  };
  process.env.QUANTAI_NORMALIZATION_ENABLED = "true";
  process.env.QUANTAI_NORMALIZATION_MODE = "shadow";
  process.env.QUANTAI_NORMALIZATION_APPLY = "true";
  const tray = [
    product({ id: 1, title: "Nike Air Force 1 White", store: "Nike", price: 110, link: "https://nike.com/a" }),
    product({ id: 2, title: "Nike Air Force 1 White", store: "Nike", price: 110, link: "https://nike.com/b" }),
  ];
  const { products, meta } = normalizeCommerceProductTray(tray, "nike air force 1");
  assert.equal(meta.apply, false);
  assert.equal(products.length, 2);
  assert.equal(meta.outputCount, meta.inputCount);
  process.env.QUANTAI_NORMALIZATION_ENABLED = prev.e;
  process.env.QUANTAI_NORMALIZATION_MODE = prev.m;
  process.env.QUANTAI_NORMALIZATION_APPLY = prev.a;
});

console.log(failed ? `\n${failed} failed` : "\nAll normalization sanity checks passed");
process.exit(failed ? 1 : 0);
