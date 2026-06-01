"use client";

/** Ambient commerce intelligence field — mesh tones, signal grid, network routes. */
const MICRO_LABELS = [
  "Commerce Mesh",
  "Trust Signals",
  "Pricing Signals",
  "Inventory Signals",
  "Market Context",
  "Seller Intelligence",
  "Decision Confidence",
  "Infrastructure Sync",
  "Executive Verdict",
] as const;

const NETWORK_NODES = [
  { cx: 180, cy: 140 },
  { cx: 420, cy: 95 },
  { cx: 680, cy: 130 },
  { cx: 920, cy: 180 },
  { cx: 540, cy: 220 },
] as const;

const FLOATING_MARKERS = [
  { x: "12%", y: "22%", delay: "0s" },
  { x: "78%", y: "18%", delay: "1.2s" },
  { x: "64%", y: "58%", delay: "2.4s" },
  { x: "28%", y: "68%", delay: "0.8s" },
  { x: "88%", y: "42%", delay: "1.8s" },
] as const;

export default function HeroAmbientField() {
  return (
    <div className="qa-ref-hero-atmo pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="qa-ref-hero-atmo__depth" />
      <div className="qa-ref-hero-atmo__mesh" />
      <div className="qa-ref-hero-atmo__grid qa-ref-hero-atmo__grid--animated" />
      <svg className="qa-ref-hero-atmo__infra" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g fill="none" stroke="rgba(42, 38, 104, 0.055)" strokeWidth="1">
          {[240, 480, 720, 960].map((x) => (
            <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="400" strokeDasharray="1 12" />
          ))}
          {[80, 160, 240, 320].map((y) => (
            <line key={`h-${y}`} x1="0" y1={y} x2="1200" y2={y} strokeDasharray="1 14" opacity="0.7" />
          ))}
          <path d="M 600 20 L 600 380" stroke="rgba(42, 38, 104, 0.07)" strokeDasharray="2 10" />
          <path d="M 120 200 C 360 140, 840 140, 1080 200" stroke="rgba(42, 38, 104, 0.05)" />
          <path d="M 80 280 C 320 320, 880 320, 1120 280" stroke="rgba(42, 38, 104, 0.04)" />
        </g>
        <g fill="rgba(42, 38, 104, 0.1)">
          {[
            [240, 160],
            [480, 80],
            [720, 240],
            [960, 160],
            [600, 200],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" />
          ))}
        </g>
      </svg>
      <div className="qa-ref-hero-atmo__scan" />
      <div className="qa-ref-hero-atmo__scan qa-ref-hero-atmo__scan--secondary" />
      <div className="qa-ref-hero-atmo__pulse-ring" />
      <div className="qa-ref-hero-atmo__glow qa-ref-hero-atmo__glow--violet" />
      <div className="qa-ref-hero-atmo__glow qa-ref-hero-atmo__glow--pink" />
      <div className="qa-ref-hero-atmo__glow qa-ref-hero-atmo__glow--radial" />
      <ul className="qa-ref-hero-atmo__micro-labels">
        {MICRO_LABELS.map((label, i) => (
          <li key={label} className={`qa-ref-hero-atmo__micro-label qa-ref-hero-atmo__micro-label--${(i % 9) + 1}`}>
            {label}
          </li>
        ))}
      </ul>
      <ul className="qa-ref-hero-atmo__markers">
        {FLOATING_MARKERS.map((m, i) => (
          <li
            key={i}
            className="qa-ref-hero-atmo__marker"
            style={{ left: m.x, top: m.y, animationDelay: m.delay }}
          />
        ))}
      </ul>
      <ul className="qa-ref-hero-atmo__particles">
        {Array.from({ length: 18 }).map((_, i) => (
          <li key={i} className={`qa-ref-hero-atmo__dot qa-ref-hero-atmo__dot--${(i % 7) + 1}`} />
        ))}
      </ul>
      <svg className="qa-ref-hero-atmo__routes" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="qa-ref-route" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2a2668" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#151238" stopOpacity="0.22" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#qa-ref-route)" strokeWidth="1" opacity="0.5">
          <path d="M 60 160 C 200 100, 400 80, 600 120 S 900 140, 1100 100" className="qa-ref-route-line" />
          <path d="M 100 260 C 280 220, 480 200, 680 230 S 980 250, 1150 220" className="qa-ref-route-line qa-ref-route-line--delay" />
          <path d="M 200 80 C 350 110, 500 90, 720 130" className="qa-ref-route-line qa-ref-route-line--delay2" />
          <path d="M 180 140 L 420 95 L 680 130 L 920 180" className="qa-ref-route-line qa-ref-route-line--mesh" opacity="0.35" />
          <path d="M 420 95 L 540 220 L 680 130" className="qa-ref-route-line qa-ref-route-line--mesh" opacity="0.28" />
        </g>
        {NETWORK_NODES.map((node, i) => (
          <circle
            key={i}
            cx={node.cx}
            cy={node.cy}
            r={i === 2 ? 3.5 : 2.5}
            fill="#2a2668"
            opacity={i === 2 ? 0.28 : 0.18}
          />
        ))}
      </svg>
    </div>
  );
}
