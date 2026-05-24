/**
 * Phase 6 — Aesthetic preference graph (deterministic nodes, no vectors).
 */

import type { AestheticAxisScores, TasteSensitivityProfile } from "../types";
import type { BrandAffinityMap } from "./brandAffinityTracker";

export type AestheticGraphNode = {
  id: string;
  axis: keyof AestheticAxisScores | "brand" | "sensitivity";
  weight01: number;
  label: string;
};

export type AestheticPreferenceGraph = {
  nodes: AestheticGraphNode[];
  dominantAxis: string;
  clusterId: string;
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildAestheticPreferenceGraph(args: {
  axes: AestheticAxisScores;
  sensitivity: TasteSensitivityProfile;
  brandAffinity: BrandAffinityMap;
}): AestheticPreferenceGraph {
  const nodes: AestheticGraphNode[] = [];

  for (const [axis, weight01] of Object.entries(args.axes) as [keyof AestheticAxisScores, number][]) {
    if (weight01 < 0.25) continue;
    nodes.push({
      id: `axis_${axis}`,
      axis,
      weight01: round4(weight01),
      label: axis.replace(/01$/, ""),
    });
  }

  const topBrand = Object.entries(args.brandAffinity).sort((a, b) => b[1] - a[1])[0];
  if (topBrand) {
    nodes.push({
      id: `brand_${topBrand[0]}`,
      axis: "brand",
      weight01: round4(topBrand[1]),
      label: topBrand[0],
    });
  }

  if (args.sensitivity.trustSensitivity01 >= 0.45) {
    nodes.push({
      id: "sensitivity_trust",
      axis: "sensitivity",
      weight01: round4(args.sensitivity.trustSensitivity01),
      label: "trust_sensitive",
    });
  }

  const dominant =
    (Object.entries(args.axes) as [keyof AestheticAxisScores, number][])
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "minimalist01";

  const clusterParts = nodes
    .slice(0, 4)
    .map((n) => n.id)
    .sort()
    .join("|");

  return {
    nodes: nodes.slice(0, 12),
    dominantAxis: dominant.replace(/01$/, ""),
    clusterId: `taste_${clusterParts.length ? clusterParts.slice(0, 48) : "neutral"}`,
  };
}
