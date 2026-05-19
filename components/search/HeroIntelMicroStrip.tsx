"use client";

import { motion, useReducedMotion } from "framer-motion";

const PIPELINE = [
  { title: "Market scan", body: "Reads retailer ecosystems in real time." },
  { title: "Trust layer", body: "Seller trust weighted before price rank." },
  { title: "Price intelligence", body: "Discount quality over fake markdowns." },
  { title: "Decision engine", body: "Evidence becomes BUY · WAIT · AVOID." },
] as const;

export default function HeroIntelMicroStrip() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="qi-micro-intel-strip qi-micro-intel-pipeline"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Market intelligence pipeline"
    >
      <span className="qi-micro-intel-pipeline-rail" aria-hidden />
      {PIPELINE.map((item, i) => (
        <motion.div
          key={item.title}
          className="qi-micro-intel-cell"
          whileHover={reduceMotion ? undefined : { y: -1, transition: { duration: 0.32 } }}
        >
          <span className="qi-micro-intel-cell-glow" aria-hidden />
          <span className="qi-micro-intel-cell-illumination" aria-hidden />
          <span className="qi-micro-intel-index" aria-hidden>
            {String(i + 1).padStart(2, "0")}
          </span>
          <p className="qi-micro-intel-title">{item.title}</p>
          <p className="qi-micro-intel-body">{item.body}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
