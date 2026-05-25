/**
 * Cognition freeze controller — blocks mutation path when frozen.
 */

export type CognitionFreezeState = {
  frozen: boolean;
  reason: string;
  since: string;
};

let freezeState: CognitionFreezeState = {
  frozen: false,
  reason: "",
  since: "",
};

export function getCognitionFreezeState(): CognitionFreezeState {
  return { ...freezeState };
}

export function setCognitionFreeze(frozen: boolean, reason: string): void {
  freezeState = {
    frozen,
    reason,
    since: new Date().toISOString(),
  };
}

export function clearCognitionFreeze(): void {
  freezeState = { frozen: false, reason: "", since: "" };
}

/** Test-only reset */
export function resetCognitionFreezeForTests(): void {
  clearCognitionFreeze();
}
