import { z } from "zod";

export function parseJsonObject<T extends z.ZodTypeAny>(
  raw: string,
  schema: T
): z.infer<T> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    } else {
      return null;
    }
  }
  const out = schema.safeParse(parsed);
  return out.success ? out.data : null;
}
