"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMobilePerf } from "@/lib/hooks/useMobilePerf";

function scheduleIdle(cb: () => void, timeoutMs: number): () => void {
  const w = window as Window & {
    requestIdleCallback?: (fn: IdleRequestCallback, opts?: IdleRequestOptions) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(cb, { timeout: timeoutMs });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(cb, 120);
  return () => window.clearTimeout(id);
}

function MobileIdleDeferred({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    return scheduleIdle(() => setReady(true), 2800);
  }, []);
  if (!ready) return <div className="min-h-px w-full" aria-hidden />;
  return children;
}

/**
 * Defers mounting heavy footer sections on touch / narrow layouts until idle (or a short timeout
 * on browsers without requestIdleCallback, e.g. older Safari).
 * Desktop renders immediately.
 */
export default function DeferredBelowFold({ children }: { children: ReactNode }) {
  const mobile = useMobilePerf();
  if (!mobile) return children;
  return <MobileIdleDeferred>{children}</MobileIdleDeferred>;
}
