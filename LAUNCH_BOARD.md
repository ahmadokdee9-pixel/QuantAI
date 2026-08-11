# QuantAI Launch Board

**Authority:** Release Director  
**Target gate:** Public Beta  
**Rule:** Only unresolved blockers remain. Completed blockers are deleted forever.  
**Rule:** No new blockers unless objectively required for production safety or reliability.  
**Rule:** When this list is empty → **Public Beta READY**.  
**Rule:** Execute **one High issue at a time**. Stop at VERIFIED before starting the next.

**Status:** `NOT READY` — **8 PB blockers** open · **0 High** remaining · **0 Critical**  
**Plan status:** Wave 1 DONE · Critical C-01/C-02 DONE · **Wave 2 CLOSED** — all Highs verified  
**Last updated:** 2026-08-11 (H-03 verified — see `docs/wave1/H03_VERIFICATION_REPORT.md`)  
**Core development:** **FROZEN** — no new core features without production evidence proving the need.

---

## Wave 2 — High Hardening (CLOSED)

**Objective:** Eliminate confirmed High production defects. No features. No UX polish. No unrelated refactors.

**H-01:** VERIFIED and **deleted forever** (2026-08-05). Evidence: `docs/wave1/H01_VERIFICATION_REPORT.md`.  
**H-06:** VERIFIED and **deleted forever** (2026-08-05). Evidence: `docs/wave1/H06_VERIFICATION_REPORT.md`.  
**H-02:** VERIFIED and **deleted forever** (2026-08-05). Evidence: `docs/wave1/H02_VERIFICATION_REPORT.md`.  
**H-05:** VERIFIED and **deleted forever** (2026-08-11). Evidence: `docs/wave1/H05_VERIFICATION_REPORT.md` · Independent QA: `docs/wave1/H05_INDEPENDENT_QA.json`.  
**H-04:** VERIFIED and **deleted forever** (2026-08-11). Evidence: `docs/wave1/H04_VERIFICATION_REPORT.md` · Independent QA: `docs/wave1/H04_INDEPENDENT_QA.json`.  
**H-07:** VERIFIED and **deleted forever** (2026-08-11). Evidence: `docs/wave1/H07_VERIFICATION_REPORT.md` · Independent QA: `docs/wave1/H07_INDEPENDENT_QA.json`.  
**H-03:** VERIFIED and **deleted forever** (2026-08-11). Evidence: `docs/wave1/H03_VERIFICATION_REPORT.md` · Independent QA: `docs/wave1/H03_INDEPENDENT_QA.json`.

### Remaining High queue

| Rank | ID | Maps to | Effort | Why this order |
|-----:|----|---------|--------|----------------|
| — | — | — | — | **Empty — Wave 2 complete** |

**Next High:** none  
**Critical count:** **0**  
**Remaining High count:** **0**  
**Wave 2 status:** **CLOSED**  
**Public Beta Go/No-Go:** **NO-GO** until remaining PB blockers below clear  
**Next gate:** Final Launch Audit → then Revenue Mode (measure / monetize / retain) — no speculative features

---

## Gate policy

| Gate | Condition |
|------|-----------|
| Private Alpha | Approved |
| Closed Beta | Approved |
| Critical Hardening | Approved (C-01/C-02) |
| **Wave 2 High** | **CLOSED** (Critical = 0 · High = 0) |
| **Public Beta** | All PB blockers below = DONE (list empty) |
| Global / Enterprise | Out of scope |

---

## Remaining PB blockers (full Public Beta gate)

| ID | Priority | Dependencies | Effort | Notes |
|----|----------|--------------|--------|-------|
| **PB-01** | P0 | PB-02 ✓, PB-10 ✓ | M | Economic envelope (auth/ceilings/kill) — H-06 ✓ (guest capacity partial) |
| **PB-04** | P0 | PB-10 ✓ | M | Search yield SLO — H-01 ✓ · H-02 ✓ (residual SLO/alert work may remain) |
| **PB-03** | P0 | Stripe env | S | H-03 ✓ SoT/fail-closed live; residual: set `STRIPE_*` in Vercel for live checkout |
| **PB-07** | P1 | — | M | CSP/XSS — H-05 ✓ (CSP live; residual XSS review optional) |
| **PB-08** | P1 | PB-01 | S | Prompt/outbound review |
| **PB-05** | P1 | — | S | Identity |
| **PB-12** | P1 | — | M | A11y baseline |
| **PB-13** | P1 | Legal | S | Legal pages |

---

## Execution waves (updated)

### Wave 1 — DONE
PB-02 + PB-10 deleted forever.

### Wave 2 — High Hardening — **CLOSED**
All Highs (H-01…H-07) verified and deleted. Core development frozen pending Final Launch Audit + Revenue Mode.

### Wave 3+ — Remaining PB not covered by High queue
PB-08, PB-05, PB-12, PB-13, residual PB-01/PB-03/PB-04 scope after High mapping.

---

## Open blockers (PB register)

### PB-01 — Public economic envelope *(merged: lock decision/run + ceilings + kill switch)*

| Field | Value |
|-------|--------|
| **Severity** | P0 |
| **Business impact** | Unauth/paid upstream burn; public without cost control |
| **User impact** | Outage under abuse; kill switch protects capacity |
| **Effort** | M (1.5–2.5d) |
| **Dependencies** | PB-02 ✓, PB-10 ✓ (Wave 1 done) |
| **Owner** | Eng / Security |
| **Wave** | 2–3 (H-06 guest capacity ✓; auth/ceilings/kill remain) |
| **Verification** | Unauth → 401/403; ceiling → 429; kill switch works; auth path 200 |
| **Definition of Done** | Auth + shared ceilings + kill switch + smoke on paid public paths |

---

### PB-07 — CSP + XSS hardening

| Field | Value |
|-------|--------|
| **Severity** | P1 |
| **Business impact** | XSS on public AI = brand/account risk |
| **User impact** | Session compromise risk |
| **Effort** | M (1–2d) |
| **Dependencies** | None |
| **Owner** | Security |
| **Wave** | 2 (H-05 ✓ CSP live) |
| **Verification** | CSP on Prod HTML; AI HTML sanitized |
| **Definition of Done** | CSP live; XSS paths signed off |

---

### PB-08 — Prompt-injection / outbound abuse *(narrowed)*

| Field | Value |
|-------|--------|
| **Severity** | P1 |
| **Business impact** | Injection/exfil/cost on AI routes |
| **User impact** | Misleading answers; privacy risk |
| **Effort** | S (0.5–1d) |
| **Dependencies** | PB-01, PB-02 |
| **Owner** | Security |
| **Wave** | 3 |
| **Verification** | Allowlist enforced; injection cases fail closed |
| **Definition of Done** | Review complete; remaining vectors mitigated |

---

### PB-04 — Search yield SLO

| Field | Value |
|-------|--------|
| **Severity** | P0 |
| **Business impact** | Empty search = dead funnel |
| **User impact** | Decide returns nothing |
| **Effort** | M (2–3d) |
| **Dependencies** | PB-10 ✓ |
| **Owner** | Eng |
| **Wave** | 2 (H-01 ✓ · H-02 ✓; residual SLO) |
| **Verification** | Canary non-empty rate meets SLO; alert on breach |
| **Definition of Done** | Written SLO + alert + recovery path |

---

### PB-03 — Plan SoT + server entitlements + fail-closed AI *(merged)*

| Field | Value |
|-------|--------|
| **Severity** | P0 |
| **Business impact** | Soft gates + fail-open = no monetization + cost leak |
| **User impact** | Wrong plan access |
| **Effort** | S residual (env) |
| **Dependencies** | Stripe webhooks; Clerk identity |
| **Owner** | Eng / Billing |
| **Wave** | 2 (H-03 ✓ SoT/fail-closed) |
| **Verification** | API entitlement matrix; unsynced ≠ Premium; checkout 503 without Stripe |
| **Definition of Done** | Single SoT ✓; server gates ✓; AI fail-closed ✓; residual: live Stripe keys in Vercel |

---

### PB-05 — Unify product identity

| Field | Value |
|-------|--------|
| **Severity** | P1 |
| **Effort** | S (0.5d) |
| **Owner** | Product |
| **Wave** | 5 |
| **Definition of Done** | Single public identity live |

---

### PB-12 — Accessibility baseline (Decision Card)

| Field | Value |
|-------|--------|
| **Severity** | P1 |
| **Effort** | M (1–2d) |
| **Owner** | Eng |
| **Wave** | 5 |
| **Definition of Done** | Core path baseline checklist pass |

---

### PB-13 — Legal / trust pages

| Field | Value |
|-------|--------|
| **Severity** | P1 |
| **Effort** | S (0.5–1d) |
| **Owner** | Product / Legal |
| **Wave** | 5 |
| **Definition of Done** | Privacy + Terms live and linked |

---

## Completion protocol

1. Wave 2 High queue is **empty** (Critical = 0 · High = 0).  
2. **Freeze core development.**  
3. Run Final Launch Audit against remaining PB blockers + production evidence.  
4. Enter Revenue Mode: measure activation/retention/conversion — no speculative features.  
5. Open PB count = 0 → **PUBLIC BETA READY**.

**Do not start new core feature development without production evidence and Release Director approval.**
