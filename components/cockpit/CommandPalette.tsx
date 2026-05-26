"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bookmark,
  Command,
  GitCompare,
  LayoutDashboard,
  PanelTop,
  Search,
  Share2,
  Sparkles,
  CreditCard,
  Home,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  getQuickHandlersNotifyVersion,
  getQuickHandlersNotifyVersionServerSnapshot,
  subscribeQuickHandlersChanged,
} from "@/lib/cockpit/quickHandlersSubscription";
import { useCockpit } from "./cockpitContext";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/pricing", label: "Plans & upgrade", icon: Sparkles },
  { href: "/billing", label: "Billing", icon: CreditCard },
] as const;

export default function CommandPalette() {
  const reduce = useReducedMotion();
  const router = useRouter();
  const pathname = usePathname();
  const { commandOpen, setCommandOpen, focusPrimarySearch, getQuickHandlers } = useCockpit();
  const quickHandlersLayout = useSyncExternalStore(
    subscribeQuickHandlersChanged,
    getQuickHandlersNotifyVersion,
    getQuickHandlersNotifyVersionServerSnapshot
  );
  const [mounted, setMounted] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const actions = useMemo(() => {
    void quickHandlersLayout;
    const h = getQuickHandlers();
    const rows: {
      id: string;
      label: string;
      sub?: string;
      icon: typeof Search;
      onSelect: () => void;
    }[] = [
      {
        id: "search",
        label: "Focus command search",
        sub: "Shortcut /",
        icon: Search,
        onSelect: () => {
          setCommandOpen(false);
          focusPrimarySearch();
        },
      },
    ];
    if (h.scrollToTray) {
      rows.push({
        id: "tray",
        label: "Jump to results tray",
        icon: PanelTop,
        onSelect: () => {
          h.scrollToTray?.();
          setCommandOpen(false);
        },
      });
    }
    if (h.primeCompareLane) {
      rows.push({
        id: "compare",
        label: "Prime compare lane",
        sub: "Add top two picks to compare",
        icon: GitCompare,
        onSelect: () => {
          h.primeCompareLane?.();
          setCommandOpen(false);
        },
      });
    }
    if (h.scrollToCompareLab) {
      rows.push({
        id: "scroll-compare",
        label: "Jump to compare lab",
        icon: GitCompare,
        onSelect: () => {
          h.scrollToCompareLab?.();
          setCommandOpen(false);
        },
      });
    }
    if (h.exportIntelligenceSummary) {
      rows.push({
        id: "export",
        label: "Copy intelligence summary",
        icon: Share2,
        onSelect: () => {
          void h.exportIntelligenceSummary?.();
          setCommandOpen(false);
        },
      });
    }
    if (h.saveLeadingPick) {
      rows.push({
        id: "save",
        label: "Save leading pick",
        icon: Bookmark,
        onSelect: () => {
          h.saveLeadingPick?.();
          setCommandOpen(false);
        },
      });
    }
    if (h.watchLeadingPick) {
      rows.push({
        id: "watch",
        label: "Watch leading pick",
        icon: Sparkles,
        onSelect: () => {
          h.watchLeadingPick?.();
          setCommandOpen(false);
        },
      });
    }
    return rows;
  }, [quickHandlersLayout, getQuickHandlers, focusPrimarySearch, setCommandOpen]);

  const runNav = useCallback(
    (href: string) => {
      setCommandOpen(false);
      router.push(href);
    },
    [router, setCommandOpen]
  );

  useEffect(() => {
    if (!commandOpen) return;
    const el = listRef.current?.querySelector<HTMLElement>("button");
    window.requestAnimationFrame(() => {
      const b = el;
      if (b)
        try {
          b.focus({ preventScroll: true });
        } catch {
          b.focus();
        }
    });
  }, [commandOpen]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {commandOpen && (
        <motion.div
          key="cmd-palette"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[min(18vh,8rem)] px-3 sm:px-4"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
        >
          <button
            type="button"
            className="qa-modal-scrim"
            aria-label="Close command palette"
            onClick={() => setCommandOpen(false)}
          />
          <motion.div
            initial={reduce ? false : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="qa-modal-panel relative w-full max-w-lg overflow-hidden"
          >
            <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
              <Command className="size-4 shrink-0 text-cyan-300/80" aria-hidden />
              <p className="cockpit-body text-sm font-semibold text-white/95">QuantAI command</p>
              <span className="ml-auto rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-slate-400">
                Esc close
              </span>
            </div>
            <div ref={listRef} className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain px-2 py-2">
              <p className="cockpit-label px-2 pb-1 pt-1 text-[10px]">Navigate</p>
              <div className="space-y-0.5">
                {nav.map((item) => {
                  const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => runNav(item.href)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${
                        active
                          ? "bg-cyan-500/15 text-cyan-50"
                          : "text-slate-200 hover:bg-white/[0.06]"
                      }`}
                    >
                      <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                      {item.label}
                      {active && (
                        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-cyan-300/80">
                          Here
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {actions.length > 0 && (
                <>
                  <p className="cockpit-label mt-3 px-2 pb-1 text-[10px]">Intelligence actions</p>
                  <div className="space-y-0.5">
                    {actions.map((a) => {
                      const Icon = a.icon;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => a.onSelect()}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
                        >
                          <Icon className="size-4 shrink-0 text-violet-300/85" aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-medium text-white/92">{a.label}</span>
                            {a.sub && (
                              <span className="block text-[11px] font-normal text-slate-500">{a.sub}</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="mt-3 border-t border-white/[0.06] px-2 py-3">
                <p className="text-[11px] leading-relaxed text-slate-500">
                  <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                    /
                  </kbd>{" "}
                  search ·{" "}
                  <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                    ⌘K
                  </kbd>{" "}
                  palette
                </p>
                <Link
                  href="/pricing"
                  className="mt-2 inline-flex text-[12px] font-medium text-cyan-300/90 hover:text-cyan-200"
                  onClick={() => setCommandOpen(false)}
                >
                  View upgrade paths →
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
