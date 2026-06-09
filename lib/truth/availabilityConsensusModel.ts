/**
 * Phase 1F — Merchant availability consensus states.
 */

export type AvailabilityConsensus =
  | "CONSENSUS_AVAILABLE"
  | "CONSENSUS_UNAVAILABLE"
  | "CONSENSUS_UNKNOWN"
  | "CONSENSUS_CONFLICT";

const AVAILABLE = new Set(["in_stock", "limited"]);
const UNAVAILABLE = new Set(["out_of_stock", "removed", "seller_unavailable"]);

export function isConsensusConflict(state: AvailabilityConsensus): boolean {
  return state === "CONSENSUS_CONFLICT";
}

export function isConsensusUnknown(state: AvailabilityConsensus): boolean {
  return state === "CONSENSUS_UNKNOWN";
}

/** Derive cross-merchant availability consensus from per-merchant statuses. */
export function deriveAvailabilityConsensus(
  merchantStatuses: Array<string | null | undefined>
): AvailabilityConsensus {
  const statuses = merchantStatuses.filter((s): s is string => typeof s === "string" && s.length > 0);
  if (statuses.length === 0) return "CONSENSUS_UNKNOWN";

  let available = 0;
  let unavailable = 0;
  let unknown = 0;

  for (const status of statuses) {
    if (AVAILABLE.has(status)) available += 1;
    else if (UNAVAILABLE.has(status)) unavailable += 1;
    else unknown += 1;
  }

  const known = available + unavailable;
  if (known === 0) return "CONSENSUS_UNKNOWN";

  const total = statuses.length;
  const availableShare = available / total;
  const unavailableShare = unavailable / total;

  if (available > 0 && unavailable > 0 && availableShare >= 0.3 && unavailableShare >= 0.3) {
    return "CONSENSUS_CONFLICT";
  }
  if (availableShare >= 0.6) return "CONSENSUS_AVAILABLE";
  if (unavailableShare >= 0.6) return "CONSENSUS_UNAVAILABLE";

  return "CONSENSUS_UNKNOWN";
}
