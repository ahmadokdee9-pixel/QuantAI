"use client";



import type { ReactNode } from "react";



type Props = {

  children: ReactNode;

  entityCount?: number;

  soloEntity?: boolean;

  trayFocus?: boolean;

  bodyClassName?: string;

};



/** Cinematic 3-column intelligence grid — institutional product cards. */

export default function IntelligenceMatrix({

  children,

  entityCount,

  soloEntity = false,

  trayFocus = false,

  bodyClassName = "",

}: Props) {

  return (

    <div className="qbeta-matrix" role="region" aria-label="Product intelligence field">

      <header className="qbeta-matrix-head">

        <div>

          <p className="qbeta-matrix-epoch">Live intelligence field</p>

          <h2 className="qbeta-matrix-title">Product intelligence matrix</h2>

        </div>

        {entityCount != null && entityCount > 0 ? (

          <p className="qbeta-matrix-meta">

            <span>{entityCount}</span>

            <span> entities · field-synchronized</span>

          </p>

        ) : null}

      </header>



      <div className="qi-field-live-bar" aria-label="Field telemetry">

        <div className="qi-field-live-cell">

          <span className="qi-field-live-label">Entities</span>

          <span className="qi-field-live-value">{entityCount ?? 0}</span>

        </div>

        <div className="qi-field-live-cell">

          <span className="qi-field-live-label">Sync</span>

          <span className="qi-field-live-value qi-field-live-value--pulse">Live</span>

        </div>

        <div className="qi-field-live-cell">

          <span className="qi-field-live-label">Trust mesh</span>

          <span className="qi-field-live-value">Verified</span>

        </div>

        <div className="qi-field-live-cell">

          <span className="qi-field-live-label">AI layer</span>

          <span className="qi-field-live-value qi-field-live-value--pulse">Active</span>

        </div>

      </div>



      <div

        className={`qbeta-matrix-grid min-w-0 ${soloEntity ? "max-w-xl mx-auto" : ""} ${bodyClassName}`.trim()}

        data-tray-focus={trayFocus ? "true" : "false"}

      >

        {children}

      </div>

    </div>

  );

}


