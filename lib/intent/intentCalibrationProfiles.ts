/**
 * P4.9 — Calibration profile registry (advisory weight baselines; no runtime apply).
 */

export type IntentCalibrationProfileId = "balanced_v1" | "trust_conservative_v1" | "stability_first_v1";

export type IntentCalibrationProfileWeights = {
  confidenceWeight: number;
  suppressionWeight: number;
  trustWeight: number;
  comparisonWeight: number;
  diversityWeight: number;
  driftWeight: number;
  stabilityWeight: number;
};

export type IntentCalibrationProfile = {
  id: IntentCalibrationProfileId;
  description: string;
  advisoryOnly: true;
  weights: IntentCalibrationProfileWeights;
};

export const INTENT_CALIBRATION_PROFILES: IntentCalibrationProfile[] = [
  {
    id: "balanced_v1",
    description: "Balanced advisory weights across confidence, trust, suppression, and diversity.",
    advisoryOnly: true,
    weights: {
      confidenceWeight: 0.72,
      suppressionWeight: 0.68,
      trustWeight: 0.74,
      comparisonWeight: 0.7,
      diversityWeight: 0.66,
      driftWeight: 0.75,
      stabilityWeight: 0.78,
    },
  },
  {
    id: "trust_conservative_v1",
    description: "Elevated trust and suppression advisory emphasis with dampened comparison shifts.",
    advisoryOnly: true,
    weights: {
      confidenceWeight: 0.7,
      suppressionWeight: 0.76,
      trustWeight: 0.82,
      comparisonWeight: 0.62,
      diversityWeight: 0.68,
      driftWeight: 0.74,
      stabilityWeight: 0.8,
    },
  },
  {
    id: "stability_first_v1",
    description: "Drift- and stability-first advisory profile for bounded rerank calibration.",
    advisoryOnly: true,
    weights: {
      confidenceWeight: 0.74,
      suppressionWeight: 0.65,
      trustWeight: 0.72,
      comparisonWeight: 0.68,
      diversityWeight: 0.64,
      driftWeight: 0.88,
      stabilityWeight: 0.86,
    },
  },
];

export function resolveCalibrationProfile(args: {
  governanceScore: number;
  anomalyDetected: boolean;
  driftCount: number;
}): IntentCalibrationProfile {
  const { governanceScore, anomalyDetected, driftCount } = args;
  if (anomalyDetected || governanceScore < 60) {
    return INTENT_CALIBRATION_PROFILES.find((p) => p.id === "stability_first_v1")!;
  }
  if (driftCount >= 2) {
    return INTENT_CALIBRATION_PROFILES.find((p) => p.id === "stability_first_v1")!;
  }
  if (governanceScore >= 80) {
    return INTENT_CALIBRATION_PROFILES.find((p) => p.id === "balanced_v1")!;
  }
  return INTENT_CALIBRATION_PROFILES.find((p) => p.id === "trust_conservative_v1")!;
}

export function getCalibrationProfile(id: IntentCalibrationProfileId): IntentCalibrationProfile | undefined {
  return INTENT_CALIBRATION_PROFILES.find((p) => p.id === id);
}
