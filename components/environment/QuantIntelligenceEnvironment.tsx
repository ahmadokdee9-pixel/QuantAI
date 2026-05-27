"use client";

import type { ReactNode } from "react";

type Props = {
  rail: ReactNode;
  gateway: ReactNode;
  scanField?: ReactNode;
  archiveShelf?: ReactNode;
  accessProtocol: ReactNode;
  appendix?: ReactNode;
  footer?: ReactNode;
};

/** Genesis immersive intelligence environment — replaces website page composition. */
export default function QuantIntelligenceEnvironment({
  rail,
  gateway,
  scanField,
  archiveShelf,
  accessProtocol,
  appendix,
  footer,
}: Props) {
  return (
    <div className="qx-genesis qx-env-root">
      {rail}
      <div className="qx-env-stage">
        <div className="qx-zone qx-zone--gateway">{gateway}</div>
        {archiveShelf ? <div className="qx-zone qx-zone--archive">{archiveShelf}</div> : null}
        {scanField ? <div className="qx-zone qx-zone--scan">{scanField}</div> : null}
        <div className="qx-zone qx-zone--access">{accessProtocol}</div>
        {appendix ? <div className="qx-zone qx-zone--appendix">{appendix}</div> : null}
        {footer ? <div className="qx-zone qx-zone--footer">{footer}</div> : null}
      </div>
    </div>
  );
}
