# QuantAI Launch Board

**Authority:** Release Director  
**Target gate:** Public Beta  
**Rule:** Only unresolved blockers remain. Completed blockers are deleted forever.  
**Rule:** No new blockers unless objectively required for production safety or reliability.  
**Rule:** When this list is empty → **Public Beta READY**.  
**Rule:** Execute **one High issue at a time**. Stop at VERIFIED before starting the next.

**Status:** `NOT READY` — **10 PB blockers** open · **4 High** remaining  
**Plan status:** Wave 1 DONE · Critical C-01/C-02 DONE · **Wave 2 OPEN** — H-01 ✓ · H-06 ✓ · H-02 ✓  
**Last updated:** 2026-08-05 (H-02 verified — see `docs/wave1/H02_VERIFICATION_REPORT.md`)

---

## Wave 2 — High Hardening (OPEN)

**Objective:** Eliminate confirmed High production defects. No features. No UX polish. No unrelated refactors.

**H-01:** VERIFIED and **deleted forever** (2026-08-05). Evidence: `docs/wave1/H01_VERIFICATION_REPORT.md`.  
**H-06:** VERIFIED and **deleted forever** (2026-08-05). Evidence: `docs/wave1/H06_VERIFICATION_REPORT.md`.  
**H-02:** VERIFIED and **deleted forever** (2026-08-05). Evidence: `docs/wave1/H02_VERIFICATION_REPORT.md` · Independent QA: `docs/wave1/H02_INDEPENDENT_QA.json`.

### Remaining High queue (ranked — execute in this order)

| Rank | ID | Maps to | Effort | Why this order |
|-----:|----|---------|--------|----------------|
| 1 | **H-05** | PB-07 | M | Exploitability (missing CSP) |
| 2 | **H-04** | PB-11 | S | Auth funnel 404; fast win after search/security pressure |
| 3 | **H-07** | PB-09 | M–L | Bounce risk; heavier; after functional Highs |
| 4 | **H-03** | PB-03 (config/billing) | S–M | Monetization; may be env SoT — after product reliability |

**Next to execute (after explicit approval only):** **H-05**  
**Protocol per issue:** Reproduce → Failing regression → Fix → Build → Deploy → Prod verify → Independent QA → Remove from board → STOP

**Wave 2 est. completion (High only):** ~5–9 eng-days sequential remaining  
**Public Beta Go/No-Go:** **NO-GO** until High queue + remaining PB blockers clear  
**Remaining High count:** **4**

---

## Gate policy

| Gate | Condition |
|------|-----------|
| Private Alpha | Approved |
| Closed Beta | Approved |
| Critical Hardening | Approved (C-01/C-02) |
| **Wave 2 High** | OPEN — execute one-by-one from ranked queue |
| **Public Beta** | All PB blockers below = DONE (list empty) |
| Global / Enterprise | Out of scope |

---

## Remaining PB blockers (full Public Beta gate)

| ID | Priority | Dependencies | Effort | Notes |
|----|----------|--------------|--------|-------|
| **PB-01** | P0 | PB-02 ✓, PB-10 ✓ | M | Economic envelope (auth/ceilings/kill) — H-06 ✓ (guest capacity partial) |
| **PB-04** | P0 | PB-10 ✓ | M | Search yield SLO — H-01 ✓ · H-02 ✓ (residual SLO/alert work may remain) |
| **PB-03** | P0 | Stripe, Clerk | M | Plan SoT — **owns H-03** |
| **PB-07** | P1 | — | M | CSP/XSS — **owns H-05** |
| **PB-08** | P1 | PB-01 | S | Prompt/outbound review |
| **PB-11** | P1 | Clerk | S | Guest auth UX — **owns H-04** |
| **PB-09** | P1 | — | M | Payload weight — **owns H-07** |
| **PB-05** | P1 | — | S | Identity |
| **PB-12** | P1 | — | M | A11y baseline |
| **PB-13** | P1 | Legal | S | Legal pages |

---

## Execution waves (updated)

### Wave 1 — DONE
PB-02 + PB-10 deleted forever.

### Wave 2 — High Hardening — OPEN
H-01 + H-06 + H-02 deleted. Execute remaining ranked High queue (H-05 → … → H-03). One at a time.  
PB-01 full economic envelope remains for auth/ceilings/kill beyond H-06.

### Wave 3+ — Remaining PB not covered by High queue
PB-08, PB-05, PB-12, PB-13, residual PB-01/PB-03 scope after High mapping.

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
| **Wave** | 2 rank H-05 / Wave 3 |
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

### PB-11 — Guest auth UX (no silent 404)

| Field | Value |
|-------|--------|
| **Severity** | P1 |
| **Business impact** | Signup abandonment |
| **User impact** | Protected routes 404 instead of sign-in |
| **Effort** | S (0.5d) |
| **Dependencies** | Clerk protect |
| **Owner** | Eng |
| **Wave** | 2 rank H-04 |
| **Verification** | Unauth → sign-in redirect; post-auth land correct |
| **Definition of Done** | Known destinations never silent-404 |

---

### PB-09 — Cut critical-path payload weight

| Field | Value |
|-------|--------|
| **Severity** | P1 |
| **Business impact** | Bounce on slow first load |
| **User impact** | Weak mobile first impression |
| **Effort** | M (2–3d) |
| **Dependencies** | None |
| **Owner** | Eng |
| **Wave** | 2 rank H-07 |
| **Verification** | Weight before/after recorded; Decide flow no regression |
| **Definition of Done** | Measurable critical-path reduction shipped |

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
| **Wave** | 2 rank H-02 (H-01 ✓) |
| **Verification** | Canary non-empty rate meets SLO; alert on breach |
| **Definition of Done** | Written SLO + alert + recovery path |

---

### PB-03 — Plan SoT + server entitlements + fail-closed AI *(merged)*

| Field | Value |
|-------|--------|
| **Severity** | P0 |
| **Business impact** | Soft gates + fail-open = no monetization + cost leak |
| **User impact** | Wrong plan access |
| **Effort** | M (2–3d) |
| **Dependencies** | Stripe webhooks; Clerk plan sync |
| **Owner** | Eng / Billing |
| **Wave** | 2 rank H-03 / Wave 5 |
| **Verification** | API entitlement matrix; unsynced ≠ Premium; cap → 429 |
| **Definition of Done** | Single SoT; server gates; AI fail-closed |

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

1. Explicit approval for the next ranked High issue only.  
2. Reproduce → test → fix → build → deploy → verify → independent QA.  
3. Delete that High (and mapped PB if fully satisfied) forever.  
4. STOP. Await approval for the next High.  
5. Open count = 0 → **PUBLIC BETA READY**.

**Do not start the next High (H-02) until Release Director approval is explicit.**
