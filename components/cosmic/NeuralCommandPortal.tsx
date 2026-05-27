"use client";

import type { ReactNode } from "react";
import HeroIntelMicroStrip from "@/components/search/HeroIntelMicroStrip";
import CommandMetricsStrip from "@/components/cosmic/CommandMetricsStrip";
import HeroCommandPipeline from "@/components/cosmic/HeroCommandPipeline";

type Props = {
  compact: boolean;
  portal: ReactNode;
  status?: ReactNode;
  guest?: ReactNode;
  entityCount?: number;
  scanning?: boolean;
};

/** Neural command center — search-first intelligence gateway. */
export default function NeuralCommandPortal({
  compact,
  portal,
  status,
  guest,
  entityCount = 0,
  scanning = false,
}: Props) {
  return (
    <section
      className={`qc-portal qi-cinema-hero ${compact ? "qc-portal--compact" : "qc-portal--prime"}`}
      aria-label="Intelligence command surface"
    >
      <div className="qa-hero-neural-field" aria-hidden>
        <div className="qa-hero-neural-grid" />
        <div className="qa-hero-neural-radial" />
        <div className="qa-hero-neural-pulse" />
        <div className="qi-hero-neural-orb" />
        <div
          className="qa-hero-neural-radial qi-hero-neural-radial--secondary"
          aria-hidden
        />
      </div>

      <div className="qc-portal-composition qc-portal-composition--command-core">
        <header className="qc-portal-manifest">
          <p className="qc-portal-badge">QuantAI · Commerce intelligence OS</p>
          <h1 className="qc-portal-title">
            Choose your intelligence layer.
            <span className="qc-portal-title-accent">Decide with institutional clarity.</span>
          </h1>
          <p className="qc-portal-lead">
            Neural commerce infrastructure for operators — price truth, seller trust, and AI verdicts in one calm command surface.
          </p>
        </header>

        <div className="qc-portal-command qc-portal-command--nexus">
          <div className="qi-command-surface-wrap">
            {portal}
          </div>
          {status ? <div className="qc-portal-status qc-command-stage-status">{status}</div> : null}
          <CommandMetricsStrip entityCount={entityCount} scanning={scanning} />
          <HeroIntelMicroStrip />
          <HeroCommandPipeline />
        </div>
      </div>

      {guest ? <div className="qc-portal-guest">{guest}</div> : null}
    </section>
  );
}
