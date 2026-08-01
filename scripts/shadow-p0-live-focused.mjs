import { writeFileSync } from "node:fs";
import {
  canonicalIntelligenceEqual,
  diffCanonicalIntelligence,
} from "../lib/search/canonicalResponseCache.ts";

const BASE = (process.env.SEARCH_BASE_URL || "http://127.0.0.1:3011").replace(/\/$/, "");
const queries = ["iPhone 15 Pro 256GB", "corner sofa", "Sony WH-1000XM5", "OLED TV 55 inch"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function pct(s, p) {
  if (!s.length) return null;
  return s[Math.max(0, Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1))];
}
function stats(a) {
  const s = [...a].sort((x, y) => x - y);
  return {
    n: s.length,
    p50: pct(s, 50),
    p95: pct(s, 95),
    max: s.length ? s[s.length - 1] : null,
    min: s.length ? s[0] : null,
    average: s.length ? Math.round(s.reduce((x, y) => x + y, 0) / s.length) : null,
  };
}

async function probe(q) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/search?q=${encodeURIComponent(q)}`);
  const wallMs = Date.now() - t0;
  const json = await res.json();
  return {
    wallMs,
    json,
    status: res.status,
    header: res.headers.get("x-quantai-canonical-cache"),
    n: (json?.data?.products || []).length,
  };
}

const miss = [];
const hitTrue = [];
const rows = [];
let eqFail = 0;

for (const q of queries) {
  await sleep(4000);
  const m = await probe(q);
  miss.push(m.wallMs);
  await sleep(1000);
  const h = await probe(q);
  let h2 = h;
  if (h.header === "HIT") {
    await sleep(300);
    h2 = await probe(q);
    hitTrue.push(h.wallMs, h2.wallMs);
  }
  const equal = canonicalIntelligenceEqual(m.json, h.json);
  if (!equal) eqFail += 1;
  const row = {
    q,
    missHeader: m.header,
    hitHeader: h.header,
    missMs: m.wallMs,
    hitMs: h.wallMs,
    hit2Ms: h2.wallMs,
    missN: m.n,
    hitN: h.n,
    equal,
    diffs: equal ? [] : diffCanonicalIntelligence(m.json, h.json).slice(0, 8),
  };
  rows.push(row);
  console.log(JSON.stringify(row));
}

const trueHits = rows.filter((r) => r.hitHeader === "HIT");
const out = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  rows,
  missStats: stats(miss),
  hitStatsTrueOnly: stats(hitTrue),
  trueHitCount: trueHits.length,
  eqFail,
  allTrueHitsEqual: trueHits.length > 0 && trueHits.every((r) => r.equal),
  trueHitsEqualCount: trueHits.filter((r) => r.equal).length,
};
writeFileSync("docs/architecture-audit/beta-launch/shadow-p0-live-focused.json", JSON.stringify(out, null, 2));
console.log(
  "SUMMARY",
  JSON.stringify(
    {
      missStats: out.missStats,
      hitTrue: out.hitStatsTrueOnly,
      trueHitCount: out.trueHitCount,
      eqFail: out.eqFail,
      allTrueHitsEqual: out.allTrueHitsEqual,
    },
    null,
    2
  )
);
