/**
 * Phase 13 — Autonomous identity snapshots.
 */

import type { AutonomousIdentitySnapshot } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

const MAX_SNAPSHOTS = 4;

export function buildAutonomousIdentitySnapshots(args: {
  maturity01: number;
  drift01: number;
  continuity01: number;
  governanceAllowed: boolean;
}): AutonomousIdentitySnapshot[] {
  if (!args.governanceAllowed) return [];
  return [
    {
      snapshotId: "aci_snap_primary",
      maturity01: round4(args.maturity01),
      drift01: round4(args.drift01),
      continuity01: round4(args.continuity01),
    },
  ].slice(0, MAX_SNAPSHOTS);
}
