# QuantAI — Documentation Manifest

**Purpose:** Clean acquisition data room **without deleting** engineering history.  
**Policy:** Do not auto-delete.  

---

## START HERE (buyer flow)

1. [`FINAL_BUYER_DATA_ROOM.md`](./FINAL_BUYER_DATA_ROOM.md) — **single buyer entry point**  
2. [`ACQUISITION_EXECUTIVE_SUMMARY.md`](./ACQUISITION_EXECUTIVE_SUMMARY.md)  
3. [`../README.md`](../README.md)  
4. [`BUYER_ARCHITECTURE_ONE_PAGER.md`](./BUYER_ARCHITECTURE_ONE_PAGER.md)  
5. [`TECHNICAL_MOAT.md`](./TECHNICAL_MOAT.md)  
6. [`LIVE_CAPABILITY_MAP.md`](./LIVE_CAPABILITY_MAP.md)  
7. [`TECHNICAL_ASSET_INVENTORY.md`](./TECHNICAL_ASSET_INVENTORY.md)  
8. [`PERFORMANCE_EVIDENCE.md`](./PERFORMANCE_EVIDENCE.md)  
9. [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md)  
10. [`BUYER_RISK_REGISTER.md`](./BUYER_RISK_REGISTER.md)  
11. [`ACCESS_AND_SECRETS_HANDOVER.md`](./ACCESS_AND_SECRETS_HANDOVER.md)  
12. [`ACQUISITION_HANDOVER.md`](./ACQUISITION_HANDOVER.md)

---

## BUYER-CRITICAL (supporting evidence)

| Document | Why |
|----------|-----|
| [`FINAL_DATA_ROOM_INDEX.md`](./FINAL_DATA_ROOM_INDEX.md) | Structured 01–10 map (supporting index) |
| [`BUYER_DATA_ROOM.md`](./BUYER_DATA_ROOM.md) | Sprint 2 orientation map (superseded as entry by FINAL_BUYER_DATA_ROOM) |
| [`../ACQUISITION_SUMMARY.md`](../ACQUISITION_SUMMARY.md) | Root exec summary (parallel to docs/ACQUISITION_EXECUTIVE_SUMMARY) |
| [`../LICENSE`](../LICENSE) | IP transfer draft |
| [`IP_AND_OWNERSHIP.md`](./IP_AND_OWNERSHIP.md) | Ownership boundaries |
| [`ENVIRONMENT.md`](./ENVIRONMENT.md) | Env setup |
| [`BUYER_DEMO_SCRIPT.md`](./BUYER_DEMO_SCRIPT.md) | 5–7 min demo |
| [`GOLDEN_DEMO_QUERIES.md`](./GOLDEN_DEMO_QUERIES.md) | Demo pack |
| [`LIVE_DEMO_READINESS.md`](./LIVE_DEMO_READINESS.md) | Demo dependency status |
| [`DEMO_LATENCY_PROOF.md`](./DEMO_LATENCY_PROOF.md) | Latency mechanisms |
| [`REPOSITORY_HANDOVER_CHECK.md`](./REPOSITORY_HANDOVER_CHECK.md) | Repo hygiene |
| [`NAMING_NOTE.md`](./NAMING_NOTE.md) | QuantAI vs smartbuy |
| [`../QUANTAI_ACQUISITION_READINESS_AUDIT.md`](../QUANTAI_ACQUISITION_READINESS_AUDIT.md) | Skeptical baseline audit |
| [`PRODUCTION_ENV_CHECKLIST.md`](./PRODUCTION_ENV_CHECKLIST.md) | Deploy env |
| [`PRODUCTION_ENV_MANIFEST.md`](./PRODUCTION_ENV_MANIFEST.md) | Env manifest |
| [`COST_MONITORING.md`](./COST_MONITORING.md) | Operating cost discipline |
| [`SERPAPI_OPENAI_COST_ALERTS.md`](./SERPAPI_OPENAI_COST_ALERTS.md) | Quota alerts |
| [`BETA_INCIDENT_RESPONSE_CHECKLIST.md`](./BETA_INCIDENT_RESPONSE_CHECKLIST.md) | Incidents |
| [`SUPABASE_PRODUCTION_MIGRATION_CHECKLIST.md`](./SUPABASE_PRODUCTION_MIGRATION_CHECKLIST.md) | DB |

---

## DUPLICATE / SUPERSEDED (keep; do not auto-delete)

| Document | Note |
|----------|------|
| `BUYER_DATA_ROOM.md` | Orientation only — prefer `FINAL_BUYER_DATA_ROOM.md` |
| `FINAL_DATA_ROOM_INDEX.md` | Folder map — prefer `FINAL_BUYER_DATA_ROOM.md` for narrative diligence |
| `../ACQUISITION_SUMMARY.md` | Prefer `docs/ACQUISITION_EXECUTIVE_SUMMARY.md` as canonical exec summary going forward |

---

## ENGINEERING

| Area | Examples |
|------|----------|
| Production ops | `PRODUCTION_ROLLOUT_CHECKLIST.md`, `PRODUCTION_MONITORING_CHECKLIST.md`, `UPSTASH_RATE_LIMIT_VERIFICATION.md`, `PUBLIC_BETA_*`, `BETA_*`, `INVITE_ONLY_BETA_ROLLOUT.md` |
| Copilot | `COPILOT.md` |
| Truth language | `TRUTH_LANGUAGE_POLICY.md` |
| Architecture audit | `docs/architecture-audit/*` |
| Controlled activation notes | `CONTROLLED_ACTIVATION_REPORT.md`, etc. |

Useful post-close; not required for a 10-minute buyer skim.

---

## HISTORICAL

| Area | Examples |
|------|----------|
| Truth phase series | `docs/TRUTH_PHASE_*.md` |
| Stage1 shadow | `docs/architecture-audit/stage1-shadow/` |
| Design evolution | `docs/design-audit/*` |

Preserve; do not present as current product claims. Some historical docs may use marketing language (e.g. “production-ready”) that is **not** acquisition packaging language.

---

## INTERNAL / NOT FOR DATA ROOM ZIP

| Item | Why |
|------|-----|
| `docs/architecture-audit/.pdf-gen/node_modules/` | Vendored noise |
| Agent/IDE artifacts | Not product IP packaging |
| `.env.local`, backups, `.env.vercel-staging` | Secrets — **MUST EXCLUDE** |
| Raw probe JSON under `.validation/` (if present) | Share selectively |

---

## Suggested data-room zip contents

Include **START HERE** set + BUYER-CRITICAL + `.env.example` + `supabase/migrations/` + CI workflow.  
Omit HISTORICAL design-audit + `.pdf-gen` unless buyer requests full archive.
