/**
 * Lightweight production logging — no secrets, structured one-liners.
 */

import { recordOpsSignal } from "@/lib/ops/productionSignals";

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

  // PB-10: shared ops counters (best-effort; never throws)
  try {
    if (outcome === "success") recordOpsSignal("search_ok", fields);
    else if (outcome === "empty") recordOpsSignal("search_empty", fields);
    else if (outcome === "rate_limit") recordOpsSignal("rate_limit", fields);
    else if (outcome === "error" || outcome === "upstream_fail") {
      recordOpsSignal("api_5xx", { outcome, ...fields });
    }
    const products = typeof fields.products === "number" ? fields.products : null;
    const discovery =
      typeof fields.discoveryCandidates === "number"
        ? fields.discoveryCandidates
        : typeof fields.sourceCount === "number"
          ? fields.sourceCount
          : null;
    if (outcome === "success" || outcome === "empty") {
      recordOpsSignal("upstream_cost", {
        units: discovery != null && discovery > 0 ? Math.min(discovery, 24) : 1,
        products,
        latencyMs: fields.latencyMs,
      });
    }
  } catch {
    /* ignore */
  }
}
