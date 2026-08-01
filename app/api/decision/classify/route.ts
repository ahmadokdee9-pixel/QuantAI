import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { classifyDecisionDomain } from "@/lib/universalDecision/router";
import { isDomainFeatureEnabled } from "@/lib/universalDecision/flags";
import type { DecisionDomain } from "@/lib/universalDecision/types";

const DOMAINS: DecisionDomain[] = [
  "product",
  "flight",
  "hotel",
  "subscription",
];

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      query?: string;
      forcedDomain?: string | null;
    };
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query) return jsonErr(400, "query required");

    const forced =
      typeof body.forcedDomain === "string" &&
      DOMAINS.includes(body.forcedDomain as DecisionDomain)
        ? (body.forcedDomain as DecisionDomain)
        : null;

    const classification = classifyDecisionDomain(query, { forcedDomain: forced });
    return jsonOk({
      classification,
      domainEnabled: isDomainFeatureEnabled(classification.domain),
      correctableDomains: DOMAINS.filter((d) => isDomainFeatureEnabled(d) || d === "product"),
    });
  } catch {
    return jsonErr(400, "Invalid JSON");
  }
}
