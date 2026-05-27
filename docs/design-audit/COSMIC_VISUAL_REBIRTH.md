# QuantAI COSMIC Visual Rebirth

**Scope:** Complete visual universe replacement. Intelligence core locked.

## Art direction

- White cosmic environments, star fields, aurora gradients, planetary glow
- Violet / cosmic blue accents — no dark void, no cyan SaaS
- Floating glass intelligence architecture
- Alive ambient particles (reduced on mobile / prefers-reduced-motion)

## Architecture (`qc-universe`)

| Zone | Component |
|------|-----------|
| Atmosphere | `CosmicBackdrop` |
| Navigation | `CosmicNavigationOrb` |
| Portal | `NeuralCommandPortal` + `CosmicSearchPortal` + `HeroSearchCommand` |
| Archive | `qc-archive-vault` |
| Galaxy | `SignalGalaxyField` + `qc-entity-grid` results |
| Bands | `CosmicIntelligenceBands` |
| Nexus | `ClearanceNexus` + `PricingCards` |
| Appendix | Trust / marketing (muted) |

## Cards (cinematic space-age)

- **Horizontal intelligence modules** (`qc-cinema-entity`) with three zones:
  - Visual — entity rank, compare, hero image, QI confidence ring
  - Core — decision layer, trust, signals, deep analysis vault
  - Orbit — Open, Brief, retailer, Track, Save
- **Side-by-side grid** (`qc-cinema-grid`) — 1 column mobile, 2 columns ≥1100px
- All intel data preserved — layout/presentation only

## Styles

- `app/globals-quant-cosmic.css` (imported last)
- Root: `qc-universe` on `html` / `body`, light `colorScheme`

## Locked

Search, APIs, ranking, compare, trust, card data, analysis — unchanged.

## Validation

`npm run build` — pass
