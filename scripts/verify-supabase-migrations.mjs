#!/usr/bin/env node
/**
 * Verify Supabase migration files exist and optional live schema probe.
 * Usage: npm run test:beta-supabase-migrations
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const MIG_DIR = resolve(import.meta.dirname, "../supabase/migrations");
const EXPECTED_TABLES = [
  "search_history",
  "saved_products",
  "user_shopping_memory",
  "shopping_watchlist",
  "outbound_clicks",
];

let failed = 0;
function pass(m) {
  console.log(`[PASS] ${m}`);
}
function fail(m) {
  failed += 1;
  console.error(`[FAIL] ${m}`);
}

if (!existsSync(MIG_DIR)) {
  fail("migrations_dir_missing");
  process.exit(1);
}

const files = readdirSync(MIG_DIR).filter((f) => f.endsWith(".sql")).sort();
if (files.length < 3) fail(`expected >=3 migration files, got ${files.length}`);
else pass(`migration_files count=${files.length}`);

const sqlBlob = files.map((f) => readFileSync(join(MIG_DIR, f), "utf8")).join("\n");
for (const table of EXPECTED_TABLES) {
  if (sqlBlob.includes(table)) pass(`migration_mentions_${table}`);
  else console.warn(`[WARN] table ${table} not found in migration SQL — verify manually`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.log("[SKIP] live Supabase probe — set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
} else {
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    if (res.ok || res.status === 404) pass("supabase_rest_reachable");
    else fail(`supabase_rest status=${res.status}`);
  } catch (e) {
    fail(`supabase_rest ${e instanceof Error ? e.message : e}`);
  }

  for (const table of ["saved_products", "search_history"]) {
    try {
      const tRes = await fetch(
        `${url.replace(/\/$/, "")}/rest/v1/${table}?select=id&limit=1`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } }
      );
      if (tRes.status === 200 || tRes.status === 406) pass(`table_${table}_exists`);
      else if (tRes.status === 404 || tRes.status === 400) {
        fail(`table_${table}_missing`, "apply supabase/migrations in Production project");
      } else {
        console.warn(`[WARN] table_${table} status=${tRes.status}`);
      }
    } catch (e) {
      fail(`table_${table} ${e instanceof Error ? e.message : e}`);
    }
  }
}

if (failed > 0) {
  console.error(`\n${failed} Supabase migration check(s) failed. See docs/SUPABASE_PRODUCTION_MIGRATION_CHECKLIST.md`);
  process.exit(1);
}
console.log("\nSupabase migration verification complete.");
