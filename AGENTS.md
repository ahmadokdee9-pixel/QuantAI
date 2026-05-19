<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Environment (critical)

- **Never** run bare `vercel env pull .env.local` — it can write empty `""` for secrets and wipe local values. Use **`npm run env:pull`** only (safe merge + backup).
- **Never** push, rotate, or delete Vercel env vars from scripts. Sync is **Vercel → local** only.
- `.env.local` is gitignored; `.env.example` is template-only (no secrets).
- See `docs/ENVIRONMENT.md` for recovery.
