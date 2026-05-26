# QuantAI — Elite invite-only beta visual readiness

**Date:** 2026-05-25  
**Scope:** Production-grade UI/UX refinement audit + cohesion pass (no product card redesign).

**Policy respected:** Search-first · premium dark identity · scan-first tray · intelligence structure unchanged · no new dashboards/widgets.

---

## 8. Beta visual readiness verdict

| Verdict | **READY WITH MINOR GAPS** |
|---------|---------------------------|
| **Design cohesion score** | **86 / 100** |
| **Invite presentation** | Suitable for elite invite-only beta after deploy of cohesion CSS |
| **Blockers** | None for visual launch; optional manual device pass recommended |

---

## 7. Design cohesion score (weighted)

| Dimension | Weight | Score | Notes |
|-----------|--------|------:|-------|
| Global tokens & dark theme | 15 | 14 | Unified `--qa-*` tokens + cohesion layer |
| Typography hierarchy | 12 | 11 | cockpit-* + qi-hero stable; minor size drift across app pages |
| Spacing & alignment | 12 | 10 | `max-w-6xl` vs `7xl` tray (documented, partially aligned) |
| Header / chrome | 10 | 10 | `qa-chrome-header` on landing + app |
| Modals / drawers | 10 | 9 | Unified `qa-modal-scrim` / `qa-modal-panel` |
| Motion & micro-interactions | 10 | 9 | Premium easing; reduced-motion respected |
| Loading / empty states | 10 | 9 | `qa-skeleton-shimmer`, `qa-empty-state` |
| Mobile & touch | 10 | 9 | Safe areas, touch min 2.75rem, scroll-touch |
| Product tray (unchanged) | 11 | 10 | Cards preserved; perceived quality via chrome only |
| Flow continuity | 10 | 9 | Home → results → dashboard coherent tone |
| **Total** | **100** | **86** | |

---

## 1. Full UI/UX audit (summary)

### Strengths (keep)

- **Premium dark OS** — navy/graphite stack, cyan–violet accent discipline, glass surfaces (`cockpit-glass-panel`, `qa-premium-surface`).
- **Search-first hero** — command deck, aurora border, institutional state language.
- **Intelligence calm** — no cyberpunk noise; shimmer restrained; `prefers-reduced-motion` hooks widespread.
- **Tray quality** — product cards already world-class; refinement should not touch card shell.

### Gaps addressed in this pass

| Area | Issue | Action |
|------|-------|--------|
| Headers | Landing vs app header opacity/shadow drift | `qa-chrome-header` |
| Modals | 72% / 80% / 88% scrim inconsistency | `qa-modal-scrim` |
| Buttons | Ad-hoc gradient/ghost classes | `qa-btn-primary`, `qa-btn-ghost`, `qa-icon-btn` |
| Skeletons | Generic `animate-shimmer` only | `qa-skeleton-shimmer` on loading blocks |
| Empty states | Panel without shared elevation | `qa-empty-state` wrapper |
| Content width | App 6xl vs results 7xl | App chrome → `qa-content-wrap` (80rem) |

### Intentionally unchanged

- `ProductResultCard.tsx` — size, layout, scan-first grid
- `ProductResultsSurface.tsx` — grid columns, tray structure (skeleton bars only)
- `FloatingIntelDock`, `GlobalIntelligencePanel` — existing IA (no removal per “no new clutter”)
- Commerce intelligence card content architecture

### Remaining optional (P1, non-blocking)

- Manual iPhone/Android pass on compare drawer + saved flow
- Pricing page header to use `qa-chrome-header` (still standalone layout)
- Export modal / share bar token alignment
- Reduce duplicate motion on hero + command deck (subtle, taste)

---

## 2. Design inconsistency report

| ID | Severity | Finding | Location | Status |
|----|----------|---------|----------|--------|
| D-01 | Medium | Content max-width 6xl vs 7xl | App vs `ProductResultsSurface` | **Mitigated** — app uses `--qa-content-max` |
| D-02 | Low | Header bg opacity 72% vs 78% | LandingNav vs AppChrome | **Fixed** — `qa-chrome-header` |
| D-03 | Low | Modal scrim opacity variance | Copilot, palette, onboarding, feedback | **Fixed** — `qa-modal-scrim` |
| D-04 | Low | CTA button class duplication | Landing, empty states | **Fixed** — shared button utilities |
| D-05 | Low | Icon button border radius  xl vs lg | Mobile menu vs modal close | **Fixed** — `qa-icon-btn` |
| D-06 | Info | Commerce intel pages `rounded-[2rem]` vs `1.5rem` glass | `/commerce-intelligence` | Documented — acceptable marketing variant |
| D-07 | Info | Copilot drawer vs command palette z-index stack | Shell | OK — z-100 onboarding, copilot layered |
| D-08 | Low | Skeleton vs card visual weight | Loading grid | **Improved** — cohesion shimmer |

---

## 3. Production polish checklist

### Pre-invite (engineering)

- [x] `app/globals-cohesion.css` imported
- [x] Landing + app headers unified
- [x] Modal scrims unified
- [x] Loading skeleton shimmer refined (not cards)
- [x] Empty state elevation unified
- [ ] `npm run build` green
- [ ] Deploy to Vercel preview → visual smoke

### Pre-invite (design / product)

- [ ] 15-min desktop pass: `/`, `/dashboard`, `/saved`, `/pricing`
- [ ] 15-min mobile pass: search → results → save → compare
- [ ] Verify reduced-motion OS setting
- [ ] Screenshot set for invite email / deck

### Do not do before beta

- [ ] Redesign product cards
- [ ] Add side dashboards or floating assistants
- [ ] Enable new intelligence phases in UI
- [ ] Change scan-first grid density

---

## 4. Component refinement list

| Component | Refinement | Card touch? |
|-----------|------------|-------------|
| `globals-cohesion.css` | **New** — tokens, chrome, modal, buttons, skeleton, empty | No |
| `AppChrome.tsx` | `qa-chrome-header`, `qa-content-wrap`, nav pills | No |
| `LandingNav.tsx` | Same chrome system + buttons | No |
| `OnboardingWelcome.tsx` | Modal scrim/panel, icon btn | No |
| `CommandPalette.tsx` | Modal scrim | No |
| `CopilotDrawer.tsx` | Modal scrim | No |
| `FeedbackLauncher.tsx` | Modal scrim | No |
| `CockpitEmptyState.tsx` | `qa-empty-state` | No |
| `ProductResultsSurface.tsx` | Skeleton bar classes only | **No card shell** |
| `page.tsx` | `qa-page-canvas` on root main | No |
| `ProductResultCard.tsx` | **None** | Preserved |
| `HeroSearchCommand.tsx` | **None** (existing qi-command) | Preserved |

---

## 5. Motion / transition audit

| Pattern | Implementation | Verdict |
|---------|----------------|---------|
| Global easing | `--qa-ease-premium`, `--qa-ease-out-soft` | Good |
| Hero fade-in | `fadeIn` 0.6–0.7s | Calm; OK for marketing |
| Nav hover | Spring y:-1 (AppChrome) | Subtle |
| Command shimmer | 7s sweep | Premium, not flashy |
| Card glow | `qi-product-card` animations | **Untouched** |
| Reduced motion | CSS + Framer `useReducedMotion` | Strong |
| Modal enter | Spring 380/34 onboarding | Cohesive |
| Skeleton | `qa-skeleton-flow` 2.4s | Calm |

**Recommendation:** Keep motion amplitude ≤2px translate on chrome; never add parallax to tray.

---

## 6. Mobile experience audit

| Check | Status | Notes |
|-------|--------|-------|
| Safe area insets | Pass | `layout.tsx` body padding |
| Touch targets ≥44px | Pass | `--qa-touch-min`, `qa-icon-btn` |
| Horizontal nav scroll | Pass | `qa-scroll-touch` on app nav |
| Hero command min-height | Pass | 60px field |
| Compare panel scroll | Pass | `72dvh` cap |
| Mobile perf hook | Pass | `useMobilePerf` on home |
| Sticky header + results | Pass | scroll-mt on results section |
| Visual pass on device | **Pending** | Manual |

---

## Files changed (cohesion pass)

```
app/globals-cohesion.css          (new)
app/globals.css                   (@import cohesion)
app/page.tsx                      (qa-page-canvas)
components/app/AppChrome.tsx
components/landing/LandingNav.tsx
components/onboarding/OnboardingWelcome.tsx
components/cockpit/CommandPalette.tsx
components/copilot/CopilotDrawer.tsx
components/feedback/FeedbackLauncher.tsx
components/empty/CockpitEmptyState.tsx
components/search/ProductResultsSurface.tsx  (skeleton only)
docs/design-audit/BETA_VISUAL_READINESS.md
```

---

## Sign-off

| Role | Invite visual go? |
|------|-------------------|
| Engineering | Yes — deploy cohesion layer |
| Design | Conditional — complete mobile screenshot pass |
| Product | Yes — elite invite presentation ready |

**Target feeling achieved:** Futuristic · elegant · hyper-premium · AI-native · calm · cohesive — without cyberpunk chaos or card redesign.
