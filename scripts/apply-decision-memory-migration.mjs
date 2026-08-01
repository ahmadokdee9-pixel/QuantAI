/**
 * Apply Decision Memory migrations via Supabase SQL when DATABASE_URL or
 * SUPABASE_DB_URL is available. Otherwise probes REST and prints apply steps.
 *
 * Usage:
 *   node --env-file=.env.local scripts/apply-decision-memory-migration.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const MIG_DIR = resolve(import.meta.dirname, "../supabase/migrations");
const TARGET = [
  "20260801120000_decision_memory.sql",
  "20260801130000_decision_memory_universal_domain.sql",
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const dbUrl =
  process.env.DATABASE_URL?.trim() ||
  process.env.SUPABASE_DB_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  "";

function sqlBundle() {
  return TARGET.map((f) => readFileSync(join(MIG_DIR, f), "utf8")).join("\n\n");
}

async function probeRest() {
  if (!url || !key) {
    return { ok: false, reason: "missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" };
  }
  const tables = {};
  for (const table of ["decision_memory", "decision_visit_state"]) {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      tables[table] = { status: res.status, ok: res.status === 200 || res.status === 206 };
    } catch (e) {
      tables[table] = { status: 0, ok: false, error: String(e?.cause?.code || e.message || e) };
    }
  }
  return { ok: tables.decision_memory?.ok && tables.decision_visit_state?.ok, tables };
}

async function applyViaPg() {
  if (!dbUrl) return { applied: false, reason: "no DATABASE_URL / SUPABASE_DB_URL" };
  let pg;
  try {
    pg = await import("pg");
  } catch {
    return {
      applied: false,
      reason: "pg package not installed — set DATABASE_URL and npm i pg, or run SQL in Supabase SQL Editor",
    };
  }
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sqlBundle());
    return { applied: true };
  } finally {
    await client.end();
  }
}

const probe = await probeRest();
console.log("[probe]", JSON.stringify(probe, null, 2));

if (probe.ok) {
  console.log("[OK] decision_memory schema already reachable via REST.");
  // Still try domain forward migration if DB URL present
  if (dbUrl) {
    const fwd = await applyViaPg();
    console.log("[forward]", JSON.stringify(fwd));
  }
  process.exit(0);
}

if (dbUrl) {
  console.log("[apply] Running SQL via DATABASE_URL…");
  const result = await applyViaPg();
  console.log(JSON.stringify(result));
  const again = await probeRest();
  console.log("[probe_after]", JSON.stringify(again, null, 2));
  process.exit(again.ok ? 0 : 1);
}

console.error(`
[BLOCKED] Cannot apply Decision Memory migration automatically.

Required (one of):
  1) Reachable NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY and paste SQL in Dashboard → SQL Editor
  2) DATABASE_URL / SUPABASE_DB_URL (Postgres connection string) for this script

Files to run in order:
${TARGET.map((f) => `  - supabase/migrations/${f}`).join("\n")}

Current REST probe failed — fix Supabase credentials, then re-run:
  node --env-file=.env.local scripts/apply-decision-memory-migration.mjs
`);
process.exit(2);
