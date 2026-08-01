import type { SourceFreshness } from "@/lib/universalDecision/types";

export function buildSourceFreshness(args: {
  fetchedAt?: string | null;
  maxAgeMs: number;
  provider: string;
  available: boolean;
  partial?: boolean;
}): SourceFreshness {
  const fetchedAt = args.fetchedAt || new Date().toISOString();
  const age = Date.now() - new Date(fetchedAt).getTime();
  const stale = Number.isFinite(age) ? age > args.maxAgeMs : true;

  if (!args.available) {
    return {
      fetchedAt,
      maxAgeMs: args.maxAgeMs,
      stale: true,
      provider: args.provider,
      status: "unavailable",
    };
  }

  return {
    fetchedAt,
    maxAgeMs: args.maxAgeMs,
    stale,
    provider: args.provider,
    status: args.partial ? "partial" : stale ? "stale" : "fresh",
  };
}

export function freshnessLabel(freshness: SourceFreshness): string {
  switch (freshness.status) {
    case "fresh":
      return "Sources fresh";
    case "stale":
      return "Sources may be stale — re-run before committing";
    case "partial":
      return "Partial provider coverage";
    default:
      return "Provider unavailable";
  }
}
