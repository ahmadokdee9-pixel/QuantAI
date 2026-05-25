# Invite-only beta rollout instructions

Operational guide for Phase 0 (internal) and Phase 1 (first 100 invitees). No product/UI changes.

**Related:** `docs/BETA_ROLLOUT_PLAN.md`, `docs/PUBLIC_BETA_LAUNCH_CHECKLIST.md`, `docs/PRODUCTION_ROLLOUT_CHECKLIST.md`.

---

## Prerequisites (do not skip)

1. `docs/architecture-audit/beta-launch/BETA_LAUNCH_READINESS_SCORE.md` ≥ **85** and no red P0 blockers.
2. `docs/PRODUCTION_ROLLOUT_CHECKLIST.md` post-deploy §4 all pass.
3. `docs/PUBLIC_BETA_30_QUERY_QA_EXECUTION.md` signed (≥28/30).
4. On-call assigned per `docs/BETA_INCIDENT_RESPONSE_CHECKLIST.md`.

---

## Phase 0 — Internal (5–10 people, 3–5 days)

### Who

- Founders, core eng, 3–5 trusted shoppers (mixed EN/AR if possible).

### Access

- Direct production URL — **no** public marketing, SEO push, or Product Hunt.
- Optional: Clerk allowlist or internal `@company.com` only if configured.

### What to ask testers

1. Run 5 searches from different categories (phone, fashion, furniture, AR query, budget).
2. Sign in once: save a product, run compare on two items.
3. Report: empty tray, &gt;10s wait, wrong category, broken links.
4. File bugs with query text + screenshot.

### Exit criteria → Phase 1

| Criterion | Target |
|-----------|--------|
| P0 automated remote | All pass (incl. latency re-probe) |
| Critical bugs | 0 open |
| Internal feedback | No Sev-1 UX blockers |
| Monitoring | Day-0 sheet started |

---

## Phase 1 — Invite-only (up to 100 users, 2–3 weeks)

### Access controls

| Control | Recommendation |
|---------|----------------|
| Issuance | Manual invite codes or email allowlist batch (10–20/week) |
| Rate limits | Upstash **required** on Production |
| Billing | Free tier only unless support ready |
| Intelligence | Phases 11–18 **OFF**, all APPLY **OFF** |

### Invite email template (short)

> You’re invited to the QuantAI beta — AI-assisted product search (not a store).  
> Link: [NEXT_PUBLIC_APP_URL]  
> We’re limiting early access; reply to this email with bugs or “empty results” and your query.  
> Expect occasional slowness on first search per topic.

### Batch playbook

| Week | New invites | Action before send |
|------|-------------|-------------------|
| 1 | 10–15 | Smoke + latency + cache probes |
| 2 | 20–30 | Review monitoring log |
| 3 | 30–55 | Golden search + cost review |

**Stop invites** if: Sev-1/2 incident, p95 &gt;12s for 24h, SerpAPI budget red.

### Support

- Single channel (e.g. support@ or Discord `#beta`).
- SLA: 24h response for Sev-3, immediate for Sev-1/2.
- Triage using `docs/BETA_INCIDENT_RESPONSE_CHECKLIST.md`.

### Metrics to review weekly

- p95 guest latency (probe)
- Empty tray rate (manual sample)
- 429 rate
- SerpAPI/OpenAI daily cost
- Retention: returning search within 7 days (if analytics wired)

### Phase 1 exit (before Phase 2 / 1000 users)

- 7 consecutive days: p95 &lt;8s, empty &lt;15% on golden set
- Zero ranking mutation incidents (no APPLY enabled)
- No Sev-1 auth/saved/compare outages

**Do not enable** normalization APPLY, Phases 11–18, or intent/taste APPLY until exit criteria met.

---

## Pausing or ending beta

| Situation | Action |
|-----------|--------|
| Cost emergency | Pause invites; keep site up with cache |
| Search broken | Pause invites + rollback deploy |
| Quality collapse | Pause invites; run 30-query QA again |

---

## Rollout communications

| Audience | Channel | Content |
|----------|---------|---------|
| Internal | Slack | Deploy SHA, probe results |
| Invitees | Email | Known issues, status updates |
| Public | **None** during invite-only | No broad launch posts |

---

## Checklist — first invite batch

| Step | Done |
|------|:----:|
| Readiness score ≥85 | ☐ |
| Post-deploy probes green | ☐ |
| 30-query QA signed | ☐ |
| Incident on-call named | ☐ |
| Monitoring Day-0 complete | ☐ |
| Invite list ≤15 emails | ☐ |
| Support channel live | ☐ |
| **Send invites** | ☐ |
