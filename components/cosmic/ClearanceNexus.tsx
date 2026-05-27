"use client";

import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

/** Civilization-grade clearance architecture — not SaaS pricing. */
export default function ClearanceNexus({ title, lead, actions, children }: Props) {
  return (
    <section id="pricing" className="qc-clearance-nexus qa-institutional-access scroll-mt-24" aria-label="Institutional access architecture">
      <div className="qc-clearance-nexus-glow" aria-hidden />
      <div className="qc-clearance-nexus-orbit" aria-hidden />
      <header className="qc-clearance-nexus-header">
        {title}
        {lead}
        {actions}
      </header>
      <div className="qc-clearance-nexus-body">{children}</div>
    </section>
  );
}
