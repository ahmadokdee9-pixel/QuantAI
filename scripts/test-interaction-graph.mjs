#!/usr/bin/env node
import assert from "node:assert";

const { buildInteractionMemoryGraph } = await import(
  "../lib/intelligence/memory/memory/interactionMemoryGraph.ts"
);
const { updateShoppingIntentMemory } = await import(
  "../lib/intelligence/memory/memory/shoppingIntentMemory.ts"
);
const { MAX_INTERACTION_NODES, MAX_INTENT_RECORDS } = await import(
  "../lib/intelligence/memory/replay/preferenceReplayContracts.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const tray = GOLDEN_CASES[0].tray;
const graph = buildInteractionMemoryGraph({
  products: tray,
  sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
});
assert.ok(graph.nodeCount > 0);
assert.ok(graph.nodeCount <= MAX_INTERACTION_NODES);

let intent = updateShoppingIntentMemory({
  query: "iphone 15",
  sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
});
for (let i = 0; i < 30; i++) {
  intent = updateShoppingIntentMemory({
    query: `query variant ${i}`,
    sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
    prior: intent.records,
  });
}
assert.ok(intent.records.length <= MAX_INTENT_RECORDS);

const repeat = updateShoppingIntentMemory({
  query: "iphone 15",
  sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
  prior: [{ queryNorm: "iphone 15", count: 2, lastSeenAt: "2020-01-01", categoryHints: [] }],
});
assert.ok(repeat.repeatSearch01 > 0);

console.log("OK interaction memory graph bounds");
console.log("OK shopping intent memory");
console.log("\nAll interaction graph tests passed.");
