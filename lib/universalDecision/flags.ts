/**
 * Domain feature flags — PRODUCT always on.
 * Other domains require both flag + live provider credentials.
 */

import type { DecisionDomain } from "@/lib/universalDecision/types";

function parseBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw == null || raw.trim() === "") return defaultValue;
  const v = raw.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(v)) return true;
  if (["false", "0", "no", "off"].includes(v)) return false;
  return defaultValue;
}

export function hasSerpApiKey(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.SERPAPI_KEY?.trim());
}

/** Domains that may be enabled in production when providers exist. */
export function isDomainFeatureEnabled(
  domain: DecisionDomain,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (domain === "product") return true;

  // Disabled domains stay typed but off until real adapters + providers.
  if (
    domain === "software" ||
    domain === "insurance" ||
    domain === "course" ||
    domain === "device" ||
    domain === "service"
  ) {
    return false;
  }

  if (domain === "flight") {
    return parseBool(env.QUANTAI_DOMAIN_FLIGHT_ENABLED, true) && hasSerpApiKey(env);
  }
  if (domain === "hotel") {
    return parseBool(env.QUANTAI_DOMAIN_HOTEL_ENABLED, true) && hasSerpApiKey(env);
  }
  if (domain === "subscription") {
    return parseBool(env.QUANTAI_DOMAIN_SUBSCRIPTION_ENABLED, true) && hasSerpApiKey(env);
  }
  return false;
}

export function domainProviderRequirement(domain: DecisionDomain): string {
  switch (domain) {
    case "product":
      return "SERPAPI_KEY (engine=google_shopping) — already used";
    case "flight":
      return "SERPAPI_KEY with Google Flights engine access (engine=google_flights)";
    case "hotel":
      return "SERPAPI_KEY with Google Hotels engine access (engine=google_hotels)";
    case "subscription":
      return "SERPAPI_KEY (google / google_shopping) for live pricing signals";
    default:
      return "Domain adapter registered but disabled until a verified provider is connected";
  }
}
