# QuantAI — Documentation Manifest

**Purpose:** Build a clean acquisition data room **without deleting** engineering history.  
**Policy:** Do not auto-delete. Buyers should prefer the structured index [`FINAL_DATA_ROOM_INDEX.md`](./FINAL_DATA_ROOM_INDEX.md) (01–10). [`BUYER_DATA_ROOM.md`](./BUYER_DATA_ROOM.md) remains a quick orientation map.

---

## BUYER-CRITICAL

| Document | Why |
|----------|-----|
| [`FINAL_DATA_ROOM_INDEX.md`](./FINAL_DATA_ROOM_INDEX.md) | Authoritative 01–10 data-room map |
| [`../ACQUISITION_SUMMARY.md`](../ACQUISITION_SUMMARY.md) | Executive summary (~2 pages) |
| [`../README.md`](../README.md) | Product orientation |
| [`../LICENSE`](../LICENSE) | IP transfer draft |
| [`IP_AND_OWNERSHIP.md`](./IP_AND_OWNERSHIP.md) | Ownership boundaries |
| [`ACCESS_AND_SECRETS_HANDOVER.md`](./ACCESS_AND_SECRETS_HANDOVER.md) | Credentials transfer |
| [`ENVIRONMENT.md`](./ENVIRONMENT.md) | Env setup |
| [`ACQUISITION_HANDOVER.md`](./ACQUISITION_HANDOVER.md) | Master handover |
| [`BUYER_ARCHITECTURE_ONE_PAGER.md`](./BUYER_ARCHITECTURE_ONE_PAGER.md) | Architecture |
| [`TECHNICAL_MOAT.md`](./TECHNICAL_MOAT.md) | Hard moat vs commodity infra |
| [`LIVE_CAPABILITY_MAP.md`](./LIVE_CAPABILITY_MAP.md) | Live vs dormant |
| [`BUYER_DATA_ROOM.md`](./BUYER_DATA_ROOM.md) | Quick orientation index |
| [`BUYER_DEMO_SCRIPT.md`](./BUYER_DEMO_SCRIPT.md) | 5–7 min acquisition demo |
| [`GOLDEN_DEMO_QUERIES.md`](./GOLDEN_DEMO_QUERIES.md) | Demo pack |
| [`LIVE_DEMO_READINESS.md`](./LIVE_DEMO_READINESS.md) | Live demo dependency status |
| [`DEMO_LATENCY_PROOF.md`](./DEMO_LATENCY_PROOF.md) | Latency / reliability mechanisms |
| [`PERFORMANCE_EVIDENCE.md`](./PERFORMANCE_EVIDENCE.md) | Honest measured vs unmeasured |
| [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md) | Diligence surprise reduction |
| [`REPOSITORY_HANDOVER_CHECK.md`](./REPOSITORY_HANDOVER_CHECK.md) | Repo hygiene before buyer access |
| [`NAMING_NOTE.md`](./NAMING_NOTE.md) | QuantAI vs smartbuy |
| [`../QUANTAI_ACQUISITION_READINESS_AUDIT.md`](../QUANTAI_ACQUISITION_READINESS_AUDIT.md) | Skeptical readiness audit |
| [`PRODUCTION_ENV_CHECKLIST.md`](./PRODUCTION_ENV_CHECKLIST.md) | Deploy env |
| [`PRODUCTION_ENV_MANIFEST.md`](./PRODUCTION_ENV_MANIFEST.md) | Env manifest |
| [`COST_MONITORING.md`](./COST_MONITORING.md) | Operating cost discipline |
| [`SERPAPI_OPENAI_COST_ALERTS.md`](./SERPAPI_OPENAI_COST_ALERTS.md) | Quota alerts |
| [`BETA_INCIDENT_RESPONSE_CHECKLIST.md`](./BETA_INCIDENT_RESPONSE_CHECKLIST.md) | Incidents |
| [`SUPABASE_PRODUCTION_MIGRATION_CHECKLIST.md`](./SUPABASE_PRODUCTION_MIGRATION_CHECKLIST.md) | DB |

---

## ENGINEERING

| Area | Examples |
|------|----------|
| Production ops | `PRODUCTION_ROLLOUT_CHECKLIST.md`, `PRODUCTION_MONITORING_CHECKLIST.md`, `UPSTASH_RATE_LIMIT_VERIFICATION.md`, `PUBLIC_BETA_*`, `BETA_*`, `INVITE_ONLY_BETA_ROLLOUT.md` |
| Copilot | `COPILOT.md` |
| Truth language | `TRUTH_LANGUAGE_POLICY.md` |
| Architecture audit (phase reports) | `docs/architecture-audit/PHASE*.md`, `QUANTAI_FULL_ARCHITECTURE_AUDIT.md`, `QUANTAI_MASTER_ROADMAP.md`, beta-launch reports under `architecture-audit/beta-launch/` |
| Controlled activation / normalization sprint notes | `CONTROLLED_ACTIVATION_REPORT.md`, `NORMALIZATION_SPRINT2_PRODUCTION.md`, etc. |

Useful for engineers post-close; **not** required for a 10-minute buyer skim.

---

## HISTORICAL

| Area | Examples |
|------|----------|
| Truth phase architecture series | `docs/TRUTH_PHASE_*.md` (large phase trail) |
| Stage1 shadow rollout notes | `docs/architecture-audit/stage1-shadow/` |
| Design evolution / cosmic / titanium reports | `docs/design-audit/*` (may reference removed UI) |

Preserve for history; do not present as current product claims.

---

## INTERNAL / NOT FOR DATA ROOM

| Item | Why |
|------|-----|
| `docs/architecture-audit/.pdf-gen/node_modules/` | Vendored tool noise — exclude from zip/data room |
| Agent-only notes / local IDE artifacts | Not product IP packaging |
| Raw probe JSON under `.validation/` (if present) | Ops artifacts; share selectively |

---

## Suggested data-room zip contents

Include **BUYER-CRITICAL** + `.env.example` + `supabase/migrations/` listing + CI workflow files.  
Optionally attach ENGINEERING ops checklists.  
Omit HISTORICAL design-audit + `.pdf-gen` unless buyer requests full archive.
