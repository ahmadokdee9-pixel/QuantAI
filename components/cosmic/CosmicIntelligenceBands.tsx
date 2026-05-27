"use client";

const BANDS = [
  {
    id: "pulse",
    epoch: "Live market pulse",
    title: "Orbital commerce radar",
    lead: "Real-time merchant lanes, trust vectors, and synthesis streams across the field.",
  },
  {
    id: "confidence",
    epoch: "AI confidence universe",
    title: "Predictive intelligence layer",
    lead: "Confidence fields, signal galaxies, and civilization-grade analytics for every entity.",
  },
  {
    id: "network",
    epoch: "Spatial merchant networks",
    title: "Floating trust architecture",
    lead: "Interconnected retailer intelligence — not isolated listings.",
  },
] as const;

/** Atmospheric intelligence bands — visual rhythm, not duplicate product logic. */
export default function CosmicIntelligenceBands() {
  return (
    <div id="qc-bands" className="qc-intelligence-bands scroll-mt-24">
      {BANDS.map((band, i) => (
        <article
          key={band.id}
          className={`qc-intelligence-band ${i % 2 === 1 ? "qc-intelligence-band--mirror" : ""}`}
        >
          <div className="qc-intelligence-band-orbit" aria-hidden />
          <div className="qc-intelligence-band-inner">
            <p className="qc-intelligence-band-epoch">{band.epoch}</p>
            <h3 className="qc-intelligence-band-title">{band.title}</h3>
            <p className="qc-intelligence-band-lead">{band.lead}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
