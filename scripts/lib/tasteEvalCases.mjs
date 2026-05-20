/**
 * Phase 2.3 institutional taste eval cases — offline shadow trays only.
 */

export const MOCK = (title, store = "Store") => ({
  title,
  store,
  price: 100,
  link: `https://example.com/${encodeURIComponent(title.slice(0, 16))}`,
});

/** @typedef {'watch'|'electronics'|'audio'|'furniture'|'desk_setup'|'fragrance'|'bilingual'|'integrity'} TasteEvalTag */

export const TASTE_EVAL_CASES = [
  // --- Watches ---
  {
    name: "watch_luxury_fitness_pollution",
    tags: ["watch", "luxury_pollution"],
    query: "luxury watch under 3000",
    products: [MOCK("Omega Seamaster Automatic Swiss Mechanical"), MOCK("Samsung Galaxy Fit3 Fitness Tracker")],
    expect: (s) =>
      s.active &&
      s.vertical === "watch" &&
      (s.violations.includes("fitness_pollution") || s.rows.some((r) => r.tasteViolations.includes("fitness_pollution"))),
  },
  {
    name: "watch_swiss_mechanical_vs_smart",
    tags: ["watch", "swiss_mechanical"],
    query: "premium mechanical swiss watch",
    products: [MOCK("Tissot PRX Powermatic 80 Automatic Swiss"), MOCK("Apple Watch Series 9 GPS Smartwatch")],
    expect: (s) => s.active && s.grammarLane != null,
  },
  {
    name: "watch_executive_dress",
    tags: ["watch", "executive_professional"],
    query: "elegant dress watch for office",
    products: [MOCK("Longines Master Collection Automatic Dress Watch"), MOCK("Casio F91W Digital Sports Watch")],
    expect: (s) => s.active && s.compareAxes.includes("movement_class"),
  },
  {
    name: "watch_arabic_luxury",
    tags: ["watch", "bilingual"],
    query: "luxury ساعة under 300",
    products: [MOCK("Citizen Eco-Drive Dress Watch Steel"), MOCK("Mi Band 8 Fitness Tracker")],
    expect: (s) => s.active && s.vertical === "watch",
  },
  {
    name: "watch_arabic_luxury_posture",
    tags: ["watch", "bilingual", "premium_vs_fake"],
    query: "ساعة شكلها luxury بس سعرها معقول",
    products: [MOCK("Seiko 5 Automatic SNK809"), MOCK("Galaxy Fit3 Smart Band")],
    expect: (s) => s.active && s.intent01 >= 0.42,
  },

  // --- Electronics / audio ---
  {
    name: "audio_focus_party_pollution",
    tags: ["electronics", "luxury_pollution"],
    query: "best premium headphones for focus",
    products: [MOCK("Sony WH-1000XM5 Noise Cancelling Headphones"), MOCK("RGB Gaming Headset Bass Boost Party LED")],
    expect: (s) =>
      s.active &&
      s.vertical === "audio" &&
      s.rows.some((r) => r.tasteViolations.includes("party_audio_pollution") || r.tasteFit01 < 0.4),
  },
  {
    name: "audio_reference_signal",
    tags: ["electronics", "executive_professional"],
    query: "neutral studio reference wired headphones",
    products: [MOCK("Beyerdynamic DT 900 Pro X Studio Headphone"), MOCK("RGB Wireless Gaming Headset 7.1 Bass")],
    expect: (s) => s.active && s.grammarLane === "electronics_audio_reference",
  },
  {
    name: "electronics_workstation_gaming",
    tags: ["electronics", "gaming_contamination"],
    query: "ultrawide monitor for workstation setup",
    products: [MOCK("LG 34WP65C-B USB-C IPS Ultrawide Monitor"), MOCK("RGB Curved Gaming Monitor 240Hz LED")],
    expect: (s) => s.active && s.vertical === "electronics",
  },
  {
    name: "electronics_mixed_arabic_focus",
    tags: ["electronics", "bilingual"],
    query: "سماعة premium للتركيز ANC",
    products: [MOCK("Bose QuietComfort Ultra Headphones"), MOCK("Party RGB Bass Boost Earbuds")],
    expect: (s) => s.active,
  },
  {
    name: "electronics_fake_premium",
    tags: ["electronics", "premium_vs_fake"],
    query: "premium luxury looking wireless earbuds",
    products: [MOCK("Sony WF-1000XM5 Wireless Earbuds"), MOCK("Generic Premium Pro Max Luxury Earbuds")],
    expect: (s) => s.active,
  },

  // --- Furniture / desk ---
  {
    name: "desk_minimal_gaming_chair",
    tags: ["furniture", "gaming_contamination", "minimal_aesthetic"],
    query: "minimal desk setup",
    products: [MOCK("Oak Standing Desk Matte Cable Management Minimal"), MOCK("RGB Gaming Chair Racer LED Gamer")],
    expect: (s) =>
      s.active &&
      s.rows.some(
        (r) =>
          r.tasteViolations.includes("gaming_rgb_pollution") || r.tasteViolations.includes("aesthetic_mismatch")
      ),
  },
  {
    name: "furniture_minimal_integrity",
    tags: ["furniture", "minimal_aesthetic"],
    query: "كرسي office minimal",
    products: [MOCK("Vitra Soft Pad Office Chair Minimal Black"), MOCK("DXRacer Gaming Chair RGB LED")],
    expect: (s) => s.active && s.vertical === "furniture",
  },
  {
    name: "furniture_arabic_minimal",
    tags: ["furniture", "bilingual", "minimal_aesthetic"],
    query: "كنبة minimal راقية",
    products: [MOCK("Modern Minimal Linen Sofa Grey Scandi"), MOCK("LED Gamer Sofa RGB Recliner")],
    expect: (s) => s.active,
  },
  {
    name: "furniture_executive_ergonomic",
    tags: ["furniture", "executive_professional"],
    query: "كرسي مكتب مريح وفخم",
    products: [MOCK("Steelcase Gesture Ergonomic Office Chair"), MOCK("Cheap Racing Style Gamer Chair")],
    expect: (s) =>
      s.active &&
      (s.grammarLane === "furniture_ergonomic_work_setup" || s.grammarLane === "furniture_premium_minimal_desk"),
  },
  {
    name: "furniture_premium_vs_fake",
    tags: ["furniture", "premium_vs_fake"],
    query: "cheap but luxury looking sofa",
    products: [MOCK("Article Sven Leather Sofa Walnut"), MOCK("Luxury Look PU Leather Couch Gold Trim")],
    expect: (s) => s.active,
  },

  // --- Fragrance ---
  {
    name: "fragrance_designer_authenticity",
    tags: ["fragrance", "fragrance_authenticity"],
    query: "yves saint laurent libre edp 90ml",
    products: [MOCK("Yves Saint Laurent Libre Eau de Parfum 90ml"), MOCK("Inspired by Libre Type Scent Oil 10ml")],
    expect: (s) =>
      s.active &&
      s.rows.some((r) => r.tasteViolations.includes("inspired_by_dupe") || r.tasteViolations.includes("authenticity_risk")),
  },
  {
    name: "fragrance_niche_artisan",
    tags: ["fragrance", "fragrance_authenticity"],
    query: "niche artisan perfume long lasting",
    products: [MOCK("Le Labo Santal 33 Eau de Parfum Niche"), MOCK("Inspired by Santal 33 Oil Dupe")],
    expect: (s) => s.active && s.grammarLane != null,
  },
  {
    name: "fragrance_luxury_haute",
    tags: ["fragrance", "premium_vs_fake"],
    query: "luxury haute parfum extrait collection",
    products: [MOCK("Tom Ford Private Blend Extrait Parfum"), MOCK("Luxury Premium Smell Alike Inspired")],
    expect: (s) => s.active,
  },
  {
    name: "fragrance_arabic_designer",
    tags: ["fragrance", "bilingual"],
    query: "عطر designer فاخر ثابت",
    products: [MOCK("Dior Sauvage Eau de Parfum 100ml"), MOCK("Arabic Oil Inspired Designer Type")],
    expect: (s) => s.active && s.vertical === "fragrance",
  },
  {
    name: "fragrance_transliterated_premium",
    tags: ["fragrance", "bilingual"],
    query: "tom ford oud wood edp premium",
    products: [MOCK("Tom Ford Oud Wood Eau de Parfum"), MOCK("Oud Wood Style Fragrance Oil Inspired")],
    expect: (s) => s.active,
  },
];

export const POLLUTION_GOLDEN = [
  { query: "luxury swiss watch", vertical: "watch", pollutionKey: "watch_fitness", badTitle: "Samsung Galaxy Fit3 Fitness Tracker", goodTitle: "Tissot Gentleman Automatic Swiss Dress Watch" },
  { query: "premium mechanical watch", vertical: "watch", pollutionKey: "watch_fitness", badTitle: "Fitbit Charge 6 Fitness Tracker", goodTitle: "Hamilton Khaki Field Automatic Mechanical" },
  { query: "best premium headphones for focus", vertical: "audio", pollutionKey: "electronics_party", badTitle: "RGB Gaming Headset Bass Boost Party", goodTitle: "Sony WH-1000XM5 Noise Cancelling Headphones" },
  { query: "neutral studio headphones", vertical: "audio", pollutionKey: "electronics_party", badTitle: "RGB Bass Boost Gaming Headset", goodTitle: "Audio-Technica ATH-M50x Studio Monitor" },
  { query: "minimal desk setup", vertical: "desk_setup", pollutionKey: "furniture_gamer", badTitle: "RGB Gaming Chair Racer LED", goodTitle: "Oak Standing Desk Matte Minimal" },
  { query: "كرسي office minimal", vertical: "furniture", pollutionKey: "furniture_gamer", badTitle: "RGB Gaming Chair Racer LED", goodTitle: "Herman Miller Aeron Ergonomic Office Chair" },
  { query: "yves saint laurent libre edp 90ml", vertical: "fragrance", pollutionKey: "fragrance_dupe", badTitle: "Inspired by Libre Type Scent Oil", goodTitle: "Yves Saint Laurent Libre Eau de Parfum 90ml" },
  { query: "niche perfume artisan", vertical: "fragrance", pollutionKey: "fragrance_dupe", badTitle: "Inspired by Niche Clone Oil", goodTitle: "Maison Francis Kurkdjian Baccarat Rouge 540 EDP" },
];

export const POLLUTION_RX = {
  watch_fitness: /\b(galaxy\s+fit|fitbit|mi\s+band|fitness\s+tracker)\b/i,
  electronics_party: /\b(rgb gaming|rgb bass|bass boost|gaming headset|party led)\b/i,
  furniture_gamer: /\b(gaming chair|racer|rgb led gamer)\b/i,
  fragrance_dupe: /\b(inspired by|type scent|dupe|clone)\b/i,
};

export const MINIMAL_LANE_RX = /\b(minimal|office minimal|desk setup|كرسي office|كنبة minimal)\b/i;
