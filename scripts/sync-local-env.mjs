/**
 * @deprecated Use pull-env-safe.mjs — this file re-exports safe pull only.
 * Never overwrites local non-empty values with empty Vercel placeholders.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const script = resolve(import.meta.dirname, "pull-env-safe.mjs");
const r = spawnSync(process.execPath, [script], { stdio: "inherit", cwd: resolve(import.meta.dirname, "..") });
process.exit(r.status ?? 1);
