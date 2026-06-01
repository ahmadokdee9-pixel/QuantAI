"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import type { QuantProduct } from "@/lib/shoppingScore";

const NETWORK_STATS = [
  { label: "Retail Sources", value: "420+" },
  { label: "Active Market Scans", value: "142" },
  { label: "Commerce Networks", value: "14" },
  { label: "Pricing Signals", value: "8.6B" },
] as const;

const MESH = { x: 480, y: 228 } as const;

const RETAILERS = [
  { id: "amazon", label: "Amazon", x: 105, y: 188 },
  { id: "apple", label: "Apple", x: 175, y: 95 },
  { id: "ikea", label: "IKEA", x: 368, y: 72 },
  { id: "mediamarkt", label: "MediaMarkt", x: 458, y: 62 },
  { id: "bol", label: "Bol", x: 548, y: 68 },
  { id: "coolblue", label: "Coolblue", x: 642, y: 98 },
  { id: "samsung", label: "Samsung", x: 755, y: 115 },
  { id: "dell", label: "Dell", x: 855, y: 195 },
  { id: "lenovo", label: "Lenovo", x: 848, y: 278 },
  { id: "zara", label: "Zara", x: 728, y: 355 },
  { id: "adidas", label: "Adidas", x: 268, y: 362 },
  { id: "nike", label: "Nike", x: 122, y: 302 },
] as const;

const ANNOTATIONS = [
  { id: "trust", label: "Trust Signals", left: 7, top: 20 },
  { id: "price", label: "Pricing Signals", left: 74, top: 10 },
  { id: "inventory", label: "Inventory Signals", left: 84, top: 56 },
  { id: "seller", label: "Seller Reliability", left: 5, top: 50 },
  { id: "context", label: "Market Context", left: 36, top: 76 },
] as const;

const FLOW_STAGES = [
  "Retailers",
  "Commerce Networks",
  "QuantAI Intelligence Layer",
  "Decision Engine",
] as const;

function meshPath(x: number, y: number, cx: number, cy: number): string {
  const mx = (x + cx) / 2;
  const my = (y + cy) / 2 - (x < cx ? 12 : x > cx ? 8 : 6);
  return `M ${x} ${y} Q ${mx} ${my} ${cx} ${cy}`;
}

const INFLOW = RETAILERS.map((r, i) => ({
  id: r.id,
  d: meshPath(r.x, r.y, MESH.x, MESH.y),
  delay: i * 0.75,
  dur: 10 + i * 0.5,
}));

type Props = {
  variant?: "network" | "scan";
  products?: QuantProduct[];
  className?: string;
};

/** Global commerce infrastructure — mesh network visualization. */
export default function CommerceCoveragePanel({
  variant = "network",
  products = [],
  className = "",
}: Props) {
  const reduceMotion = useReducedMotion();
  const liveScan = variant === "scan" && products.length >= 3;

  const scanStoreSet = useMemo(() => {
    if (!liveScan) return new Set<string>();
    return new Set(products.map((p) => p.store).filter(Boolean));
  }, [liveScan, products]);

  const stats = liveScan
    ? [
        { label: "Retailers in scan", value: String(scanStoreSet.size) },
        { label: "Listings analyzed", value: String(products.length) },
        { label: "Commerce networks", value: "14" },
        { label: "Pricing signals", value: "8.6B" },
      ]
    : NETWORK_STATS;

  return (
    <section
      className={`qa-ref-coverage${className ? ` ${className}` : ""}${reduceMotion ? "" : " qa-ref-coverage--live"}`}
      aria-label="Global commerce infrastructure network"
    >
      <header className="qa-ref-coverage__head">
        <p className="qa-ref-kicker qa-ref-coverage__kicker">Global commerce infrastructure</p>
        <h2 className="qa-ref-coverage__title">
          {liveScan ? "Commerce mesh" : "Connected To Global Retail Infrastructure"}
        </h2>
        {!liveScan && (
          <p className="qa-ref-coverage__subhead">
            QuantAI continuously monitors pricing, trust, inventory, seller reliability and market signals
            across hundreds of commerce ecosystems.
          </p>
        )}
      </header>

      <dl className="qa-ref-coverage__stats">
        {stats.map((stat) => (
          <div key={stat.label} className="qa-ref-coverage__stat">
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="qa-ref-coverage__mesh" aria-label="QuantAI commerce mesh network">
        <svg
          className="qa-ref-coverage__canvas"
          viewBox="0 0 960 440"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            <radialGradient id="qa-ref-coverage-mesh-glow" cx="50%" cy="48%" r="40%">
              <stop offset="0%" stopColor="#2a2668" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#2a2668" stopOpacity="0" />
            </radialGradient>
            <filter id="qa-ref-coverage-soft" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>

          <rect width="960" height="440" fill="url(#qa-ref-coverage-mesh-glow)" />

          <g className="qa-ref-coverage__grid" opacity="0.35">
            {[160, 320, 480, 640, 800].map((x) => (
              <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="440" stroke="rgba(42,38,104,0.04)" strokeWidth="1" />
            ))}
            {[110, 220, 330].map((y) => (
              <line key={`h-${y}`} x1="0" y1={y} x2="960" y2={y} stroke="rgba(42,38,104,0.04)" strokeWidth="1" />
            ))}
          </g>

          {INFLOW.map((route) => (
            <path
              key={`glow-${route.id}`}
              d={route.d}
              className="qa-ref-coverage__link-glow"
              filter="url(#qa-ref-coverage-soft)"
              fill="none"
            />
          ))}

          {INFLOW.map((route) => (
            <path
              key={route.id}
              d={route.d}
              className={`qa-ref-coverage__link${reduceMotion ? "" : " qa-ref-coverage__link--live"}`}
              style={{ animationDelay: `${route.delay}s` }}
              fill="none"
            />
          ))}

          {!reduceMotion &&
            INFLOW.flatMap((route) =>
              [0, 1].map((p) => (
                <circle key={`${route.id}-p-${p}`} r={p === 0 ? 2.2 : 1.6} fill="#2a2668" opacity={0.38 - p * 0.08}>
                  <animateMotion
                    dur={`${route.dur + p * 0.8}s`}
                    repeatCount="indefinite"
                    path={route.d}
                    begin={`${route.delay + p * 1.1}s`}
                    calcMode="linear"
                  />
                </circle>
              )),
            )}

          <circle cx={MESH.x} cy={MESH.y} r="92" fill="rgba(42,38,104,0.05)" className="qa-ref-coverage__core-aura" />
          <circle cx={MESH.x} cy={MESH.y} r="58" fill="rgba(42,38,104,0.08)" className="qa-ref-coverage__core-aura qa-ref-coverage__core-aura--inner" />

          {RETAILERS.map((r) => (
            <circle key={`dot-${r.id}`} cx={r.x} cy={r.y} r="3" fill="#2a2668" opacity="0.55" />
          ))}
        </svg>

        {ANNOTATIONS.map((note, i) => (
          <span
            key={note.id}
            className="qa-ref-coverage__annotation"
            style={{
              left: `${note.left}%`,
              top: `${note.top}%`,
              animationDelay: `${i * 0.65}s`,
            }}
          >
            {note.label}
          </span>
        ))}

        {RETAILERS.map((retailer) => (
          <div
            key={retailer.id}
            className={`qa-ref-coverage__retail-node${
              scanStoreSet.has(retailer.label) ? " qa-ref-coverage__retail-node--active" : ""
            }`}
            style={{ left: `${(retailer.x / 960) * 100}%`, top: `${(retailer.y / 440) * 100}%` }}
          >
            <span className="qa-ref-coverage__retail-dot" aria-hidden />
            <span className="qa-ref-coverage__retail-name">{retailer.label}</span>
          </div>
        ))}

        <div className="qa-ref-coverage__core">
          <div className="qa-ref-coverage__core-ring" aria-hidden />
          <p className="qa-ref-coverage__core-title">QuantAI Commerce Mesh</p>
          <p className="qa-ref-coverage__core-sub">Global commerce signal aggregation layer</p>
          {!reduceMotion && (
            <span className="qa-ref-coverage__core-live">
              <span className="qa-ref-coverage__core-live-dot" aria-hidden />
              Aggregating
            </span>
          )}
        </div>

        <div className="qa-ref-coverage__pipeline" aria-hidden>
          {FLOW_STAGES.map((stage, i) => (
            <span key={stage} className="qa-ref-coverage__pipeline-stage">
              {stage}
              {i < FLOW_STAGES.length - 1 && <span className="qa-ref-coverage__pipeline-arrow" />}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
