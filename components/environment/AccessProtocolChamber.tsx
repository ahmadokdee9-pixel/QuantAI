"use client";

import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

/** Intelligence access protocol — luxury clearance architecture, not SaaS pricing. */
export default function AccessProtocolChamber({ title, lead, actions, children }: Props) {
  return (
    <section id="pricing" className="qx-access-chamber scroll-mt-24" aria-label="Access protocol">
      <div className="qx-access-chamber-atmosphere" aria-hidden />
      <header className="qx-access-chamber-header">
        {title}
        {lead}
        {actions}
      </header>
      <div className="qx-access-chamber-body">{children}</div>
    </section>
  );
}
