/**
 * Future-facing capability flags for subscriptions, alerts, premium reports,
 * and affiliate surfaces. Wire Stripe / partner IDs here when ready.
 */
export type SubscriptionTier = "free" | "pro" | "business";

export type AlertChannel = "email" | "push" | "webhook";

export interface WatchlistAlertDraft {
  productLink: string;
  title: string;
  targetPrice?: number | null;
  channel: AlertChannel;
}

export interface PremiumReportDraft {
  searchQuery: string;
  productLinks: string[];
  depth: "standard" | "deep";
}

export interface AffiliateAttribution {
  network: "none" | "partner_stub";
  tag?: string;
}

export function planAllowsPremiumReports(tier: SubscriptionTier): boolean {
  return tier === "pro" || tier === "business";
}

export function planAllowsUnlimitedWatchlist(tier: SubscriptionTier): boolean {
  return tier !== "free";
}
