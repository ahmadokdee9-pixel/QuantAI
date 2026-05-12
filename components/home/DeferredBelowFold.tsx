"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMobilePerf } from "@/lib/hooks/useMobilePerf";

function MobileIdleDeferred({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const ric = window.requestIdleCallback(() => setReady(true), { timeout: 2800 });
    return () => window.cancelIdleCallback(ric);
  }, []);
  if (!ready) return <div className="min-h-px w-full" aria-hidden />;
  return children;
}

/**
 * Defers mounting heavy footer sections on touch / narrow layouts until the browser is idle,
 * so first search paint stays responsive. Desktop renders immediately.
 */
export default function DeferredBelowFold({ children }: { children: ReactNode }) {
  const mobile = useMobilePerf();
  if (!mobile) return children;
  return <MobileIdleDeferred>{children}</MobileIdleDeferred>;
}
