/**
 * P6.9 — Economic world simulation profile registry.
 */

import type { EconomicWorldSimulationMode } from "@/lib/economicWorldSimulation/economicWorldSimulationFlags";
import {
  ECONOMIC_WORLD_SIMULATION_MAX_DELTA,
  ECONOMIC_WORLD_SIMULATION_MAX_EQUILIBRIUM_AMPLIFICATION,
  ECONOMIC_WORLD_SIMULATION_MAX_PRESSURE_AMPLIFICATION,
} from "@/lib/economicWorldSimulation/economicWorldSimulationFlags";

export type EconomicWorldSimulationProfile = {
  id: EconomicWorldSimulationMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresGovernanceStable: boolean;
  maxDelta: number;
  maxPressureAmplification: number;
  maxEquilibriumAmplification: number;
};

export const ECONOMIC_WORLD_SIMULATION_PROFILES: EconomicWorldSimulationProfile[] = [
  {
    id: "telemetry-only",
    description: "Economic world simulation telemetry without ranking mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresGovernanceStable: false,
    maxDelta: ECONOMIC_WORLD_SIMULATION_MAX_DELTA,
    maxPressureAmplification: ECONOMIC_WORLD_SIMULATION_MAX_PRESSURE_AMPLIFICATION,
    maxEquilibriumAmplification: ECONOMIC_WORLD_SIMULATION_MAX_EQUILIBRIUM_AMPLIFICATION,
  },
  {
    id: "passive-simulation",
    description: "Passive economic simulation signals from aggregate telemetry only.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresGovernanceStable: false,
    maxDelta: ECONOMIC_WORLD_SIMULATION_MAX_DELTA,
    maxPressureAmplification: ECONOMIC_WORLD_SIMULATION_MAX_PRESSURE_AMPLIFICATION,
    maxEquilibriumAmplification: ECONOMIC_WORLD_SIMULATION_MAX_EQUILIBRIUM_AMPLIFICATION,
  },
  {
    id: "shadow-simulation",
    description: "Shadow economic simulation deltas recorded; order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresGovernanceStable: false,
    maxDelta: ECONOMIC_WORLD_SIMULATION_MAX_DELTA,
    maxPressureAmplification: ECONOMIC_WORLD_SIMULATION_MAX_PRESSURE_AMPLIFICATION,
    maxEquilibriumAmplification: ECONOMIC_WORLD_SIMULATION_MAX_EQUILIBRIUM_AMPLIFICATION,
  },
  {
    id: "bounded-simulation",
    description: "Bounded economic world simulation ranking stabilization.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresGovernanceStable: false,
    maxDelta: ECONOMIC_WORLD_SIMULATION_MAX_DELTA,
    maxPressureAmplification: ECONOMIC_WORLD_SIMULATION_MAX_PRESSURE_AMPLIFICATION,
    maxEquilibriumAmplification: ECONOMIC_WORLD_SIMULATION_MAX_EQUILIBRIUM_AMPLIFICATION,
  },
  {
    id: "protected-simulation",
    description: "Economic simulation with governance + stability gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresGovernanceStable: true,
    maxDelta: ECONOMIC_WORLD_SIMULATION_MAX_DELTA,
    maxPressureAmplification: ECONOMIC_WORLD_SIMULATION_MAX_PRESSURE_AMPLIFICATION,
    maxEquilibriumAmplification: ECONOMIC_WORLD_SIMULATION_MAX_EQUILIBRIUM_AMPLIFICATION,
  },
  {
    id: "full-safe-simulation",
    description: "Full economic simulation with replay integrity gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresGovernanceStable: true,
    maxDelta: ECONOMIC_WORLD_SIMULATION_MAX_DELTA,
    maxPressureAmplification: ECONOMIC_WORLD_SIMULATION_MAX_PRESSURE_AMPLIFICATION,
    maxEquilibriumAmplification: ECONOMIC_WORLD_SIMULATION_MAX_EQUILIBRIUM_AMPLIFICATION,
  },
];

export function resolveEconomicWorldSimulationProfile(mode: EconomicWorldSimulationMode): EconomicWorldSimulationProfile {
  return ECONOMIC_WORLD_SIMULATION_PROFILES.find((p) => p.id === mode) ?? ECONOMIC_WORLD_SIMULATION_PROFILES[0];
}
