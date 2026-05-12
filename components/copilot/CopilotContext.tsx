"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { copilotSessionsEqual } from "@/lib/copilot/sessionEquality";
import type { CopilotSessionPayload } from "@/lib/copilot/sessionTypes";
import { defaultCopilotSession } from "@/lib/copilot/sessionTypes";

type CopilotContextValue = {
  session: CopilotSessionPayload;
  setSession: (next: CopilotSessionPayload) => void;
  patchSession: (patch: Partial<CopilotSessionPayload>) => void;
};

const CopilotContext = createContext<CopilotContextValue | null>(null);

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<CopilotSessionPayload>(() => defaultCopilotSession());

  const setSession = useCallback((next: CopilotSessionPayload) => {
    setSessionState((prev) => (copilotSessionsEqual(prev, next) ? prev : next));
  }, []);

  const patchSession = useCallback((patch: Partial<CopilotSessionPayload>) => {
    setSessionState((prev) => {
      const merged: CopilotSessionPayload = { ...prev, ...patch };
      return copilotSessionsEqual(prev, merged) ? prev : merged;
    });
  }, []);

  const value = useMemo(
    () => ({ session, setSession, patchSession }),
    [session, setSession, patchSession]
  );

  return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>;
}

export function useCopilotSession() {
  const ctx = useContext(CopilotContext);
  if (!ctx) {
    throw new Error("useCopilotSession must be used within CopilotProvider");
  }
  return ctx;
}
