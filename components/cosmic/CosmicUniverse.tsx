"use client";

import type { ReactNode } from "react";
type Props = {
  nav: ReactNode;
  portal: ReactNode;
  galaxy?: ReactNode;
  archive?: ReactNode;
  nexus: ReactNode;
  bands?: ReactNode;
  appendix?: ReactNode;
  footer?: ReactNode;
};

function ChamberConnector() {
  return <div className="qc-chamber-connector" aria-hidden />;
}

/** Connected cosmic OS — chambers inside one intelligence system. */
export default function CosmicUniverse({
  nav,
  portal,
  galaxy,
  archive,
  nexus,
  bands,
  appendix,
  footer,
}: Props) {
  return (
    <div className="qc-universe qc-legend qc-cosmos-root qa-intelligence-document">
      {nav}
      <div className="qc-cosmos-stage">
        <div className="qc-chamber qc-chamber--portal">
          <div className="qc-orbit-zone qc-orbit-zone--portal">{portal}</div>
        </div>

        {archive ? (
          <>
            <ChamberConnector />
            <div className="qc-chamber qc-chamber--archive">
              <div className="qc-orbit-zone qc-orbit-zone--archive">{archive}</div>
            </div>
          </>
        ) : null}

        {galaxy ? (
          <>
            <ChamberConnector />
            <div className="qc-chamber qc-chamber--galaxy">
              <div className="qc-orbit-zone qc-orbit-zone--galaxy">{galaxy}</div>
            </div>
          </>
        ) : null}

        {bands ? (
          <>
            <ChamberConnector />
            <div className="qc-chamber qc-chamber--bands">
              <div className="qc-orbit-zone qc-orbit-zone--bands">{bands}</div>
            </div>
          </>
        ) : null}

        <ChamberConnector />
        <div className="qc-chamber qc-chamber--nexus">
          <div className="qc-orbit-zone qc-orbit-zone--nexus">{nexus}</div>
        </div>

        {appendix ? (
          <>
            <ChamberConnector />
            <div className="qc-chamber qc-chamber--appendix">
              <div className="qc-orbit-zone qc-orbit-zone--appendix">{appendix}</div>
            </div>
          </>
        ) : null}

        {footer ? (
          <div className="qc-orbit-zone qc-orbit-zone--footer">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
