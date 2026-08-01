# MVP Execution Plan — 6 Weeks

**Role:** Chief Product Officer  
**Constraint:** 6 weeks. Smallest set. Biggest decision-quality advantage.  
**Rule:** If it does not make QuantAI the best place to *decide*, it is out.

---

## 0. Product truth for this sprint

QuantAI already has the nucleus: Phase A authority → calibration → credibility gates → diversity → decision records.

The MVP is **not** “build a platform.”  
The MVP is: **make one search produce a decision people trust more than Google, ChatGPT, or any shopping list — then pull them back when that decision changes.**

Ignore: enterprise, investors, settings, cosmetics, dormant engine theater, billing polish, analytics pages, multi-domain expansion.

---

## 1. The ONE killer feature

### **The Instant Decision**

One search → one authoritative answer:

> **Do this: BUY / COMPARE / AVOID / WAIT**  
> **This option · This merchant · This confidence · These 3 reasons · What would change it**

Not a grid that happens to have badges.  
**A decision object that owns the page** — with the grid as evidence, not the product.

| | |
|--|--|
| **Why users care** | They came to stop drowning in options. They want the call. |
| **Expected impact** | Category-defining. Separates QuantAI from search, chat, and deal sites in under 10 seconds. |
| **Technical difficulty** | Medium — core engines exist; productization and WAIT + “what changes it” are incomplete |
| **Development time** | 2.5–3 weeks (foundation of entire MVP) |
| **Priority score** | **100** |

Everything else in this document either makes Instant Decision faster, truer, stickier, or harder to copy.

---

## 2. Top 10 features ranked by impact

Scoring: impact on *decision quality + user love* under a 6-week constraint.  
Difficulty: Low / Medium / High. Time = calendar effort assuming focused team.

| Rank | Feature | Why users care | Impact | Difficulty | Time | Score |
|------|---------|----------------|--------|------------|------|-------|
| 1 | **Instant Decision** (leader + action + confidence + 3 faithful reasons + “what changes it”) | Ends option paralysis immediately | Category-defining | Medium | 2.5–3w | **100** |
| 2 | **WAIT as first-class action** (timing / stale / weak-evidence → wait, not fake BUY) | Prevents regret; unique vs “always buy” UIs | Very high | Medium | 1–1.5w | **96** |
| 3 | **Sub-2s warm decision / ≤4s cold path** (cache + stabilization, no rank rewrite) | Slow decisions feel untrustworthy | Very high | Medium–High | 1.5–2w | **94** |
| 4 | **Faithful Why** (reasons only from Ranking Decision Records / gates — never LLM fiction) | Trust survives scrutiny | Very high | Medium | 1w | **92** |
| 5 | **Decision Watch** (re-run judgment when price/availability moves; alert the new action) | Unfinished decisions become a habit | Very high | Medium | 1.5–2w | **90** |
| 6 | **Hard constraint honesty** (budget/mismatch demotions visible: “leader failed X”) | Users feel the system is on their side | High | Low–Medium | 0.5–1w | **86** |
| 7 | **Credible-only deal truth** (verified discount / suppress theater — productized, not buried) | Stops users getting scammed by fake sales | High | Low (mostly live) | 0.5w | **84** |
| 8 | **Authority-locked Compare** (≤3 options; same order law; one winner + tradeoffs) | High-consideration moments need proof | High | Low–Medium | 0.5–1w | **82** |
| 9 | **Was this right?** (one-tap outcome on decision: bought / waited / wrong / regret) | Closes the learning loop users can feel | High (compounding) | Medium | 1w | **80** |
| 10 | **Open Decisions** (home of watched + unfinished intents; “decide again”) | Daily return surface without feed addiction | High | Low–Medium | 0.5–1w | **78** |

**Cut from top 10 on purpose:** Copilot expansion, billing tiers, analytics dashboard, collections, social, multi-vertical packs, B2B API, dormant “commerce OS,” redesign, onboarding tours, preference settings mazes.

---

## 3. What must be built first

Strict sequence. Later work depends on earlier truth.

| Order | Feature | Why first |
|-------|---------|-----------|
| **P0.1** | Instant Decision shell on search | Without it, QuantAI is still a list |
| **P0.2** | Faithful Why (RDR-backed reasons) | Instant Decision without fidelity is a chatbot |
| **P0.3** | WAIT as first-class label/action | Completes the decision vocabulary |
| **P0.4** | Latency program (warm ≤2s, cold survivable) | Unusable speed kills love |
| **P0.5** | Credible-only deal truth (surface hardening) | Cheap trust win; mostly exists |
| **P0.6** | Hard constraint honesty | Makes gates legible |
| **P1.1** | Authority-locked Compare polish | Proof layer for Instant Decision |
| **P1.2** | Decision Watch + alerts on action change | Habit engine |
| **P1.3** | Open Decisions surface | Habit home |
| **P1.4** | Was this right? outcome capture | Proprietary data seed |

**Do not parallelize P0.1–P0.3 with feature sprawl.** They are the product.

---

## 4. Features that must NEVER be built during MVP

| Never in these 6 weeks | Why |
|------------------------|-----|
| Marketplace / checkout | Wrong company; destroys focus |
| Affiliate-optimized ranking | Corrupts the killer feature |
| Enabling dormant engine stacks for demos | Theater; trust suicide |
| Multi-domain expansion (travel, finance, etc.) | Dilutes wedge |
| B2B / Decision API / white-label | Enterprise — out of scope |
| Billing / plan packaging rework | Investor/revenue chrome |
| Analytics “savings” dashboard | Stub vanity; no decision quality |
| Settings / preference control panels | Unnecessary friction |
| Cosmetic redesign / brand refresh | Not decision quality |
| Social, sharing, streaks, gamification | Engagement theater |
| Copilot as primary product | Fluency ≠ calibrated choice |
| New chat surfaces / ai-chat rewrite | Satellite only |
| Collections / folders taxonomy | Organization ≠ decisions |
| Merchant portals | Capture risk |
| Rewriting Phase A / calibration religion | Burns the moat we already have |
| Perfect identity graph / full Decision Graph ontology | Architecture fantasy; seed outcomes instead |

If a ticket is not Instant Decision, WAIT, Why, Speed, Watch, Compare, Constraints, Credibility, Outcomes, or Open Decisions — **delete it.**

---

## 5. Features that create daily habit

Habit = **open decisions under change**, not content browsing.

| Feature | Habit mechanism | Habit strength |
|---------|-----------------|----------------|
| **Decision Watch** | Price/availability change → new action notification | **Primary** |
| **Open Decisions** | Morning check: what needs a new call? | **Primary** |
| **WAIT** | Explicit unfinished state users return to resolve | **High** |
| **Was this right?** | Light return after purchase window | Medium |
| Instant Decision alone | Powerful but episodic without Watch | Medium without Watch |

**MVP habit loop:** Decide → WAIT or Watch → change → Instant Decision again.

---

## 6. Features that create network effects

Be honest: **true network effects are weak in 6 weeks.** Instrument only.

| Feature | Network effect | Reality in 6 weeks |
|---------|----------------|--------------------|
| **Was this right?** | Outcome density → better global calibration later | Seed only — ship capture |
| Decision Watch volume | More watched identities → denser price/availability truth | Local density, not viral |
| Shared trust corrections from outcomes | Source priors improve for everyone | Post-MVP learning; capture now |

**Do not claim a flywheel.** Ship the pipes: outcome + watch observations.

---

## 7. Features that create proprietary data

| Feature | Data created | Moat relevance |
|---------|--------------|----------------|
| **Was this right?** | Labeled outcomes on real decisions | Highest — calibration fuel |
| **Decision Watch + refresh** | Price/availability trajectories on identities users care about | High — timing intelligence |
| Instant Decision + Faithful Why (logged) | Decision Records at episode scale | High — audit + learning corpus |
| WAIT resolutions | When waiting was right/wrong | High — timing models |
| Hard constraint events | Which constraints kill leaders | Medium — intent/gate tuning |

**MVP data rule:** Every Instant Decision can emit a record; every Watch can emit observations; every user can emit one-tap outcome. No ontology science project.

---

## 8. Features that create long-term defensibility

| Feature | Defensibility | Notes |
|---------|---------------|-------|
| Instant Decision built on **frozen Phase A + calibration** | **Very high** | Competitor can copy UI chrome; not the locked judgment system |
| Faithful Why from real records | **High** | LLM “why” is easy to fake and easy to catch lying |
| WAIT discipline | **High** | Most clones optimize conversion, not regret |
| Outcome corpus from “Was this right?” | **High (compounding)** | Starts weak; becomes unfair in years |
| Decision Watch observation store | **High (compounding)** | Timing edge |
| Credible-only deals | **Medium–High** | Trust differentiator vs badge spam |
| Latency alone | **Low** | Necessary; not a moat |
| Compare UI alone | **Low** | Easy to copy without authority lock |

Defend the **judgment system + outcome memory**. Do not defend pixels.

---

## 9. Features easy to copy — avoid investing MVP blood

| Easy to copy | Why avoid as MVP centerpiece |
|--------------|------------------------------|
| Generic AI chat / “shopping assistant” | Commodity; competes with ChatGPT |
| Pretty product cards / masonry grids | Every shopping UI |
| Sort/filter chrome | Table stakes |
| “AI score” badges without authority | Trivial and hollow |
| Saved products CRUD | Commodity SaaS |
| Pricing page / Stripe polish | Irrelevant to decision love |
| Onboarding carousels | Nobody returns for these |
| Dark mode / motion / marketing pages | Cosmetic |
| Infinite enrichment engines ON | Looks impressive; dilutes signal; easy to mock |

Use existing cards/compare only as **servants of Instant Decision.** Do not spend the MVP making a prettier catalog.

---

## 10. Realistic 6-week execution roadmap

Assumes: decision core stays frozen (no Phase A rewrite). One product narrative. Ruthless scope.

### Week 1 — Decision is the page

- Ship Instant Decision module above results (action, leader, confidence, placeholder reasons)
- Wire action vocabulary; begin WAIT path from existing gates/truth signals
- Kill any UI that competes with the decision object for attention
- **Exit:** A cold demo query shows a clear decision in one glance

### Week 2 — Truthful judgment

- Faithful Why: top 3 reasons from Ranking Decision Records + hard gates only
- “What would change this?” from constraints/evidence gaps
- Credible-only deal truth surfaced on the decision (not buried chips only)
- Hard constraint honesty when leader is demoted
- **Exit:** A skeptical user cannot catch the Why lying

### Week 3 — Speed + WAIT completeness

- Warm path ≤2s for repeat/canonical queries; cold path budgeted and honest when slow
- WAIT fully first-class in calibration/UX (stale, weak evidence, timing)
- Authority-locked Compare: winner agrees with Instant Decision
- **Exit:** Fast when warm; WAIT feels like wisdom, not emptiness

### Week 4 — Habit engine

- Decision Watch: watch leader/intent; refresh observations
- Alert when **recommended action changes** (not only “price dropped”)
- Open Decisions surface (replace analytics vanity as the return home)
- **Exit:** User can leave a WAIT and be pulled back by a real change

### Week 5 — Learning seed + harden

- “Was this right?” one-tap on Instant Decision / Watch resolution
- Persist outcomes + ensure Decision Records land for every episode
- Fix trust-destroying edge cases (empty trays, contradictory chat if shown, BUY inflation)
- **Exit:** Outcome pipe live; no known authority contradictions in primary path

### Week 6 — Love pass (decision quality only)

- Query pack of 30 real decisions; fix only decision-quality failures
- Latency proof on warm/cold
- Habit loop QA: Decide → Watch → Change → New Instant Decision
- Cut anything still unfinished that isn’t P0
- **Exit:** Best possible demo: one search → trusted decision → watch → updated decision

---

## BEST POSSIBLE MVP (final selection)

### Ship this. Nothing else.

**QuantAI MVP = Instant Decision OS for purchases**

1. **Instant Decision** — BUY / COMPARE / AVOID / WAIT + confidence  
2. **Faithful Why** — 3 reasons + what would change it (records-backed)  
3. **WAIT** — first-class, regret-preventing action  
4. **Speed** — warm decisions feel instant  
5. **Decision Watch + action-change alerts**  
6. **Open Decisions** — home for unfinished judgment  
7. **Authority-locked Compare**  
8. **Credible-only deal truth + constraint honesty**  
9. **Was this right?** — outcome capture  

### One sentence MVP

> Search once. Get a calibrated decision you can trust. Watch it. Come back when the right action changes. Tell us if we were wrong.

### Success test (brutally simple)

A user who already knows Google Shopping and ChatGPT says:

**“I don’t need a list. I need QuantAI to tell me what to do — and I check it before I buy.”**

If the build does not force that sentence, the MVP failed — regardless of how many engines exist in the repo.

---

## Priority scoreboard (keep / kill)

| Score | Action |
|------:|--------|
| 90–100 | Build now — defines the company |
| 78–89 | Build in weeks 4–6 — habit + data |
| &lt;78 | Not in this MVP |
| Easy-to-copy chrome | Do not center the roadmap |
| Enterprise / investor / cosmetic | Delete from backlog |

**Final cut:** Ten features. One killer. Six weeks. Decision quality only.
