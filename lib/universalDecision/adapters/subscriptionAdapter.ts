import { contextualVerbFor } from "@/lib/universalDecision/actions";
import { domainProviderRequirement, hasSerpApiKey } from "@/lib/universalDecision/flags";
import { buildSourceFreshness } from "@/lib/universalDecision/freshness";
import {
  confidenceFromEvidence,
  memoryIdentityFor,
  pickActionFromSignals,
} from "@/lib/universalDecision/score";
import { fetchSubscriptionSignals } from "@/lib/universalDecision/providers/serpapiTravel";
import type { DomainAdapter } from "@/lib/universalDecision/adapters/types";
import type {
  DecisionEvidenceItem,
  UniversalCandidate,
  UniversalDecision,
} from "@/lib/universalDecision/types";

const PRICE_RX = /(?:€|\$|£|eur|usd|gbp)\s?\d+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?\s?(?:€|\$|£|\/mo|per month|\/month)/i;

function extractPriceMentions(snippets: string[]): string[] {
  const out: string[] = [];
  for (const s of snippets) {
    const m = s.match(PRICE_RX);
    if (m) out.push(m[0]);
  }
  return out.slice(0, 4);
}

export const subscriptionAdapter: DomainAdapter = {
  domain: "subscription",
  label: "Subscription",
  detectIntent: (query) => {
    if (/\b(subscription|subscribe|saas|worth it|creative cloud|spotify|netflix)\b/i.test(query)) {
      return { domain: "subscription", confidence: 78, reasons: ["Subscription language"] };
    }
    return null;
  },
  normalizeQuery: (query) => query.trim(),
  isProviderLive: (env) => hasSerpApiKey(env),
  providerRequirement: domainProviderRequirement("subscription"),
  async run(input) {
    const generatedAt = new Date().toISOString();
    const live = hasSerpApiKey();

    if (!live) {
      const decision: UniversalDecision = {
        version: 1,
        domain: "subscription",
        action: "COMPARE",
        contextualVerb: "COMPARE",
        confidence: 15,
        domainConfidence: input.classification.confidence,
        executiveSummary: "Subscription signals unavailable — configure SERPAPI_KEY.",
        reasons: [],
        risks: ["No live pricing snippets"],
        alternatives: [],
        timing: {
          today: "Cannot recommend subscribe without live pricing signals",
          thisWeek: "Connect SerpAPI Google search",
          thisMonth: "Re-run once provider is live",
        },
        evidence: [],
        trust: { score: null, label: "Provider unavailable", notes: [] },
        constraints: { hard: [], soft: [] },
        sourceFreshness: buildSourceFreshness({
          fetchedAt: generatedAt,
          maxAgeMs: 24 * 60 * 60_000,
          provider: "serpapi:google",
          available: false,
        }),
        watchable: false,
        memoryIdentity: memoryIdentityFor("subscription", "unavailable"),
        leader: null,
        candidates: [],
        insufficientEvidence: true,
        providerStatus: "unavailable",
        query: input.query,
        generatedAt,
      };
      return { decision, candidates: [] };
    }

    const result = await fetchSubscriptionSignals({
      query: input.query,
      gl: input.marketCountry || "nl",
      signal: input.signal,
    });

    const priceMentions = extractPriceMentions(result.snippets);
    const insufficient = result.snippets.length < 2 || Boolean(result.error);

    const candidates: UniversalCandidate[] = insufficient
      ? []
      : [
          {
            id: `sub_${result.title.slice(0, 40)}`,
            domain: "subscription",
            title: result.title,
            subtitle: priceMentions[0] || "Price mentioned in public results",
            merchant: "Public web signals",
            price: null,
            currency: null,
            link: result.link,
            availability: "Plan info from search snippets",
            score: priceMentions.length >= 1 ? 64 : 48,
            raw: { snippets: result.snippets },
          },
        ];

    const leader = candidates[0] ?? null;

    const evidence: DecisionEvidenceItem[] = [];
    if (priceMentions[0]) {
      evidence.push({
        id: "effective_cost",
        label: "Effective cost signals",
        value: priceMentions.join(" · "),
        kind: "fact",
        source: "serpapi:google",
      });
    }
    evidence.push({
      id: "usage",
      label: "Expected usage",
      value: "Usage fit is personal — not inferred from marketing copy alone",
      kind: "inference",
    });
    evidence.push({
      id: "duplicates",
      label: "Duplicate tools",
      value: "Check whether you already pay for overlapping software",
      kind: "recommendation",
    });
    evidence.push({
      id: "lock_in",
      label: "Lock-in & cancellation",
      value: "Cancellation difficulty not verified — check vendor terms directly",
      kind: "inference",
    });
    evidence.push({
      id: "price_history",
      label: "Price increase history",
      value: "Historical increases not verified in this feed",
      kind: "inference",
    });
    if (result.snippets[1]) {
      evidence.push({
        id: "alt_signal",
        label: "Cheaper alternatives",
        value: "Compare annual vs monthly and rival tiers before committing",
        kind: "recommendation",
      });
    }

    const action = pickActionFromSignals({
      candidateCount: candidates.length,
      bestScore: leader?.score ?? null,
      priceSpreadPct: null,
      highRisk: false,
      waitSignal: priceMentions.length === 0,
      insufficient,
    });

    // Subscription confidence stays conservative — snippets ≠ financial advice.
    const confidence = Math.min(
      62,
      confidenceFromEvidence({
        factCount: evidence.filter((e) => e.kind === "fact").length,
        candidateCount: candidates.length,
        providerLive: true,
        domainConfidence: input.classification.confidence,
        partial: true,
      })
    );

    const decision: UniversalDecision = {
      version: 1,
      domain: "subscription",
      action: insufficient ? "COMPARE" : action === "BUY" ? "COMPARE" : action,
      contextualVerb: contextualVerbFor(
        "subscription",
        insufficient ? "COMPARE" : action === "BUY" ? "COMPARE" : action
      ),
      confidence,
      domainConfidence: input.classification.confidence,
      executiveSummary: insufficient
        ? result.error ||
          "Insufficient public pricing evidence — open the vendor page before subscribing."
        : `Compare carefully: public signals mention ${priceMentions[0] || "a plan price"}, but lock-in and usage fit need your confirmation.`,
      reasons: [
        priceMentions[0] ? `Public price signal: ${priceMentions[0]}` : null,
        result.snippets[0] ? result.snippets[0].slice(0, 140) : null,
        "This is not financial advice — verify on the vendor site",
      ].filter(Boolean) as string[],
      risks: [
        "Snippet prices can be outdated or region-specific",
        "Cancellation and price-increase terms are not verified here",
        "No break-even calculation without your usage data",
      ],
      alternatives: [],
      timing: {
        today: "Open the official pricing page and confirm regional plan",
        thisWeek: "Trial if available before annual commit",
        thisMonth: "Watch for promo pricing — do not rely on snippet alone",
      },
      evidence,
      trust: {
        score: insufficient ? null : 45,
        label: "Partial public signals",
        notes: ["Facts limited to search snippets; recommendation capped"],
      },
      constraints: { hard: [], soft: ["Verify official pricing before subscribe"] },
      sourceFreshness: buildSourceFreshness({
        fetchedAt: result.fetchedAt,
        maxAgeMs: 24 * 60 * 60_000,
        provider: "serpapi:google",
        available: !insufficient,
        partial: true,
      }),
      watchable: Boolean(leader),
      memoryIdentity: memoryIdentityFor(
        "subscription",
        leader?.id || input.query.trim().toLowerCase().slice(0, 64)
      ),
      leader,
      candidates,
      insufficientEvidence: insufficient,
      providerStatus: insufficient ? "partial" : "partial",
      query: input.query,
      generatedAt,
    };

    // Prefer COMPARE over BUY for subscription — never claim subscribe-ready from snippets alone.
    if (decision.action === "BUY") {
      decision.action = "COMPARE";
      decision.contextualVerb = "COMPARE";
    }

    return { decision, candidates };
  },
};
