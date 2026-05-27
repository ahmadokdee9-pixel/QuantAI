"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Props = {
  children: ReactNode;
  active?: boolean;
  loading?: boolean;
};

/** Neural command capsule — orbital command center shell. */
export default function CosmicSearchPortal({ children, active = false, loading = false }: Props) {
  const reduce = useReducedMotion();

  return (
    <div
      className={`qc-neural-portal ${active ? "qc-neural-portal--active" : ""} ${loading ? "qc-neural-portal--loading" : ""}`}
      data-qc-energy={active || loading ? "live" : "idle"}
    >
      <div className="qc-neural-portal-energy" aria-hidden />
      <div className="qc-neural-portal-orbit qc-neural-portal-orbit--outer" aria-hidden />
      <div className="qc-neural-portal-orbit qc-neural-portal-orbit--mid" aria-hidden />
      <div className="qc-neural-portal-orbit qc-neural-portal-orbit--inner" aria-hidden />
      <div className="qc-neural-portal-beacon" aria-hidden />
      {!reduce ? (
        <motion.div
          className="qc-neural-portal-pulse"
          aria-hidden
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.75, 0.4] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : (
        <div className="qc-neural-portal-pulse" aria-hidden />
      )}
      <div className="qc-neural-portal-core">
        <div className="qa-chamber-shadow-field" aria-hidden />
        <div className="qa-chamber-glass-reflection" aria-hidden />
        <div className="qc-neural-portal-chrome" aria-hidden />
        <div className="qc-neural-portal-sheen" aria-hidden />
        <div className="qc-neural-portal-body">{children}</div>
      </div>
    </div>
  );
}
