/**
 * Phase 6 — Style signal resolver (minimalist / luxury / gamer / professional).
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { AestheticAxisScores } from "../types";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function resolveStyleSignals(args: {
  query: string;
  sessionMemory: CommerceSessionMemoryV1;
  styleTags: string[];
}): AestheticAxisScores {
  const q = args.query.toLowerCase();
  const tags = new Set([...args.styleTags, ...args.sessionMemory.styleTags].map((t) => t.toLowerCase()));

  let minimalist01 = 0.2;
  let luxury01 = 0.2;
  let gamer01 = 0.15;
  let professional01 = 0.2;

  if (/\b(minimal|scandi|clean|simple|uncluttered)\b/.test(q)) minimalist01 += 0.45;
  if (/\b(luxury|premium|designer|boutique|rolex|hermes)\b/.test(q)) luxury01 += 0.5;
  if (/\b(gaming|gamer|rgb|rtx|playstation|xbox|steam)\b/.test(q)) gamer01 += 0.55;
  if (/\b(office|business|professional|productivity|workstation)\b/.test(q)) professional01 += 0.45;

  for (const t of tags) {
    if (/minimal|scandi|clean/.test(t)) minimalist01 += 0.25;
    if (/luxury|premium|quiet/.test(t)) luxury01 += 0.25;
    if (/gamer|gaming|rgb/.test(t)) gamer01 += 0.3;
    if (/professional|productivity|office/.test(t)) professional01 += 0.25;
  }

  for (const p of args.sessionMemory.aestheticsRecurring) {
    if (/minimal/.test(p)) minimalist01 += 0.15;
    if (/luxury|premium/.test(p)) luxury01 += 0.15;
    if (/gamer|gaming/.test(p)) gamer01 += 0.15;
    if (/professional|productivity/.test(p)) professional01 += 0.15;
  }

  return {
    minimalist01: round4(clamp01(minimalist01)),
    luxury01: round4(clamp01(luxury01)),
    gamer01: round4(clamp01(gamer01)),
    professional01: round4(clamp01(professional01)),
  };
}
