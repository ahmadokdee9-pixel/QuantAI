"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  notifyQuickHandlersChanged,
} from "@/lib/cockpit/quickHandlersSubscription";

export type CockpitQuickHandlers = {
  scrollToTray?: () => void;
  scrollToCompareLab?: () => void;
  exportIntelligenceSummary?: () => void | Promise<void>;
  saveLeadingPick?: () => void;
  watchLeadingPick?: () => void;
  primeCompareLane?: () => void;
};

type CockpitContextValue = {
  registerPrimarySearch: (el: HTMLInputElement | null) => void;
  focusPrimarySearch: () => void;
  commandOpen: boolean;
  setCommandOpen: (v: boolean | ((b: boolean) => boolean)) => void;
  registerQuickHandlers: (handlers: CockpitQuickHandlers | null) => void;
  getQuickHandlers: () => CockpitQuickHandlers;
  intelligenceEpoch: number;
  pulseIntelligence: () => void;
};

const CockpitContext = createContext<CockpitContextValue | null>(null);

export function useCockpit() {
  const ctx = useContext(CockpitContext);
  if (!ctx) {
    throw new Error("useCockpit must be used within CockpitProvider");
  }
  return ctx;
}

function quickHandlersFingerprint(h: CockpitQuickHandlers | null): string {
  if (!h) return "";
  return (Object.keys(h) as (keyof CockpitQuickHandlers)[])
    .filter((k) => typeof h[k] === "function")
    .sort()
    .join("|");
}

export function CockpitProvider({ children }: { children: React.ReactNode }) {
  const searchRef = useRef<HTMLInputElement | null>(null);
  const quickRef = useRef<CockpitQuickHandlers | null>(null);
  const quickFingerprintRef = useRef<string>("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [intelligenceEpoch, setIntelligenceEpoch] = useState(0);

  const registerPrimarySearch = useCallback((el: HTMLInputElement | null) => {
    searchRef.current = el;
  }, []);

  const focusPrimarySearch = useCallback(() => {
    const el = searchRef.current;
    if (!el) return;
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
    el.select?.();
  }, []);

  const registerQuickHandlers = useCallback((handlers: CockpitQuickHandlers | null) => {
    if (handlers === quickRef.current) return;
    quickRef.current = handlers;
    const next = quickHandlersFingerprint(handlers);
    if (next === quickFingerprintRef.current) return;
    quickFingerprintRef.current = next;
    notifyQuickHandlersChanged();
  }, []);

  const getQuickHandlers = useCallback(() => quickRef.current ?? {}, []);

  const pulseIntelligence = useCallback(() => {
    setIntelligenceEpoch((e) => e + 1);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const editable =
        target?.isContentEditable ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT";

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((o) => !o);
        return;
      }

      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (editable) return;
        if (target instanceof HTMLInputElement && target.type === "password") return;
        e.preventDefault();
        focusPrimarySearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusPrimarySearch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!commandOpen) return;
      e.preventDefault();
      e.stopPropagation();
      setCommandOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [commandOpen]);

  const value = useMemo(
    () =>
      ({
        registerPrimarySearch,
        focusPrimarySearch,
        commandOpen,
        setCommandOpen,
        registerQuickHandlers,
        getQuickHandlers,
        intelligenceEpoch,
        pulseIntelligence,
      }) satisfies CockpitContextValue,
    [
      registerPrimarySearch,
      focusPrimarySearch,
      commandOpen,
      registerQuickHandlers,
      getQuickHandlers,
      intelligenceEpoch,
      pulseIntelligence,
    ]
  );

  return <CockpitContext.Provider value={value}>{children}</CockpitContext.Provider>;
}
