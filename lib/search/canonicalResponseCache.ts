/**
 * Shadow P0 — canonical search response cache (DEFAULT OFF).
 *
 * Stores the COMPLETE post-intelligence JSON body after the frozen pipeline finishes.
 * HIT returns a prior completed canonical response. MISS always runs the full pipeline.
 *
 * Backends (shadow/production-ready path):
 * - upstash: shared durable (preferred when UPSTASH_* present) — multi-worker safe
 * - file: durable shared filesystem store for local multi-process proof (QUANTAI_CRC_BACKEND=file)
 * - memory: process-local fallback (NOT multi-worker safe)
 *
 * Never put secrets, tokens, emails, or raw PII in keys.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeSearchCacheKey } from "@/lib/search/searchCacheKey";
import { createUpstashRedisClient, getUpstashRedis, hasUpstashRedisEnv } from "@/lib/redis/upstashClient";

export const CANONICAL_RESPONSE_CACHE_FLAG = "QUANTAI_SEARCH_CANONICAL_RESPONSE_CACHE";
export const CANONICAL_RESPONSE_CACHE_TTL_ENV = "QUANTAI_SEARCH_CANONICAL_RESPONSE_CACHE_TTL_SECONDS";
export const CANONICAL_CRC_BACKEND_ENV = "QUANTAI_CRC_BACKEND";
export const CANONICAL_CRC_FILE_DIR_ENV = "QUANTAI_CRC_FILE_DIR";

/** Shadow experiment TTL — short freshness window; miss path remains full pipeline. */
export const CANONICAL_RESPONSE_CACHE_DEFAULT_TTL_SECONDS = 60;

/** Pipeline / intelligence contract version baked into keys. */
export const CANONICAL_RESPONSE_CACHE_SCHEMA_VERSION = "crc-v1";

const REDIS_KEY_PREFIX = "quantai:crc:v1:";

type CacheEntry = {
  body: Record<string, unknown>;
  expiresAtMs: number;
  storedAtMs: number;
};

type DurableEnvelope = {
  v: 1;
  storedAtMs: number;
  expiresAtMs?: number;
  body: Record<string, unknown>;
};

const memoryStore = new Map<string, CacheEntry>();

export type CanonicalCacheBackendKind = "upstash" | "file" | "memory";

function parseBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw == null || raw.trim() === "") return defaultValue;
  const v = raw.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(v)) return true;
  if (["false", "0", "no", "off"].includes(v)) return false;
  return defaultValue;
}

/** Feature flag — DEFAULT OFF (frozen pipeline when unset). */
export function isCanonicalResponseCacheEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return parseBool(env[CANONICAL_RESPONSE_CACHE_FLAG], false);
}

export function canonicalResponseCacheTtlSeconds(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env[CANONICAL_RESPONSE_CACHE_TTL_ENV] ?? CANONICAL_RESPONSE_CACHE_DEFAULT_TTL_SECONDS);
  if (!Number.isFinite(raw)) return CANONICAL_RESPONSE_CACHE_DEFAULT_TTL_SECONDS;
  return Math.min(300, Math.max(5, Math.round(raw)));
}

export function resolveCanonicalCacheBackend(env: NodeJS.ProcessEnv = process.env): CanonicalCacheBackendKind {
  const forced = (env[CANONICAL_CRC_BACKEND_ENV] || "").trim().toLowerCase();
  if (forced === "memory") return "memory";
  if (forced === "file") return "file";
  if (forced === "upstash") return hasUpstashRedisEnv(env) ? "upstash" : "memory";
  if (hasUpstashRedisEnv(env)) return "upstash";
  return "memory";
}

export function hashOpaqueContext(value: unknown): string {
  const payload = typeof value === "string" ? value : JSON.stringify(value ?? null);
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

export type CanonicalResponseCacheKeyInput = {
  normalizedQuery: string;
  authScope: "guest" | "auth";
  userFingerprint?: string | null;
  tier: string;
  marketCountry?: string | null;
  marketCurrency?: string | null;
  language?: string | null;
  sortMode?: string | null;
  sessionFingerprint?: string | null;
  featureFlagDigest: string;
  intelligenceVersion: number | string;
  pipelineCacheTag: string;
};

export function buildFeatureFlagDigest(env: NodeJS.ProcessEnv = process.env): string {
  const keys = [
    "QUANTAI_BETA_STABILIZATION",
    "QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI",
    "QUANTAI_SEARCH_META_LITE",
    "QUANTAI_IDENTITY_FOUNDATION_ENABLED",
    "QUANTAI_TRUST_ENGINE_ENABLED",
    "QUANTAI_COMMERCE_MEMORY_ENABLED",
    "QUANTAI_RECOMMENDATION_COGNITION_ENABLED",
    "QUANTAI_AUTONOMOUS_COMMERCE_OS_ENABLED",
    "QUANTAI_CONTROLLED_ACTIVATION_ENABLED",
    "QUANTAI_COMMERCE_EVOLUTION_ENABLED",
    "QUANTAI_COMMERCE_BRAIN_ENABLED",
    "QUANTAI_LIVE_COMMERCE_SIGNALS_ENABLED",
    "QUANTAI_AUTONOMOUS_COMMERCE_IDENTITY_ENABLED",
    "QUANTAI_PREDICTIVE_COMMERCE_INTENT_ENABLED",
    "QUANTAI_AUTONOMOUS_COMMERCE_STRATEGY_ENABLED",
    "QUANTAI_UNIVERSAL_COMMERCE_INTELLIGENCE_ENABLED",
    "QUANTAI_EMOTIONAL_COMMERCE_INTELLIGENCE_ENABLED",
    "QUANTAI_AUTONOMOUS_COMMERCE_EVOLUTION_ENABLED",
    "NODE_ENV",
  ];
  const parts = keys.map((k) => `${k}=${env[k] ?? ""}`);
  return hashOpaqueContext(parts.join("|"));
}

export function buildCanonicalResponseCacheKey(input: CanonicalResponseCacheKeyInput): string {
  const q = normalizeSearchCacheKey(input.normalizedQuery || "");
  const material = [
    CANONICAL_RESPONSE_CACHE_SCHEMA_VERSION,
    `q=${q}`,
    `scope=${input.authScope}`,
    `user=${input.authScope === "auth" ? input.userFingerprint || "missing" : "guest"}`,
    `tier=${input.tier}`,
    `gl=${input.marketCountry ?? ""}`,
    `cur=${input.marketCurrency ?? ""}`,
    `lang=${input.language ?? ""}`,
    `sort=${input.sortMode ?? "value"}`,
    `session=${input.sessionFingerprint ?? "none"}`,
    `flags=${input.featureFlagDigest}`,
    `intel=${input.intelligenceVersion}`,
    `pipe=${input.pipelineCacheTag}`,
  ].join("|");
  const digest = createHash("sha256").update(material).digest("hex");
  return `crc:${CANONICAL_RESPONSE_CACHE_SCHEMA_VERSION}:${digest}`;
}

export const VOLATILE_EQUIVALENCE_PATHS = [
  "data.meta.searchLatencyMs",
  "data.meta.latencyBudget",
  "data.meta.stageSuppression",
  "data.meta.reliability",
  "data.meta.canonicalResponseCache",
  "data.meta.searchDebug",
  "data.meta.pipelineTrace",
] as const;

function isVolatileKey(key: string): boolean {
  return (
    key === "searchLatencyMs" ||
    key === "latencyMs" ||
    key === "latencyBudget" ||
    key === "stageSuppression" ||
    key === "reliability" ||
    key === "canonicalResponseCache" ||
    key === "searchDebug" ||
    key === "pipelineTrace" ||
    key === "ts" ||
    key === "generatedAt" ||
    key === "recordedAt" ||
    key === "requestId" ||
    key === "retryAfter"
  );
}

export function stripVolatileForEquivalence(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripVolatileForEquivalence(item));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isVolatileKey(k)) continue;
      out[k] = stripVolatileForEquivalence(v);
    }
    return out;
  }
  return value;
}

export function stableStringify(value: unknown): string {
  const normalize = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(normalize);
    if (v && typeof v === "object") {
      const obj = v as Record<string, unknown>;
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(obj).sort()) {
        sorted[key] = normalize(obj[key]);
      }
      return sorted;
    }
    return v;
  };
  return JSON.stringify(normalize(value));
}

export function canonicalIntelligenceEqual(a: unknown, b: unknown): boolean {
  return stableStringify(stripVolatileForEquivalence(a)) === stableStringify(stripVolatileForEquivalence(b));
}

export type EquivalenceDiff = { path: string; reason: string };

export function diffCanonicalIntelligence(a: unknown, b: unknown, path = ""): EquivalenceDiff[] {
  const left = stripVolatileForEquivalence(a);
  const right = stripVolatileForEquivalence(b);
  const diffs: EquivalenceDiff[] = [];

  const walk = (x: unknown, y: unknown, p: string) => {
    if (x === y) return;
    if (typeof x !== typeof y) {
      diffs.push({ path: p || "/", reason: `type ${typeof x} vs ${typeof y}` });
      return;
    }
    if (Array.isArray(x) && Array.isArray(y)) {
      if (x.length !== y.length) {
        diffs.push({ path: p || "/", reason: `array length ${x.length} vs ${y.length}` });
        return;
      }
      for (let i = 0; i < x.length; i++) walk(x[i], y[i], `${p}[${i}]`);
      return;
    }
    if (x && y && typeof x === "object" && typeof y === "object") {
      const xk = Object.keys(x as object).sort();
      const yk = Object.keys(y as object).sort();
      if (xk.length !== yk.length || xk.some((k, i) => k !== yk[i])) {
        diffs.push({ path: p || "/", reason: "object keys differ" });
        return;
      }
      for (const k of xk) {
        walk((x as Record<string, unknown>)[k], (y as Record<string, unknown>)[k], p ? `${p}.${k}` : k);
      }
      return;
    }
    if (x !== y) diffs.push({ path: p || "/", reason: "value mismatch" });
  };

  walk(left, right, path);
  return diffs;
}

function cloneBody(body: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
}

function sanitizeStoredBody(body: Record<string, unknown>): Record<string, unknown> {
  const stored = cloneBody(body);
  const data = stored.data as Record<string, unknown> | undefined;
  const meta = data?.meta as Record<string, unknown> | undefined;
  if (meta && "canonicalResponseCache" in meta) delete meta.canonicalResponseCache;
  return stored;
}

function validateCachedBody(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  if (body.success !== true) return null;
  if (!body.data || typeof body.data !== "object") return null;
  return cloneBody(body);
}

function redisKey(logicalKey: string): string {
  return REDIS_KEY_PREFIX + createHash("sha256").update(logicalKey).digest("hex");
}

function fileDir(env: NodeJS.ProcessEnv = process.env): string {
  const dir = (env[CANONICAL_CRC_FILE_DIR_ENV] || ".cache/quantai-crc").trim();
  return join(process.cwd(), dir);
}

function filePathForKey(logicalKey: string, env?: NodeJS.ProcessEnv): string {
  const digest = createHash("sha256").update(logicalKey).digest("hex");
  return join(fileDir(env), `${digest}.json`);
}

function readMemory(key: string): { body: Record<string, unknown>; storedAtMs: number } | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAtMs) {
    memoryStore.delete(key);
    return null;
  }
  const body = validateCachedBody(entry.body);
  if (!body) {
    memoryStore.delete(key);
    return null;
  }
  return { body, storedAtMs: entry.storedAtMs };
}

function writeMemory(key: string, body: Record<string, unknown>, ttlSeconds: number): boolean {
  const stored = sanitizeStoredBody(body);
  if (!validateCachedBody(stored)) return false;
  memoryStore.set(key, {
    body: stored,
    storedAtMs: Date.now(),
    expiresAtMs: Date.now() + ttlSeconds * 1000,
  });
  return true;
}

async function readUpstash(
  key: string,
  independentClient = false
): Promise<{ body: Record<string, unknown>; storedAtMs: number } | null> {
  const redis = independentClient ? createUpstashRedisClient() : getUpstashRedis();
  if (!redis) return null;
  const raw = await redis.get<DurableEnvelope | string>(redisKey(key));
  if (raw == null) return null;
  let env: DurableEnvelope | null = null;
  if (typeof raw === "string") {
    try {
      env = JSON.parse(raw) as DurableEnvelope;
    } catch {
      return null;
    }
  } else if (typeof raw === "object") {
    env = raw as DurableEnvelope;
  }
  if (!env || env.v !== 1) return null;
  const body = validateCachedBody(env.body);
  if (!body) return null;
  return { body, storedAtMs: env.storedAtMs || Date.now() };
}

async function writeUpstash(key: string, body: Record<string, unknown>, ttlSeconds: number): Promise<boolean> {
  const redis = getUpstashRedis();
  if (!redis) return false;
  const stored = sanitizeStoredBody(body);
  if (!validateCachedBody(stored)) return false;
  const envelope: DurableEnvelope = { v: 1, storedAtMs: Date.now(), body: stored };
  await redis.set(redisKey(key), envelope, { ex: ttlSeconds });
  return true;
}

function readFileStore(key: string): { body: Record<string, unknown>; storedAtMs: number } | null {
  const path = filePathForKey(key);
  if (!existsSync(path)) return null;
  try {
    const env = JSON.parse(readFileSync(path, "utf8")) as DurableEnvelope;
    if (!env || env.v !== 1) return null;
    if (env.expiresAtMs && Date.now() >= env.expiresAtMs) {
      try {
        unlinkSync(path);
      } catch {
        /* */
      }
      return null;
    }
    const body = validateCachedBody(env.body);
    if (!body) return null;
    return { body, storedAtMs: env.storedAtMs || Date.now() };
  } catch {
    return null;
  }
}

function writeFileStore(key: string, body: Record<string, unknown>, ttlSeconds: number): boolean {
  try {
    const dir = fileDir();
    mkdirSync(dir, { recursive: true });
    const stored = sanitizeStoredBody(body);
    if (!validateCachedBody(stored)) return false;
    const envelope: DurableEnvelope = {
      v: 1,
      storedAtMs: Date.now(),
      expiresAtMs: Date.now() + ttlSeconds * 1000,
      body: stored,
    };
    writeFileSync(filePathForKey(key), JSON.stringify(envelope), "utf8");
    return true;
  } catch {
    return false;
  }
}

export type CanonicalCacheReadResult = {
  body: Record<string, unknown>;
  storedAtMs: number;
  backend: CanonicalCacheBackendKind;
};

/** Async get — fail soft to null (canonical MISS). */
export async function getCanonicalCachedSearchBody(key: string): Promise<Record<string, unknown> | null> {
  const got = await getCanonicalCachedSearchBodyDetailed(key);
  return got?.body ?? null;
}

export async function getCanonicalCachedSearchBodyDetailed(
  key: string
): Promise<CanonicalCacheReadResult | null> {
  try {
    const backend = resolveCanonicalCacheBackend();
    if (backend === "upstash") {
      const hit = await readUpstash(key);
      if (hit) return { ...hit, backend };
      return null;
    }
    if (backend === "file") {
      const hit = readFileStore(key);
      if (hit) return { ...hit, backend };
      return null;
    }
    const hit = readMemory(key);
    if (hit) return { ...hit, backend: "memory" };
    return null;
  } catch {
    return null;
  }
}

/** Independent client read — simulates another worker against shared Upstash. */
export async function getCanonicalCachedSearchBodyViaIndependentUpstashClient(
  key: string
): Promise<Record<string, unknown> | null> {
  try {
    const hit = await readUpstash(key, true);
    return hit?.body ?? null;
  } catch {
    return null;
  }
}

export async function setCanonicalCachedSearchBody(
  key: string,
  body: Record<string, unknown>,
  ttlSeconds?: number
): Promise<boolean> {
  try {
    if (!key || !body || typeof body !== "object") return false;
    const ttl = ttlSeconds ?? canonicalResponseCacheTtlSeconds();
    const backend = resolveCanonicalCacheBackend();
    if (backend === "upstash") return await writeUpstash(key, body, ttl);
    if (backend === "file") return writeFileStore(key, body, ttl);
    return writeMemory(key, body, ttl);
  } catch {
    return false;
  }
}

export function stampCanonicalCacheHitDiagnostics(
  body: Record<string, unknown>,
  args: {
    lookupMs: number;
    ageMs: number;
    keyDigest: string;
    backend?: CanonicalCacheBackendKind;
  }
): Record<string, unknown> {
  const next = cloneBody(body);
  const data = (next.data ??= {}) as Record<string, unknown>;
  const meta = (data.meta ??= {}) as Record<string, unknown>;
  meta.canonicalResponseCache = {
    hit: true,
    lookupMs: args.lookupMs,
    ageMs: args.ageMs,
    keyDigest: args.keyDigest.slice(0, 16),
    schema: CANONICAL_RESPONSE_CACHE_SCHEMA_VERSION,
    backend: args.backend ?? resolveCanonicalCacheBackend(),
  };
  return next;
}

export function clearCanonicalResponseCache(): void {
  memoryStore.clear();
}

export function canonicalResponseCacheSize(): number {
  return memoryStore.size;
}

export function expireCanonicalResponseCacheKey(key: string): void {
  const backend = resolveCanonicalCacheBackend();
  if (backend === "upstash") {
    // Sync helper for tests — fire-and-forget delete (await deleteCanonicalCachedSearchBody in async tests).
    void deleteCanonicalCachedSearchBody(key);
    return;
  }
  if (backend === "file") {
    const path = filePathForKey(key);
    if (!existsSync(path)) return;
    try {
      const env = JSON.parse(readFileSync(path, "utf8")) as DurableEnvelope;
      env.expiresAtMs = Date.now() - 1;
      writeFileSync(path, JSON.stringify(env), "utf8");
    } catch {
      /* */
    }
    return;
  }
  const entry = memoryStore.get(key);
  if (!entry) return;
  memoryStore.set(key, { ...entry, expiresAtMs: Date.now() - 1 });
}

export async function peekCanonicalResponseCacheAgeMs(key: string): Promise<number | null> {
  const hit = await getCanonicalCachedSearchBodyDetailed(key);
  if (!hit) return null;
  return Date.now() - hit.storedAtMs;
}

/** Delete durable entry (tests). */
export async function deleteCanonicalCachedSearchBody(key: string): Promise<void> {
  const backend = resolveCanonicalCacheBackend();
  if (backend === "upstash") {
    const redis = getUpstashRedis();
    if (redis) await redis.del(redisKey(key));
    return;
  }
  if (backend === "file") {
    const path = filePathForKey(key);
    if (existsSync(path)) {
      try {
        unlinkSync(path);
      } catch {
        /* */
      }
    }
    return;
  }
  memoryStore.delete(key);
}
