/**
 * P4.4 — Telemetry history under .validation/history/live-observability/
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { deployId } from "./validationHistory.mjs";

const LIVE_DIR =
  process.env.INTENT_LIVE_OBSERVABILITY_DIR ||
  resolve(import.meta.dirname, "../../.validation/history/live-observability");

export function ensureLiveObservabilityDir() {
  mkdirSync(LIVE_DIR, { recursive: true });
  return LIVE_DIR;
}

export function saveLiveObservabilityRun(report, suiteName) {
  const dir = ensureLiveObservabilityDir();
  const id = deployId();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = join(dir, `${stamp}__${suiteName}__${id}.json`);
  const payload = {
    ...report,
    deployId: id,
    suiteName,
    savedAt: new Date().toISOString(),
  };
  writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
  writeFileSync(join(dir, "latest.json"), JSON.stringify({ file, deployId: id, suiteName }, null, 2), "utf8");
  return { file, deployId: id };
}

export function loadLatestLiveObservability(suiteName) {
  if (!existsSync(LIVE_DIR)) return null;
  const files = readdirSync(LIVE_DIR)
    .filter((f) => f.includes(`__${suiteName}__`) && f.endsWith(".json") && f !== "latest.json")
    .sort();
  if (!files.length) return null;
  const path = join(LIVE_DIR, files[files.length - 1]);
  return { path, report: JSON.parse(readFileSync(path, "utf8")) };
}
