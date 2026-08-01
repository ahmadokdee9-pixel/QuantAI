"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export const LIVE_STAGES = [
  { id: "ingestion", label: "Signal Ingestion" },
  { id: "trust", label: "Trust Calibration" },
  { id: "seller", label: "Seller Verification" },
  { id: "price", label: "Price Validation" },
  { id: "confidence", label: "Confidence Formation" },
  { id: "synthesis", label: "Decision Synthesis" },
] as const;

const NODE_X = [32, 128, 224, 320, 416, 512] as const;
const FLOW_Y = 22;
const VIEW_W = 544;
const VIEW_H = 44;

type Props = {
  className?: string;
  searchQuery?: string;
  live?: boolean;
  stageIndex?: number;
};

function stageState(index: number, active: number): "done" | "active" | "pending" {
  if (index < active) return "done";
  if (index === active) return "active";
  return "pending";
}

function linkState(index: number, active: number): "done" | "active" | "pending" {
  if (index < active) return "done";
  if (index === active) return "active";
  return "pending";
}

/** Compact animated intelligence flow — live signal pipeline. */
export default function LiveIntelligenceRail({
  className = "",
  searchQuery = "",
  live = true,
  stageIndex,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [activeStage, setActiveStage] = useState(0);

  const resolvedStage =
    stageIndex !== undefined
      ? Math.min(Math.max(stageIndex, 0), LIVE_STAGES.length - 1)
      : activeStage;

  const animate = live && !reduceMotion;

  useEffect(() => {
    if (!live || reduceMotion || stageIndex !== undefined) return;

    const id = window.setInterval(() => {
      setActiveStage((i) => (i + 1) % LIVE_STAGES.length);
    }, 2400);

    return () => window.clearInterval(id);
  }, [live, reduceMotion, stageIndex]);

  useEffect(() => {
    if (stageIndex === undefined) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- controlled stage prop sync
    setActiveStage(stageIndex);
  }, [stageIndex]);

  return (
    <section
      className={`qa-ref-live-flow${animate ? " qa-ref-live-flow--live" : ""}${className ? ` ${className}` : ""}`}
      aria-label="Live intelligence signals"
      aria-busy={live}
      role="status"
    >
      <div className="qa-ref-live-flow__head">
        <span className="qa-ref-live-flow__pulse" aria-hidden />
        <p className="qa-ref-live-flow__kicker">Live intelligence signals</p>
        {searchQuery.trim() ? (
          <span className="qa-ref-live-flow__query">{searchQuery.trim()}</span>
        ) : null}
      </div>

      <div className="qa-ref-live-flow__conduit" aria-hidden={false}>
        <svg
          className="qa-ref-live-flow__svg"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            <linearGradient id="qa-ref-live-flow-energy" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2a2668" stopOpacity="0" />
              <stop offset="50%" stopColor="#2a2668" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#2a2668" stopOpacity="0" />
            </linearGradient>
          </defs>

          {NODE_X.slice(0, -1).map((x, i) => {
            const x2 = NODE_X[i + 1] ?? x;
            const state = linkState(i + 1, resolvedStage);
            const midX = (x + x2) / 2;
            return (
              <g key={`link-${i}`}>
                <path
                  d={`M ${x + 5} ${FLOW_Y} L ${midX} ${FLOW_Y + 5} L ${x2 - 5} ${FLOW_Y}`}
                  className={`qa-ref-live-flow__path qa-ref-live-flow__path--${state}`}
                  fill="none"
                />
                <text
                  x={midX}
                  y={FLOW_Y + 11}
                  className={`qa-ref-live-flow__chevron qa-ref-live-flow__chevron--${state}`}
                >
                  ↓
                </text>
                {animate && state === "active" ? (
                  <>
                    <circle r="2" className="qa-ref-live-flow__packet">
                      <animateMotion
                        dur="1.35s"
                        repeatCount="indefinite"
                        path={`M ${x + 5} ${FLOW_Y} L ${midX} ${FLOW_Y + 5} L ${x2 - 5} ${FLOW_Y}`}
                        calcMode="linear"
                      />
                    </circle>
                    <circle r="1.2" className="qa-ref-live-flow__packet qa-ref-live-flow__packet--trail">
                      <animateMotion
                        dur="1.35s"
                        repeatCount="indefinite"
                        begin="0.25s"
                        path={`M ${x + 5} ${FLOW_Y} L ${midX} ${FLOW_Y + 5} L ${x2 - 5} ${FLOW_Y}`}
                        calcMode="linear"
                      />
                    </circle>
                  </>
                ) : null}
              </g>
            );
          })}

          {NODE_X.map((x, i) => {
            const state = stageState(i, resolvedStage);
            return (
              <g key={`node-${i}`}>
                {state === "active" && animate ? (
                  <circle
                    cx={x}
                    cy={FLOW_Y}
                    r="8"
                    className="qa-ref-live-flow__node-ring"
                  />
                ) : null}
                <circle
                  cx={x}
                  cy={FLOW_Y}
                  r={state === "active" ? 4.5 : 3.5}
                  className={`qa-ref-live-flow__node qa-ref-live-flow__node--${state}`}
                />
              </g>
            );
          })}
        </svg>

        <ol className="qa-ref-live-flow__stages" aria-label="Processing pipeline">
          {LIVE_STAGES.map((stage, i) => {
            const state = stageState(i, resolvedStage);
            return (
              <li
                key={stage.id}
                className={`qa-ref-live-flow__stage qa-ref-live-flow__stage--${state}`}
                aria-current={state === "active" ? "step" : undefined}
              >
                <span className="qa-ref-live-flow__stage-label">{stage.label}</span>
                {state === "active" && animate ? (
                  <span className="qa-ref-live-flow__stage-scan" aria-hidden />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
