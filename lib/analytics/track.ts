"use client";

import type { QuantAnalyticsEvent } from "./events";

/**
 * Fire-and-forget client analytics. POSTs to `/api/analytics/event` with `keepalive` for unload safety.
 * Does not read the response — avoids any HTML/redirect edge cases and never touches logging here.
 */
export function trackEvent(event: QuantAnalyticsEvent, properties?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({
    event,
    properties: properties ?? {},
    path: window.location.pathname,
    ts: Date.now(),
  });
  void fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
