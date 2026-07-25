# QuantAI — Repository Handover Hygiene Check

**Sprint:** Acquisition Prep Sprint 3  
**Policy:** Identify issues; do **not** auto-delete historical material. Never print secret values.

---

## Snapshot (this workspace)

`git status` shows acquisition packaging as **untracked / modified docs** on `main` (not yet committed). `.env.local` exists and is **gitignored**. Vercel project link present (`.vercel` — typically gitignored).

---

## MUST FIX BEFORE BUYER ACCESS

| Item | Why |
|------|-----|
| **Commit or package** Sprint 1–3 acquisition docs into a clean tag/branch for the data room | Buyer should not dig through a dirty working tree |
| **Confirm no secrets in commit / zip** | Only `.env.example` may be tracked; never `.env.local`, `.env.local.bak`, `.env.local.backup-*`, or `.env.vercel-staging` (present locally, gitignored — **exclude from any buyer archive**) |
| **Counsel review of `LICENSE` / IP** | Draft status; required for closing |
| **Provide `SEARCH_BASE_URL` + warm demo** or disclose absence | Live latency evidence still missing |
| **Rotate keys at transfer** | Per `ACCESS_AND_SECRETS_HANDOVER.md` |

---

## RECOMMENDED

| Item | Why |
|------|-----|
| Exclude `docs/architecture-audit/.pdf-gen/node_modules/` from zip | Vendored noise |
| Prefer `FINAL_DATA_ROOM_INDEX.md` as shared folder root | Avoid duplicate indexes confusing buyers |
| Attach latency probe artifact when available | Closes PERFORMANCE_EVIDENCE gap |
| Set `NEXT_PUBLIC_APP_URL` on Production | Demo polish |
| Enable Upstash on Production | Stronger rate limits |
| Add Stripe only if monetization is in the narrative | Avoid incomplete billing demo |
| Tag release e.g. `acquisition-pack-v1` after commit | Reproducible diligence snapshot |

---

## SAFE TO LEAVE

| Item | Why |
|------|-----|
| Historical `TRUTH_PHASE_*` / `architecture-audit` / `design-audit` docs | Engineering history; classified in DOCUMENTATION_MANIFEST |
| Large `scripts/test-*` inventory | Asset; do not delete |
| Dormant intelligence code with flags OFF | Inventory; disclose via LIVE_CAPABILITY_MAP |
| Package name `smartbuy` | Documented alias; rename is post-close optional |
| In-repo acquisition audit markdown | Useful skeptical baseline |

---

## Secrets risk (reconfirmed)

| Check | Result |
|-------|--------|
| `.env.local` ignored | Yes |
| Tracked env | `.env.example` only (expected) |
| Print secrets in docs | Forbidden / not done |

If any secret appears in git history: **STOP**, rotate, do not paste into chat or docs.

---

## Large / noise paths to exclude from buyer zip

- `node_modules/`, `.next/`  
- `docs/architecture-audit/.pdf-gen/`  
- `.env.local`, `.env*.local`, `*.pem`  
- Local IDE / agent transcript folders outside repo product docs  

---

## Seller pre-access checklist

1. Commit acquisition pack (or export zip from FINAL_DATA_ROOM_INDEX).  
2. Verify `git ls-files` has no `.env.local`.  
3. Human: deploy + warm demo + optional latency probe.  
4. Human: counsel on LICENSE.  
5. Share data room link + demo URL under NDA.
