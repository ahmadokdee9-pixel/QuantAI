"use client";

/** Global neural field mesh — connects chambers, fills dead space. Visual only. */
export default function CinematicFieldMesh() {
  return (
    <div className="qc-field-mesh pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden>
      <div className="qc-field-mesh-grid" />
      <div className="qc-field-mesh-fog qc-field-mesh-fog--a" />
      <div className="qc-field-mesh-fog qc-field-mesh-fog--b" />
      <div className="qc-field-mesh-radial" />
      <div className="qc-field-mesh-threads" />
    </div>
  );
}
