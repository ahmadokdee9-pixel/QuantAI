#!/usr/bin/env node
/**
 * QUANTAI_PHASE_26_2_STABLE_FROZEN — freeze guard suite.
 * Ensures verdict/reason authority and pipelines remain locked.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  QUANTAI_PHASE_26_2_FILE_ANCHORS,
  QUANTAI_PHASE_26_2_FROZEN_FILES,
  QUANTAI_PHASE_26_2_FREEZE_MARKER,
  QUANTAI_PHASE_26_2_LOCKED,
  QUANTAI_PHASE_26_2_PROTECTED,
  QUANTAI_PHASE_26_2_STABLE_FROZEN,
} from "../lib/governance/quantaiPhase262Freeze.ts";

const root = process.cwd();

assert.equal(QUANTAI_PHASE_26_2_STABLE_FROZEN, "QUANTAI_PHASE_26_2_STABLE_FROZEN", "freeze token");
assert.equal(QUANTAI_PHASE_26_2_LOCKED.length, 7, "seven frozen locks");
assert.ok(QUANTAI_PHASE_26_2_PROTECTED.includes("layout"), "layout protected");
assert.ok(QUANTAI_PHASE_26_2_PROTECTED.includes("card_size"), "card size protected");
assert.equal(QUANTAI_PHASE_26_2_FROZEN_FILES.length, 10, "ten frozen implementation files");

for (const relativePath of QUANTAI_PHASE_26_2_FROZEN_FILES) {
  const absolutePath = join(root, relativePath);
  const src = readFileSync(absolutePath, "utf8");
  assert.ok(
    src.includes(QUANTAI_PHASE_26_2_FREEZE_MARKER),
    `${relativePath} missing freeze marker`
  );
  const anchors = QUANTAI_PHASE_26_2_FILE_ANCHORS[relativePath] ?? [];
  for (const anchor of anchors) {
    assert.ok(src.includes(anchor), `${relativePath} missing anchor: ${anchor}`);
  }
}

const exposureSrc = readFileSync(join(root, "lib/ui/intelligenceExposureActivation.ts"), "utf8");
assert.ok(!exposureSrc.includes("mergeBuyWaitChip"), "frozen pipeline: no legacy metric chips");
assert.ok(exposureSrc.includes("buildSurfaceSummaryLines"), "frozen reasoning: surface summary from authority");

const marketSrc = readFileSync(join(root, "lib/ui/marketSummary.ts"), "utf8");
assert.ok(!marketSrc.includes("searchIntelActionLabel(searchIntelligence.finalRecommendation)") || marketSrc.includes("trayVerdict"), "final verdict prefers tray authority when present");

const surfaceSrc = readFileSync(join(root, "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(surfaceSrc.includes("buildMap(null)"), "frozen single verdict pipeline pass-1");
assert.ok(surfaceSrc.includes("buildMap(unified.verdict)"), "frozen single verdict pipeline pass-2");

console.log(`${QUANTAI_PHASE_26_2_STABLE_FROZEN}: ok`);
