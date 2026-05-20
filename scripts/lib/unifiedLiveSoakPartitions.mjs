/**
 * P3.3 — Protected live soak partition trays (cross-vertical canary partitions).
 */

export const UNIFIED_LIVE_SOAK_THRESHOLDS = {
  pollutionTop2Max: 0,
  applyDeltaMax: 4,
  prestigeIntegrityMin: 0.68,
  rankingDriftMax: 3,
  trayCollapseAllowed: false,
  latencyMsMax: 15,
};

const P = (title, store, price, link) => ({
  title,
  store,
  price,
  link,
  extensions: [],
  rating: 4.2,
});

/** Protected partition trays — institutional cross-vertical soak coverage. */
export const UNIFIED_LIVE_SOAK_PARTITIONS = [
  {
    id: "quiet_luxury_watches",
    partition: "quiet_luxury_watches",
    query: "elegant swiss dress watch quiet luxury",
    expectIdentity: "quiet_luxury",
    expectQueryClass: "luxury",
    products: [
      P("Tissot Gentleman Powermatic Dress Watch Swiss", "A", 650, "wl-a"),
      P("Casio Fitness Smart Watch Step Counter", "B", 45, "wl-b"),
      P("Hamilton Jazzmaster Dress Automatic", "C", 720, "wl-c"),
    ],
  },
  {
    id: "institutional_workspace",
    partition: "institutional_workspace",
    query: "minimal oak desk setup clean",
    expectIdentity: "institutional_minimal",
    expectQueryClass: "institutional",
    products: [
      P("Oak Standing Desk Matte Cable Management Minimal", "D", 420, "iw-d"),
      P("RGB Gaming Chair Racer LED Gamer", "E", 89, "iw-e"),
      P("Walnut Minimal Office Desk Steel Frame", "F", 380, "iw-f"),
    ],
  },
  {
    id: "collector_fragrance",
    partition: "collector_fragrance",
    query: "niche artisan haute parfum extrait collector",
    expectIdentity: "haute_collector",
    expectQueryClass: "collector",
    products: [
      P("Tom Ford Private Blend Extrait Parfum 50ml", "G", 320, "cf-g"),
      P("Inspired by Tom Ford Clone Oil", "H", 15, "cf-h"),
      P("Maison Francis Kurkdjian Extrait 70ml", "I", 290, "cf-i"),
    ],
  },
  {
    id: "architectural_furniture",
    partition: "architectural_furniture",
    query: "architectural office minimal designer desk",
    expectIdentity: "architectural_modern",
    expectQueryClass: "architectural",
    products: [
      P("Architectural Steel Frame Designer Desk Bespoke", "J", 890, "af-j"),
      P("RGB Gaming Desk Racer LED Gamer", "K", 120, "af-k"),
      P("Walnut Minimal Office Desk Steel Frame", "L", 680, "af-l"),
    ],
  },
  {
    id: "executive_setups",
    partition: "executive_setups",
    query: "executive ergonomic workspace premium",
    expectIdentity: "executive_premium",
    expectQueryClass: "executive",
    products: [
      P("Steelcase Gesture Ergonomic Office Chair Lumbar", "M", 890, "es-m"),
      P("Racing Style Gamer Chair Ergonomic Look", "N", 120, "es-n"),
      P("Herman Miller Aeron Executive Chair", "O", 950, "es-o"),
    ],
  },
];

export function checkUnifiedLiveSoakMetrics(meta, thresholds = UNIFIED_LIVE_SOAK_THRESHOLDS) {
  const issues = [];
  if ((meta.pollutionTop2 ?? 99) > thresholds.pollutionTop2Max) {
    issues.push(`pollutionTop2=${meta.pollutionTop2} (max ${thresholds.pollutionTop2Max})`);
  }
  if ((meta.applyDeltaMax ?? 99) > thresholds.applyDeltaMax) {
    issues.push(`applyDeltaMax=${meta.applyDeltaMax} (max ${thresholds.applyDeltaMax})`);
  }
  if ((meta.prestigeIntegrity ?? 0) < thresholds.prestigeIntegrityMin) {
    issues.push(`prestigeIntegrity=${meta.prestigeIntegrity} (min ${thresholds.prestigeIntegrityMin})`);
  }
  if ((meta.rankingDriftCount ?? 99) > thresholds.rankingDriftMax) {
    issues.push(`rankingDriftCount=${meta.rankingDriftCount} (max ${thresholds.rankingDriftMax})`);
  }
  if (meta.trayCollapse !== thresholds.trayCollapseAllowed) {
    issues.push(`trayCollapse=${meta.trayCollapse}`);
  }
  if ((meta.latencyMs ?? 99) > thresholds.latencyMsMax) {
    issues.push(`latencyMs=${meta.latencyMs} (max ${thresholds.latencyMsMax})`);
  }
  return { pass: issues.length === 0, issues };
}
