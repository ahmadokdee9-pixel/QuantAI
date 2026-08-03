"use client";

/**
 * Living Intelligence Presence — real Decision Memory / Feed / Mission signals only.
 * Replaces marketing metric nodes on the homepage without redesigning the hero.
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";
import {
  buildLocalLivingPresence,
  mergeServerPresenceHints,
  type LivingPresenceSnapshot,
  type PresenceLine,
} from "@/lib/decisionMemory/livingPresence";

type Props = {
  /** Full node grid (hero metrics row) or compact console chip + ticker. */
  variant?: "nodes" | "console" | "strip";
  /** Bump to refresh after Instant Decision persists. */
  refreshKey?: string | number;
};

function lineClass(tone: PresenceLine["tone"]): string {
  if (tone === "live") return "qa-living-presence__line--live";
  if (tone === "alert") return "qa-living-presence__line--alert";
  if (tone === "idle") return "qa-living-presence__line--idle";
  return "qa-living-presence__line--calm";
}

export default function LivingIntelligencePresence({
  variant = "nodes",
  refreshKey = 0,
}: Props) {
  const { isSignedIn } = useAuth();
  const reduceMotion = useReducedMotion();
  const [presence, setPresence] = useState<LivingPresenceSnapshot | null>(null);
  const [lineIndex, setLineIndex] = useState(0);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      void (async () => {
        let snap = buildLocalLivingPresence();
        if (isSignedIn) {
          try {
            const [memRes, watchRes, updRes, feedRes, misRes] = await Promise.all([
              fetch("/api/intelligence/decision-memory?limit=80", { credentials: "same-origin" }),
              fetch("/api/intelligence/decision-memory?watched=1", { credentials: "same-origin" }),
              fetch("/api/intelligence/decision-updates", { credentials: "same-origin" }),
              fetch("/api/intelligence/decision-feed?limit=40", { credentials: "same-origin" }),
              fetch("/api/intelligence/missions", { credentials: "same-origin" }),
            ]);
            const mem = await readApiJson<{ items?: unknown[] }>(memRes);
            const watch = await readApiJson<{ items?: unknown[] }>(watchRes);
            const upd = await readApiJson<{ items?: unknown[] }>(updRes);
            const feed = await readApiJson<{ counts?: { critical?: number } }>(feedRes);
            const mis = await readApiJson<{ totals?: { activeMissions?: number } }>(misRes);

            snap = mergeServerPresenceHints(snap, {
              episodeCount:
                !isApiFailure(mem) && Array.isArray(mem.data?.items)
                  ? mem.data.items.length
                  : undefined,
              watchedCount:
                !isApiFailure(watch) && Array.isArray(watch.data?.items)
                  ? watch.data.items.length
                  : undefined,
              updatesCount:
                !isApiFailure(upd) && Array.isArray(upd.data?.items)
                  ? upd.data.items.length
                  : undefined,
              feedCritical:
                !isApiFailure(feed) && typeof feed.data?.counts?.critical === "number"
                  ? feed.data.counts.critical
                  : undefined,
              activeMissions:
                !isApiFailure(mis) && typeof mis.data?.totals?.activeMissions === "number"
                  ? mis.data.totals.activeMissions
                  : undefined,
            });
          } catch {
            // Local presence already valid.
          }
        }
        setPresence(snap);
        setLineIndex(0);
      })();
    });
  }, [isSignedIn, refreshKey]);

  const lines = presence?.lines ?? [];

  useEffect(() => {
    if (reduceMotion || lines.length <= 1) return;
    const id = window.setInterval(() => {
      setLineIndex((i) => (i + 1) % lines.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [lines.length, reduceMotion]);

  const activeLine = lines[lineIndex] ?? lines[0] ?? null;

  const nodes = useMemo(() => presence?.nodes ?? [], [presence]);

  if (variant === "console") {
    return (
      <div className="qa-living-presence qa-living-presence--console" aria-live="polite">
        <span className="qa-living-presence__dot" aria-hidden />
        <span className="qa-living-presence__kicker">
          {presence?.statusKicker || "Intelligence Engine"}
        </span>
        {activeLine ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={activeLine.id + activeLine.text}
              className={`qa-living-presence__line ${lineClass(activeLine.tone)}`}
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: reduceMotion ? 0 : 0.28 }}
            >
              {activeLine.text}
            </motion.span>
          </AnimatePresence>
        ) : null}
      </div>
    );
  }

  if (variant === "strip") {
    if (!activeLine) return null;
    return (
      <div className="qa-living-presence qa-living-presence--strip" aria-live="polite">
        <span className="qa-living-presence__dot" aria-hidden />
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={activeLine.id + activeLine.text}
            className={`qa-living-presence__line ${lineClass(activeLine.tone)}`}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
          >
            {activeLine.text}
          </motion.p>
        </AnimatePresence>
      </div>
    );
  }

  // nodes — same seat as former IntelligenceMetricCards nodes
  return (
    <div className="qa-living-presence qa-living-presence--nodes" aria-label="Living intelligence">
      <div className="qa-ref-metrics qa-ref-metrics--nodes">
        {nodes.map((node) => (
          <article
            key={node.id}
            className={`qa-ref-sys-node${node.pulse ? " qa-living-presence__node--pulse" : ""}`}
          >
            <p className="qa-ref-sys-node__label">{node.label}</p>
            <p className="qa-ref-sys-node__value">{node.value}</p>
            <p className="qa-ref-sys-node__meta">{node.meta}</p>
          </article>
        ))}
      </div>
      {activeLine ? (
        <div className="qa-living-presence__ticker" aria-live="polite">
          <span className="qa-living-presence__dot" aria-hidden />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={activeLine.id + activeLine.text}
              className={`qa-living-presence__line ${lineClass(activeLine.tone)}`}
              initial={reduceMotion ? false : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -3 }}
              transition={{ duration: reduceMotion ? 0 : 0.3 }}
            >
              {activeLine.text}
            </motion.span>
          </AnimatePresence>
        </div>
      ) : null}
    </div>
  );
}
