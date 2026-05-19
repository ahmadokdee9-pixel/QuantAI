/**
 * User-facing explanations for empty or reduced search trays (from API debug meta).
 */

export type StageSuppressionRow = {
  stage?: string;
  before?: number;
  after?: number;
  suppressed?: number;
};

export type TrayDiagnosticsInput = {
  query: string;
  productCount: number;
  stageSuppression?: StageSuppressionRow[] | null;
  fallbackReason?: string | null;
  identityGatePassed?: number | null;
  discoveryCandidates?: number | null;
  upstreamReliabilityScore?: number | null;
};

const STAGE_LABELS: Record<string, string> = {
  hard_identity_gate: "strict product identity match",
  semantic_rerank: "relevance filtering",
  semantic_empty_guard: "relevance recovery",
  commerce_quality_ranking: "quality ranking",
  safe_identity_breadth_recovery: "identity recovery",
};

function topSuppression(stages: StageSuppressionRow[]): StageSuppressionRow | null {
  let best: StageSuppressionRow | null = null;
  for (const row of stages) {
    const suppressed = row.suppressed ?? Math.max(0, (row.before ?? 0) - (row.after ?? 0));
    if (suppressed <= 0) continue;
    if (!best || suppressed > (best.suppressed ?? 0)) best = { ...row, suppressed };
  }
  return best;
}

/** Institutional copy for empty tray — honest, not blaming the user. */
export function buildEmptyTrayExplanation(input: TrayDiagnosticsInput): {
  headline: string;
  supporting: string;
  hints: string[];
} {
  const stages = Array.isArray(input.stageSuppression) ? input.stageSuppression : [];
  const top = topSuppression(stages);
  const stageKey = top?.stage ?? "";
  const stageLabel = STAGE_LABELS[stageKey] ?? (stageKey ? stageKey.replace(/_/g, " ") : "filtering");

  if (input.fallbackReason?.includes("SEARCH_FAILED") || input.fallbackReason?.includes("upstream")) {
    return {
      headline: "Market feed could not complete this read.",
      supporting:
        "Upstream commerce data was unavailable. This is a connectivity or provider issue — not a judgment on your query.",
      hints: ["Retry in a moment", "Try a shorter product name", "Check network connection"],
    };
  }

  if (top && (top.suppressed ?? 0) >= 3) {
    return {
      headline: "No listings passed strict identity alignment.",
      supporting: `We found retailer signals, but ${stageLabel} removed ${top.suppressed} rows that did not match your product intent closely enough. QuantAI prioritizes precision over volume.`,
      hints: [
        "Add a model name or SKU family",
        "Remove accessory words unless you want cases/parts",
        "Try a shorter core product phrase",
      ],
    };
  }

  if ((input.discoveryCandidates ?? 0) === 0 && input.productCount === 0) {
    return {
      headline: "No stable listing cluster for this intent.",
      supporting:
        "Retail ingestion returned no candidates for this query in the selected market. Try a more common product phrase or alternate spelling.",
      hints: ["Use English or Arabic product names consistently", "Include brand + model", "Broaden category slightly"],
    };
  }

  return {
    headline: "Insufficient market clarity for this query.",
    supporting:
      "Decision intelligence needs at least one listing that matches your intent. This is a coverage gap, not a final recommendation.",
    hints: [
      "Narrow to a model line",
      "Add retailer or region context",
      "Shorten to core product identity",
    ],
  };
}

/** Honest copy when serving a cached tray under guest/upstream pressure. */
export function buildDegradedTrayNotice(reason: string | null | undefined): {
  headline: string;
  supporting: string;
} {
  const r = (reason ?? "").toLowerCase();
  if (r.includes("rate_limit")) {
    return {
      headline: "Showing a recent intelligence read while guest capacity recovers.",
      supporting:
        "Live market refresh is paused briefly. Tray data may be slightly stale — sign in for uninterrupted refresh.",
    };
  }
  if (r.includes("upstream")) {
    return {
      headline: "Showing the last successful market read for this query.",
      supporting:
        "Upstream commerce feeds were temporarily unavailable. Results are cached — retry for a fresh tray.",
    };
  }
  return {
    headline: "Operating in degraded refresh mode.",
    supporting: "Tray may be cached while systems recover. Verify price and availability before checkout.",
  };
}

export function trayDiagnosticsFromMeta(
  meta: Record<string, unknown> | null | undefined,
  query: string,
  productCount: number
): TrayDiagnosticsInput {
  if (!meta || typeof meta !== "object") {
    return { query, productCount };
  }
  return {
    query,
    productCount,
    stageSuppression: meta.stageSuppression as StageSuppressionRow[] | undefined,
    fallbackReason: typeof meta.fallbackReason === "string" ? meta.fallbackReason : null,
    identityGatePassed:
      typeof meta.identityGatePassed === "number" ? meta.identityGatePassed : null,
    discoveryCandidates:
      typeof meta.discoveryCandidates === "number" ? meta.discoveryCandidates : null,
    upstreamReliabilityScore:
      typeof meta.upstreamReliabilityScore === "number" ? meta.upstreamReliabilityScore : null,
  };
}
