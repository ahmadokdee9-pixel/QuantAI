"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Target,
} from "lucide-react";
import { isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";
import {
  getLocalMission,
  updateLocalMission,
  updateLocalMissionDecision,
} from "@/lib/missions/clientMissions";
import { groupDecisions } from "@/lib/missions/intelligence";
import { briefHrefForDecision } from "@/lib/missions/templates";
import type {
  Mission,
  MissionDecisionItem,
  MissionDecisionStatus,
  MissionIntelligence,
} from "@/lib/missions/types";

function formatMoney(n: number | null | undefined, currency = "EUR") {
  if (n == null || !Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${Math.round(n)} ${currency}`;
  }
}

function healthTone(h: MissionIntelligence["missionHealth"]) {
  if (h === "strong") return "text-emerald-300";
  if (h === "at_risk") return "text-rose-300";
  if (h === "stable") return "text-cyan-200";
  return "text-slate-400";
}

type EnrichedMission = Mission & { intelligence: MissionIntelligence };

export default function MissionDetailView({ missionId }: { missionId: string }) {
  const { isSignedIn } = useAuth();
  const [mission, setMission] = useState<EnrichedMission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          if (isSignedIn) {
            const res = await fetch(`/api/intelligence/missions/${missionId}`, {
              credentials: "same-origin",
            });
            const parsed = await readApiJson<{ mission: EnrichedMission }>(res);
            if (!isApiFailure(parsed) && parsed.data?.mission) {
              setMission(parsed.data.mission);
            } else {
              const local = getLocalMission(missionId);
              setMission(local);
              if (!local) setError("Mission not found");
            }
          } else {
            const local = getLocalMission(missionId);
            setMission(local);
            if (!local) setError("Mission not found");
          }
        } catch {
          const local = getLocalMission(missionId);
          setMission(local);
          if (!local) setError("Mission not found");
        } finally {
          setLoading(false);
        }
      })();
    });
  }, [isSignedIn, missionId]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(
    () => (mission ? groupDecisions(mission.decisions) : []),
    [mission]
  );

  const setDecisionStatus = async (
    decision: MissionDecisionItem,
    status: MissionDecisionStatus
  ) => {
    if (isSignedIn) {
      const res = await fetch(`/api/intelligence/missions/decisions/${decision.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const parsed = await readApiJson<{ decision?: MissionDecisionItem }>(res);
      if (!isApiFailure(parsed)) {
        load();
        return;
      }
    }
    updateLocalMissionDecision(decision.id, { status });
    load();
  };

  const setMissionStatus = async (status: Mission["status"]) => {
    if (isSignedIn) {
      await fetch(`/api/intelligence/missions/${missionId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      load();
      return;
    }
    updateLocalMission(missionId, { status });
    load();
  };

  if (loading && !mission) {
    return (
      <div className="cockpit-glass-panel qa-premium-surface flex items-center gap-3 p-8 text-slate-400">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        Loading mission…
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="cockpit-glass-panel qa-premium-surface p-8">
        <p className="text-sm text-rose-300">{error || "Mission not found"}</p>
        <Link href="/agent" className="mt-4 inline-block text-sm font-semibold text-cyan-200">
          Back to Decision Agent
        </Link>
      </div>
    );
  }

  const intel = mission.intelligence;

  return (
    <div className="cockpit-glass-panel qa-premium-surface p-6 sm:p-8">
      <Link
        href="/agent"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Decision Agent
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex size-12 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/10">
            <Target className="size-6 text-cyan-200" aria-hidden />
          </div>
          <h1 className="cockpit-display mt-5 text-2xl text-white sm:text-3xl">{mission.title}</h1>
          {mission.goal ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">{mission.goal}</p>
          ) : null}
        </div>
        <div className="text-right text-xs text-slate-400">
          <p className={`text-sm font-semibold capitalize ${healthTone(intel.missionHealth)}`}>
            {intel.missionHealth.replace("_", " ")}
          </p>
          <p className="mt-1">{mission.status}</p>
          {pending ? <Loader2 className="ml-auto mt-2 size-4 animate-spin" /> : null}
        </div>
      </div>

      <section className="mt-8" aria-label="Mission intelligence">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
          Mission intelligence
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Completion" value={`${intel.completionPct}%`} />
          <Stat
            label="Confidence"
            value={intel.overallConfidence != null ? `${intel.overallConfidence}%` : "—"}
          />
          <Stat
            label="Expected savings"
            value={formatMoney(intel.estimatedSavings, mission.currency)}
          />
          <Stat
            label="Budget remaining"
            value={formatMoney(intel.moneyRemaining, mission.currency)}
          />
          <Stat label="Pending" value={String(intel.pendingCount)} />
          <Stat label="Completed" value={String(intel.completedCount)} />
          <Stat label="Critical alerts" value={String(intel.criticalAlerts)} />
          <Stat
            label="Tracked spend"
            value={formatMoney(intel.moneySpentTracked, mission.currency)}
          />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <Insight
            title="Biggest risk"
            body={
              intel.highestRiskDecision
                ? `${intel.highestRiskDecision.title} — ${intel.highestRiskDecision.reason}`
                : "No elevated risk from Living Decisions yet."
            }
            tone="risk"
          />
          <Insight
            title="Best opportunity today"
            body={
              intel.bestOpportunityToday
                ? `${intel.bestOpportunityToday.title} — ${intel.bestOpportunityToday.reason}`
                : "Run Instant Decision on pending items to surface opportunities."
            }
            tone="ok"
          />
          <Insight
            title="Most urgent action"
            body={
              intel.mostUrgentAction
                ? `${intel.mostUrgentAction.title} — ${intel.mostUrgentAction.reason}`
                : "No urgent action queued."
            }
            tone="urgent"
          />
        </div>
      </section>

      {(intel.todaysOpportunities.length > 0 ||
        intel.upcomingDecisions.length > 0 ||
        intel.recentChanges.length > 0) && (
        <section className="mt-8 grid gap-4 lg:grid-cols-3" aria-label="Mission signals">
          <SignalList
            title="Today's opportunities"
            items={intel.todaysOpportunities.map((o) => `${o.title}: ${o.reason}`)}
            empty="None yet — linked BUY signals appear here."
          />
          <SignalList
            title="Upcoming decisions"
            items={intel.upcomingDecisions.map((o) => `${o.title} (${o.domain})`)}
            empty="No pending decisions."
          />
          <SignalList
            title="Recent changes"
            items={intel.recentChanges.map((o) => `${o.title}: ${o.summary}`)}
            empty="No Living Decision changes yet."
          />
        </section>
      )}

      <div className="mt-6 flex flex-wrap gap-3 text-xs">
        <button
          type="button"
          className="font-semibold text-slate-300 hover:text-white"
          onClick={() => void setMissionStatus(mission.status === "paused" ? "active" : "paused")}
        >
          {mission.status === "paused" ? "Resume mission" : "Pause mission"}
        </button>
        {mission.status !== "completed" ? (
          <button
            type="button"
            className="font-semibold text-emerald-300 hover:text-white"
            onClick={() => void setMissionStatus("completed")}
          >
            Mark mission complete
          </button>
        ) : null}
        <Link href="/feed" className="font-semibold text-cyan-200 hover:text-white">
          Open Decision Feed
        </Link>
      </div>

      <section className="mt-10" aria-label="Decision groups">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
          Decision groups
        </h2>
        <div className="mt-4 space-y-6">
          {groups.map((g) => (
            <div key={g.key}>
              <h3 className="text-sm font-semibold text-white">{g.label}</h3>
              <ul className="mt-3 space-y-2">
                {g.items.map((d) => (
                  <li
                    key={d.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-white">{d.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {d.domain} · {d.priority} · {d.status}
                          {d.living?.action
                            ? ` · Living ${d.living.action}${
                                d.living.confidence != null
                                  ? ` ${Math.round(d.living.confidence)}%`
                                  : ""
                              }`
                            : " · Not linked yet"}
                          {(d.living?.changesCount ?? 0) > 0
                            ? ` · ${d.living!.changesCount} change(s)`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Link
                          href={briefHrefForDecision(d.searchQuery)}
                          className="inline-flex items-center gap-1 font-semibold text-cyan-200 hover:text-white"
                        >
                          Decision Brief
                          <ExternalLink className="size-3" aria-hidden />
                        </Link>
                        {d.status !== "completed" ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 font-semibold text-emerald-300 hover:text-white"
                            onClick={() => void setDecisionStatus(d, "completed")}
                          >
                            <CheckCircle2 className="size-3.5" aria-hidden />
                            Complete
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="font-semibold text-slate-400 hover:text-white"
                            onClick={() => void setDecisionStatus(d, "pending")}
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function Insight({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "risk" | "ok" | "urgent";
}) {
  const color =
    tone === "risk" ? "text-rose-300" : tone === "ok" ? "text-emerald-300" : "text-amber-200";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className={`flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] ${color}`}>
        <AlertTriangle className="size-3.5" aria-hidden />
        {title}
      </p>
      <p className="mt-2 text-sm text-slate-300">{body}</p>
    </div>
  );
}

function SignalList({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
