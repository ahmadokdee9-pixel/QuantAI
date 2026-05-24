#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_TRUST_ENGINE_ENABLED = "true";

const { buildTrustTruthEngine } = await import(
  "../lib/intelligence/trust/buildTrustTruthEngine.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { trayPriceHistoryStore } = await import(
  "../lib/intelligence/identity/pricing/priceHistoryStore.ts"
);

const tray = GOLDEN_CASES[0].tray;
const query = GOLDEN_CASES[0].query;

trayPriceHistoryStore.clear();
const a = buildTrustTruthEngine({ products: tray, query });
trayPriceHistoryStore.clear();
const b = buildTrustTruthEngine({ products: tray, query });

assert.equal(a.replayFingerprint, b.replayFingerprint);
assert.ok(a.replayFingerprint.startsWith("trp_"));

console.log("OK trust determinism fingerprint");
console.log("\nAll trust determinism tests passed.");
