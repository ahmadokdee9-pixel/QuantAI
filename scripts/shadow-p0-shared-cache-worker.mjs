#!/usr/bin/env node
/**
 * Child worker for shared-cache multi-process proof.
 * Env: QUANTAI_CRC_BACKEND, QUANTAI_CRC_FILE_DIR, CRC_WORKER_MODE, CRC_WORKER_KEY, CRC_WORKER_BODY_PATH
 */
import { readFileSync } from "node:fs";
import {
  getCanonicalCachedSearchBody,
  setCanonicalCachedSearchBody,
} from "../lib/search/canonicalResponseCache.ts";

const mode = process.env.CRC_WORKER_MODE || "read";
const key = process.env.CRC_WORKER_KEY || "";

if (!key) {
  console.error(JSON.stringify({ error: "missing key" }));
  process.exit(1);
}

if (mode === "write") {
  const bodyPath = process.env.CRC_WORKER_BODY_PATH;
  const body = JSON.parse(readFileSync(bodyPath, "utf8"));
  const ok = await setCanonicalCachedSearchBody(key, body, 120);
  console.log(JSON.stringify({ ok, mode }));
} else {
  const hit = await getCanonicalCachedSearchBody(key);
  console.log(
    JSON.stringify({
      hit: Boolean(hit),
      title: hit?.data?.products?.[0]?.title ?? null,
      mode,
    })
  );
}
