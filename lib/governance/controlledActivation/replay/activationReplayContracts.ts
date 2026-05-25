/**
 * Activation replay contracts.
 */

export const ACTIVATION_REPLAY_VERSION = "activation_replay.1";

export type ActivationReplayContract = {
  version: string;
  globalApplyBlocked: true;
  replaySafe: true;
  boundedExecution: true;
  maxLatencyMs: number;
};

export const DEFAULT_ACTIVATION_REPLAY_CONTRACT: ActivationReplayContract = {
  version: ACTIVATION_REPLAY_VERSION,
  globalApplyBlocked: true,
  replaySafe: true,
  boundedExecution: true,
  maxLatencyMs: 15,
};

export function validateActivationReplayContract(c: ActivationReplayContract): string[] {
  const errors: string[] = [];
  if (!c.globalApplyBlocked) errors.push("globalApplyBlocked required");
  if (!c.replaySafe) errors.push("replaySafe required");
  return errors;
}
