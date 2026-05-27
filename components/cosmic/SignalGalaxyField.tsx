"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  live?: boolean;
};

/** Intelligence signal galaxy — spatial results ecosystem. */
export default function SignalGalaxyField({ children, live = false }: Props) {
  return (
    <section
      className={`qc-galaxy-field qa-intelligence-synthesis-wrap ${live ? "qc-galaxy-field--live" : ""}`}
      aria-label="Market synthesis field"
    >
      <div className="qc-galaxy-field-inner qc-intelligence-field qi-field-command-deck">{children}</div>
    </section>
  );
}
