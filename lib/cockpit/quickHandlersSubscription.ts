/**
 * External store for quick-handler *availability* changes only.
 * Avoids React state in CockpitProvider while letting palette/dock subscribe safely.
 */

let notifyVersion = 0;
const listeners = new Set<() => void>();

export function subscribeQuickHandlersChanged(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getQuickHandlersNotifyVersion() {
  return notifyVersion;
}

export function getQuickHandlersNotifyVersionServerSnapshot() {
  return 0;
}

export function notifyQuickHandlersChanged() {
  notifyVersion += 1;
  listeners.forEach((l) => l());
}
