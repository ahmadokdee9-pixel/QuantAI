"use client";

import { motion, useReducedMotion } from "framer-motion";

type Props = {
  /** Mobile / touch-primary: drop animated meshes and drifting layers for GPU budget. */
  lite?: boolean;
};

/**
 * Full-viewport ambient layer — cosmic field, no interaction.
 */
export default function AmbientBackdrop({ lite = false }: Props) {
  const reduce = useReducedMotion();
  const low = reduce || lite;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#020617]" />
      {!low && <div className="absolute inset-0 cosmic-particles cosmic-drift-slow" />}
      {low ? (
        <div className="cosmic-starfield absolute inset-0 opacity-70" />
      ) : (
        <div className="cosmic-starfield absolute inset-0" />
      )}
      {!low && (
        <div className="cosmic-constellation absolute inset-0 [mask-image:radial-gradient(ellipse_90%_70%_at_50%_30%,black,transparent)] cosmic-constellation-motion" />
      )}
      {!low && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.055] neural-mesh-slow [mask-image:radial-gradient(ellipse_85%_65%_at_50%_35%,black,transparent)]"
          aria-hidden
        />
      )}
      <div
        className="absolute inset-0 opacity-[0.88]"
        style={{
          background: lite
            ? `radial-gradient(ellipse 100% 70% at 50% -15%, rgba(34, 211, 238, 0.07), transparent 54%),
            radial-gradient(ellipse 70% 55% at 100% 20%, rgba(139, 92, 246, 0.05), transparent 50%)`
            : `
            radial-gradient(ellipse 100% 70% at 50% -15%, rgba(34, 211, 238, 0.11), transparent 54%),
            radial-gradient(ellipse 70% 55% at 100% 20%, rgba(139, 92, 246, 0.08), transparent 50%),
            radial-gradient(ellipse 60% 50% at 0% 75%, rgba(52, 211, 153, 0.045), transparent 44%),
            radial-gradient(ellipse 50% 40% at 80% 90%, rgba(56, 189, 248, 0.035), transparent 42%)
          `,
        }}
      />
      {!low && (
        <>
          <motion.div
            className="absolute -top-48 left-1/2 h-[min(85vh,900px)] w-[min(120vw,980px)] -translate-x-1/2 rounded-full bg-gradient-to-b from-cyan-400/14 via-violet-500/7 to-transparent blur-[100px]"
            animate={{ opacity: [0.32, 0.48, 0.32], scale: [1, 1.02, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-0 right-[-20%] h-[55vh] w-[70vw] max-w-[900px] rounded-full bg-gradient-to-tl from-violet-600/8 to-transparent blur-[90px]"
            animate={{ opacity: [0.14, 0.24, 0.14], x: [0, -8, 0] }}
            transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
      {low && (
        <div className="absolute -top-40 left-1/2 h-[520px] w-[min(90vw,720px)] -translate-x-1/2 rounded-full bg-gradient-to-b from-cyan-500/10 via-violet-500/6 to-transparent blur-3xl" />
      )}
      <div
        className={`absolute inset-0 opacity-[0.14] bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_78%_62%_at_50%_22%,black,transparent)] ${low ? "" : "ai-grid-motion"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#020617]/92" />
    </div>
  );
}
