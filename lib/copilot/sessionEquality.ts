import type { CopilotSessionPayload } from "@/lib/copilot/sessionTypes";

/** Stable deep equality for copilot payloads (JSON-serializable shapes only). */
export function copilotSessionsEqual(a: CopilotSessionPayload, b: CopilotSessionPayload): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
