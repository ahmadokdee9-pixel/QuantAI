import { classifyDecisionDomain } from "../lib/universalDecision/router.ts";
import { domainStatusReport } from "../lib/universalDecision/registry.ts";
import { runUniversalDecision } from "../lib/universalDecision/runDecision.ts";

console.log("status", JSON.stringify(domainStatusReport(), null, 2));
console.log(
  "classify",
  JSON.stringify(classifyDecisionDomain("flight Amsterdam to Istanbul next Friday"), null, 2)
);

const r = await runUniversalDecision({
  query: "flight AMS to IST next Friday",
  forcedDomain: "flight",
});
console.log(
  "flight",
  JSON.stringify(
    {
      action: r.decision?.action,
      conf: r.decision?.confidence,
      provider: r.decision?.providerStatus,
      candidates: r.decision?.candidates?.length,
      summary: r.decision?.executiveSummary?.slice(0, 200),
      risks: r.decision?.risks?.slice(0, 2),
    },
    null,
    2
  )
);

const h = await runUniversalDecision({
  query: "hotel in Paris near the Louvre for 3 nights",
  forcedDomain: "hotel",
});
console.log(
  "hotel",
  JSON.stringify(
    {
      action: h.decision?.action,
      conf: h.decision?.confidence,
      provider: h.decision?.providerStatus,
      candidates: h.decision?.candidates?.length,
      summary: h.decision?.executiveSummary?.slice(0, 200),
    },
    null,
    2
  )
);
