/**
 * Validates QuantAI .env.local before dev/build.
 * Loads .env.local without printing secret values.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ENV_PATH = resolve(ROOT, ".env.local");

const SPECS = [
  { key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", required: true, systems: ["auth"] },
  { key: "CLERK_SECRET_KEY", required: true, systems: ["auth"] },
  { key: "NEXT_PUBLIC_SUPABASE_URL", required: true, systems: ["supabase"] },
  { key: "SUPABASE_SERVICE_ROLE_KEY", required: true, systems: ["supabase"] },
  { key: "SERPAPI_KEY", required: true, systems: ["search"] },
  { key: "OPENAI_API_KEY", required: true, systems: ["ai", "compare-verdict", "build"] },
  { key: "NEXT_PUBLIC_APP_URL", required: false, systems: ["stripe"] },
  { key: "STRIPE_SECRET_KEY", required: false, systems: ["billing"] },
];

function parseDotEnv(text) {
  const map = new Map();
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
    if (val.length) map.set(key, val);
  }
  return map;
}

function isPresent(map, key) {
  const v = map.get(key);
  return typeof v === "string" && v.trim().length > 0;
}

function loadEnvFile() {
  if (!existsSync(ENV_PATH)) return new Map();
  return parseDotEnv(readFileSync(ENV_PATH, "utf8"));
}

/** Merge process.env (Next/Vercel) with .env.local for script runs */
function mergedEnv() {
  const file = loadEnvFile();
  const merged = new Map(file);
  for (const spec of SPECS) {
    const fromProcess = process.env[spec.key]?.trim();
    if (fromProcess) merged.set(spec.key, fromProcess);
  }
  return merged;
}

const strict = process.argv.includes("--strict");
const env = mergedEnv();

const missingRequired = SPECS.filter((s) => s.required && !isPresent(env, s.key));
const emptyRequired = SPECS.filter(
  (s) => s.required && env.has(s.key) && !isPresent(env, s.key)
);
const missingOptional = SPECS.filter((s) => !s.required && !isPresent(env, s.key));

if (!existsSync(ENV_PATH) && missingRequired.length > 0) {
  console.error("\n[QuantAI env] .env.local not found.\n");
  console.error("  1. Copy .env.example → .env.local");
  console.error("  2. Or run: npm run env:sync\n");
  console.error("  See docs/ENVIRONMENT.md\n");
  process.exit(1);
}

if (missingRequired.length > 0 || emptyRequired.length > 0) {
  console.error("\n[QuantAI env] Missing or empty required keys:\n");
  for (const spec of [...missingRequired, ...emptyRequired]) {
    const state = env.has(spec.key) ? "empty" : "missing";
    console.error(`  ✗ ${spec.key} (${state}) — ${spec.systems.join(", ")}`);
  }
  console.error("\nVercel CLI returned empty values for required keys.");
  console.error("Production may still work (https://quant-ai-app.vercel.app) while local pull cannot decrypt secrets.");
  console.error("Fix: Vercel Dashboard → quant-ai → Environment Variables → edit each key → paste value → Save.");
  console.error("      Then paste the same values into .env.local (or run npm run env:pull after Vercel shows non-empty).");
  console.error("      Do NOT use bare `vercel env pull` — use npm run env:pull only.\n");
  console.error("Docs: docs/ENVIRONMENT.md\n");
  process.exit(1);
}

console.log("[QuantAI env] Required keys present.");
if (missingOptional.length > 0 && !strict) {
  console.log("[QuantAI env] Optional keys not set:");
  for (const spec of missingOptional) {
    console.log(`  · ${spec.key}`);
  }
}
