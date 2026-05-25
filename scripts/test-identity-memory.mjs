#!/usr/bin/env node
import assert from "node:assert";

const { buildIdentityContinuityMemory } = await import(
  "../lib/intelligence/autonomousCommerceIdentity/memory/identityContinuityMemory.ts"
);
const { validateReplaySafeIdentityMemory } = await import(
  "../lib/intelligence/autonomousCommerceIdentity/memory/replaySafeIdentityMemory.ts"
);
const { computePreferenceContinuity } = await import(
  "../lib/intelligence/autonomousCommerceIdentity/continuity/deterministicPreferenceContinuity.ts"
);
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const sessionA = {
  ...EMPTY_COMMERCE_SESSION_MEMORY,
  interactionCount: 5,
  preferredBrands: ["apple", "sony"],
  styleTags: ["minimal"],
  categoryAffinity: { electronics: 0.7, audio: 0.3 },
};

const mem = buildIdentityContinuityMemory(sessionA);
assert.ok(mem.memoryKey.startsWith("icm_"));
assert.equal(validateReplaySafeIdentityMemory(mem).length, 0);
assert.ok(mem.continuityLabels.includes("brand_continuity"));

const continuity = computePreferenceContinuity({ sessionMemory: sessionA });
assert.ok(continuity.continuity01 >= 0 && continuity.continuity01 <= 1);
assert.ok(continuity.decay01 >= 0 && continuity.decay01 <= 1);

const sessionB = { ...sessionA };
const memTwin = buildIdentityContinuityMemory(sessionB);
assert.equal(mem.memoryKey, memTwin.memoryKey);

console.log("OK identity continuity memory replay-safe");
console.log("OK deterministic preference continuity");
console.log("\nAll identity memory tests passed.");
