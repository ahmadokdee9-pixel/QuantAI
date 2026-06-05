#!/usr/bin/env node
/**
 * QUANTAI_PHASE_27_1_STABLE_FROZEN — freeze guard suite.
 * Ensures decision distribution + confidence spread authority remain locked.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  QUANTAI_PHASE_27_1_FILE_ANCHORS,
  QUANTAI_PHASE_27_1_FROZEN_FILES,
  QUANTAI_PHASE_27_1_FREEZE_MARKER,
  QUANTAI_PHASE_27_1_LOCKED,
  QUANTAI_PHASE_27_1_PROTECTED,
  QUANTAI_PHASE_27_1_STABLE_FROZEN,
} from "../lib/governance/quantaiPhase271Freeze.ts";

const root = process.cwd();

assert.equal(QUANTAI_PHASE_27_1_STABLE_FROZEN, "QUANTAI_PHASE_27_1_STABLE_FROZEN", "freeze token");
assert.equal(QUANTAI_PHASE_27_1_LOCKED.length, 5, "five frozen locks");
assert.ok(QUANTAI_PHASE_27_1_PROTECTED.includes("layout"), "layout protected");
assert.ok(QUANTAI_PHASE_27_1_PROTECTED.includes("card_size"), "card size protected");
assert.ok(
  QUANTAI_PHASE_27_1_PROTECTED.includes("phase_26_1_unified_verdict_authority"),
  "phase 26.1 preserved"
);
assert.ok(
  QUANTAI_PHASE_27_1_PROTECTED.includes("phase_26_2_verdict_reason_authority"),
  "phase 26.2 preserved"
);
assert.equal(QUANTAI_PHASE_27_1_FROZEN_FILES.length, 4, "four frozen implementation files");

for (const relativePath of QUANTAI_PHASE_27_1_FROZEN_FILES) {
  const absolutePath = join(root, relativePath);
  const src = readFileSync(absolutePath, "utf8");
  assert.ok(src.includes(QUANTAI_PHASE_27_1_FREEZE_MARKER), `${relativePath} missing freeze marker`);
  const anchors = QUANTAI_PHASE_27_1_FILE_ANCHORS[relativePath] ?? [];
  for (const anchor of anchors) {
    assert.ok(src.includes(anchor), `${relativePath} missing anchor: ${anchor}`);
  }
}

const distributionSrc = readFileSync(join(root, "lib/ui/decisionDistributionAuthority.ts"), "utf8");
assert.ok(
  distributionSrc.includes("compareViable"),
  "frozen distribution: COMPARE requires explicit viability gate"
);
assert.ok(
  !distributionSrc.includes('verdict: "COMPARE"') ||
    distributionSrc.includes("if (compareViable)"),
  "frozen distribution: no unconditional COMPARE fallback"
);

const spreadSrc = readFileSync(join(root, "lib/ui/confidenceSpreadEngine.ts"), "utf8");
assert.ok(spreadSrc.includes("VERDICT_RANGES"), "frozen spread: verdict-bounded ranges");
assert.ok(!spreadSrc.includes("primaryVerdictAlignment"), "frozen spread: no fixed verdict buckets");

const overlaySrc = readFileSync(join(root, "lib/ui/phase271PresentationActivation.ts"), "utf8");
assert.ok(
  overlaySrc.includes("resolveUnifiedTrayVerdictFromPhase271"),
  "frozen overlay: tray verdict from distribution labels"
);
assert.ok(
  overlaySrc.includes("resolveConfidenceSpread"),
  "frozen overlay: spread confidence on cards"
);

const phase262Src = readFileSync(join(root, "lib/governance/quantaiPhase262Freeze.ts"), "utf8");
assert.ok(
  phase262Src.includes("QUANTAI_PHASE_26_2_STABLE_FROZEN"),
  "phase 26.2 freeze remains independent"
);

console.log(`${QUANTAI_PHASE_27_1_STABLE_FROZEN}: ok`);
