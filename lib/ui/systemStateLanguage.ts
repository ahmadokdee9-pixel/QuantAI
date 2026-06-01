/**
 * Institutional intelligence system language — shared copy + resolution for all non-success states.
 */

export type InstitutionalStateVariant = "signal" | "empty" | "throughput" | "access" | "neutral";

export type InstitutionalState = {
  headline: string;
  supporting: string;
  detail?: string;
  recoveryHints: string[];
  variant: InstitutionalStateVariant;
  ctaLabel: string;
  footnote: string;
};

export const INSTITUTIONAL = {
  signalInstability: "Signal instability detected",
  feedRecalibrating: "Market feed recalibrating",
  synthesisStabilizing: "Synthesis field stabilizing",
  retailerInterruption: "Retailer signal interruption",
  trayRecalibrating: "Comparison tray recalibrating",
  insufficientClarity: "Insufficient market clarity for this query.",
  listingVolatility: "Listing volatility prevented stable synthesis.",
  fragmentedSignals: "Retailer ingestion returned fragmented signals.",
  supportingRetry: "Retrying clean intelligence assembly.",
  noSessionLoss: "No session data was lost.",
  resumeRead: "Resume read",
  reinitialize: "Reinitialize synthesis",
  recalibrateTray: "Recalibrate tray",
} as const;

const RECOVERY_HINTS_SEARCH = [
  "Try a shorter purchase intent",
  "Include a model name or product family",
  "Add a retailer or region hint",
];

const RECOVERY_HINTS_EMPTY = [
  "Narrow to a model line or SKU family",
  "Add a retailer or marketplace hint",
  "Shorten to core product identity",
];

function includesAny(hay: string, needles: string[]): boolean {
  const h = hay.toLowerCase();
  return needles.some((n) => h.includes(n));
}

/** Map raw API / UI strings into institutional presentation. */
export function resolveInstitutionalState(
  raw: string | null | undefined,
  opts?: { retryAfter?: number }
): InstitutionalState | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  const lower = t.toLowerCase();

  if (
    t === INSTITUTIONAL.insufficientClarity ||
    includesAny(lower, ["insufficient market clarity", "insufficient clarity"])
  ) {
    return {
      headline: INSTITUTIONAL.insufficientClarity,
      supporting: "The ingestion layer returned no stable listing cluster for this intent.",
      detail: t,
      recoveryHints: RECOVERY_HINTS_EMPTY,
      variant: "empty",
      ctaLabel: INSTITUTIONAL.reinitialize,
      footnote: INSTITUTIONAL.noSessionLoss,
    };
  }

  if (
    t === INSTITUTIONAL.signalInstability ||
    includesAny(lower, ["signal instability", "listing volatility", "fragmented signals"])
  ) {
    return {
      headline: INSTITUTIONAL.signalInstability,
      supporting: INSTITUTIONAL.supportingRetry,
      detail: t,
      recoveryHints: RECOVERY_HINTS_SEARCH,
      variant: "signal",
      ctaLabel: INSTITUTIONAL.resumeRead,
      footnote: INSTITUTIONAL.noSessionLoss,
    };
  }

  if (t === INSTITUTIONAL.retailerInterruption || includesAny(lower, ["retailer signal interruption"])) {
    return {
      headline: INSTITUTIONAL.retailerInterruption,
      supporting: INSTITUTIONAL.supportingRetry,
      detail: t,
      recoveryHints: RECOVERY_HINTS_SEARCH,
      variant: "signal",
      ctaLabel: INSTITUTIONAL.resumeRead,
      footnote: INSTITUTIONAL.noSessionLoss,
    };
  }

  if (includesAny(lower, ["sign in", "unauthorized", "authenticate"])) {
    return {
      headline: "Clearance required for field access",
      supporting: "Authenticate to resume intelligence reads on this workspace.",
      detail: t,
      recoveryHints: [],
      variant: "access",
      ctaLabel: INSTITUTIONAL.resumeRead,
      footnote: INSTITUTIONAL.noSessionLoss,
    };
  }

  if (includesAny(lower, ["guest daily", "daily search allowance", "guest search window"])) {
    return {
      headline: INSTITUTIONAL.trayRecalibrating,
      supporting: "Guest intelligence throughput allowance reached for this period.",
      detail: t,
      recoveryHints: ["Sign in for expanded clearance and persistence"],
      variant: "throughput",
      ctaLabel: INSTITUTIONAL.resumeRead,
      footnote: INSTITUTIONAL.noSessionLoss,
    };
  }

  if (includesAny(lower, ["too many", "rate limit", "quota", "throughput limit", "cooling down"])) {
    const wait =
      opts?.retryAfter != null ? ` Throughput resets in ~${opts.retryAfter}s.` : "";
    return {
      headline: INSTITUTIONAL.trayRecalibrating,
      supporting: `Intelligence throughput limit reached.${wait} ${INSTITUTIONAL.supportingRetry}`,
      detail: t,
      recoveryHints: [],
      variant: "throughput",
      ctaLabel: INSTITUTIONAL.resumeRead,
      footnote: INSTITUTIONAL.noSessionLoss,
    };
  }

  if (includesAny(lower, ["no products", "no results", "not found", "empty"])) {
    return {
      headline: INSTITUTIONAL.insufficientClarity,
      supporting: "The ingestion layer returned no stable listing cluster for this intent.",
      detail: t,
      recoveryHints: RECOVERY_HINTS_EMPTY,
      variant: "empty",
      ctaLabel: INSTITUTIONAL.reinitialize,
      footnote: INSTITUTIONAL.noSessionLoss,
    };
  }

  if (includesAny(lower, ["connection", "network", "fetch", "abort"])) {
    return {
      headline: INSTITUTIONAL.retailerInterruption,
      supporting: INSTITUTIONAL.supportingRetry,
      detail: t,
      recoveryHints: RECOVERY_HINTS_SEARCH,
      variant: "signal",
      ctaLabel: INSTITUTIONAL.resumeRead,
      footnote: INSTITUTIONAL.noSessionLoss,
    };
  }

  if (includesAny(lower, ["temporarily unavailable", "503", "upstream", "provider"])) {
    return {
      headline: INSTITUTIONAL.feedRecalibrating,
      supporting: INSTITUTIONAL.supportingRetry,
      detail: t,
      recoveryHints: RECOVERY_HINTS_SEARCH,
      variant: "signal",
      ctaLabel: INSTITUTIONAL.reinitialize,
      footnote: INSTITUTIONAL.noSessionLoss,
    };
  }

  if (includesAny(lower, ["save", "watchlist", "shelf"])) {
    return {
      headline: INSTITUTIONAL.synthesisStabilizing,
      supporting: "Workspace sync interrupted — intelligence tray remains intact.",
      detail: t,
      recoveryHints: [],
      variant: "neutral",
      ctaLabel: INSTITUTIONAL.resumeRead,
      footnote: INSTITUTIONAL.noSessionLoss,
    };
  }

  if (includesAny(lower, ["compare tray", "comparison tray", "compare verdict", "verdict alignment"])) {
    return {
      headline: INSTITUTIONAL.trayRecalibrating,
      supporting: "Comparison synthesis could not reach stable alignment.",
      detail: t,
      recoveryHints: ["Re-run compare after tray settles", "Reduce selection to two listings"],
      variant: "signal",
      ctaLabel: INSTITUTIONAL.recalibrateTray,
      footnote: INSTITUTIONAL.noSessionLoss,
    };
  }

  if (
    includesAny(lower, [
      "search failed",
      "upstream",
      "search_failed",
      "provider",
      "unavailable",
      "invalid json",
      "not json",
      "web page instead",
    ])
  ) {
    return {
      headline: INSTITUTIONAL.signalInstability,
      supporting: INSTITUTIONAL.supportingRetry,
      detail: t,
      recoveryHints: RECOVERY_HINTS_SEARCH,
      variant: "signal",
      ctaLabel: INSTITUTIONAL.resumeRead,
      footnote: INSTITUTIONAL.noSessionLoss,
    };
  }

  return {
    headline: INSTITUTIONAL.feedRecalibrating,
    supporting: t || INSTITUTIONAL.supportingRetry,
    detail: undefined,
    recoveryHints: RECOVERY_HINTS_SEARCH,
    variant: "signal",
    ctaLabel: INSTITUTIONAL.reinitialize,
    footnote: INSTITUTIONAL.noSessionLoss,
  };
}

export const PROCESSING_STAGES = [
  { id: "normalize", label: "Aligning listings", sub: "Cross-store offer alignment" },
  { id: "calibrate", label: "Calibrating price field", sub: "Spread and median bands" },
  { id: "tray", label: "Ranking results", sub: "Confidence-weighted order" },
  { id: "layer", label: "Building intelligence", sub: "Trust and market posture" },
  { id: "align", label: "Finalizing read", sub: "Presentation assembly" },
] as const;

export function institutionalLoadingCaption(stageIndex: number): string {
  return PROCESSING_STAGES[Math.min(stageIndex, PROCESSING_STAGES.length - 1)]?.label ?? "Processing";
}
