"use client";

type Props = {
  entityCount?: number;
  scanning?: boolean;
};

/** Presentational OS metrics — display only, no search logic. */
export default function CommandMetricsStrip({ entityCount = 0, scanning = false }: Props) {
  return (
    <div className="qc-command-metrics" aria-label="Intelligence system metrics">
      <div className="qc-command-metric">
        <p className="qc-command-metric-label">Neural throughput</p>
        <p className="qc-command-metric-value">{scanning ? "Synthesizing" : "Operational"}</p>
      </div>
      <div className="qc-command-metric">
        <p className="qc-command-metric-label">Entity field</p>
        <p className="qc-command-metric-value">{entityCount > 0 ? entityCount : "—"}</p>
      </div>
      <div className="qc-command-metric">
        <p className="qc-command-metric-label">Trust mesh</p>
        <p className="qc-command-metric-value">Verified</p>
      </div>
      <div className="qc-command-metric">
        <p className="qc-command-metric-label">Market sync</p>
        <p className="qc-command-metric-value">Live</p>
      </div>
    </div>
  );
}
