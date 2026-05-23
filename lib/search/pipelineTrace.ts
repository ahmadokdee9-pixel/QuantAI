/**
 * Phase 1 — Deterministic pipeline stage tracing with wall-clock timings.
 */

export type PipelineStageRow = {
  stage: string;
  before: number;
  after: number;
  suppressed: number;
  durationMs: number;
};

export class PipelineTrace {
  private readonly startedAt = Date.now();
  private lastMark = this.startedAt;
  private readonly rows: PipelineStageRow[] = [];

  trace(stage: string, before: number, after: number): void {
    const now = Date.now();
    const durationMs = Math.max(0, now - this.lastMark);
    this.lastMark = now;
    this.rows.push({
      stage,
      before,
      after,
      suppressed: Math.max(0, before - after),
      durationMs,
    });
  }

  /** Mark elapsed time for a stage without count change (e.g. controlled stack block). */
  mark(stage: string, count: number, durationMs: number): void {
    this.rows.push({
      stage,
      before: count,
      after: count,
      suppressed: 0,
      durationMs: Math.max(0, durationMs),
    });
    this.lastMark = Date.now();
  }

  rowsSnapshot(): PipelineStageRow[] {
    return [...this.rows];
  }

  totalMs(): number {
    return Date.now() - this.startedAt;
  }
}
