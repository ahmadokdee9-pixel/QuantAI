"use client";

import type { ReactNode } from "react";

type Props = {
  hasResults: boolean;
  manifest: ReactNode;
  headline: ReactNode;
  lead: ReactNode;
  microStrip?: ReactNode;
  command: ReactNode;
  belowCommand?: ReactNode;
  footer?: ReactNode;
};

/**
 * Asymmetric command environment — not a centered marketing hero.
 */
export default function CommandEnvironmentHero({
  hasResults,
  manifest,
  headline,
  lead,
  microStrip,
  command,
  belowCommand,
  footer,
}: Props) {
  return (
    <section
      className={`qcc-command-environment relative overflow-hidden ${
        hasResults ? "qcc-command-environment--compact" : "qcc-command-environment--immersive"
      }`}
      aria-label="Commerce intelligence command environment"
    >
      <div className="qcc-env-structure" aria-hidden>
        <div className="qcc-env-beam qcc-env-beam--a" />
        <div className="qcc-env-beam qcc-env-beam--b" />
        <div className="qcc-env-grid-field" />
        <div className="qcc-env-horizon" />
      </div>

      <div className="qcc-env-composition relative z-[1]">
        <div className="qcc-env-manifest-col">
          <div className="qcc-env-manifest">{manifest}</div>
          <div className="qcc-env-headline">{headline}</div>
          <div className="qcc-env-lead">{lead}</div>
          {microStrip ? <div className="qcc-env-micro">{microStrip}</div> : null}
        </div>

        <div className="qcc-env-terminal-col">
          <div className="qcc-env-terminal-frame">
            <div className="qcc-env-terminal-rim" aria-hidden />
            <div className="qcc-env-terminal-core">{command}</div>
            {belowCommand ? <div className="qcc-env-terminal-status">{belowCommand}</div> : null}
          </div>
        </div>
      </div>

      {footer ? <div className="qcc-env-footer relative z-[1]">{footer}</div> : null}
    </section>
  );
}
