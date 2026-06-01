"use client";

import { motion, useReducedMotion } from "framer-motion";

const PIPELINE = [
  { title: "Query", body: "Intent parsed before retailer noise enters the tray." },
  { title: "Synthesis", body: "Cross-market posture aligned to your purchase thesis." },
  { title: "Signal", body: "Price integrity, seller trust, and volatility aligned." },
  { title: "Decision", body: "Evidence before commitment — buy, wait, or avoid." },
] as const;

type Props = { className?: string };

export default function HeroIntelMicroStrip({ className = "" }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`qa-ui-hero-pipeline ${className}`.trim()}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Intelligence pipeline"
    >
      {PIPELINE.map((item, i) => (
        <article key={item.title} className="qa-ui-hero-pipeline-cell">
          <span className="qa-ui-hero-pipeline-index" aria-hidden>
            {String(i + 1).padStart(2, "0")}
          </span>
          <h2 className="qa-ui-hero-pipeline-title">{item.title}</h2>
          <p className="qa-ui-hero-pipeline-body">{item.body}</p>
        </article>
      ))}
    </motion.div>
  );
}
