"use client";



type Props = {

  lite?: boolean;

};



/** Layered neural atmosphere — visual only, no interaction. */

export default function CosmicBackdrop(_props: Props) {

  return (

    <div className="qc-backdrop qa-backdrop-minimal pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>

      <div className="qa-backdrop-depth-layer" />

      <div className="qa-backdrop-ambient-glow qa-backdrop-ambient-glow--violet" />

      <div className="qa-backdrop-ambient-glow qa-backdrop-ambient-glow--cyan" />

      <div className="qa-backdrop-neural-fog" />

      <div className="qa-backdrop-neural-grid" />

      <div className="qc-cosmos-backdrop-mesh" />

      <div className="qc-cosmos-backdrop-orb qc-cosmos-backdrop-orb--a" />

      <div className="qc-cosmos-backdrop-orb qc-cosmos-backdrop-orb--b" />

      <div className="qa-backdrop-soft" />

    </div>

  );

}
