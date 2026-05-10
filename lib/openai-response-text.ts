/**
 * Best-effort extraction of assistant text from `client.responses.create` payloads.
 */
export function extractResponsesApiText(response: unknown): string {
  if (!response || typeof response !== "object") {
    return "";
  }

  const r = response as Record<string, unknown>;

  if (typeof r.output_text === "string" && r.output_text.trim()) {
    return r.output_text.trim();
  }

  const output = r.output;
  if (!Array.isArray(output)) {
    return "";
  }

  const chunks: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const content = row.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      const b = block as Record<string, unknown>;
      if (typeof b.text === "string" && b.text.trim()) {
        chunks.push(b.text.trim());
      }
    }
  }

  return chunks.join("\n\n").trim();
}
