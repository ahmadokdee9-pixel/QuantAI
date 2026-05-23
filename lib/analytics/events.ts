/**
 * QuantAI analytics — structured names for dashboards (PostHog, Segment, internal ETL, etc.).
 * Client: call `trackEvent` from `lib/analytics/track`. Server: use `trackServerEvent` where needed.
 */

export const QuantAnalyticsEvents = {
  SEARCH_RUN: "quantai.search.run",
  SEARCH_SUCCESS: "quantai.search.success",
  SEARCH_ERROR: "quantai.search.error",
  PRODUCT_SAVE: "quantai.product.save",
  PRODUCT_SAVE_FAIL: "quantai.product.save_fail",
  PRODUCT_REMOVE_SAVE: "quantai.product.remove_save",
  COMPARE_OPEN: "quantai.compare.open",
  COMPARE_VERDICT: "quantai.compare.verdict",
  COMPARE_VERDICT_FAIL: "quantai.compare.verdict_fail",
  WATCHLIST_ADD: "quantai.watchlist.add",
  WATCHLIST_ADD_FAIL: "quantai.watchlist.add_fail",
  OFFER_CLICK: "quantai.offer.click",
  PRICING_CTA_CHECKOUT: "quantai.pricing.checkout_start",
  PRICING_CTA_DASHBOARD: "quantai.pricing.dashboard_open",
  DASHBOARD_VIEW: "quantai.dashboard.view",
  NORMALIZATION_SHADOW: "quantai.normalization.shadow",
} as const;

export type QuantAnalyticsEvent = (typeof QuantAnalyticsEvents)[keyof typeof QuantAnalyticsEvents];

const ALLOWED = new Set<string>(Object.values(QuantAnalyticsEvents));

export function isAllowedAnalyticsEvent(name: string): name is QuantAnalyticsEvent {
  return ALLOWED.has(name);
}
