import type { LegalPolicy } from "@/lib/legal/types";
import { LEGAL_CONTACT_EMAIL, LEGAL_PRIVACY_EMAIL } from "@/lib/legal/types";

const EFFECTIVE = "1 June 2026";

export const BETA_LEGAL_POLICIES: Record<string, LegalPolicy> = {
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "How QuantAI collects, uses, and protects information during the invite-only beta.",
    effectiveDate: EFFECTIVE,
    sections: [
      {
        heading: "Scope",
        paragraphs: [
          "This Privacy Policy describes how QuantAI (“we”, “us”) processes information when you use the QuantAI commerce intelligence platform, including search, synthesis, workspace features, and related services (the “Service”).",
          "The Service is offered as an invite-only public beta. By using the Service, you acknowledge this Policy and our Terms of Service.",
        ],
      },
      {
        heading: "Information we collect",
        bullets: [
          "Account data: if you sign in, we receive identifiers and profile basics from our authentication provider (Clerk), such as email and user ID.",
          "Usage data: search queries, interaction events, feature usage, and technical logs (IP address, browser type, timestamps) used for security, rate limits, and product improvement.",
          "Commerce intelligence inputs: product searches, saved listings, watchlist entries, compare selections, and session memory you choose to store.",
          "Payment data: if you subscribe, payment processing is handled by Stripe; we do not store full card numbers.",
        ],
      },
      {
        heading: "How we use information",
        bullets: [
          "Provide search, ranking, synthesis, compare, and workspace functionality.",
          "Enforce plan limits, prevent abuse, and protect API infrastructure.",
          "Operate authentication, billing, and customer support.",
          "Improve reliability, debug errors, and measure aggregate product performance.",
        ],
      },
      {
        heading: "Processors and service providers",
        paragraphs: [
          "We use third-party infrastructure to operate the Service. Categories include authentication (Clerk), database and persistence (Supabase), product search data providers (including SerpAPI), AI inference providers (including OpenAI where enabled), hosting (Vercel), payments (Stripe), and optional analytics forwarding if configured.",
          "These providers process data on our instructions and under their own terms and privacy policies.",
        ],
      },
      {
        heading: "Cookies and local storage",
        bullets: [
          "Session and authentication cookies required to sign in and secure the Service.",
          "Local storage for recent searches, market memory, and commerce session preferences on your device.",
          "Optional analytics or performance cookies if enabled in your deployment environment.",
        ],
      },
      {
        heading: "Retention",
        paragraphs: [
          "We retain account-linked data while your account is active and as needed to provide the Service, comply with law, resolve disputes, and enforce agreements.",
          "Guest search activity may be retained in logs and rate-limit systems for a limited period for security and cost control.",
        ],
      },
      {
        heading: "Your rights and choices",
        bullets: [
          "Access, correct, or delete saved products and workspace data through in-product controls where available.",
          "Request account deletion or data inquiries by contacting us (see Contact).",
          "Depending on your region, you may have rights to access, portability, restriction, or objection; we will respond as required by applicable law.",
        ],
      },
      {
        heading: "International transfers",
        paragraphs: [
          "We may process information in the United States, European Union, and other regions where our providers operate. Appropriate safeguards are used where required.",
        ],
      },
      {
        heading: "Children",
        paragraphs: ["The Service is not directed to children under 16. We do not knowingly collect their data."],
      },
      {
        heading: "Changes",
        paragraphs: [
          "We may update this Policy for beta iterations. Material changes will be reflected by an updated effective date. Continued use after changes constitutes acceptance.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [`Privacy requests: ${LEGAL_PRIVACY_EMAIL}`],
      },
    ],
  },

  terms: {
    slug: "terms",
    title: "Terms of Service",
    summary: "Terms governing access to QuantAI during the invite-only beta.",
    effectiveDate: EFFECTIVE,
    sections: [
      {
        heading: "Agreement",
        paragraphs: [
          "These Terms of Service (“Terms”) govern your access to QuantAI. By accessing or using the Service, you agree to these Terms, our Privacy Policy, and our AI & Information Disclaimer.",
        ],
      },
      {
        heading: "Beta program",
        bullets: [
          "The Service is provided as an invite-only beta and may change, suspend, or end without notice.",
          "Features, limits, and availability are not guaranteed.",
          "You agree to provide feedback-quality use: no scraping, automated abuse, or attempts to circumvent rate limits.",
        ],
      },
      {
        heading: "Eligibility",
        paragraphs: [
          "You must be at least 18 years old and able to form a binding contract. You are responsible for activity under your account.",
        ],
      },
      {
        heading: "Accounts and security",
        bullets: [
          "Keep credentials confidential.",
          "Notify us promptly of unauthorized access.",
          "We may suspend accounts that violate these Terms or threaten platform integrity.",
        ],
      },
      {
        heading: "Acceptable use",
        bullets: [
          "Do not misuse the Service, probe systems, or overload APIs.",
          "Do not use outputs to harass, defraud, or misrepresent retailer relationships.",
          "Do not reverse engineer proprietary systems except where law permits.",
          "Comply with applicable commerce, consumer, and export laws in your jurisdiction.",
        ],
      },
      {
        heading: "Intelligence outputs",
        paragraphs: [
          "QuantAI provides informational synthesis based on third-party listings and heuristics. Outputs are not offers, warranties, or professional advice. See the AI & Information Disclaimer.",
        ],
      },
      {
        heading: "Third-party retailers and links",
        paragraphs: [
          "The Service surfaces links to third-party merchants. QuantAI does not sell products. Purchases are solely between you and the retailer. We are not responsible for retailer pricing, fulfillment, or policies.",
          "Outbound links may use redirect or attribution parameters. Retailer sites have their own terms.",
        ],
      },
      {
        heading: "Subscriptions and billing",
        paragraphs: [
          "Paid clearance layers, if offered, are billed through Stripe subject to the Billing and Refund policies. Fees are shown before purchase.",
        ],
      },
      {
        heading: "Intellectual property",
        paragraphs: [
          "QuantAI owns the Service, branding, and software. You receive a limited, revocable license to use the Service during the beta. You retain rights in content you submit; you grant us a license to operate and improve the Service with that content.",
        ],
      },
      {
        heading: "Disclaimer of warranties",
        paragraphs: [
          'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
        ],
      },
      {
        heading: "Limitation of liability",
        paragraphs: [
          "TO THE MAXIMUM EXTENT PERMITTED BY LAW, QUANTAI AND ITS SUPPLIERS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.",
          "OUR AGGREGATE LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE IS LIMITED TO THE GREATER OF (A) AMOUNTS YOU PAID US IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) USD $100.",
        ],
      },
      {
        heading: "Indemnity",
        paragraphs: [
          "You will indemnify QuantAI against claims arising from your misuse of the Service or violation of these Terms, except where caused by our gross negligence or willful misconduct.",
        ],
      },
      {
        heading: "Governing law",
        paragraphs: [
          "These Terms are governed by the laws of the Netherlands, excluding conflict-of-law rules, unless mandatory consumer protections in your country require otherwise.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [`Legal and terms inquiries: ${LEGAL_CONTACT_EMAIL}`],
      },
    ],
  },

  disclaimer: {
    slug: "disclaimer",
    title: "AI & Information Disclaimer",
    summary: "How to interpret QuantAI intelligence outputs during beta.",
    effectiveDate: EFFECTIVE,
    sections: [
      {
        heading: "Informational purpose only",
        paragraphs: [
          "QuantAI is a commerce intelligence operating system. It synthesizes publicly available and licensed product signals to support research and purchase decisions. It does not provide financial, legal, tax, or investment advice.",
        ],
      },
      {
        heading: "Not a substitute for judgment",
        bullets: [
          "Verify price, availability, warranty, and seller terms on the retailer checkout page before purchase.",
          "Confirm model numbers, regional variants, and compatibility independently.",
          "Treat trust and risk scores as heuristic indicators, not certifications or guarantees.",
        ],
      },
      {
        heading: "AI and automated synthesis",
        bullets: [
          "Some features use automated models and rules that can be incomplete, outdated, or incorrect.",
          "Outputs may omit relevant listings or overweight noisy signals.",
          "During beta, certain AI layers may run in heuristic or limited modes for stability.",
        ],
      },
      {
        heading: "Third-party data",
        paragraphs: [
          "Listings, prices, and merchant names originate from third-party sources and may change without notice. QuantAI does not guarantee accuracy, completeness, or timeliness.",
        ],
      },
      {
        heading: "No endorsement",
        paragraphs: [
          "Inclusion of a retailer or product in results does not constitute endorsement. “Buy”, “Wait”, “Compare”, and similar labels are synthesis summaries, not instructions.",
        ],
      },
      {
        heading: "Affiliate and commercial relationships",
        paragraphs: [
          "QuantAI may earn compensation through outbound links or partner programs where disclosed. Compensation does not determine safety scores, but you should evaluate deals independently.",
        ],
      },
      {
        heading: "Limitation",
        paragraphs: [
          "You assume all risk for decisions made using the Service. QuantAI is not liable for purchase outcomes, retailer disputes, or losses based on intelligence outputs.",
        ],
      },
    ],
  },

  billing: {
    slug: "billing",
    title: "Billing Policy",
    summary: "Clearance subscriptions, renewal, and access changes.",
    effectiveDate: EFFECTIVE,
    sections: [
      {
        heading: "Plans",
        paragraphs: [
          "Paid clearance layers are optional during beta. Plan names, limits, and prices are shown on the Access layers page before checkout.",
        ],
      },
      {
        heading: "Payment",
        paragraphs: [
          "Payments are processed by Stripe. By subscribing, you authorize recurring charges where applicable until you cancel.",
        ],
      },
      {
        heading: "Changes and cancellation",
        bullets: [
          "You may manage billing through the customer portal where available.",
          "We may change plan limits or pricing with notice on the Service.",
          "Access continues through the current billing period unless otherwise stated.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [`Billing support: ${LEGAL_CONTACT_EMAIL}`],
      },
    ],
  },

  refund: {
    slug: "refund",
    title: "Refund Policy",
    summary: "Refund eligibility for clearance subscriptions during beta.",
    effectiveDate: EFFECTIVE,
    sections: [
      {
        heading: "Beta refunds",
        paragraphs: [
          "If you believe you were charged in error, contact us within 14 days of the charge with your account email and invoice reference.",
        ],
      },
      {
        heading: "Eligibility",
        bullets: [
          "Duplicate charges or failed delivery of paid clearance after good-faith support attempt.",
          "Refunds are generally not provided for partial unused periods except where required by law.",
        ],
      },
      {
        heading: "Process",
        paragraphs: [
          "Approved refunds are issued to the original payment method via Stripe. Processing times depend on your bank.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [`Refund requests: ${LEGAL_CONTACT_EMAIL}`],
      },
    ],
  },

  cookies: {
    slug: "cookies",
    title: "Cookie Notice",
    summary: "Cookies and similar technologies used by QuantAI.",
    effectiveDate: EFFECTIVE,
    sections: [
      {
        heading: "What we use",
        bullets: [
          "Strictly necessary cookies for authentication and security.",
          "Preference and session cookies to maintain sign-in state.",
          "Local storage for search memory and UI preferences on your device.",
          "Optional analytics cookies if an analytics sink is configured in your environment.",
        ],
      },
      {
        heading: "Your choices",
        paragraphs: [
          "You can clear browser storage at any time; some features may reset. Browser settings may block cookies required to sign in.",
        ],
      },
    ],
  },

  security: {
    slug: "security",
    title: "Data & Security",
    summary: "Operational safeguards during the beta.",
    effectiveDate: EFFECTIVE,
    sections: [
      {
        heading: "Practices",
        bullets: [
          "Encrypted transport (HTTPS) for web and API traffic.",
          "Secrets stored in environment configuration, not in client code.",
          "Rate limiting and abuse protection on public search endpoints.",
          "Role-scoped database access for server operations.",
        ],
      },
      {
        heading: "Reporting",
        paragraphs: [
          `Report security concerns to ${LEGAL_CONTACT_EMAIL}. Do not publicly disclose active vulnerabilities before we respond.`,
        ],
      },
    ],
  },

  trust: {
    slug: "trust",
    title: "Trust & Responsible Use",
    summary: "Responsible use of commerce signals and outputs.",
    effectiveDate: EFFECTIVE,
    sections: [
      {
        heading: "Responsible use",
        bullets: [
          "Do not present QuantAI outputs as official retailer or brand statements.",
          "Do not use the Service to target individuals or conduct unlawful surveillance.",
          "Respect retailer terms of service when following outbound links.",
        ],
      },
      {
        heading: "Integrity",
        paragraphs: [
          "We work to reduce spam listings and misleading discounts, but no filter is perfect. Report systematic issues via Contact.",
        ],
      },
    ],
  },

  status: {
    slug: "status",
    title: "System Status",
    summary: "Beta availability expectations.",
    effectiveDate: EFFECTIVE,
    sections: [
      {
        heading: "Availability",
        paragraphs: [
          "Search, synthesis, and workspace modules depend on third-party APIs (including product search and AI providers). Interruptions may occur without notice during beta.",
        ],
      },
      {
        heading: "Health checks",
        paragraphs: [
          "Operators may use the /api/health endpoint for deployment verification. Public status page may be added post-beta.",
        ],
      },
      {
        heading: "Incidents",
        paragraphs: [`For active outages during beta, contact ${LEGAL_CONTACT_EMAIL}.`],
      },
    ],
  },
};

export const LEGAL_POLICY_SLUGS = Object.keys(BETA_LEGAL_POLICIES);

export function getLegalPolicy(slug: string): LegalPolicy | undefined {
  return BETA_LEGAL_POLICIES[slug];
}
