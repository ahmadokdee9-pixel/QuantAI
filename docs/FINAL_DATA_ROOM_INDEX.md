# QuantAI — Final Data Room Index

**Authoritative acquisition package map (Sprint 3).**  
Prefer this index for buyer zip / shared diligence folders.  
Brand: **QuantAI** · Package: `smartbuy`.

---

## 01 — Executive Product Overview

| Document | Path |
|----------|------|
| Acquisition executive summary | [`../ACQUISITION_SUMMARY.md`](../ACQUISITION_SUMMARY.md) |
| Product README | [`../README.md`](../README.md) |
| Readiness audit (skeptical baseline) | [`../QUANTAI_ACQUISITION_READINESS_AUDIT.md`](../QUANTAI_ACQUISITION_READINESS_AUDIT.md) |
| Naming (QuantAI vs smartbuy) | [`NAMING_NOTE.md`](./NAMING_NOTE.md) |

---

## 02 — Architecture & Technical Moat

| Document | Path |
|----------|------|
| Architecture one-pager | [`BUYER_ARCHITECTURE_ONE_PAGER.md`](./BUYER_ARCHITECTURE_ONE_PAGER.md) |
| Live vs dormant capability map | [`LIVE_CAPABILITY_MAP.md`](./LIVE_CAPABILITY_MAP.md) |
| Technical moat memo | [`TECHNICAL_MOAT.md`](./TECHNICAL_MOAT.md) |

---

## 03 — IP / Ownership / Licensing

| Document | Path |
|----------|------|
| License (proprietary draft) | [`../LICENSE`](../LICENSE) |
| IP & ownership | [`IP_AND_OWNERSHIP.md`](./IP_AND_OWNERSHIP.md) |

---

## 04 — Deployment & Environment

| Document | Path |
|----------|------|
| Environment (buyer-classed) | [`ENVIRONMENT.md`](./ENVIRONMENT.md) |
| Production env checklist | [`PRODUCTION_ENV_CHECKLIST.md`](./PRODUCTION_ENV_CHECKLIST.md) |
| Production env manifest | [`PRODUCTION_ENV_MANIFEST.md`](./PRODUCTION_ENV_MANIFEST.md) |
| Env template | [`../.env.example`](../.env.example) |
| Supabase migrations checklist | [`SUPABASE_PRODUCTION_MIGRATION_CHECKLIST.md`](./SUPABASE_PRODUCTION_MIGRATION_CHECKLIST.md) |
| Live demo readiness | [`LIVE_DEMO_READINESS.md`](./LIVE_DEMO_READINESS.md) |

---

## 05 — Security & Credential Transfer

| Document | Path |
|----------|------|
| Access & secrets handover | [`ACCESS_AND_SECRETS_HANDOVER.md`](./ACCESS_AND_SECRETS_HANDOVER.md) |
| Repository handover hygiene | [`REPOSITORY_HANDOVER_CHECK.md`](./REPOSITORY_HANDOVER_CHECK.md) |

---

## 06 — Demo & Performance Evidence

| Document | Path |
|----------|------|
| Buyer demo script (5–7 min) | [`BUYER_DEMO_SCRIPT.md`](./BUYER_DEMO_SCRIPT.md) |
| Golden demo queries | [`GOLDEN_DEMO_QUERIES.md`](./GOLDEN_DEMO_QUERIES.md) |
| Demo latency / stale-prefer | [`DEMO_LATENCY_PROOF.md`](./DEMO_LATENCY_PROOF.md) |
| Performance evidence (honest) | [`PERFORMANCE_EVIDENCE.md`](./PERFORMANCE_EVIDENCE.md) |

---

## 07 — Quality / Validation Evidence

| Gate | Command |
|------|---------|
| Build | `npm run build` |
| TypeScript | `npx tsc --noEmit` |
| Phase A rank authority | `npm run test:phase-a-rank-authority` → **11/11** |
| Decision calibration | `npm run test:phase-a-decision-calibration` → **17/17** |
| Phase 4 ranking | `npm run test:phase4-ranking-validation` → **23/23** |
| P0 production readiness | `npm run test:p0-production-readiness` |

Also: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (subset) · Documentation manifest [`DOCUMENTATION_MANIFEST.md`](./DOCUMENTATION_MANIFEST.md)

---

## 08 — Known Limitations

| Document | Path |
|----------|------|
| Known limitations disclosure | [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md) |

---

## 09 — Operational Costs & Vendors

| Document | Path |
|----------|------|
| Cost monitoring | [`COST_MONITORING.md`](./COST_MONITORING.md) |
| SerpAPI / OpenAI alerts | [`SERPAPI_OPENAI_COST_ALERTS.md`](./SERPAPI_OPENAI_COST_ALERTS.md) |
| Upstash verification | [`UPSTASH_RATE_LIMIT_VERIFICATION.md`](./UPSTASH_RATE_LIMIT_VERIFICATION.md) |
| Incident response | [`BETA_INCIDENT_RESPONSE_CHECKLIST.md`](./BETA_INCIDENT_RESPONSE_CHECKLIST.md) |

---

## 10 — Acquisition Handover

| Document | Path |
|----------|------|
| Master handover | [`ACQUISITION_HANDOVER.md`](./ACQUISITION_HANDOVER.md) |
| Prior data-room index (Sprint 2) | [`BUYER_DATA_ROOM.md`](./BUYER_DATA_ROOM.md) — use **this FINAL index** as primary |

---

## Zip recommendation

Include sections **01–10** buyer-critical files + `supabase/migrations/` + `.env.example`.  
Exclude `docs/architecture-audit/.pdf-gen/node_modules/` and local `.env.local`.
