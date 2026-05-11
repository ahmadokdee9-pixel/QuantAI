import type { ApiReadResult } from "./readJson";

/** True when the response should be treated as an API failure (non-JSON, HTTP error, or `{ success: false }`). */
export function isApiFailure(p: ApiReadResult<unknown>): boolean {
  return Boolean(p.notJson) || !p.ok || p.success === false;
}

/** Prefer server `message`, then `error`, then transport message, then `fallback`. */
export function apiErrorText(p: ApiReadResult<unknown>, fallback: string): string {
  if (p.data && typeof p.data === "object" && p.data !== null) {
    const o = p.data as { message?: unknown; error?: unknown };
    if (typeof o.message === "string" && o.message.trim()) return o.message;
    if (typeof o.error === "string" && o.error.trim()) return o.error;
  }
  if (p.error?.trim()) return p.error;
  return fallback;
}
