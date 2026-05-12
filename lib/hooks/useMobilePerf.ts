"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 768px), (pointer: coarse)";

function subscribe(onStoreChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

/** True on small viewports or touch-primary devices — tone down motion, layers, and scroll hacks. */
export function useMobilePerf(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
