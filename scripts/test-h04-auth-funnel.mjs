/**
 * H-04 regression — guest auth funnel must redirect, not 404.
 *
 * Usage: npx tsx scripts/test-h04-auth-funnel.mjs
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
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

console.log("=== H-04 auth route wiring ===\n");

const signInPage = join(root, "app/sign-in/[[...sign-in]]/page.tsx");
const signUpPage = join(root, "app/sign-up/[[...sign-up]]/page.tsx");
check(existsSync(signInPage), "app/sign-in/[[...sign-in]]/page.tsx exists");
check(existsSync(signUpPage), "app/sign-up/[[...sign-up]]/page.tsx exists");

{
  const signIn = readFileSync(signInPage, "utf8");
  check(/from ["']@clerk\/nextjs["']/.test(signIn), "sign-in page imports Clerk");
  check(/<SignIn[\s>]/.test(signIn), "sign-in page renders <SignIn />");
  check(/fallbackRedirectUrl=["']\/dashboard["']/.test(signIn), "sign-in fallbackRedirectUrl → /dashboard");
}

{
  const signUp = readFileSync(signUpPage, "utf8");
  check(/<SignUp[\s>]/.test(signUp), "sign-up page renders <SignUp />");
  check(/signInUrl=["']\/sign-in["']/.test(signUp), "sign-up links back to /sign-in");
}

{
  const proxy = readFileSync(join(root, "proxy.ts"), "utf8");
  check(/signInUrl:\s*["']\/sign-in["']/.test(proxy), "proxy.ts sets signInUrl /sign-in");
  check(/signUpUrl:\s*["']\/sign-up["']/.test(proxy), "proxy.ts sets signUpUrl /sign-up");
  check(/auth\.protect\(/.test(proxy), "proxy.ts still uses auth.protect() (no bypass)");
  check(!/\/sign-in/.test(proxy.match(/createRouteMatcher\(\[([\s\S]*?)\]\)/)?.[1] || ""), "sign-in is not a protected matcher route");
}

console.log("\n=== H-04 protected surfaces listed ===\n");
{
  const proxy = readFileSync(join(root, "proxy.ts"), "utf8");
  for (const route of ["/dashboard", "/decisions", "/watchlist", "/saved", "/agent", "/billing", "/feed"]) {
    check(proxy.includes(route), `protected matcher includes ${route}`);
  }
}

if (failed) {
  console.error(`\n${failed} H-04 regression(s) failed`);
  process.exit(1);
}
console.log("\nAll H-04 regressions passed.");
