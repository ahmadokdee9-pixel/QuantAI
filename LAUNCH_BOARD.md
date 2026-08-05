# QuantAI Launch Board

**Authority:** Program Manager → Release Director  
**Target gate:** Public Beta  
**Rule:** Only unresolved blockers remain. Completed blockers are deleted forever.  
**Rule:** No new blockers unless objectively required for production safety or reliability.  
**Rule:** When this list is empty → **Public Beta READY**.  
**Rule:** Execute by waves only. Verify production after every wave. Do not polish.

**Status:** `NOT READY` — **10 blockers** open  
**Plan status:** Wave 1 DONE · Critical QA C-01/C-02 HARDENED · Wave 2 LOCKED  
**Last updated:** 2026-08-05 (Critical Hardening verified — see `docs/wave1/CRITICAL_HARDENING_VERIFICATION_REPORT.md`)

---

## Optimization changelog (effort cut)

| Action | Result |
|--------|--------|
| **Merged** old PB-01 + PB-14 → **PB-01** Public economic envelope | One auth/limit/ceiling/kill-switch workstream; remove duplicate rate-limit wiring |
| **Merged** old PB-03 + PB-06 → **PB-03** Plan SoT + entitlements + fail-closed AI | One billing/authz workstream; remove double plan checks |
| **Narrowed** PB-08 | After PB-01: review + outbound/injection only — do not re-build rate limits |
| **Removed as separate items** | Old PB-06, old PB-14 (absorbed) |
| **Not removed** | PB-05 / PB-11 / PB-12 / PB-13 — still required for public trust/conversion; kept minimal scope |
| **Net** | 14 → **12** blockers · ~3–5 eng-days saved vs parallel duplicate streams · calendar time cut via waves |

**Wave 1 complete:** PB-02 + PB-10 deleted forever. Next unlocker: **PB-01** (Wave 2 — locked).

---

## Gate policy

| Gate | Condition |
|------|-----------|
| Private Alpha | Approved |
| Closed Beta | Approved |
| **Public Beta** | All blockers below = DONE (list empty) |
| Global / Enterprise | Out of scope |

---

## Final execution roadmap (summary)

| ID | Priority | Dependencies | Effort | Risk | Unlock value | Parallel? | Owner |
|----|----------|--------------|--------|------|--------------|-----------|-------|
| **PB-01** | P0 | PB-02 ✓, PB-10 ✓ | M (1.5–2.5d) | Med | Unlocks safe public surface; shrinks PB-08; stops Serp burn | No · W2 LOCKED | Eng / Security |
| **PB-07** | P1 | None (after W1 ideal) | M (1–2d) | Med | XSS/CSP baseline for public HTML/AI | **Yes** w/ PB-08, PB-11 | Security |
| **PB-08** | P1 | PB-01, PB-02 | S (0.5–1d) | Med | Closes injection/outbound gaps without rebuild | **Yes** w/ PB-07, PB-11 | Security |
| **PB-11** | P1 | Clerk protect | S (0.5d) | Low | Fixes guest→auth funnel; signup recovery | **Yes** w/ PB-07, PB-08 | Eng |
| **PB-09** | P1 | None | M (2–3d) | Med | Mobile TTI / premium feel; reduces bounce | **Yes** w/ PB-04 | Eng |
| **PB-04** | P0 | PB-10 | M (2–3d) | High | Search non-empty = funnel alive | **Yes** w/ PB-09 | Eng |
| **PB-03** | P0 | Stripe webhooks; Clerk plan | M (2–3d) | High | Real monetization; fail-closed AI | **Yes** w/ PB-05/12/13 | Eng / Billing |
| **PB-05** | P1 | None | S (0.5d) | Low | 10-second clarity; conversion | **Yes** in W5 | Product |
| **PB-12** | P1 | None | M (1–2d) | Low | Keyboard/SR core path; public risk down | **Yes** in W5 | Eng |
| **PB-13** | P1 | Legal copy | S (0.5–1d) | Low | Pay/trust compliance baseline | **Yes** in W5 | Product / Legal |

**Est. sequential effort:** ~16–22 eng-days  
**Est. calendar with waves (1 eng):** ~12–16 days · **(2 eng):** ~8–11 days

---

## Execution waves

Each wave is **independently deployable**. After each wave: production verify (below). Do not start the next wave until verify passes.

### Wave 1 — Highest leverage — DONE (2026-08-05)

**Completed:** PB-02 + PB-10 (removed from open blockers)  
**Report:** `docs/wave1/WAVE1_VERIFICATION_REPORT.md`

**Production verify (Wave 1)**
- [x] `UPSTASH_*` present in Vercel Production
- [x] Health shows shared rate store configured — not in-memory-only
- [x] Empty-search rate, 5xx, and upstream cost/proxy signals visible within minutes
- [x] Smoke: production smoke script green
- [x] Deploy marked READY on Vercel Production

---

### Wave 2 — Infrastructure (economic envelope) — LOCKED

**Deploy:** PB-01 only · **LOCKED until explicit approval**  
**Deps satisfied:** PB-02 (done) · PB-10 (done)  
**Why here:** Cost-control backbone for public traffic.

| ID | Priority | Deps | Effort | Risk | Unlock value | Parallel | Owner |
|----|----------|------|--------|------|--------------|----------|-------|
| PB-01 | P0 | PB-02, PB-10 | M | Med | Auth + ceilings + kill switch on paid paths | No | Eng / Security |

**Scope (merged):** Lock `/api/decision/run` + guest search/AI ceilings + kill switch. One PR stream.

**Production verify (Wave 2)**
- [ ] Unauth `POST /api/decision/run` → 401/403
- [ ] Over-ceiling guest → 429 (shared store)
- [ ] Kill switch disables paid upstreams (flag test)
- [ ] Auth happy path still 200
- [ ] Cost/ceiling alerts fire on test breach (or dry-run)
- [ ] Production smoke green

---

### Wave 3 — Security

**Deploy together:** PB-07 + PB-08 + PB-11  
**Parallel:** Yes.

| ID | Priority | Deps | Effort | Risk | Unlock value | Parallel | Owner |
|----|----------|------|--------|------|--------------|----------|-------|
| PB-07 | P1 | — | M | Med | CSP + XSS on AI/HTML | Yes | Security |
| PB-08 | P1 | PB-01, PB-02 | S | Med | Injection/outbound review only | Yes | Security |
| PB-11 | P1 | Clerk | S | Low | Sign-in redirect not 404 | Yes | Eng |

**Production verify (Wave 3)**
- [ ] CSP header present on production HTML
- [ ] Spot-check: AI/HTML output sanitized
- [ ] Injection/outbound allowlist cases fail closed
- [ ] Unauth `/dashboard` (and peers) → sign-in, not 404
- [ ] Production smoke green

---

### Wave 4 — Performance

**Deploy together:** PB-09 + PB-04  
**Parallel:** Yes (different owners possible).

| ID | Priority | Deps | Effort | Risk | Unlock value | Parallel | Owner |
|----|----------|------|--------|------|--------------|----------|-------|
| PB-09 | P1 | — | M | Med | Critical-path weight down | Yes | Eng |
| PB-04 | P0 | PB-10 | M | High | Non-empty search SLO | Yes | Eng |

**Production verify (Wave 4)**
- [ ] Homepage critical CSS/JS weight reduced vs pre-wave baseline (recorded)
- [ ] Decide flow functional (no regression)
- [ ] Canary queries meet written non-empty SLO
- [ ] Empty-rate alert path confirmed
- [ ] Production smoke green

---

### Wave 5 — Business

**Deploy together:** PB-03 + PB-05 + PB-12 + PB-13  
**Parallel:** Yes (PB-03 is the long pole).

| ID | Priority | Deps | Effort | Risk | Unlock value | Parallel | Owner |
|----|----------|------|--------|------|--------------|----------|-------|
| PB-03 | P0 | Stripe, Clerk | M | High | Monetization real | Yes | Eng / Billing |
| PB-05 | P1 | — | S | Low | One identity | Yes | Product |
| PB-12 | P1 | — | M | Low | Decision Card a11y baseline | Yes | Eng |
| PB-13 | P1 | Legal copy | S | Low | Privacy + Terms live | Yes | Product / Legal |

**Production verify (Wave 5)**
- [ ] Free cannot call Premium-gated APIs successfully
- [ ] Unsynced/unknown plan → fail-closed on AI caps
- [ ] Stripe webhook updates plan; E2E checked
- [ ] Live title/home/pricing/how-it-works = one mission
- [ ] Privacy + Terms 200 + linked; no marketed dead trust URLs
- [ ] Decision Card: keyboard Decide → Compare; focus + SR labels
- [ ] Production smoke green

**→ If open list empty after Wave 5 verify: declare `PUBLIC BETA READY`.**

---

## Open blockers (full register)

### PB-01 — Public economic envelope *(merged: lock decision/run + ceilings + kill switch)*

| Field | Value |
|-------|--------|
| **Severity** | P0 |
| **Business impact** | Unauth/paid upstream burn; public without cost control |
| **User impact** | Outage under abuse; kill switch protects capacity |
| **Effort** | M (1.5–2.5d) |
| **Dependencies** | PB-02 ✓, PB-10 ✓ (Wave 1 done) |
| **Owner** | Eng / Security |
| **Wave** | 2 |
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
| **Wave** | 3 |
| **Verification** | CSP on Prod HTML; AI HTML sanitized; no unsanitized dangerous HTML paths |
| **Definition of Done** | CSP live; XSS paths signed off |

---

### PB-08 — Prompt-injection / outbound abuse *(narrowed)*

| Field | Value |
|-------|--------|
| **Severity** | P1 |
| **Business impact** | Injection/exfil/cost on AI routes |
| **User impact** | Misleading answers; privacy risk |
| **Effort** | S (0.5–1d) — review only; do not rebuild limits |
| **Dependencies** | PB-01, PB-02 |
| **Owner** | Security |
| **Wave** | 3 |
| **Verification** | Allowlist enforced; injection cases fail closed; routes already limited by PB-01 |
| **Definition of Done** | Review complete; remaining vectors mitigated in code |

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
| **Wave** | 3 |
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
| **Wave** | 4 |
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
| **Dependencies** | PB-10 |
| **Owner** | Eng |
| **Wave** | 4 |
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
| **Wave** | 5 |
| **Verification** | API entitlement matrix enforced; unsynced ≠ Premium; cap → 429; webhook E2E |
| **Definition of Done** | Single SoT; server gates; AI fail-closed |

---

### PB-05 — Unify product identity

| Field | Value |
|-------|--------|
| **Severity** | P1 |
| **Business impact** | Split positioning kills conversion |
| **User impact** | Fails 10-second test |
| **Effort** | S (0.5d) |
| **Dependencies** | None |
| **Owner** | Product |
| **Wave** | 5 |
| **Verification** | title + home + pricing + how-it-works = one mission |
| **Definition of Done** | Single public identity live |

---

### PB-12 — Accessibility baseline (Decision Card)

| Field | Value |
|-------|--------|
| **Severity** | P1 |
| **Business impact** | Public/legal rejection risk |
| **User impact** | Keyboard/SR blocked on core path |
| **Effort** | M (1–2d) |
| **Dependencies** | None |
| **Owner** | Eng |
| **Wave** | 5 |
| **Verification** | Keyboard Decide→Compare; focus; contrast; SR labels |
| **Definition of Done** | Core path baseline checklist pass |

---

### PB-13 — Legal / trust pages

| Field | Value |
|-------|--------|
| **Severity** | P1 |
| **Business impact** | Pay/trust/compliance risk |
| **User impact** | Will not pay without Privacy/Terms |
| **Effort** | S (0.5–1d) |
| **Dependencies** | Legal copy |
| **Owner** | Product / Legal |
| **Wave** | 5 |
| **Verification** | Privacy + Terms 200 + linked; no marketed dead URLs |
| **Definition of Done** | Privacy + Terms live and linked |

---

## Completion protocol

1. Execute **one wave** only.  
2. Deploy.  
3. Run that wave’s **Production verify**.  
4. Delete completed blocker sections from this file forever.  
5. Start next wave.  
6. Open count = 0 → **PUBLIC BETA READY**.

**Wave 2 remains locked until explicitly approved.**
