export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalPolicy = {
  slug: string;
  title: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSection[];
};

export const LEGAL_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL?.trim() || "trust@quantai.app";

export const LEGAL_PRIVACY_EMAIL =
  process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL?.trim() || "trust@quantai.app";
