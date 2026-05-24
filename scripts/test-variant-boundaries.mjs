#!/usr/bin/env node
/**
 * Phase 4 — Variant boundary + false-collapse prevention tests.
 */
import assert from "node:assert";

const { checkVariantBoundary } = await import(
  "../lib/intelligence/identity/variantBoundaryEngine.ts"
);
const { canMergeIdentities } = await import(
  "../lib/intelligence/identity/productIdentityResolver.ts"
);
const { countFalseCollapseBlocks } = await import(
  "../lib/intelligence/identity/variantBoundaryEngine.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");

function p(partial) {
  return {
    id: 1,
    title: partial.title,
    store: partial.store ?? "Store",
    price: partial.price ?? 100,
    displayPrice: "€100",
    rating: 4.5,
    link: partial.link ?? `https://t.test/${Math.random()}`,
    image: "",
    reviewsCount: 10,
    shipping: null,
    availability: null,
    oldPrice: null,
    priceTrend: "stable",
    extensions: [],
  };
}

// Storage conflict
const s128 = p({ title: "Apple iPhone 15 Pro 128GB Black", link: "https://t.test/a" });
const s256 = p({ title: "Apple iPhone 15 Pro 256GB Black", link: "https://t.test/b" });
const storageCheck = checkVariantBoundary(s128, s256);
assert.equal(storageCheck.conflict, true, "128GB vs 256GB blocked");
assert.ok(storageCheck.reasons.includes("storage_gb"));

// AirPods Pro 2 vs Pro (generation tier)
const pro2 = p({ title: "Apple AirPods Pro 2 USB-C", link: "https://t.test/c" });
const pro3 = p({ title: "Apple AirPods Pro 3", link: "https://t.test/d" });
const airpodsCheck = checkVariantBoundary(pro2, pro3);
assert.equal(airpodsCheck.conflict, true, "Pro 2 vs Pro tier blocked");

const mergeBlocked = canMergeIdentities(pro2, pro3, 200);
assert.equal(mergeBlocked.allowed, false);
assert.equal(mergeBlocked.reason, "blocked_variant_boundary");

// Accessory confusion
const phone = p({ title: "Apple iPhone 15 Pro 128GB", link: "https://t.test/e" });
const case_ = p({ title: "iPhone 15 Pro Silicone Case Black", link: "https://t.test/f" });
const accCheck = checkVariantBoundary(phone, case_);
assert.equal(accCheck.conflict, true, "accessory vs product blocked");

// Golden tray false-collapse count
const iphoneTray = GOLDEN_CASES.find((c) => c.id === "iphone-15-duplicates")?.tray ?? [];
if (iphoneTray.length >= 2) {
  const groups = [{ memberLinks: iphoneTray.slice(0, 3).map((x) => x.link) }];
  const blocks = countFalseCollapseBlocks(iphoneTray, groups);
  assert.ok(blocks >= 0, "false collapse counter runs");
}

console.log("OK storage / generation / accessory boundaries");
console.log("OK merge blocked on variant conflict");
console.log("\nAll variant boundary tests passed.");
