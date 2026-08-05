"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

const FLOW_STAGES = [
  "Global Signals",
  "Intelligence Processing",
  "Decision Synthesis",
  "Final Verdict",
] as const;

const INCOMING_SIGNALS = [
  { id: "trust", label: "Trust Signals" },
  { id: "price", label: "Pricing Signals" },
  { id: "inventory", label: "Inventory Signals" },
  { id: "seller", label: "Seller Reliability" },
  { id: "context", label: "Market Context" },
] as const;

const PROCESSING_STAGES = [
  { id: "trust", label: "Trust Analysis" },
  { id: "price", label: "Price Validation" },
  { id: "inventory", label: "Inventory Stability" },
  { id: "seller", label: "Seller Verification" },
  { id: "synthesis", label: "Decision Synthesis" },
] as const;

const CORE = { x: 430, y: 150 } as const;
const ENGINE = { x: 620, y: 150 } as const;
const VERDICT_HUB = { x: 820, y: 150 } as const;

const SIGNAL_Y = [38, 92, 146, 200, 254] as const;

function inflowPath(sy: number): string {
  const { x: cx, y: cy } = CORE;
  const sx = 195;
  const mx = (sx + cx) / 2;
  return `M ${sx} ${sy} C ${mx} ${sy}, ${mx - 20} ${cy}, ${cx - 48} ${cy}`;
}

const INFLOW_ROUTES = INCOMING_SIGNALS.map((signal, i) => ({
  id: signal.id,
  d: inflowPath(SIGNAL_Y[i] ?? 146),
  delay: i * 0.85,
  dur: 5.5 + i * 0.4,
}));

const CORE_TO_ENGINE = `M ${CORE.x + 52} ${CORE.y} L ${ENGINE.x - 42} ${ENGINE.y}`;
const ENGINE_TO_VERDICT = `M ${ENGINE.x + 42} ${ENGINE.y} L ${VERDICT_HUB.x - 58} ${VERDICT_HUB.y}`;

const VERDICTS = [
  { tone: "buy-ready", label: "BUY READY", meta: "High confidence — proceed with purchase" },
  { tone: "compare", label: "COMPARE", meta: "Evaluate alternatives before committing" },
  { tone: "wait", label: "WAIT", meta: "Market conditions suggest holding position" },
] as const;

/** Visual intelligence pipeline — market signals → core → verdict. */
export default function GlobalCommerceIntelligenceNetwork() {
  const reduceMotion = useReducedMotion();
  const [stageIndex, setStageIndex] = useState(0);
  const [verdictIndex, setVerdictIndex] = useState(0);
  const [processing, setProcessing] = useState(true);

  const synthesizing = processing || stageIndex === 4;
  const aggregating = stageIndex > 0;
  const aggregationFill = ((stageIndex + 1) / PROCESSING_STAGES.length) * 100;

  const flowStageActive = (i: number) => {
    if (reduceMotion) return i === 3;
    if (i === 0) return true;
    if (i === 1) return stageIndex < 4;
    if (i === 2) return stageIndex >= 2 || processing;
    return !processing;
  };

  useEffect(() => {
    if (reduceMotion) return;

    const stageId = window.setInterval(() => {
      setStageIndex((i) => (i + 1) % PROCESSING_STAGES.length);
    }, 2400);

    return () => window.clearInterval(stageId);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;

    let processingTimeout: number | undefined;
    const verdictId = window.setInterval(() => {
      setProcessing(true);
      processingTimeout = window.setTimeout(() => setProcessing(false), 900);
      setVerdictIndex((i) => (i + 1) % VERDICTS.length);
    }, 9000);

    return () => {
      window.clearInterval(verdictId);
      if (processingTimeout !== undefined) window.clearTimeout(processingTimeout);
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (!reduceMotion) return;
    // Sync decorative processing state to reduced-motion preference.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a11y preference sync
    setProcessing(false);
  }, [reduceMotion]);

  return (
    <article className="qa-ref-gcin" aria-labelledby="qa-ref-gcin-title">
      <header className="qa-ref-gcin__intro">
        <p className="qa-ref-kicker">How judgment forms</p>
        <h2 id="qa-ref-gcin-title" className="qa-ref-h2 qa-ref-gcin__title">
          Observe. Reconcile. Commit.
        </h2>
        <p className="qa-ref-lead qa-ref-lead--narrow qa-ref-gcin__lead">
          Independent signals are watched, reconciled without noise, and resolved into one
          living commitment posture.
        </p>
      </header>

      <div
        className={`qa-ref-gcin__flow${reduceMotion ? "" : " qa-ref-gcin__flow--live"}`}
        aria-label="QuantAI decision intelligence pipeline"
      >
        <div className="qa-ref-gcin__flow-bar" aria-hidden>
          {FLOW_STAGES.map((stage, i) => (
            <span
              key={stage}
              className={`qa-ref-gcin__flow-stage${flowStageActive(i) ? " qa-ref-gcin__flow-stage--active" : ""}`}
            >
              {stage}
              {i < FLOW_STAGES.length - 1 && <span className="qa-ref-gcin__flow-pulse" />}
            </span>
          ))}
        </div>

        <div className="qa-ref-gcin__pipeline">
          {!reduceMotion && <div className="qa-ref-gcin__ambient" aria-hidden />}
          <svg
            className="qa-ref-gcin__connections"
            viewBox="0 0 960 292"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            <defs>
              <linearGradient id="qa-ref-gcin-route" gradientUnits="userSpaceOnUse" x1="180" y1="0" x2="820" y2="0">
                <stop offset="0%" stopColor="#2a2668" stopOpacity="0.12" />
                <stop offset="45%" stopColor="#2a2668" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#151238" stopOpacity="0.48" />
              </linearGradient>
              <linearGradient id="qa-ref-gcin-energy" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="960" y2="0">
                <stop offset="0%" stopColor="#2a2668" stopOpacity="0" />
                <stop offset="50%" stopColor="#2a2668" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#2a2668" stopOpacity="0" />
              </linearGradient>
              <filter id="qa-ref-gcin-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="qa-ref-gcin-soft" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="4" />
              </filter>
            </defs>

            <rect width="960" height="292" fill="rgba(42,38,104,0.025)" rx="12" />
            <rect
              className="qa-ref-gcin__field"
              x="120"
              y="20"
              width="760"
              height="252"
              rx="18"
              fill="rgba(42,38,104,0.018)"
            />

            {INFLOW_ROUTES.map((route, i) => (
              <path
                key={`glow-${route.id}`}
                d={route.d}
                className={`qa-ref-gcin__route-glow${i === stageIndex ? " qa-ref-gcin__route-glow--active" : ""}`}
                fill="none"
              />
            ))}

            {INFLOW_ROUTES.map((route, i) => (
              <path
                key={route.id}
                d={route.d}
                className={`qa-ref-gcin__route${i === stageIndex ? " qa-ref-gcin__route--active" : ""}${reduceMotion ? "" : " qa-ref-gcin__route--live"}`}
                style={{ animationDelay: `${route.delay}s` }}
                fill="none"
              />
            ))}

            <path
              d={CORE_TO_ENGINE}
              className={`qa-ref-gcin__route qa-ref-gcin__route--trunk${synthesizing ? " qa-ref-gcin__route--active" : ""}${reduceMotion ? "" : " qa-ref-gcin__route--live"}`}
              fill="none"
            />
            <path
              d={ENGINE_TO_VERDICT}
              className={`qa-ref-gcin__route qa-ref-gcin__route--trunk${synthesizing ? " qa-ref-gcin__route--active" : ""}${reduceMotion ? "" : " qa-ref-gcin__route--live"}`}
              style={{ animationDelay: "0.6s" }}
              fill="none"
            />

            {!reduceMotion &&
              INFLOW_ROUTES.flatMap((route) =>
                [0, 1, 2].map((p) => (
                  <circle
                    key={`${route.id}-p-${p}`}
                    r={p === 0 ? 2.4 : p === 1 ? 1.8 : 1.2}
                    fill="#2a2668"
                    opacity={0.28 - p * 0.08}
                    filter={p === 0 ? "url(#qa-ref-gcin-glow)" : undefined}
                    className={p === 2 ? "qa-ref-gcin__stream--micro" : undefined}
                  >
                    <animateMotion
                      dur={`${route.dur + p * 0.65}s`}
                      repeatCount="indefinite"
                      path={route.d}
                      begin={`${route.delay + p * 0.9}s`}
                      calcMode="linear"
                    />
                  </circle>
                )),
              )}

            {!reduceMotion &&
              [CORE_TO_ENGINE, ENGINE_TO_VERDICT].flatMap((path, pi) =>
                [0, 1, 2].map((p) => (
                  <circle
                    key={`trunk-${pi}-p-${p}`}
                    r={p === 0 ? 2 : 1.4}
                    fill="#2a2668"
                    opacity={0.32 - p * 0.08}
                    filter={p === 0 ? "url(#qa-ref-gcin-glow)" : undefined}
                  >
                    <animateMotion
                      dur={`${2.8 + pi * 0.4 + p * 0.5}s`}
                      repeatCount="indefinite"
                      path={path}
                      begin={`${pi * 0.7 + p * 0.55}s`}
                      calcMode="linear"
                    />
                  </circle>
                )),
              )}

            {!reduceMotion && (
              <>
                <circle cx={382} cy={CORE.y} r="3" className="qa-ref-gcin__junction" />
                <circle cx={CORE.x + 52} cy={CORE.y} r="3" className="qa-ref-gcin__junction qa-ref-gcin__junction--delay" />
                <circle cx={ENGINE.x + 42} cy={ENGINE.y} r="3" className="qa-ref-gcin__junction qa-ref-gcin__junction--delay-2" />
                <circle cx={VERDICT_HUB.x - 58} cy={VERDICT_HUB.y} r="3" className="qa-ref-gcin__junction qa-ref-gcin__junction--delay-3" />
              </>
            )}

            <circle cx={CORE.x} cy={CORE.y} r="102" className="qa-ref-gcin__core-aura" />
            <circle cx={CORE.x} cy={CORE.y} r="78" className="qa-ref-gcin__core-aura qa-ref-gcin__core-aura--mid" />
            <circle cx={CORE.x} cy={CORE.y} r="52" className="qa-ref-gcin__core-aura qa-ref-gcin__core-aura--inner" />
          </svg>

          <div className="qa-ref-gcin__grid">
            <section className="qa-ref-gcin__col qa-ref-gcin__col--signals" aria-label="Global signals">
              <p className="qa-ref-gcin__col-label">Global signals</p>
              <ul className="qa-ref-gcin__signals">
                {INCOMING_SIGNALS.map((signal, i) => (
                  <li
                    key={signal.id}
                    className={`qa-ref-gcin__signal${i === stageIndex ? " qa-ref-gcin__signal--active" : ""}${i < stageIndex ? " qa-ref-gcin__signal--passed" : ""}`}
                  >
                    <span className="qa-ref-gcin__signal-port" aria-hidden />
                    <span className="qa-ref-gcin__signal-label">{signal.label}</span>
                    {!reduceMotion && i === stageIndex && (
                      <>
                        <span className="qa-ref-gcin__signal-emit" aria-hidden />
                        <span className="qa-ref-gcin__signal-pulse" aria-hidden />
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="qa-ref-gcin__col qa-ref-gcin__col--core" aria-label="Intelligence processing">
              <p className="qa-ref-gcin__col-label">Intelligence processing</p>
              <div className={`qa-ref-gcin__core${reduceMotion ? "" : " qa-ref-gcin__core--live"}`}>
                <div className="qa-ref-gcin__core-backdrop" aria-hidden />
                <div className="qa-ref-gcin__core-glow" aria-hidden />
                <div className="qa-ref-gcin__core-halo" aria-hidden />
                <div className="qa-ref-gcin__core-ring" aria-hidden />
                <div className="qa-ref-gcin__core-ring qa-ref-gcin__core-ring--inner" aria-hidden />
                {!reduceMotion && <div className="qa-ref-gcin__core-scan" aria-hidden />}
                <p className="qa-ref-gcin__core-kicker">QuantAI Intelligence Core</p>
                <p className="qa-ref-gcin__core-status">
                  {reduceMotion ? "Analysis complete" : "Processing live market intelligence"}
                </p>
                <ul className="qa-ref-gcin__core-stages" aria-label="Active processing stages">
                  {PROCESSING_STAGES.map((stage, i) => (
                    <li
                      key={stage.id}
                      className={`qa-ref-gcin__core-stage${i === stageIndex ? " qa-ref-gcin__core-stage--active" : ""}${i < stageIndex ? " qa-ref-gcin__core-stage--done" : ""}`}
                    >
                      <span className="qa-ref-gcin__core-stage-dot" aria-hidden />
                      <span className="qa-ref-gcin__core-stage-label">{stage.label}</span>
                      {i === stageIndex && !reduceMotion && (
                        <span className="qa-ref-gcin__core-stage-sweep" aria-hidden />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="qa-ref-gcin__col qa-ref-gcin__col--engine" aria-label="Decision synthesis">
              <p className="qa-ref-gcin__col-label">Decision synthesis</p>
              <div
                className={`qa-ref-gcin__engine${
                  synthesizing
                    ? " qa-ref-gcin__engine--processing"
                    : aggregating
                      ? " qa-ref-gcin__engine--aggregating"
                      : " qa-ref-gcin__engine--ready"
                }${reduceMotion ? "" : " qa-ref-gcin__engine--live"}`}
              >
                <span className="qa-ref-gcin__engine-backdrop" aria-hidden />
                <span className="qa-ref-gcin__engine-ring" aria-hidden />
                <span className="qa-ref-gcin__engine-energy" aria-hidden />
                {!reduceMotion && synthesizing && <span className="qa-ref-gcin__engine-scan" aria-hidden />}
                <span className="qa-ref-gcin__engine-fuse" aria-hidden>
                  <span className="qa-ref-gcin__engine-fuse-in">
                    {INCOMING_SIGNALS.map((signal, i) => (
                      <span
                        key={signal.id}
                        className={`qa-ref-gcin__engine-fuse-channel${i <= stageIndex ? " qa-ref-gcin__engine-fuse-channel--lit" : ""}${synthesizing && i === stageIndex ? " qa-ref-gcin__engine-fuse-channel--active" : ""}${aggregating && i === stageIndex && !synthesizing ? " qa-ref-gcin__engine-fuse-channel--incoming" : ""}`}
                      />
                    ))}
                  </span>
                  <span
                    className={`qa-ref-gcin__engine-fuse-core${
                      synthesizing
                        ? " qa-ref-gcin__engine-fuse-core--live"
                        : aggregating
                          ? " qa-ref-gcin__engine-fuse-core--gathering"
                          : " qa-ref-gcin__engine-fuse-core--settled"
                    }`}
                  />
                  <span
                    className={`qa-ref-gcin__engine-fuse-out${!synthesizing && aggregating ? " qa-ref-gcin__engine-fuse-out--armed" : ""}${!synthesizing && !aggregating ? " qa-ref-gcin__engine-fuse-out--ready" : ""}`}
                  />
                </span>
                <span className="qa-ref-gcin__engine-aggregate" aria-hidden>
                  <span
                    className="qa-ref-gcin__engine-aggregate-fill"
                    style={{ width: `${aggregationFill}%` }}
                  />
                </span>
                <span className="qa-ref-gcin__engine-port qa-ref-gcin__engine-port--in" aria-hidden />
                <span className="qa-ref-gcin__engine-port qa-ref-gcin__engine-port--out" aria-hidden />
                <p className="qa-ref-gcin__engine-label">Decision synthesis</p>
                <p className="qa-ref-gcin__engine-status">
                  {synthesizing && !reduceMotion ? "Synthesizing…" : "Output ready"}
                </p>
                {!reduceMotion && (synthesizing || aggregating) && (
                  <span
                    className={`qa-ref-gcin__engine-activity${synthesizing ? "" : " qa-ref-gcin__engine-activity--soft"}`}
                    aria-hidden
                  >
                    <span /><span /><span />
                  </span>
                )}
              </div>
            </section>

            <section className="qa-ref-gcin__col qa-ref-gcin__col--verdict" aria-label="Final verdict">
              <p className="qa-ref-gcin__col-label">Final verdict</p>
              <div className="qa-ref-gcin__verdicts" aria-live="polite" aria-atomic="true">
                {VERDICTS.map((v, i) => (
                  <div
                    key={v.tone}
                    className={`qa-ref-gcin__verdict qa-ref-gcin__verdict--${v.tone}${i === verdictIndex ? " qa-ref-gcin__verdict--active" : ""}${processing && i === verdictIndex ? " qa-ref-gcin__verdict--processing" : ""}${!processing && i === verdictIndex ? " qa-ref-gcin__verdict--resolved" : ""}`}
                  >
                    {!reduceMotion && i === verdictIndex && (
                      <>
                        <span className="qa-ref-gcin__verdict-beam" aria-hidden />
                        <span className="qa-ref-gcin__verdict-glow" aria-hidden />
                      </>
                    )}
                    <div className="qa-ref-gcin__verdict-head">
                      <span className="qa-ref-gcin__verdict-seal" aria-hidden />
                      <span className="qa-ref-gcin__verdict-label">{v.label}</span>
                      {i === verdictIndex && !processing && !reduceMotion && (
                        <span
                          className={`qa-ref-gcin__verdict-confidence qa-ref-gcin__verdict-confidence--${v.tone}`}
                          aria-hidden
                        >
                          <span />
                          <span />
                          <span />
                        </span>
                      )}
                    </div>
                    {i === verdictIndex && <p className="qa-ref-gcin__verdict-meta">{v.meta}</p>}
                    {i === verdictIndex && !processing && !reduceMotion && (
                      <span className="qa-ref-gcin__verdict-lock" aria-hidden />
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </article>
  );
}
