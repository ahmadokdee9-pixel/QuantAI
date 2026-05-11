/** Development-only logging — avoids console noise in production builds. */

export function logDevError(scope: string, error: unknown): void {
  if (process.env.NODE_ENV !== "development") return;
  console.error(`[QuantAI:${scope}]`, error);
}

export function logDevWarn(scope: string, message: string): void {
  if (process.env.NODE_ENV !== "development") return;
  console.warn(`[QuantAI:${scope}]`, message);
}
