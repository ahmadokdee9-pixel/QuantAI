"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Loader2,
  Target,
  Wallet,
} from "lucide-react";
import { isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";
import {
  createLocalMission,
  listLocalMissionsDashboard,
} from "@/lib/missions/clientMissions";
import { MISSION_TEMPLATES } from "@/lib/missions/templates";
import type { MissionDashboard, MissionIntelligence } from "@/lib/missions/types";

type TemplateCard = {
  id: string;
  title: string;
  goal: string;
  suggestedBudget: number | null;
  decisionCount: number;
};

type MissionsApiPayload = MissionDashboard & {
  templates?: TemplateCard[];
  configured?: boolean;
  error?: string;
};

function healthTone(h: MissionIntelligence["missionHealth"]) {
  if (h === "strong") return "text-emerald-300";
  if (h === "at_risk") return "text-rose-300";
  if (h === "stable") return "text-cyan-200";
  return "text-slate-400";
}

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

export default function MissionDashboardView() {
  const { isSignedIn } = useAuth();
  const [dashboard, setDashboard] = useState<MissionDashboard | null>(null);
  const [templates, setTemplates] = useState<TemplateCard[]>(
    MISSION_TEMPLATES.map((t) => ({
      id: t.id,
      title: t.title,
      goal: t.goal,
      suggestedBudget: t.suggestedBudget,
      decisionCount: t.decisions.length,
    }))
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          if (isSignedIn) {
            const res = await fetch("/api/intelligence/missions", {
              credentials: "same-origin",
            });
            const parsed = await readApiJson<MissionsApiPayload>(res);
            if (!isApiFailure(parsed) && parsed.data) {
              setDashboard({
                missions: parsed.data.missions || [],
                totals: parsed.data.totals,
              });
              if (parsed.data.templates?.length) setTemplates(parsed.data.templates);
              if (parsed.data.error) setError(parsed.data.error);
            } else {
              setDashboard(listLocalMissionsDashboard());
              setError("Live sync soft-failed — showing local missions.");
            }
          } else {
            setDashboard(listLocalMissionsDashboard());
          }
        } catch {
          setDashboard(listLocalMissionsDashboard());
          setError("Live sync soft-failed — showing local missions.");
        } finally {
          setLoading(false);
        }
      })();
    });
  }, [isSignedIn]);

  useEffect(() => {
    load();
  }, [load]);

  const startMission = async (templateId: string) => {
    setCreating(templateId);
    try {
      const tpl = MISSION_TEMPLATES.find((t) => t.id === templateId);
      if (isSignedIn) {
        const res = await fetch("/api/intelligence/missions", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: tpl?.title,
            templateId,
            goal: tpl?.goal,
            budget: tpl?.suggestedBudget,
          }),
        });
        const parsed = await readApiJson<{ mission?: { id: string } }>(res);
        if (!isApiFailure(parsed) && parsed.data?.mission?.id) {
          window.location.href = `/agent/${parsed.data.mission.id}`;
          return;
        }
        // Fall through to local if schema missing
      }
      const local = createLocalMission({
        title: tpl?.title || "Mission",
        templateId,
        goal: tpl?.goal,
        budget: tpl?.suggestedBudget,
      });
      window.location.href = `/agent/${local.id}`;
    } finally {
      setCreating(null);
    }
  };

  const totals = dashboard?.totals;

  return (
    <div className="cockpit-glass-panel qa-premium-surface p-6 sm:p-8">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/10">
        <Target className="size-6 text-cyan-200" aria-hidden />
      </div>
      <h1 className="cockpit-display mt-6 text-2xl text-white sm:text-3xl">Decision Agent</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
        Persistent mission planner. Every item becomes a Living Decision powered by the QuantAI Decision
        Engine — not a chatbot.
      </p>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <Link href="/feed" className="font-semibold text-cyan-200 hover:text-white">
          Decision Feed
        </Link>
        <Link href="/decisions" className="font-semibold text-slate-300 hover:text-white">
          Decision timeline
        </Link>
        <Link href="/watchlist" className="font-semibold text-slate-300 hover:text-white">
          Watched decisions
        </Link>
      </div>

      {error ? (
        <p className="mt-4 text-xs text-amber-200/90" role="status">
          {error}
        </p>
      ) : null}

      <section className="mt-8" aria-label="Mission dashboard">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
          Mission Dashboard
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Mission progress",
              value: totals ? `${totals.completionAvg}%` : "—",
              icon: CircleDot,
            },
            {
              label: "Money saved",
              value: formatMoney(totals?.moneySaved ?? null),
              icon: Wallet,
            },
            {
              label: "Money remaining",
              value: formatMoney(totals?.moneyRemaining ?? null),
              icon: Wallet,
            },
            {
              label: "Pending decisions",
              value: totals ? String(totals.pendingDecisions) : "—",
              icon: AlertTriangle,
            },
            {
              label: "Completed decisions",
              value: totals ? String(totals.completedDecisions) : "—",
              icon: CheckCircle2,
            },
            {
              label: "Critical changes",
              value: totals ? String(totals.criticalChanges) : "—",
              icon: AlertTriangle,
            },
            {
              label: "Active missions",
              value: totals ? String(totals.activeMissions) : "—",
              icon: Target,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                <card.icon className="size-3.5 text-cyan-300/80" aria-hidden />
                {card.label}
              </div>
              <p className="mt-2 text-xl font-semibold text-white">{card.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10" aria-label="Active missions">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
            Your missions
          </h2>
          {(loading || pending) && (
            <Loader2 className="size-4 animate-spin text-slate-400" aria-label="Loading" />
          )}
        </div>

        {!loading && (!dashboard?.missions.length) ? (
          <p className="mt-4 text-sm text-slate-400">
            No missions yet. Start from a blueprint below — each decision links into Instant Decision /
            Living Decisions.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {(dashboard?.missions || []).map((m) => {
              const intel = m.intelligence;
              return (
                <li key={m.id}>
                  <Link
                    href={`/agent/${m.id}`}
                    className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:border-cyan-400/30 hover:bg-white/[0.05]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">{m.title}</p>
                        {m.goal ? (
                          <p className="mt-1 text-sm text-slate-400 line-clamp-2">{m.goal}</p>
                        ) : null}
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        <p className={healthTone(intel.missionHealth)}>
                          {intel.missionHealth.replace("_", " ")}
                        </p>
                        <p className="mt-1">{intel.completionPct}% complete</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        {intel.completedCount}/{intel.decisionCount} decisions
                      </span>
                      <span>{intel.pendingCount} pending</span>
                      {intel.criticalAlerts > 0 ? (
                        <span className="text-rose-300">{intel.criticalAlerts} critical</span>
                      ) : null}
                      {intel.estimatedSavings != null ? (
                        <span className="text-emerald-300">
                          Saved {formatMoney(intel.estimatedSavings, m.currency)}
                        </span>
                      ) : null}
                      {m.budget != null ? (
                        <span>Budget {formatMoney(m.budget, m.currency)}</span>
                      ) : null}
                    </div>
                    {intel.mostUrgentAction ? (
                      <p className="mt-2 text-xs text-cyan-200/90">
                        Urgent: {intel.mostUrgentAction.title} — {intel.mostUrgentAction.reason}
                      </p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10" aria-label="Mission blueprints">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
          Start a mission
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Structural blueprints only — prices and confidence appear after Living Decisions run.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <li
              key={t.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
            >
              <p className="font-semibold text-white">{t.title}</p>
              <p className="mt-1 text-sm text-slate-400 line-clamp-2">{t.goal}</p>
              <p className="mt-2 text-xs text-slate-500">
                {t.decisionCount} decisions
                {t.suggestedBudget != null
                  ? ` · suggested budget ${formatMoney(t.suggestedBudget)}`
                  : ""}
              </p>
              <button
                type="button"
                className="mt-3 text-xs font-semibold text-cyan-200 hover:text-white disabled:opacity-50"
                disabled={creating === t.id}
                onClick={() => void startMission(t.id)}
              >
                {creating === t.id ? "Starting…" : "Start mission"}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
