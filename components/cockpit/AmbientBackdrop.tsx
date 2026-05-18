"use client";

import { motion, useReducedMotion } from "framer-motion";

type Props = {
  lite?: boolean;
};

/**
 * Living atmosphere — gradient drift and soft haze only. No particles or cyber effects.
 */
export default function AmbientBackdrop({ lite = false }: Props) {
  const reduce = useReducedMotion();
  const low = reduce || lite;

  return (
    <motion.div className="qi-living-atmosphere pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#02040a]" />

      <motion.div
        className="qi-atmosphere-veil absolute inset-[-12%] opacity-[0.92]"
        animate={
          low
            ? undefined
            : {
                backgroundPosition: ["0% 40%", "100% 60%", "0% 40%"],
              }
        }
        transition={
          low ? undefined : { duration: 48, repeat: Infinity, ease: "easeInOut" }
        }
        style={{
          backgroundImage: `
            radial-gradient(ellipse 70% 55% at 20% 10%, rgba(34, 211, 238, 0.07), transparent 58%),
            radial-gradient(ellipse 55% 45% at 85% 15%, rgba(99, 102, 241, 0.05), transparent 52%),
            radial-gradient(ellipse 50% 40% at 50% 95%, rgba(15, 23, 42, 0.9), transparent 70%)
          `,
          backgroundSize: "120% 120%",
        }}
      />

      {!low && (
        <motion.div
          className="absolute left-1/2 top-[-18%] h-[min(70vh,640px)] w-[min(110vw,920px)] -translate-x-1/2 rounded-full bg-cyan-400/[0.06] blur-[120px]"
          animate={{ opacity: [0.35, 0.5, 0.35], scale: [1, 1.03, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {!low && (
        <motion.div
          className="absolute bottom-[-8%] right-[-12%] h-[45vh] w-[55vw] max-w-[720px] rounded-full bg-violet-600/[0.04] blur-[100px]"
          animate={{ opacity: [0.2, 0.32, 0.2], x: [0, -12, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {low && (
        <motion.div
          className="absolute -top-32 left-1/2 h-[420px] w-[min(88vw,680px)] -translate-x-1/2 rounded-full bg-cyan-500/[0.05] blur-3xl"
          aria-hidden
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#02040a]/95" />
    </motion.div>
  );
}
