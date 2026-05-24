#!/usr/bin/env node
/**
 * Phase 4 — Identity foundation tests (deterministic, no embeddings).
 */
import assert from "node:assert";

process.env.QUANTAI_IDENTITY_FOUNDATION_ENABLED = "true";

const { buildIdentityFoundation } = await import(
  "../lib/intelligence/identity/buildIdentityFoundation.ts"
);
const { resolveProductIdentity, canMergeIdentities } = await import(
  "../lib/intelligence/identity/productIdentityResolver.ts"
);
const { buildCanonicalProductGraph } = await import(
  "../lib/intelligence/identity/canonicalProductGraph.ts"
);
const { trayPriceHistoryStore } = await import(
  "../lib/intelligence/identity/pricing/priceHistoryStore.ts"
);
const { buildCanonicalRetrievalSurface } = await import(
  "../lib/intelligence/identity/retrieval/canonicalRetrievalSurface.ts"
);
const { validateRetrievalContract, CANONICAL_RETRIEVAL_CONTRACT } = await import(
  "../lib/intelligence/identity/retrieval/retrievalContracts.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");

trayPriceHistoryStore.clear();

const tray = GOLDEN_CASES[0].tray;
const preLinks = tray.map((p) => p.link);

const foundation = buildIdentityFoundation({
  products: tray,
  query: GOLDEN_CASES[0].query,
});
assert.equal(foundation.products.length, tray.length, "no tray mutation");
assert.deepEqual(
  foundation.products.map((p) => p.link),
  preLinks,
  "ranking order unchanged"
);
assert.ok(foundation.meta.enabled);
assert.ok(foundation.meta.canonicalProductCount > 0);
assert.ok(foundation.meta.identityCoverage > 0);

const idA = resolveProductIdentity(tray[0]);
const idB = resolveProductIdentity(tray[1]);
assert.ok(idA.commerceId.startsWith("qcid_"));
assert.ok(idA.listingKey.startsWith("qlk_"));

const graph = buildCanonicalProductGraph(tray);
assert.ok(graph.nodes.length > 0);
assert.equal(validateRetrievalContract(CANONICAL_RETRIEVAL_CONTRACT).length, 0);

const surface = buildCanonicalRetrievalSurface(
  { query: GOLDEN_CASES[0].query, maxResults: 5 },
  graph.nodes
);
assert.ok(surface.surfaceId.startsWith("crs_"));
assert.equal(CANONICAL_RETRIEVAL_CONTRACT.embeddingFree, true);

console.log("OK identity foundation shadow discipline");
console.log("OK canonical graph + retrieval surface");
console.log("\nAll identity tests passed.");
