"use client";

/** Visual pipeline rail under hero command — layout-only placeholder for cosmic shell. */
export default function HeroCommandPipeline() {
  return (
    <ol
      className="qc-command-pipeline mt-6 hidden gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--qui-ink-muted,#5a6278)] sm:grid sm:grid-cols-4"
      aria-label="Intelligence pipeline"
    >
      <li className="rounded-lg border border-[var(--qui-border-soft)] bg-white/80 px-2 py-2 text-center">
        Query
      </li>
      <li className="rounded-lg border border-[var(--qui-border-soft)] bg-white/80 px-2 py-2 text-center">
        Synthesis
      </li>
      <li className="rounded-lg border border-[var(--qui-border-soft)] bg-white/80 px-2 py-2 text-center">
        Signal
      </li>
      <li className="rounded-lg border border-[var(--qui-border-soft)] bg-white/80 px-2 py-2 text-center">
        Decision
      </li>
    </ol>
  );
}
