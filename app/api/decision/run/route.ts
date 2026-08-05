import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { mapDecisionRunOutcome } from "@/lib/universalDecision/decisionRunResponse";
import { domainStatusReport } from "@/lib/universalDecision/registry";
import { runUniversalDecision } from "@/lib/universalDecision/runDecision";
import { validateDecisionRunRequest } from "@/lib/universalDecision/validateDecisionRunRequest";

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonErr(400, "Invalid JSON body", { code: "INVALID_JSON" });
    }

    const validated = validateDecisionRunRequest(body);
    if (!validated.ok) {
      return jsonErr(validated.status, validated.error, { code: validated.code });
    }

    const { query, forcedDomain, marketCountry, currency } = validated.value;

    const outcome = await runUniversalDecision({
      query,
      forcedDomain,
      marketCountry,
      currency,
      signal: req.signal,
    });

    const mapped = mapDecisionRunOutcome(outcome);
    const domains = domainStatusReport();

    if (!mapped.ok) {
      return jsonErr(mapped.status, mapped.error, {
        code: mapped.code,
        classification: mapped.classification,
        decision: null,
        candidates: [],
        routedToProductPipeline: mapped.routedToProductPipeline,
        domains,
      });
    }

    return jsonOk({
      classification: mapped.classification,
      decision: mapped.decision,
      candidates: mapped.candidates,
      routedToProductPipeline: mapped.routedToProductPipeline,
      domains,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Decision run failed";
    return jsonErr(500, message, { code: "DECISION_RUN_FAILED" });
  }
}

export async function GET() {
  return jsonOk({ domains: domainStatusReport() });
}
