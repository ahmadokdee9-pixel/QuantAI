"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

const SIGNALS = [
  { id: "trust", label: "Trust", x: 64 },
  { id: "price", label: "Price", x: 176 },
  { id: "inventory", label: "Inventory", x: 288 },
  { id: "context", label: "Market", x: 400 },
] as const;

const MESH_SATELLITES = [
  { x: 520, y: 28 },
  { x: 612, y: 38 },
  { x: 648, y: 72 },
  { x: 520, y: 88 },
  { x: 612, y: 92 },
  { x: 568, y: 18 },
] as const;

const FLOW_Y = 58;
const HUB = { x: 568, y: FLOW_Y } as const;
const ENGINE = { x: 728, y: FLOW_Y } as const;
const VERDICT = { x: 872, y: FLOW_Y } as const;

function signalPath(sx: number): string {
  const { x: cx, y: cy } = HUB;
  const mx = (sx + cx) / 2;
  return `M ${sx + 14} ${cy} C ${mx} ${cy - 16}, ${mx + 18} ${cy}, ${cx - 32} ${cy}`;
}

const SIGNAL_ROUTES = SIGNALS.map((s) => ({
  id: s.id,
  d: signalPath(s.x),
}));

const HUB_TO_ENGINE = `M ${HUB.x + 24} ${HUB.y} L ${ENGINE.x - 22} ${ENGINE.y}`;
const ENGINE_TO_VERDICT = `M ${ENGINE.x + 22} ${ENGINE.y} L ${VERDICT.x - 18} ${VERDICT.y}`;

/** Live commerce mesh — signals converging through mesh to synthesis and verdict. */
export default function HeroIntelligenceCanvas() {
  const reduceMotion = useReducedMotion();
  const [activeSignal, setActiveSignal] = useState(0);
  const animate = !reduceMotion;

  useEffect(() => {
    if (!animate) return;
    const id = window.setInterval(() => {
      setActiveSignal((i) => (i + 1) % (SIGNALS.length + 2));
    }, 2600);
    return () => window.clearInterval(id);
  }, [animate]);

  const trunkActive = activeSignal >= SIGNALS.length;
  const verdictActive = activeSignal === SIGNALS.length + 1;

  return (
    <aside className="qa-ref-hero-canvas" aria-label="Commerce intelligence mesh">
      <div className="qa-ref-hero-canvas__head">
        <span className="qa-ref-hero-canvas__pulse" aria-hidden />
        <p className="qa-ref-hero-canvas__kicker">Live intelligence network</p>
        <span className="qa-ref-hero-canvas__status">Signal flow active</span>
      </div>

      <svg
        className="qa-ref-hero-canvas__svg"
        viewBox="0 0 920 132"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <linearGradient id="qa-ref-hero-canvas-flow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2a2668" stopOpacity="0.06" />
            <stop offset="45%" stopColor="#2a2668" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#2a2668" stopOpacity="0.06" />
          </linearGradient>
          <radialGradient id="qa-ref-hero-canvas-hub-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2a2668" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#2a2668" stopOpacity="0" />
          </radialGradient>
          <filter id="qa-ref-hero-canvas-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="920" height="132" fill="url(#qa-ref-hero-canvas-flow)" rx="10" />

        <g className="qa-ref-hero-canvas__grid" opacity="0.35">
          {[160, 320, 480, 640, 800].map((x) => (
            <line key={`v-${x}`} x1={x} y1="8" x2={x} y2="124" stroke="rgba(42,38,104,0.05)" strokeWidth="1" />
          ))}
        </g>

        {SIGNAL_ROUTES.map((route, i) => (
          <path
            key={route.id}
            d={route.d}
            className={`qa-ref-hero-canvas__route${i === activeSignal ? " qa-ref-hero-canvas__route--active" : i < activeSignal ? " qa-ref-hero-canvas__route--done" : ""}${animate ? " qa-ref-hero-canvas__route--live" : ""}`}
            fill="none"
          />
        ))}

        <path
          d={HUB_TO_ENGINE}
          className={`qa-ref-hero-canvas__route qa-ref-hero-canvas__route--trunk${trunkActive && !verdictActive ? " qa-ref-hero-canvas__route--active" : activeSignal > SIGNALS.length ? " qa-ref-hero-canvas__route--done" : ""}${animate ? " qa-ref-hero-canvas__route--live" : ""}`}
          fill="none"
        />
        <path
          d={ENGINE_TO_VERDICT}
          className={`qa-ref-hero-canvas__route qa-ref-hero-canvas__route--trunk${verdictActive ? " qa-ref-hero-canvas__route--active" : ""}${animate ? " qa-ref-hero-canvas__route--live" : ""}`}
          fill="none"
        />

        {MESH_SATELLITES.map((node, i) => (
          <line
            key={`mesh-link-${i}`}
            x1={HUB.x}
            y1={HUB.y}
            x2={node.x}
            y2={node.y}
            className="qa-ref-hero-canvas__mesh-link"
            strokeWidth="0.75"
          />
        ))}

        {animate &&
          SIGNAL_ROUTES.map((route, i) =>
            i === activeSignal ? (
              <circle key={`p-${route.id}`} r="2.4" className="qa-ref-hero-canvas__packet" filter="url(#qa-ref-hero-canvas-glow)">
                <animateMotion dur="1.35s" repeatCount="indefinite" path={route.d} calcMode="linear" />
              </circle>
            ) : null,
          )}

        {animate && trunkActive && !verdictActive && (
          <circle r="2.2" className="qa-ref-hero-canvas__packet">
            <animateMotion dur="1.05s" repeatCount="indefinite" path={HUB_TO_ENGINE} calcMode="linear" />
          </circle>
        )}

        {animate && verdictActive && (
          <circle r="2.2" className="qa-ref-hero-canvas__packet">
            <animateMotion dur="0.95s" repeatCount="indefinite" path={ENGINE_TO_VERDICT} calcMode="linear" />
          </circle>
        )}

        {SIGNALS.map((signal, i) => (
          <g key={signal.id}>
            <circle
              cx={signal.x}
              cy={FLOW_Y}
              r={i === activeSignal ? 4.5 : 3.5}
              className={`qa-ref-hero-canvas__node qa-ref-hero-canvas__node--signal${i <= activeSignal ? " qa-ref-hero-canvas__node--lit" : ""}${i === activeSignal ? " qa-ref-hero-canvas__node--active" : ""}`}
            />
            <text x={signal.x} y={FLOW_Y + 24} className="qa-ref-hero-canvas__label">
              {signal.label}
            </text>
          </g>
        ))}

        <circle cx={HUB.x} cy={HUB.y} r="44" fill="url(#qa-ref-hero-canvas-hub-glow)" />
        <circle cx={HUB.x} cy={HUB.y} r="34" className="qa-ref-hero-canvas__hub-aura" />
        <circle cx={HUB.x} cy={HUB.y} r="22" className="qa-ref-hero-canvas__hub-ring" fill="none" />
        <circle cx={HUB.x} cy={HUB.y} r="14" className="qa-ref-hero-canvas__hub-ring qa-ref-hero-canvas__hub-ring--inner" fill="none" />
        <circle
          cx={HUB.x}
          cy={HUB.y}
          r="6"
          className={`qa-ref-hero-canvas__node qa-ref-hero-canvas__node--hub${trunkActive || activeSignal >= SIGNALS.length - 1 ? " qa-ref-hero-canvas__node--active" : ""}`}
        />

        {MESH_SATELLITES.map((node, i) => (
          <circle key={`sat-${i}`} cx={node.x} cy={node.y} r="2.2" className="qa-ref-hero-canvas__mesh-node" />
        ))}

        <text x={HUB.x} y={FLOW_Y + 34} className="qa-ref-hero-canvas__label qa-ref-hero-canvas__label--hub">
          Commerce mesh
        </text>

        <circle
          cx={ENGINE.x}
          cy={ENGINE.y}
          r="5"
          className={`qa-ref-hero-canvas__node qa-ref-hero-canvas__node--engine${trunkActive ? " qa-ref-hero-canvas__node--active" : ""}`}
        />
        <text x={ENGINE.x} y={FLOW_Y + 24} className="qa-ref-hero-canvas__label qa-ref-hero-canvas__label--engine">
          Decision synthesis
        </text>

        <circle
          cx={VERDICT.x}
          cy={VERDICT.y}
          r="4.5"
          className={`qa-ref-hero-canvas__node qa-ref-hero-canvas__node--verdict${verdictActive ? " qa-ref-hero-canvas__node--active" : ""}`}
        />
        <text x={VERDICT.x} y={FLOW_Y + 24} className="qa-ref-hero-canvas__label qa-ref-hero-canvas__label--verdict">
          Executive verdict
        </text>
      </svg>
    </aside>
  );
}
