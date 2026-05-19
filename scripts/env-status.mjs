import { readFileSync, existsSync } from "node:fs";

const keys = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SERPAPI_KEY",
  "OPENAI_API_KEY",
  "STRIPE_SECRET_KEY",
];

if (!existsSync(".env.local")) {
  console.log("NO .env.local");
  process.exit(1);
}

const text = readFileSync(".env.local", "utf8");
for (const k of keys) {
  const line = text.split(/\r?\n/).find((l) => l.startsWith(`${k}=`));
  if (!line) {
    console.log(k, "MISSING");
    continue;
  }
  let v = line.slice(line.indexOf("=") + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  console.log(k, v.length > 2 ? `OK (${v.length} chars)` : "EMPTY");
}
