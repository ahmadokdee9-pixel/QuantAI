"use client";

import type { ReactNode } from "react";

type Props = {
  active: boolean;
  command: ReactNode;
  status?: ReactNode;
  guest?: ReactNode;
};

/** Cinematic intelligence gateway — spatial command surface, not a SaaS hero. */
export default function IntelligenceGateway({ active, command, status, guest }: Props) {
  return (
    <section
      className={`qx-gateway ${active ? "qx-gateway--live" : "qx-gateway--idle"}`}
      aria-label="Intelligence gateway"
    >
      <div className="qx-gateway-atmosphere" aria-hidden>
        <div className="qx-gateway-void" />
        <div className="qx-gateway-grid" />
        <div className="qx-gateway-orbit" />
        <div className="qx-gateway-axis" />
      </div>

      <div className="qx-gateway-composition">
        <header className="qx-gateway-manifest">
          <p className="qx-gateway-system">QuantAI · Civilization-grade commerce intelligence</p>
          <h1 className="qx-gateway-statement">
            Enter the
            <span className="block qx-gateway-statement-sub">buying intelligence dimension.</span>
          </h1>
          <p className="qx-gateway-directive">
            Activate the core. Every entity is classified, scored, and synthesized — never listed.
          </p>
        </header>

        <div className="qx-gateway-terminal">
          <div className="qx-gateway-terminal-label" aria-hidden>
            <span>Neural command</span>
            <span className="qx-gateway-terminal-line" />
          </div>
          <div className="qx-gateway-terminal-body">{command}</div>
          {status ? <div className="qx-gateway-terminal-status">{status}</div> : null}
        </div>
      </div>

      {guest ? <div className="qx-gateway-guest">{guest}</div> : null}
    </section>
  );
}
