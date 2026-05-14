/** Browser session persistence for `CommerceSessionMemoryV1` (no UI). */

export const COMMERCE_SESSION_STORAGE_KEY = "quantai_commerce_session_memory_v1";

export function readCommerceSessionMemoryFromBrowser(): unknown {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(COMMERCE_SESSION_STORAGE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

export function writeCommerceSessionMemoryToBrowser(mem: unknown): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(COMMERCE_SESSION_STORAGE_KEY, JSON.stringify(mem));
  } catch {
    /* ignore quota / private mode */
  }
}
