import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { runUniversalDecision } from "@/lib/universalDecision/runDecision";
import { domainStatusReport } from "@/lib/universalDecision/registry";
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
      marketCountry?: string | null;
      currency?: string | null;
    };
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query) return jsonErr(400, "query required");

    const forced =
      typeof body.forcedDomain === "string" &&
      DOMAINS.includes(body.forcedDomain as DecisionDomain)
        ? (body.forcedDomain as DecisionDomain)
        : null;

    const outcome = await runUniversalDecision({
      query,
      forcedDomain: forced,
      marketCountry: body.marketCountry,
      currency: body.currency,
      signal: req.signal,
    });

    return jsonOk({
      classification: outcome.classification,
      decision: outcome.decision,
      candidates: outcome.result?.candidates ?? [],
      routedToProductPipeline: outcome.routedToProductPipeline,
      domains: domainStatusReport(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Decision run failed";
    return jsonErr(500, message);
  }
}

export async function GET() {
  return jsonOk({ domains: domainStatusReport() });
}
