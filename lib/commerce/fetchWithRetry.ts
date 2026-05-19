/**
 * Bounded fetch retry for commerce upstreams (SerpAPI, etc.).
 */

export type FetchWithRetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  signal?: AbortSignal;
  label?: string;
};

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  opts?: FetchWithRetryOptions
): Promise<Response> {
  const retries = Math.min(3, Math.max(0, opts?.retries ?? 2));
  const baseDelayMs = opts?.baseDelayMs ?? 400;
  let lastError: unknown;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: opts?.signal });
      if (res.ok || !retryableStatus(res.status) || attempt === retries) {
        return res;
      }
      lastResponse = res;
    } catch (e) {
      lastError = e;
      if (opts?.signal?.aborted) throw e;
      if (attempt === retries) throw e;
    }
    const backoff = baseDelayMs * Math.pow(2, attempt);
    await delay(backoff, opts?.signal);
  }

  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error(`${opts?.label ?? "fetch"} failed`);
}
