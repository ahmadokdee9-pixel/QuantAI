"use client";

import { Activity, Brain, Radar, Shield } from "lucide-react";

const METRICS = [
  {
    label: "Trusted Retail Sources",
    value: "420+",
    story: "Global commerce mesh — vetted before synthesis",
    delta: "Mesh",
    icon: Shield,
    tone: "slate" as const,
  },
  {
    label: "Decision Confidence Accuracy",
    value: "98.7%",
    story: "Institutional verdict precision at scale",
    delta: "Engine",
    icon: Brain,
    tone: "violet" as const,
  },
  {
    label: "Pricing Signals Processed",
    value: "8.6B",
    story: "Live price integrity across retail networks",
    delta: "Signals",
    icon: Activity,
    tone: "slate" as const,
  },
  {
    label: "Live Market Scans",
    value: "142",
    story: "Active intelligence runs in production",
    delta: "Live",
    icon: Radar,
    tone: "violet" as const,
  },
] as const;

const SYSTEM_NODES = [
  { label: "Trusted Sources", value: "420+", meta: "Global commerce mesh" },
  { label: "Decision Accuracy", value: "98.7%", meta: "Verdict precision" },
  { label: "Signals Processed", value: "8.6B", meta: "Live price integrity" },
  { label: "Live Market Scans", value: "142", meta: "Active production runs" },
] as const;

type IntelligenceMetricCardsProps = {
  variant?: "cards" | "nodes";
};

export default function IntelligenceMetricCards({ variant = "cards" }: IntelligenceMetricCardsProps) {
  if (variant === "nodes") {
    return (
      <div className="qa-ref-metrics qa-ref-metrics--nodes" aria-label="System intelligence nodes">
        {SYSTEM_NODES.map((node) => (
          <article key={node.label} className="qa-ref-sys-node">
            <p className="qa-ref-sys-node__label">{node.label}</p>
            <p className="qa-ref-sys-node__value">{node.value}</p>
            <p className="qa-ref-sys-node__meta">{node.meta}</p>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="qa-ref-metrics qa-ref-metrics--intel" aria-label="Commerce intelligence metrics">
      {METRICS.map((m) => (
        <article key={m.label} className={`qa-ref-metric qa-ref-metric--${m.tone}`}>
          <div className="qa-ref-metric__icon">
            <m.icon className="size-[18px]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="qa-ref-metric__body">
            <p className="qa-ref-metric__label">{m.label}</p>
            <p className="qa-ref-metric__value">{m.value}</p>
            <p className="qa-ref-metric__story">{m.story}</p>
          </div>
          <span className="qa-ref-metric__delta">{m.delta}</span>
          <div className="qa-ref-metric__spark" aria-hidden />
        </article>
      ))}
    </div>
  );
}
