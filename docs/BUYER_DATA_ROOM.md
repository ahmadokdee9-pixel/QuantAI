# QuantAI — Buyer Data Room Index

**Start here for technical due diligence.**  
Product brand: **QuantAI** · Repository/npm name: `smartbuy`.

**Primary buyer entry (current):** [`FINAL_BUYER_DATA_ROOM.md`](./FINAL_BUYER_DATA_ROOM.md).  
**Structured 01–10 map:** [`FINAL_DATA_ROOM_INDEX.md`](./FINAL_DATA_ROOM_INDEX.md).  
This file remains a quick orientation map from Sprint 2.

Estimated path: 10 minutes to orientation → deep links as needed.

---

## 1. Legal / ownership

| Document | Link |
|----------|------|
| License (proprietary draft) | [`../LICENSE`](../LICENSE) |
| IP & ownership inventory | [`IP_AND_OWNERSHIP.md`](./IP_AND_OWNERSHIP.md) |
| Naming (QuantAI vs smartbuy) | [`NAMING_NOTE.md`](./NAMING_NOTE.md) |

**SELLER/COUNSEL CONFIRMATION REQUIRED** before closing on copyright holder and trademarks.

---

## 2. Product & architecture

| Document | Link |
|----------|------|
| Product README | [`../README.md`](../README.md) |
| Architecture one-pager | [`BUYER_ARCHITECTURE_ONE_PAGER.md`](./BUYER_ARCHITECTURE_ONE_PAGER.md) |
| Live vs dormant map | [`LIVE_CAPABILITY_MAP.md`](./LIVE_CAPABILITY_MAP.md) |
| Master handover | [`ACQUISITION_HANDOVER.md`](./ACQUISITION_HANDOVER.md) |
| Full readiness audit (skeptical) | [`../QUANTAI_ACQUISITION_READINESS_AUDIT.md`](../QUANTAI_ACQUISITION_READINESS_AUDIT.md) |

---

## 3. Environment, secrets, ops

| Document | Link |
|----------|------|
| Environment (buyer-classed) | [`ENVIRONMENT.md`](./ENVIRONMENT.md) |
| Access & secrets handover | [`ACCESS_AND_SECRETS_HANDOVER.md`](./ACCESS_AND_SECRETS_HANDOVER.md) |
| Production env checklist | [`PRODUCTION_ENV_CHECKLIST.md`](./PRODUCTION_ENV_CHECKLIST.md) |
| Production env manifest | [`PRODUCTION_ENV_MANIFEST.md`](./PRODUCTION_ENV_MANIFEST.md) |
| Env template | [`../.env.example`](../.env.example) |
| Cost / SerpAPI alerts | [`COST_MONITORING.md`](./COST_MONITORING.md), [`SERPAPI_OPENAI_COST_ALERTS.md`](./SERPAPI_OPENAI_COST_ALERTS.md) |
| Incident response | [`BETA_INCIDENT_RESPONSE_CHECKLIST.md`](./BETA_INCIDENT_RESPONSE_CHECKLIST.md) |
| Supabase migrations checklist | [`SUPABASE_PRODUCTION_MIGRATION_CHECKLIST.md`](./SUPABASE_PRODUCTION_MIGRATION_CHECKLIST.md) |

---

## 4. Demo & latency

| Document | Link |
|----------|------|
| Golden demo queries | [`GOLDEN_DEMO_QUERIES.md`](./GOLDEN_DEMO_QUERIES.md) |
| Latency / stale-prefer proof | [`DEMO_LATENCY_PROOF.md`](./DEMO_LATENCY_PROOF.md) |
| Public beta 30-query QA | [`PUBLIC_BETA_30_QUERY_QA.md`](./PUBLIC_BETA_30_QUERY_QA.md) |

---

## 5. Quality evidence (verified gates only)

Do **not** claim CI runs all `test:*` scripts.

| Gate | Command | Last verified result (Sprint 1) |
|------|---------|----------------------------------|
| Production build | `npm run build` | PASS |
| TypeScript | `npx tsc --noEmit` | PASS |
| Phase A rank authority | `npm run test:phase-a-rank-authority` | **11/11** |
| Decision calibration | `npm run test:phase-a-decision-calibration` | **17/17** |
| Phase 4 ranking validation | `npm run test:phase4-ranking-validation` | **23/23** |
| P0 production readiness | `npm run test:p0-production-readiness` | PASS (incl. merchant-diversity) |

CI workflow (subset): [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)  
Production validation workflow: [`.github/workflows/production-validation.yml`](../.github/workflows/production-validation.yml)

---

## 6. Documentation hygiene

| Document | Link |
|----------|------|
| Manifest (buyer-critical vs historical) | [`DOCUMENTATION_MANIFEST.md`](./DOCUMENTATION_MANIFEST.md) |

---

## 7. Suggested diligence order

1. README → Architecture one-pager → Live capability map  
2. LICENSE + IP  
3. Environment + Access/secrets  
4. Golden queries + Latency proof  
5. Run acquisition gates locally or review CI artifacts  
6. Handover checklist + cost/incident docs  
7. Deep-dive `docs/architecture-audit/` only if needed (ENGINEERING / HISTORICAL)
