#!/usr/bin/env node
/** Offline APPLY + rollback safety — no network. npm run normalization-apply-rollback-verify */
import { GOLDEN_CASES } from "./lib/normalizationGoldenFixtures.mjs";
import { verifyNormalizationApplyRollback } from "../lib/intelligence/normalization/index.ts";

let failed = 0;
for (const spec of GOLDEN_CASES) {
  const v = verifyNormalizationApplyRollback(spec.tray, spec.query);
  const ok = v.rollbackSafe && v.shadowPreservesTray && v.falseCollapseShadow === 0;
  console.log(
    `${ok ? "PASS" : "FAIL"} ${spec.id} shadow=${v.shadowOutputCount}/${v.shadowInputCount} apply=${v.applyOutputCount}/${v.applyInputCount} top5Drift=${v.top5Drift} dupReduction=${v.duplicateReduction}`
  );
  if (!ok) {
    failed++;
    console.log("  notes:", v.notes.join(", "));
  }
}

if (failed) process.exit(1);
console.log("\nAll rollback verifications passed.");
