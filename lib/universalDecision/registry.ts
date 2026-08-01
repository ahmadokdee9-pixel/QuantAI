import { flightAdapter } from "@/lib/universalDecision/adapters/flightAdapter";
import { hotelAdapter } from "@/lib/universalDecision/adapters/hotelAdapter";
import { productAdapter } from "@/lib/universalDecision/adapters/productAdapter";
import { subscriptionAdapter } from "@/lib/universalDecision/adapters/subscriptionAdapter";
import type { DomainAdapter } from "@/lib/universalDecision/adapters/types";
import type { DecisionDomain } from "@/lib/universalDecision/types";
import {
  domainProviderRequirement,
  isDomainFeatureEnabled,
} from "@/lib/universalDecision/flags";

const ADAPTERS: DomainAdapter[] = [
  productAdapter,
  flightAdapter,
  hotelAdapter,
  subscriptionAdapter,
];

const BY_DOMAIN = new Map<DecisionDomain, DomainAdapter>(
  ADAPTERS.map((a) => [a.domain, a])
);

/** Future domains typed but disabled until real providers exist. */
export const DISABLED_TYPED_DOMAINS: DecisionDomain[] = [
  "software",
  "insurance",
  "course",
  "device",
  "service",
];

export function getAdapter(domain: DecisionDomain): DomainAdapter | null {
  return BY_DOMAIN.get(domain) ?? null;
}

export function listEnabledAdapters(env: NodeJS.ProcessEnv = process.env): DomainAdapter[] {
  return ADAPTERS.filter((a) => isDomainFeatureEnabled(a.domain, env));
}

export function domainStatusReport(env: NodeJS.ProcessEnv = process.env) {
  const live: DecisionDomain[] = [];
  const flagged: Array<{ domain: DecisionDomain; reason: string; provider: string }> = [];

  for (const adapter of ADAPTERS) {
    const enabled = isDomainFeatureEnabled(adapter.domain, env);
    const providerLive = adapter.isProviderLive(env);
    if (enabled && providerLive) {
      live.push(adapter.domain);
    } else if (adapter.domain !== "product") {
      flagged.push({
        domain: adapter.domain,
        reason: !providerLive
          ? "Provider credentials missing or engine not accessible"
          : "Feature-flagged off",
        provider: domainProviderRequirement(adapter.domain),
      });
    }
  }

  for (const domain of DISABLED_TYPED_DOMAINS) {
    flagged.push({
      domain,
      reason: "Typed only — adapter not implemented",
      provider: domainProviderRequirement(domain),
    });
  }

  return { live, flagged };
}
