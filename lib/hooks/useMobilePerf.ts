"use client";

import { useEffect, useState } from "react";

const QUERY = "(max-width: 768px), (pointer: coarse)";

/**
 * True on small viewports or touch-primary devices — tone down motion, layers, and scroll hacks.
 * First paint is always `false` (matches SSR) to avoid hydration mismatches; updates after mount.
 */
export function useMobilePerf(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const apply = () => setMobile(mq.matches);
    apply();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, []);

  return mobile;
}
