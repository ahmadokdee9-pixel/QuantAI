/**
 * Serialized search validation client — adaptive spacing and 429 backoff.
 * Separates infrastructure failures from ranking-quality failures.
 */

const DEFAULT_MIN_INTERVAL_MS = Number(process.env.VALIDATION_MIN_INTERVAL_MS || 2200);
const DEFAULT_MAX_RETRIES = Number(process.env.VALIDATION_MAX_RETRIES || 4);
const DEFAULT_BASE_BACKOFF_MS = Number(process.env.VALIDATION_BACKOFF_MS || 3500);

export class ValidationRequestQueue {
  #chain = Promise.resolve();
  #lastDoneAt = 0;
  #minIntervalMs;
  #maxRetries;
  #baseBackoffMs;

  constructor(opts = {}) {
    this.#minIntervalMs = opts.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
    this.#maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.#baseBackoffMs = opts.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS;
  }

  enqueue(task) {
    const run = async () => {
      const waitMs = Math.max(0, this.#minIntervalMs - (Date.now() - this.#lastDoneAt));
      if (waitMs > 0) await sleep(waitMs);
      return task();
    };
    const next = this.#chain.then(run, run);
    this.#chain = next.then(
      () => {
        this.#lastDoneAt = Date.now();
      },
      () => {
        this.#lastDoneAt = Date.now();
      }
    );
    return next;
  }

  get maxRetries() {
    return this.#maxRetries;
  }

  get baseBackoffMs() {
    return this.#baseBackoffMs;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * @param {string} baseUrl
 * @param {string} query
 * @param {ValidationRequestQueue} queue
 */
export async function validationSearch(baseUrl, query, queue) {
  return queue.enqueue(() => searchWithRetry(baseUrl, query, queue.maxRetries, queue.baseBackoffMs));
}

async function searchWithRetry(baseUrl, query, maxRetries, baseBackoffMs) {
  let attempt = 0;
  let last = null;

  while (attempt <= maxRetries) {
    const started = Date.now();
    let res;
    let text = "";
    try {
      res = await fetch(`${baseUrl}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      text = await res.text();
    } catch (e) {
      last = {
        status: 0,
        success: false,
        products: [],
        meta: {},
        infrastructure: {
          kind: "network_error",
          retryable: true,
          detail: e instanceof Error ? e.message : "fetch_failed",
        },
        latencyMs: Date.now() - started,
      };
      attempt += 1;
      if (attempt > maxRetries) break;
      await sleep(backoffMs(baseBackoffMs, attempt));
      continue;
    }

    const json = parseJsonSafe(text);
    const products = Array.isArray(json?.data?.products) ? json.data.products : [];
    const meta = json?.data?.meta ?? {};
    const retryAfterHeader = Number.parseInt(res.headers.get("retry-after") ?? "", 10);
    const retryAfterBody = Number(json?.retryAfter);
    const retryAfter = Number.isFinite(retryAfterHeader)
      ? retryAfterHeader
      : Number.isFinite(retryAfterBody)
        ? retryAfterBody
        : null;

    if (res.status === 429) {
      last = {
        status: 429,
        success: false,
        products,
        meta,
        infrastructure: {
          kind: "rate_limited",
          retryable: true,
          retryAfter: retryAfter ?? 60,
        },
        latencyMs: Date.now() - started,
      };
      attempt += 1;
      if (attempt > maxRetries) break;
      const wait = Math.max(backoffMs(baseBackoffMs, attempt), (retryAfter ?? 8) * 1000);
      await sleep(wait);
      continue;
    }

    if (res.status >= 500 || !json) {
      last = {
        status: res.status,
        success: false,
        products,
        meta,
        infrastructure: {
          kind: res.status >= 500 ? "server_error" : "bad_response",
          retryable: res.status >= 500,
          detail: json?.message ?? `http_${res.status}`,
        },
        latencyMs: Date.now() - started,
      };
      if (res.status >= 500 && attempt < maxRetries) {
        attempt += 1;
        await sleep(backoffMs(baseBackoffMs, attempt));
        continue;
      }
      break;
    }

    return {
      status: res.status,
      success: json?.success === true,
      products,
      meta,
      infrastructure: null,
      latencyMs: Date.now() - started,
      degraded: Boolean(meta?.operationalState?.degraded || meta?.guestDegraded),
    };
  }

  return (
    last ?? {
      status: 0,
      success: false,
      products: [],
      meta: {},
      infrastructure: { kind: "unknown", retryable: false },
      latencyMs: 0,
    }
  );
}

function backoffMs(base, attempt) {
  const jitter = Math.floor(Math.random() * 400);
  return base * 2 ** Math.max(0, attempt - 1) + jitter;
}

export function isInfrastructureFailure(row) {
  return Boolean(row.infrastructure);
}

export function infrastructureLabel(row) {
  if (!row.infrastructure) return null;
  return row.infrastructure.kind;
}
