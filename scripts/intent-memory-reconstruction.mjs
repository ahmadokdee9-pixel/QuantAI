/**
 * P5.2 — Snapshot reconstruction validation.
 * Usage: npm run test:intent-memory-reconstruction
 */
import {
  buildMemorySnapshot,
  clearIntentMemoryStore,
  computeReplayMemoryIntegrity,
  getMemorySnapshot,
  reconstructRankingFromSnapshot,
  saveMemorySnapshot,
} from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MEMORY_BOUNDED_ENV, runMemoryPartitions } from "./lib/intentMemoryRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runMemoryPartitions(MEMORY_BOUNDED_ENV);

for (const { trayId, memory: m, row } of rows) {
  const sessionKey = m.sessionKey;
  const snap = getMemorySnapshot(sessionKey);
  if (!snap) {
    failed += 1;
    console.error(`FAIL ${trayId} no snapshot saved`);
    continue;
  }

  const products = row.orchestrationProducts ?? row.products;
  const previous = { ...snap, topLinks: [...snap.topLinks] };
  const reconstructed = reconstructRankingFromSnapshot({ products, snapshot: snap, previous: null });
  const integrityCold = computeReplayMemoryIntegrity({
    snapshot: snap,
    previous: null,
    reconstructedLinks: reconstructed.map((p) => p.link || p.title),
  });

  saveMemorySnapshot(previous);
  const snap2 = buildMemorySnapshot({
    sessionKey,
    products,
    orchestration: row.orchestration,
    runtime: row.runtime,
  });
  const reconstructed2 = reconstructRankingFromSnapshot({ products, snapshot: snap2, previous });
  const integrityWarm = computeReplayMemoryIntegrity({
    snapshot: snap2,
    previous,
    reconstructedLinks: reconstructed2.map((p) => p.link || p.title),
  });

  const ok = integrityCold >= 90 && integrityWarm >= 60 && m.replayMemoryIntegrity >= 60;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { integrityCold, integrityWarm, replay: m.replayMemoryIntegrity });
  } else {
    console.log(`OK ${trayId} cold=${integrityCold} warm=${integrityWarm} replay=${m.replayMemoryIntegrity}`);
  }
}

saveLiveObservabilityRun({ suite: "intent-memory-reconstruction", phase: "P5.2", pass: failed === 0 }, "intent-memory-reconstruction");

if (failed) process.exit(1);
console.log("\nIntent memory reconstruction passed");
