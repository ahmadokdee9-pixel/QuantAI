/**
 * PostgREST / Postgres messages when tables are missing or the schema cache is stale.
 * Treat as "storage not ready" — fail open with empty payloads, avoid noisy logs.
 */
export function isBenignStorageSchemaError(message: string | null | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  if (m.includes("could not find the table")) return true;
  if (m.includes("schema cache")) return true;
  if (m.includes("does not exist") && (m.includes("relation") || m.includes("table"))) return true;
  return false;
}
