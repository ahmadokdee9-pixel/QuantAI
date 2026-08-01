# Decision Engine

The **Decision Engine** is QuantAI’s core machine: the system that converts intent + options + signals into a single calibrated decision.

It is the product’s brain. Surfaces, chat, and domains are clients of the engine — never competitors to it.

---

## Engine contract

**Input**

- Intent (what success looks like for this human)
- Constraints (budget, condition, market, timing, hard exclusions)
- Option set (candidates from discovery)
- Signals (trust, price realism, fit, quality, risk, evidence quality)

**Output**

- Canonical order of options
- Calibrated action per material option (and for the tray)
- Confidence
- Decision record (why)
- Continuity hooks (what to watch, what would change the answer)

If an output cannot be audited back to this contract, it is not an engine output — it is UI noise.

---

## Internal law (generalized from the live commerce core)

These laws already define QuantAI in shopping. They become permanent engine law:

### 1. Enrich before you judge

Raw listings are not decision-ready. Options must be normalized and scored into comparable signals before authority runs.

### 2. One ranking authority

A single canonical rank produces order. No surface may invent a second “real” order for the default decision path.

### 3. Hard gates beat soft scores

Constraints (budget, mismatch floors, non-recommendable states) can demote or veto leaders even if soft scores look attractive.

### 4. Calibration is post-rank

Labels and confidence are applied after authority order exists. Calibration communicates judgment; it does not secretly replace ranking for vanity.

### 5. Credibility gating

Weak or fake promotional evidence cannot purchase a better decision. Discount and trust theater are suppressed.

### 6. Alternative preservation

Diversity rules prevent concentration collapse so the human still has a real choice set.

### 7. Records are first-class

Every material decision emits a reconstructable record: contributions, gates, and reasons.

### 8. Language is a satellite

Generative models may narrate, compare, or coach. They do not become the silent ranker.

---

## Engine stages

```text
1. Intent binding      → canonicalize what is being decided
2. Option intake       → fetch / normalize candidates
3. Signal enrichment   → trust, value, fit, risk, timing
4. Authority ranking   → single order + hard gates
5. Diversity pass      → preserve real alternatives
6. Calibration         → actions + confidence + reasons
7. Record emission     → Decision Record into the Graph
8. Continuity          → save / watch / revisit hooks
9. Outcome intake      → later: what the human actually did
10. Learning writeback → tighten priors (offline, gated)
```

Stages 1–8 are the live product spine in commerce today. Stages 9–10 are the compounding future of the same engine.

---

## Why the engine is hard to copy

Copying labels is trivial. Copying an engine requires stable semantics across years, cross-surface consistency, gate discipline under commercial pressure, regression locks, calibration rarity, and record fidelity to the real path.

The engine’s value is **institutionalized judgment**, not a prompt.

---

## AI systems that get smarter after every decision

Not every module should “learn online” recklessly. The engine improves through controlled writebacks:

| System | What improves |
|--------|----------------|
| Trust priors | Merchant and listing credibility after outcomes |
| Value / discount models | Which “deals” were real vs theater |
| Intent binding | How people phrase goals vs what they meant |
| Calibration thresholds | When BUY was premature or AVOID was too harsh |
| Timing models | When waiting beat buying |
| Domain packs | Category-specific failure modes |

Learning that cannot be gated, shadowed, and rolled back is not allowed near authority.

---

## Engine vs product surface

| Decision Engine | Product surface |
|-----------------|-----------------|
| Owns order & labels | Renders them |
| Owns records | Displays reasons |
| Owns gates | Shows degraded honesty |
| Owns learning writeback | Collects consent & feedback |

When surface needs conflict with engine law, **engine law wins.**

---

## Platform form of the engine

Long-term, the engine is exposable as:

1. **First-party consumer product** (commerce decisions)
2. **Decision API** (rank + calibrate + records for partners)
3. **Embedded decision layer** inside other products

Same contract. Same authority. Different clients.

That is how a shopping wedge becomes infrastructure.

---

## Explicit engine non-goals

- Optimizing for whoever pays for placement
- Letting chat override canonical order
- Turning every dormant research module on by default
- Replacing the human for irreversible life-critical acts
- Owning inventory so the engine can prefer itself

The engine decides among the world’s options. It does not become the world’s store.
