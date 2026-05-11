"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Full-viewport ambient layer — pure presentation, no interaction.
 */
export default function AmbientBackdrop() {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#020617]" />
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background: `
            radial-gradient(ellipse 100% 70% at 50% -15%, rgba(34, 211, 238, 0.22), transparent 52%),
            radial-gradient(ellipse 70% 55% at 100% 20%, rgba(139, 92, 246, 0.16), transparent 48%),
            radial-gradient(ellipse 60% 50% at 0% 75%, rgba(52, 211, 153, 0.09), transparent 42%),
            radial-gradient(ellipse 50% 40% at 80% 90%, rgba(56, 189, 248, 0.06), transparent 40%)
          `,
        }}
      />
      {!reduce && (
        <>
          <motion.div
            className="absolute -top-48 left-1/2 h-[min(85vh,900px)] w-[min(120vw,980px)] -translate-x-1/2 rounded-full bg-gradient-to-b from-cyan-400/25 via-violet-500/12 to-transparent blur-[100px]"
            animate={{ opacity: [0.45, 0.7, 0.45], scale: [1, 1.04, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-0 right-[-20%] h-[55vh] w-[70vw] max-w-[900px] rounded-full bg-gradient-to-tl from-violet-600/14 to-transparent blur-[90px]"
            animate={{ opacity: [0.25, 0.42, 0.25], x: [0, -12, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
      {reduce && (
        <div className="absolute -top-40 left-1/2 h-[520px] w-[min(90vw,720px)] -translate-x-1/2 rounded-full bg-gradient-to-b from-cyan-500/18 via-violet-500/10 to-transparent blur-3xl" />
      )}
      <div
        className="absolute inset-0 opacity-[0.28] bg-[linear-gradient(rgba(148,163,184,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.055)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_25%,black,transparent)] ai-grid-motion"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#020617]/90" />
    </div>
  );
}
