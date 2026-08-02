/**
 * Thin bridge so feed client does not re-implement localStorage keys.
 */

import {
  listLocalDecisionMemory,
  listLocalDecisionUpdates,
} from "@/lib/decisionMemory/clientMemory";
import { DECISION_VISIT_STORAGE_KEY } from "@/lib/decisionMemory/types";

export { listLocalDecisionMemory, listLocalDecisionUpdates };

export function readVisitSince(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DECISION_VISIT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      lastUpdatesSeenAt?: string | null;
      lastVisitAt?: string | null;
    };
    return parsed.lastUpdatesSeenAt || parsed.lastVisitAt || null;
  } catch {
    return null;
  }
}
