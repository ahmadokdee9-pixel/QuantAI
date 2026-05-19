/**
 * Safe one-way sync: Vercel → local only.
 * - Backs up existing .env.local before any change
 * - Never writes empty values over non-empty local secrets
 * - Never pushes or modifies Vercel (read-only pull)
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ENV_PATH = resolve(ROOT, ".env.local");
const STAGING_PATH = resolve(ROOT, ".env.vercel-staging");
const REQUIRED_KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SERPAPI_KEY",
  "OPENAI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID_PRO",
  "STRIPE_PRICE_ID_PREMIUM",
];
const ENVIRONMENT = process.env.VERCEL_ENV_TARGET || "production";

/** Written to .env.local (QuantAI app keys only — no Vercel CI noise). */
const LOCAL_KEYS = new Set([
  ...REQUIRED_KEYS,
  "SERPAPI_SHOPPING_GL",
  "SERPAPI_SHOPPING_NUM",
  "QUANTAI_COMMERCE_AI_MODEL",
  "QUANTAI_COPILOT_MODEL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "QUANTAI_ANALYTICS_SINK_URL",
]);

function parseDotEnv(text) {
  const map = new Map();
  const order = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!map.has(key)) order.push(key);
    map.set(key, val);
  }
  return { map, order };
}

function nonEmpty(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function serializeEnv(map, preferredOrder = []) {
  const seen = new Set();
  const lines = [
    "# QuantAI local environment (safe Vercel pull — read-only from cloud)",
    `# Last sync: ${new Date().toISOString()} (${ENVIRONMENT})`,
    "# Restore: npm run env:pull",
    "# Docs: docs/ENVIRONMENT.md",
    "",
  ];

  for (const key of preferredOrder) {
    if (!map.has(key)) continue;
    const value = map.get(key) ?? "";
    seen.add(key);
    const escaped =
      value.includes(" ") || value.includes("#") || value.includes("\n")
        ? `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
        : value;
    lines.push(`${key}=${escaped}`);
  }

  for (const [key, value] of [...map.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (seen.has(key)) continue;
    const escaped =
      value.includes(" ") || value.includes("#")
        ? `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
        : value;
    lines.push(`${key}=${escaped}`);
  }

  return `${lines.join("\n")}\n`;
}

const local = existsSync(ENV_PATH) ? parseDotEnv(readFileSync(ENV_PATH, "utf8")) : { map: new Map(), order: [] };

if (existsSync(ENV_PATH)) {
  const backup = resolve(ROOT, `.env.local.backup-${Date.now()}`);
  copyFileSync(ENV_PATH, backup);
  console.log(`[QuantAI env] Backed up .env.local → ${backup.split(/[/\\]/).pop()}`);
}

console.log(`[QuantAI env] Pulling Vercel \`${ENVIRONMENT}\` → staging file (read-only)…`);
try {
  execSync(`npx vercel env pull "${STAGING_PATH}" --environment=${ENVIRONMENT} --yes`, {
    cwd: ROOT,
    stdio: "inherit",
  });
} catch {
  console.error("\n[QuantAI env] Pull failed. Run: npx vercel login\n");
  process.exit(1);
}

if (!existsSync(STAGING_PATH)) {
  console.error("[QuantAI env] Staging file missing after pull.");
  process.exit(1);
}

const remote = parseDotEnv(readFileSync(STAGING_PATH, "utf8"));
const merged = new Map(local.map);
let applied = 0;
let skippedEmptyRemote = 0;
let preservedLocal = 0;

for (const [key, remoteVal] of remote.map) {
  if (!LOCAL_KEYS.has(key)) continue;
  const localVal = merged.get(key);
  if (!nonEmpty(remoteVal)) {
    skippedEmptyRemote += 1;
    if (nonEmpty(localVal)) preservedLocal += 1;
    // Keep placeholder from staging so keys are not dropped from .env.local
    if (REQUIRED_KEYS.includes(key) && !merged.has(key)) {
      merged.set(key, localVal ?? "");
    }
    continue;
  }
  if (localVal === remoteVal) continue;
  merged.set(key, remoteVal);
  applied += 1;
}

for (const key of REQUIRED_KEYS) {
  if (!merged.has(key)) merged.set(key, remote.map.get(key) ?? "");
}

if (!nonEmpty(merged.get("NEXT_PUBLIC_APP_URL"))) {
  merged.set("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
}

const order = [...new Set([...REQUIRED_KEYS, ...local.order, ...remote.order])].filter((k) =>
  LOCAL_KEYS.has(k)
);
const localOnly = new Map();
for (const [key, value] of merged) {
  if (LOCAL_KEYS.has(key)) localOnly.set(key, value);
}
writeFileSync(ENV_PATH, serializeEnv(localOnly, order), "utf8");

console.log(`\n[QuantAI env] Safe merge complete.`);
console.log(`  Applied from Vercel: ${applied}`);
console.log(`  Skipped empty remote: ${skippedEmptyRemote}`);
console.log(`  Preserved local non-empty: ${preservedLocal}`);
if (skippedEmptyRemote > 0) {
  console.log(
    "\n  Note: Vercel CLI often returns \"\" for sensitive variables even when Production works."
  );
  console.log("  If env:check fails, paste values from Vercel Dashboard → Environment Variables.");
}
console.log("\n  Next: npm run env:check && npm run dev\n");
