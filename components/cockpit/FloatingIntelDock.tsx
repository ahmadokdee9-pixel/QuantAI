"use client";

import { useMemo, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Bookmark,
  Command,
  GitCompare,
  PanelTop,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  getQuickHandlersNotifyVersion,
  getQuickHandlersNotifyVersionServerSnapshot,
  subscribeQuickHandlersChanged,
} from "@/lib/cockpit/quickHandlersSubscription";
import { useCockpit } from "./cockpitContext";

export default function FloatingIntelDock() {
  const reduce = useReducedMotion();
  const { setCommandOpen, focusPrimarySearch, getQuickHandlers } = useCockpit();
  const quickHandlersLayout = useSyncExternalStore(
    subscribeQuickHandlersChanged,
    getQuickHandlersNotifyVersion,
    getQuickHandlersNotifyVersionServerSnapshot
  );
  const h = useMemo(() => {
    void quickHandlersLayout;
    return getQuickHandlers();
  }, [getQuickHandlers, quickHandlersLayout]);

  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 320, damping: 32 };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="pointer-events-none fixed bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-[max(0.85rem,env(safe-area-inset-right,0px))] z-[90] flex max-w-[calc(100vw-1.75rem)] flex-col items-end gap-2.5 lg:bottom-28"
      style={{ maxHeight: "min(70vh, 28rem)" }}
    >
      <div className="qa-os-dock pointer-events-auto flex max-h-[inherit] flex-col gap-2.5 overflow-y-auto overflow-x-hidden rounded-2xl p-2.5">
        <span className="sr-only">Quick shortcuts</span>
        <DockBtn
          label="Command palette ⌘K"
          onClick={() => setCommandOpen(true)}
          icon={Command}
        />
        <DockBtn label="Focus search /" onClick={() => focusPrimarySearch()} icon={Search} />
        {h.scrollToTray && (
          <DockBtn label="Jump to tray" onClick={() => h.scrollToTray?.()} icon={PanelTop} />
        )}
        {h.primeCompareLane && (
          <DockBtn label="Prime compare" onClick={() => h.primeCompareLane?.()} icon={GitCompare} />
        )}
        {h.exportIntelligenceSummary && (
          <DockBtn
            label="Copy summary"
            onClick={() => void h.exportIntelligenceSummary?.()}
            icon={Share2}
          />
        )}
        {h.saveLeadingPick && (
          <DockBtn label="Save top pick" onClick={() => h.saveLeadingPick?.()} icon={Bookmark} />
        )}
        {h.watchLeadingPick && (
          <DockBtn label="Watch top pick" onClick={() => h.watchLeadingPick?.()} icon={Sparkles} />
        )}
        <Link
          href="/pricing"
          className="flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[11px] font-medium tracking-tight text-slate-300/95 transition duration-300 hover:border-cyan-400/22 hover:bg-white/[0.07] hover:text-slate-100"
        >
          Plans
        </Link>
      </div>
    </motion.div>
  );
}

function DockBtn({
  label,
  onClick,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Search;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex size-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.035] text-slate-400/95 transition duration-300 hover:border-white/[0.1] hover:bg-white/[0.06] hover:text-slate-100 active:scale-[0.97]"
    >
      <Icon className="size-[1.05rem] opacity-90" strokeWidth={1.5} aria-hidden />
    </button>
  );
}
