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
    : { type: "spring" as const, stiffness: 380, damping: 28 };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="pointer-events-none fixed bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-[90] hidden max-w-[calc(100vw-2rem)] flex-col items-end gap-2 lg:bottom-28 lg:flex"
      style={{ maxHeight: "min(70vh, 28rem)" }}
    >
      <div className="pointer-events-auto flex max-h-[inherit] flex-col gap-2 overflow-y-auto overflow-x-hidden rounded-2xl border border-white/[0.1] bg-[#060b14]/92 p-2 shadow-[0_28px_80px_-24px_rgba(0,0,0,0.85),0_0_48px_-20px_rgba(34,211,238,0.12)] backdrop-blur-2xl">
        <p className="cockpit-label px-2 pt-1 text-center text-[9px] text-slate-500">Quick</p>
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
          className="flex items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-500/12 px-3 py-2 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-500/18"
        >
          Upgrade
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
      className="flex size-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05] text-slate-200 transition hover:border-cyan-400/28 hover:bg-cyan-500/10 hover:text-white"
    >
      <Icon className="size-[1.15rem]" strokeWidth={1.75} aria-hidden />
    </button>
  );
}
