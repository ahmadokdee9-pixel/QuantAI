/**
 * H-05 regression — production HTML responses must carry a real CSP.
 *
 * Usage: npx tsx scripts/test-h05-csp.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  QUANTAI_CSP_CUSTOM_DIRECTIVES,
  QUANTAI_CSP_REQUIRED_TOKENS,
} from "../lib/security/cspDirectives.ts";

let failed = 0;
function check(cond, msg) {
  try {
    assert.ok(cond, msg);
    console.log(`[PASS] ${msg}`);
  } catch (e) {
    failed += 1;
    console.error(`[FAIL] ${msg}`, e instanceof Error ? e.message : e);
  }
}

console.log("=== H-05 CSP wiring ===\n");

{
  const proxy = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
  check(proxy.includes("contentSecurityPolicy"), "proxy.ts enables Clerk contentSecurityPolicy");
  check(proxy.includes("strict: true") || proxy.includes("strict:true"), "CSP uses strict mode (nonce + strict-dynamic)");
  check(proxy.includes("QUANTAI_CSP_CUSTOM_DIRECTIVES"), "proxy merges QuantAI CSP directives");
  check(!/unsafe-eval/.test(proxy), "proxy must not force unsafe-eval");
}

{
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  check(
    /<ClerkProvider\s+dynamic[\s>]/.test(layout) || /<ClerkProvider\s+dynamic\s*\/>/.test(layout),
    "ClerkProvider sets dynamic so strict CSP nonces reach scripts (interaction integrity)"
  );
}

{
  check(
    (QUANTAI_CSP_CUSTOM_DIRECTIVES["object-src"] || []).includes("'none'"),
    "object-src is 'none'"
  );
  check(
    (QUANTAI_CSP_CUSTOM_DIRECTIVES["frame-ancestors"] || []).includes("'none'"),
    "frame-ancestors is 'none'"
  );
  check(
    (QUANTAI_CSP_CUSTOM_DIRECTIVES["base-uri"] || []).includes("'self'"),
    "base-uri is 'self'"
  );
  check(
    (QUANTAI_CSP_CUSTOM_DIRECTIVES["img-src"] || []).some((v) => v === "https:" || v === "https"),
    "img-src allows https: for retailer product images"
  );
  check(
    (QUANTAI_CSP_CUSTOM_DIRECTIVES["frame-src"] || []).some((v) => v.includes("stripe")),
    "frame-src allows Stripe"
  );
  check(
    (QUANTAI_CSP_CUSTOM_DIRECTIVES["connect-src"] || []).some((v) => v.includes("protect.clerk")),
    "connect-src allows Clerk protect hosts"
  );
}

console.log("\n=== H-05 required CSP tokens ===\n");
for (const token of QUANTAI_CSP_REQUIRED_TOKENS) {
  check(typeof token === "string" && token.length > 0, `required token listed: ${token}`);
}

if (failed) {
  console.error(`\n${failed} H-05 regression(s) failed`);
  process.exit(1);
}
console.log("\nAll H-05 regressions passed.");
