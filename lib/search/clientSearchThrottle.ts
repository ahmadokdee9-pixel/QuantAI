/** Client-side minimum interval between search submissions (abuse + double-tap guard). */

const DEFAULT_MIN_MS = 2500;

export function createClientSearchThrottle(minIntervalMs = DEFAULT_MIN_MS) {
  let lastSubmitAt = 0;

  return {
    check(): { allowed: true } | { allowed: false; waitMs: number } {
      const now = Date.now();
      const elapsed = now - lastSubmitAt;
      if (lastSubmitAt > 0 && elapsed < minIntervalMs) {
        return { allowed: false, waitMs: minIntervalMs - elapsed };
      }
      lastSubmitAt = now;
      return { allowed: true };
    },
    reset() {
      lastSubmitAt = 0;
    },
  };
}

export function clientThrottleMessage(waitMs: number): string {
  const sec = Math.max(1, Math.ceil(waitMs / 1000));
  return `Intelligence console cooling down — wait ~${sec}s before the next read.`;
}
