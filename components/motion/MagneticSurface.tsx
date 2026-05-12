"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

type Props = {
  children: ReactNode;
  /** 0.05–0.15 typical */
  strength?: number;
  className?: string;
  /** Skip springs / pointer tracking (mobile, reduced motion). */
  disabled?: boolean;
};

/**
 * Subtle magnetic tilt toward cursor. Disabled when prefers-reduced-motion.
 */
export default function MagneticSurface({
  children,
  strength = 0.11,
  className = "",
  disabled = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 280, damping: 22, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 280, damping: 22, mass: 0.4 });

  if (reduce || disabled) {
    return <div className={className}>{children}</div>;
  }

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
  }

  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onBlur={onLeave}
    >
      <motion.div style={{ x: sx, y: sy }} className="flex h-full min-h-[inherit] w-full">
        {children}
      </motion.div>
    </div>
  );
}
