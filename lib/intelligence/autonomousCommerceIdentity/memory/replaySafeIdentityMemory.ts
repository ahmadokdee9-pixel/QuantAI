/**
 * Phase 13 — Replay-safe identity memory contract helpers.
 */

import type { IdentityContinuityMemory } from "./identityContinuityMemory";

export function validateReplaySafeIdentityMemory(memory: IdentityContinuityMemory): string[] {
  const errors: string[] = [];
  if (!memory.memoryKey.startsWith("icm_")) errors.push("invalid_memory_key_prefix");
  if (memory.slotCount > 8) errors.push("slot_overflow");
  return errors;
}
