/**
 * Lightweight production logging — no secrets, structured one-liners.
 */

type LogLevel = "info" | "warn" | "error";

function emit(level: LogLevel, event: string, fields?: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export function logProductionInfo(event: string, fields?: Record<string, unknown>) {
  emit("info", event, fields);
}

export function logProductionWarn(event: string, fields?: Record<string, unknown>) {
  emit("warn", event, fields);
}

export function logProductionError(event: string, fields?: Record<string, unknown>) {
  emit("error", event, fields);
}

export function logSearchEvent(
  outcome: "success" | "empty" | "upstream_fail" | "rate_limit" | "error",
  fields: Record<string, unknown>
) {
  emit(outcome === "error" || outcome === "upstream_fail" ? "error" : outcome === "empty" ? "warn" : "info", "search", {
    outcome,
    ...fields,
  });
}
