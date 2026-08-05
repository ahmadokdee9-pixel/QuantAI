/**
 * H-01 regression — popular SKU queries must not empty the tray via identity gate.
 * Fixtures: Dyson V15, Nike Pegasus 41 (production H-01).
 *
 * Usage: npx tsx scripts/test-h01-empty-search-identity.mjs
 */
import assert from "node:assert/strict";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import {
  applyHardIdentityGate,
  recoverSafeIdentityBreadth,
} from "../lib/intelligence/productIdentity.ts";

function product(title, i = 0) {
  return {
    id: `p${i}`,
    title,
    store: "Bol.com",
    price: 400 + i * 10,
    currency: "EUR",
    link: `https://example.com/${i}`,
    image: "https://example.com/i.jpg",
    rating: 4.5,
    reviewsCount: 20,
    source: "live",
    extensions: [],
  };
}

let failed = 0;
function check(cond, msg) {
  try {
    assert.ok(cond, msg);
    console.log(`[PASS] ${msg}`);
  } catch (e) {
    failed += 1;
    console.error(`[FAIL] ${msg}`, e instanceof Error ? e.message : e);
  }
}

console.log("=== H-01 canonical model corruption ===\n");

{
  const cq = buildCanonicalQuery("Dyson V15");
  check(cq.brand === "dyson", "Dyson brand detected");
  check(typeof cq.model === "string" && cq.model.length > 0, "Dyson model present");
  // Must not triplicate query into model (production bug)
  const modelLower = String(cq.model).toLowerCase();
  const dysonCount = (modelLower.match(/dyson/g) || []).length;
  check(dysonCount === 0, `Dyson model must not re-include brand (got "${cq.model}")`);
  check(!/v15\s+dyson/i.test(modelLower), `Dyson model must be clean token (got "${cq.model}")`);
  check(/\bv15\b/i.test(modelLower), `Dyson model includes v15 (got "${cq.model}")`);
}

{
  const cq = buildCanonicalQuery("Nike Pegasus 41");
  check(cq.brand === "nike", "Nike brand detected");
  check(/\bpegasus\b/i.test(String(cq.model)), "Nike model includes pegasus");
  check(/\b41\b/.test(String(cq.model)), `Nike model includes version 41 (got "${cq.model}")`);
}

console.log("\n=== H-01 identity gate must keep real listings ===\n");

{
  const cq = buildCanonicalQuery("Dyson V15");
  const products = [
    "Dyson V15 Detect Absolute steelstofzuiger",
    "Dyson V15 Detect Absolute",
    "Dyson V15 Complete",
    "Dyson V15 Filter Replacement",
    "Case for Dyson V15",
  ].map(product);
  const gated = applyHardIdentityGate(products, cq);
  const recovered =
    gated.length === 0 ? recoverSafeIdentityBreadth(products, cq) : gated;
  const titles = recovered.map((p) => p.title.toLowerCase());
  check(recovered.length >= 2, `Dyson tray keeps ≥2 products (got ${recovered.length})`);
  check(
    titles.some((t) => t.includes("v15") && !t.includes("filter") && !t.includes("case")),
    "Dyson tray includes a primary V15 vacuum listing"
  );
  check(
    !titles.every((t) => t.includes("filter") || t.includes("case")),
    "Dyson tray is not only accessories"
  );
}

{
  const cq = buildCanonicalQuery("Nike Pegasus 41");
  const products = [
    "Nike Pegasus 41 Heren",
    "Nike Air Zoom Pegasus 41",
    "Nike Pegasus 41 Running Shoes",
    "Nike Pegasus 40",
    "Nike Pegasus socks",
  ].map(product);
  const gated = applyHardIdentityGate(products, cq);
  const recovered =
    gated.length === 0 ? recoverSafeIdentityBreadth(products, cq) : gated;
  const titles = recovered.map((p) => p.title.toLowerCase());
  check(recovered.length >= 2, `Nike tray keeps ≥2 products (got ${recovered.length})`);
  check(
    titles.some((t) => t.includes("pegasus") && t.includes("41")),
    "Nike tray includes a Pegasus 41 shoe listing"
  );
}

if (failed) {
  console.error(`\n${failed} H-01 regression(s) failed`);
  process.exit(1);
}
console.log("\nAll H-01 regressions passed.");
