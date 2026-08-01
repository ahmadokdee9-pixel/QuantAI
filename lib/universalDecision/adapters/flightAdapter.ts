import { contextualVerbFor } from "@/lib/universalDecision/actions";
import { domainProviderRequirement, hasSerpApiKey } from "@/lib/universalDecision/flags";
import { buildSourceFreshness } from "@/lib/universalDecision/freshness";
import {
  clampPct,
  confidenceFromEvidence,
  memoryIdentityFor,
  pickActionFromSignals,
} from "@/lib/universalDecision/score";
import { fetchGoogleFlights } from "@/lib/universalDecision/providers/serpapiTravel";
import type { DomainAdapter } from "@/lib/universalDecision/adapters/types";
import type {
  DecisionEvidenceItem,
  UniversalCandidate,
  UniversalDecision,
} from "@/lib/universalDecision/types";

function formatDuration(mins: number | null): string {
  if (mins == null || !Number.isFinite(mins)) return "Unknown duration";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export const flightAdapter: DomainAdapter = {
  domain: "flight",
  label: "Flight",
  detectIntent: (query) => {
    if (/\b(flight|flights|fly|airfare)\b/i.test(query)) {
      return { domain: "flight", confidence: 75, reasons: ["Flight language"] };
    }
    return null;
  },
  normalizeQuery: (query) => query.trim(),
  isProviderLive: (env) => hasSerpApiKey(env),
  providerRequirement: domainProviderRequirement("flight"),
  async run(input) {
    const generatedAt = new Date().toISOString();
    const live = hasSerpApiKey();
    const extracted = input.classification.extracted || {};

    if (!live) {
      const decision: UniversalDecision = {
        version: 1,
        domain: "flight",
        action: "COMPARE",
        contextualVerb: "COMPARE",
        confidence: 15,
        domainConfidence: input.classification.confidence,
        executiveSummary: "Flight provider unavailable — configure SERPAPI_KEY with Google Flights access.",
        reasons: [],
        risks: ["No live fare data"],
        alternatives: [],
        timing: {
          today: "Cannot recommend booking without live fares",
          thisWeek: "Connect SerpAPI Google Flights",
          thisMonth: "Re-run once provider is live",
        },
        evidence: [],
        trust: { score: null, label: "Provider unavailable", notes: [] },
        constraints: { hard: [], soft: [] },
        sourceFreshness: buildSourceFreshness({
          fetchedAt: generatedAt,
          maxAgeMs: 30 * 60_000,
          provider: "serpapi:google_flights",
          available: false,
        }),
        watchable: false,
        memoryIdentity: memoryIdentityFor("flight", "unavailable"),
        leader: null,
        candidates: [],
        insufficientEvidence: true,
        providerStatus: "unavailable",
        query: input.query,
        generatedAt,
      };
      return { decision, candidates: [] };
    }

    const result = await fetchGoogleFlights({
      departureId: typeof extracted.departureId === "string" ? extracted.departureId : undefined,
      arrivalId: typeof extracted.arrivalId === "string" ? extracted.arrivalId : undefined,
      departureCity:
        typeof extracted.departureCity === "string" ? extracted.departureCity : undefined,
      arrivalCity: typeof extracted.arrivalCity === "string" ? extracted.arrivalCity : undefined,
      outboundDate: typeof extracted.outboundDate === "string" ? extracted.outboundDate : undefined,
      currency: input.currency || "EUR",
      gl: input.marketCountry || "nl",
      signal: input.signal,
    });

    const candidates: UniversalCandidate[] = result.offers
      .filter((o) => o.price != null)
      .map((o) => ({
        id: o.id,
        domain: "flight" as const,
        title: o.title,
        subtitle: `${o.stops === 0 ? "Nonstop" : `${o.stops} stop${o.stops > 1 ? "s" : ""}`} · ${formatDuration(o.durationMinutes)}`,
        merchant: o.airline,
        price: o.price,
        currency: o.currency,
        link: o.link,
        availability: "Listed fare",
        score: clampPct(
          70 -
            o.stops * 8 -
            (o.durationMinutes != null ? Math.min(20, o.durationMinutes / 60) : 0)
        ),
        raw: o.raw,
      }));

    const leader = candidates[0] ?? null;
    const prices = candidates.map((c) => c.price!).filter((p) => Number.isFinite(p));
    const min = prices.length ? Math.min(...prices) : null;
    const max = prices.length ? Math.max(...prices) : null;
    const spread =
      min != null && max != null && min > 0 ? ((max - min) / min) * 100 : null;

    const evidence: DecisionEvidenceItem[] = [];
    if (leader?.price != null) {
      evidence.push({
        id: "total_fare",
        label: "Total fare",
        value: `${leader.currency || "EUR"} ${leader.price}`,
        kind: "fact",
        source: "serpapi:google_flights",
      });
    }
    if (leader?.subtitle) {
      evidence.push({
        id: "stops_duration",
        label: "Stops & journey time",
        value: leader.subtitle,
        kind: "fact",
        source: "serpapi:google_flights",
      });
    }
    evidence.push({
      id: "baggage",
      label: "Baggage & hidden fees",
      value: "Not fully disclosed in fare listing — verify before booking",
      kind: "inference",
      source: "serpapi:google_flights",
    });
    evidence.push({
      id: "flexibility",
      label: "Refund / change flexibility",
      value: "Policy not confirmed in this feed — check airline rules",
      kind: "inference",
    });
    evidence.push({
      id: "timing",
      label: "Booking timing",
      value:
        spread != null && spread > 25
          ? "Wide fare spread — comparing options is warranted"
          : "Fares clustered; act if schedule fit is clear",
      kind: "recommendation",
    });

    const insufficient = candidates.length === 0 || Boolean(result.error);
    const action = pickActionFromSignals({
      candidateCount: candidates.length,
      bestScore: leader?.score ?? null,
      priceSpreadPct: spread,
      highRisk: false,
      waitSignal: spread != null && spread > 35,
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
      domain: "flight",
      action,
      contextualVerb: contextualVerbFor("flight", action),
      confidence,
      domainConfidence: input.classification.confidence,
      executiveSummary: insufficient
        ? result.error ||
          "Insufficient live flight evidence — refine origin, destination, and date."
        : `${action === "BUY" ? "Book" : action === "WAIT" ? "Wait" : action === "AVOID" ? "Avoid" : "Compare"}: ${leader?.title ?? "top option"} at ${leader?.currency || "EUR"} ${leader?.price ?? "—"}.`,
      reasons: [
        leader?.price != null ? `Listed fare ${leader.currency} ${leader.price}` : null,
        leader?.subtitle || null,
        candidates.length > 1 ? `${candidates.length} priced options from Google Flights` : null,
      ].filter(Boolean) as string[],
      risks: [
        "Baggage and change fees may not be in the listed fare",
        "Schedules and prices change quickly",
        result.error ? `Provider note: ${result.error}` : null,
      ].filter(Boolean) as string[],
      alternatives: candidates.slice(1, 4).map((c) => ({
        id: c.id,
        title: c.title,
        subtitle: c.subtitle,
        price: c.price,
        currency: c.currency,
        link: c.link,
        why: c.subtitle || "Alternative itinerary",
      })),
      timing: {
        today:
          action === "BUY"
            ? "Fare looks competitive if the schedule fits — confirm baggage rules"
            : "Do not book blindly; compare stops and total time",
        thisWeek: "Re-check fares — aviation pricing moves daily",
        thisMonth: "Watch this route if dates are flexible",
        waitPoints:
          action === "WAIT" ? ["Wide fare dispersion — wait for a clearer leader"] : [],
      },
      evidence,
      trust: {
        score: insufficient ? null : 62,
        label: insufficient ? "Insufficient evidence" : "Live fare listing",
        notes: ["Facts from SerpAPI Google Flights; fees/policies may be incomplete"],
      },
      constraints: {
        hard: [],
        soft: ["Prefer fewer stops when fare delta is small"],
      },
      sourceFreshness: buildSourceFreshness({
        fetchedAt: result.fetchedAt,
        maxAgeMs: 30 * 60_000,
        provider: "serpapi:google_flights",
        available: !insufficient,
        partial: Boolean(result.error) && candidates.length > 0,
      }),
      watchable: Boolean(leader),
      memoryIdentity: memoryIdentityFor(
        "flight",
        leader?.id ||
          `${extracted.departureId || extracted.departureCity || "x"}_${extracted.arrivalId || extracted.arrivalCity || "y"}`
      ),
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
