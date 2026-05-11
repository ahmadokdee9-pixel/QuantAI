import type { QuantAnalyticsEvent } from "./events";
import { isAllowedAnalyticsEvent } from "./events";

type AnalyticsPayload = {
  event: string;
  properties?: Record<string, unknown>;
  path?: string;
  ts?: number;
};

/** Optional forwarder for server-side events (e.g. after successful mutations). */
export function trackServerEvent(event: QuantAnalyticsEvent, properties?: Record<string, unknown>): void {
  if (!isAllowedAnalyticsEvent(event)) return;
  const sink = process.env.QUANTAI_ANALYTICS_SINK_URL?.trim();
  if (!sink) return;
  void fetch(sink, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, properties: properties ?? {} } satisfies AnalyticsPayload),
  }).catch(() => {});
}
