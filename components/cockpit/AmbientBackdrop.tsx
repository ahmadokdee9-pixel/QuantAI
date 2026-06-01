"use client";

import { motion, useReducedMotion } from "framer-motion";

type Props = {
  lite?: boolean;
};

/**
 * QuantAI signature atmosphere — neural depth, intelligence glow, restrained drift.
 * Institutional light field; no particles or gamified effects.
 */
export default function AmbientBackdrop({ lite = false }: Props) {
  const reduce = useReducedMotion();
  const low = reduce || lite;

  return (
    <motion.div
      className="qi-living-atmosphere qa-iconic-atmosphere pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden
    >
      <div className="qa-iconic-atmosphere-base absolute inset-0" />

      <motion.div
        className="qa-iconic-neural-veil absolute inset-[-8%]"
        animate={
          low
            ? undefined
            : {
                opacity: [0.72, 0.92, 0.72],
                backgroundPosition: ["0% 35%", "100% 65%", "0% 35%"],
              }
        }
        transition={low ? undefined : { duration: 42, repeat: Infinity, ease: "easeInOut" }}
      />

      {!low && (
        <>
          <motion.div
            className="qa-iconic-intel-orb qa-iconic-intel-orb--crown absolute left-1/2 top-[-12%] h-[min(68vh,620px)] w-[min(105vw,880px)] -translate-x-1/2 rounded-full"
            animate={{ opacity: [0.42, 0.62, 0.42], scale: [1, 1.025, 1] }}
            transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="qa-iconic-intel-orb qa-iconic-intel-orb--field absolute bottom-[-6%] right-[-8%] h-[42vh] w-[min(58vw,680px)] rounded-full"
            animate={{ opacity: [0.18, 0.32, 0.18], x: [0, -14, 0] }}
            transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      <div className="qa-iconic-neural-mesh absolute inset-0" />

      <div className="qa-iconic-atmosphere-vignette absolute inset-0" />
    </motion.div>
  );
}
