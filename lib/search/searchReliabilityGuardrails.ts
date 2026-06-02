import type { SearchPipelineTray } from "@/lib/search/productionStabilizationEnv";

type TelemetryCounters = {
  requests: number;
  rateLimited429: number;
  degradedServed: number;
  emptyOn429: number;
};

const counters: TelemetryCounters = {
  requests: 0,
  rateLimited429: 0,
  degradedServed: 0,
  emptyOn429: 0,
};

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

export function markSearchRequest(): void {
  counters.requests += 1;
}

export function markRateLimited429(args: { servedDegraded: boolean; emptyOn429: boolean }): void {
  counters.rateLimited429 += 1;
  if (args.servedDegraded) counters.degradedServed += 1;
  if (args.emptyOn429) counters.emptyOn429 += 1;
}

export function reliabilityTelemetrySnapshot() {
  return {
    counters: { ...counters },
    rates: {
      rate429: pct(counters.rateLimited429, counters.requests),
      degradedServedRate: pct(counters.degradedServed, counters.rateLimited429),
      emptyOn429Rate: pct(counters.emptyOn429, counters.rateLimited429),
    },
  };
}

type TimeoutError = Error & { code: "SEARCH_PIPELINE_TIMEOUT"; timeoutMs: number };

export async function withTimeout<T>(
  label: string,
  timeoutMs: number,
  run: () => Promise<T>
): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      run(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          const err = new Error(`${label} timed out after ${timeoutMs}ms`) as TimeoutError;
          err.code = "SEARCH_PIPELINE_TIMEOUT";
          err.timeoutMs = timeoutMs;
          reject(err);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type CircuitState = {
  failures: number;
  openedUntilMs: number;
  lastFailureAtMs: number;
};

const circuitByKey = new Map<string, CircuitState>();

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name] ?? "");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
}

const FAILURE_THRESHOLD = envInt("SEARCH_CIRCUIT_BREAKER_FAILURE_THRESHOLD", 3);
const OPEN_MS = envInt("SEARCH_CIRCUIT_BREAKER_OPEN_MS", 30_000);
const REQUEST_TIMEOUT_MS = envInt("SEARCH_REQUEST_TIMEOUT_MS", 15_000);

export function searchRequestTimeoutMs(): number {
  return REQUEST_TIMEOUT_MS;
}

export function isCircuitOpen(key: string): boolean {
  const state = circuitByKey.get(key);
  if (!state) return false;
  const now = Date.now();
  if (state.openedUntilMs <= now) {
    state.openedUntilMs = 0;
    state.failures = 0;
    circuitByKey.set(key, state);
    return false;
  }
  return true;
}

export function markCircuitFailure(key: string): void {
  const now = Date.now();
  const current = circuitByKey.get(key) ?? { failures: 0, openedUntilMs: 0, lastFailureAtMs: 0 };
  const failures = current.failures + 1;
  const shouldOpen = failures >= FAILURE_THRESHOLD;
  circuitByKey.set(key, {
    failures,
    openedUntilMs: shouldOpen ? now + OPEN_MS : current.openedUntilMs,
    lastFailureAtMs: now,
  });
}

export function markCircuitSuccess(key: string): void {
  if (!circuitByKey.has(key)) return;
  circuitByKey.set(key, { failures: 0, openedUntilMs: 0, lastFailureAtMs: 0 });
}

export function circuitSnapshot(key: string) {
  const state = circuitByKey.get(key) ?? { failures: 0, openedUntilMs: 0, lastFailureAtMs: 0 };
  return {
    key,
    failures: state.failures,
    open: state.openedUntilMs > Date.now(),
    openedUntilMs: state.openedUntilMs,
    lastFailureAtMs: state.lastFailureAtMs,
    threshold: FAILURE_THRESHOLD,
  };
}

type StaleTrayEntry = {
  tray: SearchPipelineTray;
  savedAtMs: number;
};

const staleGuestTrayByKey = new Map<string, StaleTrayEntry>();
let latestGuestTray: StaleTrayEntry | null = null;
const STALE_TTL_MS = envInt("SEARCH_STALE_GUEST_TTL_MS", 15 * 60 * 1000);

export function saveGuestStaleTray(cacheKey: string, tray: SearchPipelineTray): void {
  const entry: StaleTrayEntry = { tray, savedAtMs: Date.now() };
  staleGuestTrayByKey.set(cacheKey, entry);
  latestGuestTray = entry;
}

function freshEnough(entry: StaleTrayEntry | null): entry is StaleTrayEntry {
  if (!entry) return false;
  return Date.now() - entry.savedAtMs <= STALE_TTL_MS;
}

export function getGuestStaleTray(cacheKey: string): SearchPipelineTray | null {
  const specific = staleGuestTrayByKey.get(cacheKey) ?? null;
  if (freshEnough(specific)) return specific.tray;
  if (freshEnough(latestGuestTray)) return latestGuestTray.tray;
  return null;
}
