import { contextualVerbFor } from "@/lib/universalDecision/actions";
import { domainProviderRequirement, hasSerpApiKey } from "@/lib/universalDecision/flags";
import { buildSourceFreshness } from "@/lib/universalDecision/freshness";
import {
  clampPct,
  confidenceFromEvidence,
  memoryIdentityFor,
  pickActionFromSignals,
} from "@/lib/universalDecision/score";
import { fetchGoogleHotels } from "@/lib/universalDecision/providers/serpapiTravel";
import type { DomainAdapter } from "@/lib/universalDecision/adapters/types";
import type {
  DecisionEvidenceItem,
  UniversalCandidate,
  UniversalDecision,
} from "@/lib/universalDecision/types";

export const hotelAdapter: DomainAdapter = {
  domain: "hotel",
  label: "Hotel",
  detectIntent: (query) => {
    if (/\b(hotel|hotels|hostel|resort|airbnb)\b/i.test(query)) {
      return { domain: "hotel", confidence: 76, reasons: ["Lodging language"] };
    }
    return null;
  },
  normalizeQuery: (query, extracted) => {
    const dest = typeof extracted?.destination === "string" ? extracted.destination : "";
    const landmark = typeof extracted?.landmark === "string" ? extracted.landmark : "";
    if (dest && landmark) return `${dest} hotels near ${landmark}`;
    if (dest) return `${dest} hotels`;
    return query.trim();
  },
  isProviderLive: (env) => hasSerpApiKey(env),
  providerRequirement: domainProviderRequirement("hotel"),
  async run(input) {
    const generatedAt = new Date().toISOString();
    const live = hasSerpApiKey();
    const extracted = input.classification.extracted || {};
    const q = hotelAdapter.normalizeQuery(input.query, extracted);

    if (!live) {
      const decision: UniversalDecision = {
        version: 1,
        domain: "hotel",
        action: "COMPARE",
        contextualVerb: "COMPARE",
        confidence: 15,
        domainConfidence: input.classification.confidence,
        executiveSummary: "Hotel provider unavailable — configure SERPAPI_KEY with Google Hotels access.",
        reasons: [],
        risks: ["No live stay pricing"],
        alternatives: [],
        timing: {
          today: "Cannot recommend a stay without live rates",
          thisWeek: "Connect SerpAPI Google Hotels",
          thisMonth: "Re-run once provider is live",
        },
        evidence: [],
        trust: { score: null, label: "Provider unavailable", notes: [] },
        constraints: { hard: [], soft: [] },
        sourceFreshness: buildSourceFreshness({
          fetchedAt: generatedAt,
          maxAgeMs: 60 * 60_000,
          provider: "serpapi:google_hotels",
          available: false,
        }),
        watchable: false,
        memoryIdentity: memoryIdentityFor("hotel", "unavailable"),
        leader: null,
        candidates: [],
        insufficientEvidence: true,
        providerStatus: "unavailable",
        query: input.query,
        generatedAt,
      };
      return { decision, candidates: [] };
    }

    const nights =
      typeof extracted.nights === "number" && extracted.nights > 0 ? extracted.nights : 3;

    const result = await fetchGoogleHotels({
      query: q,
      nights,
      currency: input.currency || "EUR",
      gl: input.marketCountry || "nl",
      signal: input.signal,
    });

    const candidates: UniversalCandidate[] = result.offers
      .filter((o) => o.price != null)
      .map((o) => ({
        id: o.id,
        domain: "hotel" as const,
        title: o.title,
        subtitle: o.neighborhood,
        merchant: "Google Hotels",
        price: o.price,
        currency: o.currency,
        link: o.link,
        availability: "Listed rate",
        score: clampPct(
          55 + (o.rating != null ? o.rating * 8 : 0) - (o.price != null ? Math.min(15, o.price / 50) : 0)
        ),
        raw: { ...o.raw, rating: o.rating },
      }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const leader = candidates[0] ?? null;
    const prices = candidates.map((c) => c.price!).filter(Number.isFinite);
    const min = prices.length ? Math.min(...prices) : null;
    const max = prices.length ? Math.max(...prices) : null;
    const spread =
      min != null && max != null && min > 0 ? ((max - min) / min) * 100 : null;

    const evidence: DecisionEvidenceItem[] = [];
    if (leader?.price != null) {
      evidence.push({
        id: "stay_cost",
        label: "Listed stay rate",
        value: `${leader.currency || "EUR"} ${leader.price} (per listing unit · ~${nights} nights context)`,
        kind: "fact",
        source: "serpapi:google_hotels",
      });
    }
    evidence.push({
      id: "taxes_fees",
      label: "Taxes & hidden fees",
      value: "Resort fees/taxes may be excluded — confirm total before reserve",
      kind: "inference",
    });
    if (leader?.subtitle) {
      evidence.push({
        id: "location",
        label: "Location fit",
        value: leader.subtitle,
        kind: "fact",
        source: "serpapi:google_hotels",
      });
    }
    const rating =
      leader?.raw && typeof (leader.raw as { rating?: unknown }).rating === "number"
        ? Number((leader.raw as { rating: number }).rating)
        : null;
    if (rating != null) {
      evidence.push({
        id: "reviews",
        label: "Review score",
        value: `${rating.toFixed(1)} / 5 (listing score)`,
        kind: "fact",
        source: "serpapi:google_hotels",
      });
    }
    evidence.push({
      id: "cancellation",
      label: "Cancellation flexibility",
      value: "Policy not confirmed in this feed — verify free-cancellation window",
      kind: "inference",
    });
    evidence.push({
      id: "safety_context",
      label: "Neighborhood context",
      value: "Safety/context not independently verified — use local judgment",
      kind: "inference",
    });

    const insufficient = candidates.length === 0 || Boolean(result.error);
    const action = pickActionFromSignals({
      candidateCount: candidates.length,
      bestScore: leader?.score ?? null,
      priceSpreadPct: spread,
      highRisk: rating != null && rating < 3.2,
      waitSignal: false,
      insufficient,
    });

    const confidence = confidenceFromEvidence({
      factCount: evidence.filter((e) => e.kind === "fact").length,
      candidateCount: candidates.length,
      providerLive: true,
      domainConfidence: input.classification.confidence,
      partial: Boolean(result.error) || candidates.length < 2,
    });

    const decision: UniversalDecision = {
      version: 1,
      domain: "hotel",
      action,
      contextualVerb: contextualVerbFor("hotel", action),
      confidence,
      domainConfidence: input.classification.confidence,
      executiveSummary: insufficient
        ? result.error || "Insufficient live hotel evidence — refine destination and dates."
        : `${action === "BUY" ? "Reserve" : action}: ${leader?.title ?? "top stay"} at ${leader?.currency || "EUR"} ${leader?.price ?? "—"}.`,
      reasons: [
        leader?.price != null ? `Listed rate ${leader.currency} ${leader.price}` : null,
        rating != null ? `Listing score ${rating.toFixed(1)}` : null,
        candidates.length > 1 ? `${candidates.length} priced stays` : null,
      ].filter(Boolean) as string[],
      risks: [
        "Taxes and resort fees may be missing from the listed rate",
        "Cancellation terms not confirmed here",
        result.error ? `Provider note: ${result.error}` : null,
      ].filter(Boolean) as string[],
      alternatives: candidates.slice(1, 4).map((c) => ({
        id: c.id,
        title: c.title,
        subtitle: c.subtitle,
        price: c.price,
        currency: c.currency,
        link: c.link,
        why: c.subtitle || "Alternative stay",
      })),
      timing: {
        today:
          action === "BUY"
            ? "Rate looks workable if location fit is confirmed — verify total + cancel policy"
            : "Compare a short list before reserving",
        thisWeek: "Re-check rates closer to check-in",
        thisMonth: "Watch if free-cancellation options appear",
      },
      evidence,
      trust: {
        score: insufficient ? null : 58,
        label: insufficient ? "Insufficient evidence" : "Live hotel listing",
        notes: ["Facts from SerpAPI Google Hotels; fees/policies may be incomplete"],
      },
      constraints: {
        hard: [],
        soft: [`~${nights} night stay context`],
      },
      sourceFreshness: buildSourceFreshness({
        fetchedAt: result.fetchedAt,
        maxAgeMs: 60 * 60_000,
        provider: "serpapi:google_hotels",
        available: !insufficient,
        partial: Boolean(result.error) && candidates.length > 0,
      }),
      watchable: Boolean(leader),
      memoryIdentity: memoryIdentityFor("hotel", leader?.id || q.slice(0, 48)),
      leader,
      candidates,
      insufficientEvidence: insufficient,
      providerStatus: insufficient ? (result.error ? "partial" : "unavailable") : "live",
      query: input.query,
      generatedAt,
    };

    return { decision, candidates };
  },
};
