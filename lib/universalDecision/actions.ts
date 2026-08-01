import type {
  CanonicalDecisionAction,
  ContextualVerb,
  DecisionDomain,
} from "@/lib/universalDecision/types";

export function contextualVerbFor(
  domain: DecisionDomain,
  action: CanonicalDecisionAction
): ContextualVerb {
  if (action === "WAIT" || action === "COMPARE" || action === "AVOID") {
    return action;
  }
  switch (domain) {
    case "flight":
      return "BOOK";
    case "hotel":
      return "RESERVE";
    case "subscription":
    case "software":
      return "SUBSCRIBE";
    case "course":
      return "ENROLL";
    default:
      return "BUY";
  }
}

export function actionCommitmentLabel(
  domain: DecisionDomain,
  action: CanonicalDecisionAction
): string {
  const verb = contextualVerbFor(domain, action);
  if (verb === action) return action;
  return `${action} · ${verb}`;
}
