"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Sparkles, Trash2 } from "lucide-react";
import TrustRibbon from "@/components/trust/TrustRibbon";
import CockpitEmptyState from "@/components/empty/CockpitEmptyState";
import { apiErrorText, isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";
import { useCopilotSession } from "@/components/copilot/CopilotContext";
import { defaultCopilotSession } from "@/lib/copilot/sessionTypes";
import type { CopilotSessionPayload } from "@/lib/copilot/sessionTypes";
import { buildSavedItemInsights } from "@/lib/liveSignals/savedInsights";

type SavedRow = {
  id?: string;
  title: string | null;
  price: number | null;
  image: string | null;
  link: string;
  ai_score?: number | null;
  created_at?: string;
};

export default function SavedProductsPage() {
  const [items, setItems] = useState<SavedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const { setSession: setCopilotSession } = useCopilotSession();

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/intelligence/saved-products", { credentials: "same-origin" });
      const parsed = await readApiJson<{ items?: SavedRow[]; error?: string }>(res);
      if (!res.ok || isApiFailure(parsed)) {
        setErr(apiErrorText(parsed, "Memory shelf sync failed."));
        setItems([]);
        return;
      }
      setItems(Array.isArray(parsed.data?.items) ? (parsed.data.items ?? []) : []);
    } catch {
      setErr("Memory shelf sync failed.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const savedCopilotSession = useMemo((): CopilotSessionPayload | null => {
    if (loading) return null;
    return {
      ...defaultCopilotSession(),
      route: "saved",
      lastSearchQuery: "saved_products",
      savedSummaries: items.map((s) => ({
        title: s.title ?? "Saved item",
        link: s.link,
        price: s.price,
      })),
      memoryHints: ["context:saved_products_page"],
    };
  }, [loading, items]);

  useEffect(() => {
    if (!savedCopilotSession) return;
    setCopilotSession(savedCopilotSession);
  }, [savedCopilotSession, setCopilotSession]);

  async function remove(link: string) {
    try {
      const res = await fetch(
        `/api/intelligence/saved-products?link=${encodeURIComponent(link)}`,
        { method: "DELETE", credentials: "same-origin" }
      );
      const parsed = await readApiJson<{ error?: string }>(res);
      if (!res.ok || isApiFailure(parsed)) {
        setErr(apiErrorText(parsed, "Anchor removal failed."));
        return;
      }
      setItems((prev) => prev.filter((x) => x.link !== link));
      setErr(null);
    } catch {
      setErr("Anchor removal failed.");
    }
  }

  return (
    <>
      <section className="qa-ref-ws-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="qa-ref-ws-kicker">Memory shelf module</p>
            <h1 className="qa-ref-ws-display">Commerce anchor persistence</h1>
            <p className="qa-ref-ws-lead max-w-xl">
              Saved listings propagate through Search, Compare, and Governance—the same signal infrastructure that powers live intelligence.
            </p>
          </div>
          <div className="qa-ref-ws-actions">
            <Link href="/" className="qi-access-cta inline-flex items-center px-5">
              Launch search console
            </Link>
            <Link href="/dashboard" className="qi-access-cta qi-access-cta--ghost inline-flex items-center px-5">
              Workspace
            </Link>
          </div>
        </div>
      </section>

      {err && <p className="qa-ref-ws-alert">{err}</p>}

      {loading ? (
        <div className="qa-ref-ws-loading">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          Loading memory shelf…
        </div>
      ) : items.length === 0 ? (
        <CockpitEmptyState
          moduleLabel="Memory shelf module"
          readiness="Indexed · Awaiting anchor ingest"
          title="Shelf channel open"
          description="Commerce anchors persist here and propagate through Compare lab, session briefing, and Search re-analysis. The shelf remains synchronized with the commerce OS state layer."
          context={[
            "Saved posture feeds Compare lab and session briefing modules",
            "Copilot reads shelf state across intelligence routing",
            "Trust and pricing context attach at Search save ingest",
          ]}
          primaryLabel="Launch search console"
          primaryHref="/"
          secondaryLabel="Workspace"
          secondaryHref="/dashboard"
          icon={<Sparkles className="size-6" strokeWidth={1.5} aria-hidden />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <article key={item.link} className="qa-ref-ws-saved-card">
              {item.image && (
                <div className="qa-ref-ws-saved-card__media mx-auto sm:mx-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt="" className="size-full object-contain" />
                </div>
              )}
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="qa-ref-ws-row__title line-clamp-2">{item.title}</p>
                <p className="qa-ref-ws-saved-card__price">
                  {item.price != null ? `€${item.price}` : "—"}
                </p>
                {item.ai_score != null && (
                  <p className="qa-ref-ws-meta mt-1">QI at save · {item.ai_score}</p>
                )}
                <ul className="mt-3 space-y-1.5 text-left">
                  {buildSavedItemInsights(item, items).map((ins) => (
                    <li
                      key={`${item.link}-${ins.headline}`}
                      className={`qa-ref-ws-insight ${
                        ins.tone === "positive"
                          ? "qa-ref-ws-insight--positive"
                          : ins.tone === "watch"
                            ? "qa-ref-ws-insight--watch"
                            : "qa-ref-ws-insight--neutral"
                      }`}
                    >
                      <span className="qa-ref-ws-insight__headline">{ins.headline}</span>
                      <span className="qa-ref-ws-insight__detail">{ins.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap justify-center gap-2 sm:flex-col sm:justify-end">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="qi-access-cta inline-flex items-center gap-1 px-4 text-xs"
                >
                  Open source
                  <ExternalLink className="size-3.5 opacity-70" aria-hidden />
                </a>
                <button
                  type="button"
                  onClick={() => void remove(item.link)}
                  className="qa-ref-ws-btn-danger"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Release anchor
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && <TrustRibbon variant="institutional" />}
    </>
  );
}
