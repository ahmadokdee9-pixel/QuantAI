/**
 * Persistent validation history — per-run snapshots and deploy-to-deploy regression deltas.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const HISTORY_DIR = process.env.VALIDATION_HISTORY_DIR || resolve(import.meta.dirname, "../../.validation/history");

export function deployId() {
  return (
    process.env.VALIDATION_DEPLOY_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
    process.env.GITHUB_SHA?.slice(0, 12) ||
    `local-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`
  );
}

export function ensureHistoryDir() {
  mkdirSync(HISTORY_DIR, { recursive: true });
  return HISTORY_DIR;
}

export function saveValidationRun(report, suiteName = "realworld") {
  const dir = ensureHistoryDir();
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

function listHistoryFiles(suiteName) {
  if (!existsSync(HISTORY_DIR)) return [];
  return readdirSync(HISTORY_DIR)
    .filter((f) => f.endsWith(".json") && f.includes(`__${suiteName}__`) && f !== "latest.json")
    .sort();
}

export function loadPreviousRun(suiteName = "realworld", skipFile = null) {
  const files = listHistoryFiles(suiteName);
  for (let i = files.length - 1; i >= 0; i -= 1) {
    const file = join(HISTORY_DIR, files[i]);
    if (skipFile && file === skipFile) continue;
    try {
      return { file, report: JSON.parse(readFileSync(file, "utf8")) };
    } catch {
      continue;
    }
  }
  return null;
}

function queryMap(report) {
  const map = new Map();
  for (const q of report.queries ?? []) {
    map.set(q.query, q);
  }
  return map;
}

export function compareValidationRuns(current, previous) {
  if (!previous?.report) {
    return { hasBaseline: false, regressions: [], improvements: [], summary: {} };
  }

  const prev = previous.report;
  const curMap = queryMap(current);
  const prevMap = queryMap(prev);
  const regressions = [];
  const improvements = [];

  const curRankable = (current.queries ?? []).filter((q) => !q.infrastructureFailure);
  const prevRankable = (prev.queries ?? []).filter((q) => !q.infrastructureFailure);
  const curPass = curRankable.filter((q) => q.pass).length;
  const prevPass = prevRankable.filter((q) => q.pass).length;
  const curPassRate = curRankable.length ? (curPass / curRankable.length) * 100 : 0;
  const prevPassRate = prevRankable.length ? (prevPass / prevRankable.length) * 100 : 0;

  for (const [query, row] of curMap) {
    const before = prevMap.get(query);
    if (!before) continue;
    if (row.infrastructureFailure || before.infrastructureFailure) continue;

    const rankDrop = (before.scores?.ranking ?? 0) - (row.scores?.ranking ?? 0);
    const wasPass = Boolean(before.pass);
    const nowPass = Boolean(row.pass);

    if (!wasPass && nowPass) {
      improvements.push({ query, kind: "pass_recovered", detail: `pass rate recovered` });
    } else if (wasPass && !nowPass) {
      regressions.push({ query, kind: "pass_regression", severity: "high", detail: "was passing, now failing" });
    }

    if ((before.productCount ?? 0) >= 2 && (row.productCount ?? 0) === 0) {
      regressions.push({ query, kind: "empty_tray_regression", severity: "critical", detail: "tray emptied" });
    }

    if (before.canonicalCategory && row.canonicalCategory && before.canonicalCategory !== row.canonicalCategory) {
      regressions.push({
        query,
        kind: "category_drift",
        severity: "medium",
        detail: `${before.canonicalCategory} → ${row.canonicalCategory}`,
      });
    }

    if (rankDrop >= 18) {
      regressions.push({
        query,
        kind: "ranking_drop",
        severity: rankDrop >= 30 ? "high" : "medium",
        detail: `ranking ${before.scores?.ranking ?? 0} → ${row.scores?.ranking ?? 0}`,
      });
    }
  }

  const summary = {
    hasBaseline: true,
    previousFile: previous.file,
    previousDeployId: prev.deployId ?? null,
    passRateDeltaPct: Math.round((curPassRate - prevPassRate) * 10) / 10,
    avgRankingDelta:
      Math.round(
        (avg(curRankable, (q) => q.scores?.ranking ?? 0) - avg(prevRankable, (q) => q.scores?.ranking ?? 0)) * 10
      ) / 10,
    infrastructureSkips: (current.queries ?? []).filter((q) => q.infrastructureFailure).length,
    regressionCount: regressions.length,
    improvementCount: improvements.length,
  };

  return { hasBaseline: true, regressions, improvements, summary };
}

function avg(rows, pick) {
  if (!rows.length) return 0;
  return rows.reduce((s, r) => s + pick(r), 0) / rows.length;
}
