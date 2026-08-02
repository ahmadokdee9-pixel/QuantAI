/**
 * Mission blueprints — structural decision plans (not fabricated market data).
 * Each decision becomes a Living Decision when the user runs QuantAI search.
 */

import type { MissionDecisionWrite, MissionDomain } from "@/lib/missions/types";
import type { DecisionDomain } from "@/lib/universalDecision/types";

export type MissionTemplate = {
  id: string;
  title: string;
  goal: string;
  suggestedBudget: number | null;
  decisions: MissionDecisionWrite[];
};

function d(
  groupKey: string,
  groupLabel: string,
  title: string,
  domain: MissionDomain,
  searchQuery: string,
  sortOrder: number,
  priority: MissionDecisionWrite["priority"] = "important"
): MissionDecisionWrite {
  return { groupKey, groupLabel, title, domain, searchQuery, sortOrder, priority };
}

export const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    id: "move_house",
    title: "Move to a new house",
    goal: "Complete relocation with controlled spend and clear buy/wait calls.",
    suggestedBudget: 8000,
    decisions: [
      d("housing", "Housing", "Rental deposit / first month", "housing", "apartment deposit costs", 1, "critical"),
      d("furniture", "Furniture", "Sofa", "product", "sofa under 800", 2),
      d("furniture", "Furniture", "Bed frame + mattress", "product", "bed mattress bundle", 3, "critical"),
      d("furniture", "Furniture", "Desk", "product", "home office desk", 4),
      d("furniture", "Furniture", "Chair", "product", "ergonomic office chair", 5),
      d("utilities", "Utilities", "Internet plan", "utilities", "fiber internet home plan", 6, "critical"),
      d("utilities", "Utilities", "Electricity contract", "utilities", "electricity provider switch", 7),
      d("insurance", "Insurance", "Home contents insurance", "insurance", "home contents insurance", 8, "critical"),
      d("subscriptions", "Subscriptions", "Streaming / tools cleanup", "subscription", "cancel unused subscriptions", 9),
      d("travel", "Travel", "Moving van / transport", "service", "moving company quote", 10),
    ],
  },
  {
    id: "gaming_setup",
    title: "Prepare a gaming setup",
    goal: "Build a high-value gaming rig without overpaying on GPUs and peripherals.",
    suggestedBudget: 2500,
    decisions: [
      d("core", "Core", "GPU", "product", "graphics card best value", 1, "critical"),
      d("core", "Core", "CPU", "product", "gaming cpu", 2, "critical"),
      d("core", "Core", "Monitor", "product", "144hz gaming monitor", 3),
      d("peripherals", "Peripherals", "Headset", "product", "gaming headset", 4),
      d("peripherals", "Peripherals", "Keyboard", "product", "mechanical keyboard", 5),
      d("peripherals", "Peripherals", "Mouse", "product", "gaming mouse", 6),
      d("chair", "Comfort", "Gaming chair / office chair", "product", "ergonomic gaming chair", 7),
      d("subs", "Subscriptions", "Game Pass / Plus", "subscription", "xbox game pass ultimate worth it", 8),
    ],
  },
  {
    id: "travel_japan",
    title: "Travel to Japan",
    goal: "Book flights, stays, and gear with timing-aware Instant Decisions.",
    suggestedBudget: 3500,
    decisions: [
      d("flights", "Flights", "Outbound + return flight", "flight", "flight to Tokyo", 1, "critical"),
      d("stays", "Stays", "Tokyo hotel", "hotel", "hotel in Tokyo for 4 nights", 2, "critical"),
      d("stays", "Stays", "Kyoto hotel", "hotel", "hotel in Kyoto for 3 nights", 3),
      d("rail", "Transport", "JR Pass decision", "subscription", "JR Pass worth it", 4, "important"),
      d("gear", "Gear", "Luggage", "product", "carry on luggage", 5),
      d("gear", "Gear", "Travel adapter / power bank", "product", "travel power bank", 6),
      d("insurance", "Insurance", "Travel insurance", "insurance", "travel insurance japan", 7, "critical"),
      d("phone", "Connectivity", "eSIM / phone plan", "subscription", "japan travel esim", 8),
    ],
  },
  {
    id: "start_university",
    title: "Start university",
    goal: "Equip study life with durable value decisions on laptop, housing, and plans.",
    suggestedBudget: 2000,
    decisions: [
      d("device", "Devices", "Laptop", "product", "student laptop under 1000", 1, "critical"),
      d("device", "Devices", "Headphones", "product", "noise cancelling headphones student", 2),
      d("software", "Software", "Office / creative suite", "subscription", "microsoft 365 student", 3),
      d("housing", "Housing", "Student housing deposit", "housing", "student housing costs", 4, "critical"),
      d("bike", "Transport", "Bike / transit pass", "product", "city bike durable", 5),
      d("insurance", "Insurance", "Student liability insurance", "insurance", "student liability insurance", 6),
    ],
  },
  {
    id: "home_office",
    title: "Build a home office",
    goal: "Ship a productive workspace with clear buy/wait calls on desk, chair, and displays.",
    suggestedBudget: 1500,
    decisions: [
      d("furniture", "Furniture", "Desk", "product", "standing desk", 1, "critical"),
      d("furniture", "Furniture", "Chair", "product", "ergonomic office chair", 2, "critical"),
      d("display", "Displays", "Monitor", "product", "27 inch 4k monitor", 3),
      d("device", "Devices", "Webcam / mic", "product", "webcam microphone kit", 4),
      d("lighting", "Lighting", "Desk lamp", "product", "desk lamp eye care", 5),
      d("subs", "Software", "Productivity suite", "subscription", "notion vs microsoft 365", 6),
    ],
  },
  {
    id: "start_business",
    title: "Start a business",
    goal: "Sequence foundational tools, legal/insurance, and ops stack without waste.",
    suggestedBudget: 4000,
    decisions: [
      d("legal", "Foundation", "Business insurance", "insurance", "small business liability insurance", 1, "critical"),
      d("banking", "Banking", "Business bank account", "banking", "business bank account fees", 2, "critical"),
      d("software", "Software", "Accounting software", "subscription", "accounting software small business", 3, "critical"),
      d("software", "Software", "CRM / email", "subscription", "crm for startups", 4),
      d("device", "Devices", "Laptop", "product", "business laptop", 5),
      d("web", "Presence", "Domain + hosting", "subscription", "domain hosting business", 6),
      d("phone", "Comms", "Business phone plan", "subscription", "business mobile plan", 7),
    ],
  },
  {
    id: "ecommerce_brand",
    title: "Launch an ecommerce brand",
    goal: "Decide stack, fulfillment, and creatives with confidence-aware Instant Decisions.",
    suggestedBudget: 5000,
    decisions: [
      d("platform", "Platform", "Shopify vs alternatives", "subscription", "shopify vs woocommerce", 1, "critical"),
      d("payments", "Payments", "Payment processor", "subscription", "stripe vs mollie fees", 2, "critical"),
      d("fulfillment", "Ops", "Fulfillment / 3PL", "service", "ecommerce fulfillment europe", 3),
      d("ads", "Growth", "Ads creative tools", "subscription", "canva vs adobe express", 4),
      d("device", "Devices", "Product photography setup", "product", "product photography kit", 5),
      d("shipping", "Shipping", "Shipping labels / carrier", "service", "ecommerce shipping rates", 6),
      d("insurance", "Insurance", "Product liability", "insurance", "product liability insurance ecommerce", 7, "critical"),
    ],
  },
];

export function getMissionTemplate(id: string): MissionTemplate | null {
  return MISSION_TEMPLATES.find((t) => t.id === id) ?? null;
}

/** Map mission domain → live decision router domain when available. */
export function engineDomainFor(domain: MissionDomain): DecisionDomain | null {
  switch (domain) {
    case "product":
    case "flight":
    case "hotel":
    case "subscription":
    case "software":
    case "insurance":
    case "course":
    case "device":
    case "service":
      return domain;
    case "housing":
    case "utilities":
    case "healthcare":
    case "car":
    case "banking":
      return null; // pending live adapters — still tracked as Living Decision stubs via search
    default:
      return "product";
  }
}

export function briefHrefForDecision(searchQuery: string | null | undefined): string {
  const q = (searchQuery || "").trim();
  if (!q) return "/";
  return `/?q=${encodeURIComponent(q)}`;
}
