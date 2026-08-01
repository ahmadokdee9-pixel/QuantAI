/**
 * Universal Decision Router — classify NL query into a decision domain.
 */

import type { DecisionDomain, DomainClassification } from "@/lib/universalDecision/types";
import { isDomainFeatureEnabled } from "@/lib/universalDecision/flags";

const FLIGHT_RX =
  /\b(flight|flights|fly|flying|airfare|airline|airport|one[- ]way|round[- ]trip|layover)\b/i;
const FLIGHT_ROUTE_RX =
  /\b([A-Z]{3})\s*(?:to|->|→)\s*([A-Z]{3})\b|\b(?:from\s+)?([A-Za-z][A-Za-z\s]{1,40}?)\s+to\s+([A-Za-z][A-Za-z\s]{1,40}?)(?:\s|$)/i;
const HOTEL_RX =
  /\b(hotel|hotels|hostel|airbnb|accommodation|stay|resort|motel|booking\.com)\b/i;
const HOTEL_NIGHTS_RX = /\b(\d+)\s*(?:nights?|nacht(?:en)?)\b/i;
const SUB_RX =
  /\b(subscription|subscribe|saas|membership|monthly plan|annual plan|worth it|cancel(?:lation)?|creative cloud|spotify|netflix|microsoft 365|adobe|chatgpt plus|openai plus)\b/i;
const PRODUCT_RX =
  /\b(buy|laptop|phone|iphone|macbook|sofa|tv|headphones|earbuds|gpu|monitor|camera|shoes|sneakers)\b/i;

function nextFridayIso(): string {
  const d = new Date();
  const day = d.getDay();
  const add = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + add);
  return d.toISOString().slice(0, 10);
}

function cleanPlace(raw: string): string {
  return raw
    .replace(
      /^(?:flight|flights|fly|flying|airfare|airline|a\s+)?\s*/i,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function parseFlightExtracted(query: string): Record<string, unknown> {
  const extracted: Record<string, unknown> = {};
  const airport = query.match(/\b([A-Z]{3})\s*(?:to|->|→)\s*([A-Z]{3})\b/);
  if (airport) {
    extracted.departureId = airport[1];
    extracted.arrivalId = airport[2];
  } else {
    const named = query.match(
      /\b(?:from\s+)?([A-Za-z][A-Za-z\s]{1,32}?)\s+to\s+([A-Za-z][A-Za-z\s]{1,32}?)(?:\s+(?:next|on|this|tomorrow|friday|monday|saturday|sunday)|$)/i
    );
    if (named) {
      extracted.departureCity = cleanPlace(named[1]!);
      extracted.arrivalCity = cleanPlace(named[2]!);
    }
  }
  if (/\bnext friday\b/i.test(query)) {
    extracted.outboundDate = nextFridayIso();
  }
  const date = query.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (date) extracted.outboundDate = date[1];
  return extracted;
}

function parseHotelExtracted(query: string): Record<string, unknown> {
  const extracted: Record<string, unknown> = {};
  const near = query.match(/\bin\s+([A-Za-z][A-Za-z\s]{1,40}?)(?:\s+near|\s+for|$)/i);
  if (near) extracted.destination = near[1]!.trim();
  const nights = query.match(HOTEL_NIGHTS_RX);
  if (nights) extracted.nights = Number(nights[1]);
  const nearPlace = query.match(/\bnear\s+([A-Za-z0-9][A-Za-z0-9\s']{1,40})/i);
  if (nearPlace) extracted.landmark = nearPlace[1]!.trim();
  return extracted;
}

/**
 * Classify a natural-language decision query.
 * Low confidence → needsClarification (never silently force a domain).
 */
export function classifyDecisionDomain(
  query: string,
  opts?: { forcedDomain?: DecisionDomain | null; env?: NodeJS.ProcessEnv }
): DomainClassification {
  const q = query.trim();
  const env = opts?.env ?? process.env;

  if (opts?.forcedDomain) {
    const forcedExtracted =
      opts.forcedDomain === "flight"
        ? parseFlightExtracted(q)
        : opts.forcedDomain === "hotel"
          ? parseHotelExtracted(q)
          : {};
    return {
      domain: opts.forcedDomain,
      confidence: 100,
      reasons: ["User-corrected domain"],
      needsClarification: false,
      clarifyingQuestion: null,
      normalizedQuery: q,
      extracted: forcedExtracted,
    };
  }

  const scores: Array<{ domain: DecisionDomain; score: number; reasons: string[] }> = [];

  if (FLIGHT_RX.test(q) || FLIGHT_ROUTE_RX.test(q)) {
    const reasons = ["Flight / route language detected"];
    let score = FLIGHT_RX.test(q) ? 72 : 55;
    if (FLIGHT_ROUTE_RX.test(q)) {
      score += 18;
      reasons.push("Origin → destination pattern");
    }
    scores.push({ domain: "flight", score: Math.min(98, score), reasons });
  }

  if (HOTEL_RX.test(q) || HOTEL_NIGHTS_RX.test(q)) {
    const reasons = ["Lodging language detected"];
    let score = HOTEL_RX.test(q) ? 74 : 50;
    if (HOTEL_NIGHTS_RX.test(q)) {
      score += 12;
      reasons.push("Stay duration present");
    }
    scores.push({ domain: "hotel", score: Math.min(98, score), reasons });
  }

  if (SUB_RX.test(q)) {
    scores.push({
      domain: "subscription",
      score: 78,
      reasons: ["Subscription / SaaS value language detected"],
    });
  }

  if (PRODUCT_RX.test(q) || scores.length === 0) {
    scores.push({
      domain: "product",
      score: PRODUCT_RX.test(q) ? 70 : 42,
      reasons: PRODUCT_RX.test(q)
        ? ["Product purchase language detected"]
        : ["Default commerce product decision"],
    });
  }

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0]!;
  const second = scores[1];
  const ambiguous = second && top.score - second.score < 12 && top.score < 80;

  let domain = top.domain;
  let confidence = top.score;
  let needsClarification = ambiguous || confidence < 55;
  let clarifyingQuestion: string | null = null;

  if (!isDomainFeatureEnabled(domain, env) && domain !== "product") {
    // Fall back to product rather than silently serving an empty domain.
    if (confidence >= 70) {
      needsClarification = true;
      clarifyingQuestion = `This looks like a ${domain} decision, but that domain is not live yet. Continue as a product decision, or try again later?`;
    }
    domain = "product";
    confidence = Math.min(confidence, 48);
  }

  if (needsClarification && !clarifyingQuestion) {
    const options = scores
      .slice(0, 2)
      .map((s) => s.domain)
      .join(" or ");
    clarifyingQuestion = `Is this a ${options} decision?`;
  }

  const extracted =
    domain === "flight"
      ? parseFlightExtracted(q)
      : domain === "hotel"
        ? parseHotelExtracted(q)
        : {};

  return {
    domain,
    confidence: Math.round(confidence),
    reasons: top.reasons,
    needsClarification,
    clarifyingQuestion,
    normalizedQuery: q,
    extracted,
  };
}
