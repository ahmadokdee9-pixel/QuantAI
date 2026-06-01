import type { Metadata } from "next";
import Link from "next/link";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { LEGAL_CONTACT_EMAIL, LEGAL_PRIVACY_EMAIL } from "@/lib/legal/types";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact QuantAI for support, privacy, security, and beta inquiries.",
};

const CHANNELS = [
  {
    title: "General & beta support",
    detail: "Invite access, product questions, and operational issues during the beta.",
    email: LEGAL_CONTACT_EMAIL,
  },
  {
    title: "Privacy & data requests",
    detail: "Access, correction, deletion, and privacy-related inquiries.",
    email: LEGAL_PRIVACY_EMAIL,
  },
  {
    title: "Security reports",
    detail: "Responsible disclosure of security vulnerabilities.",
    email: LEGAL_CONTACT_EMAIL,
  },
  {
    title: "Billing & refunds",
    detail: "Clearance subscriptions, invoices, and refund requests.",
    email: LEGAL_CONTACT_EMAIL,
  },
] as const;

export default function ContactPage() {
  return (
    <LegalPageShell>
      <article className="qa-ref-legal-doc">
        <header className="qa-ref-legal-doc__head">
          <p className="qa-ref-ws-kicker">Operating governance</p>
          <h1 className="qa-ref-ws-display">Contact</h1>
          <p className="qa-ref-ws-lead max-w-2xl">
            Reach the QuantAI team for invite-only beta support, governance requests, and incident
            reports.
          </p>
        </header>

        <div className="qa-ref-legal-doc__body">
          {CHANNELS.map((channel) => (
            <section key={channel.title} className="qa-ref-legal-doc__section">
              <h2 className="qa-ref-legal-doc__heading">{channel.title}</h2>
              <p className="qa-ref-legal-doc__p">{channel.detail}</p>
              <p className="qa-ref-legal-doc__p">
                <a href={`mailto:${channel.email}`} className="qa-ref-link">
                  {channel.email}
                </a>
              </p>
            </section>
          ))}

          <section className="qa-ref-legal-doc__section">
            <h2 className="qa-ref-legal-doc__heading">Response expectations</h2>
            <p className="qa-ref-legal-doc__p">
              During the invite-only beta we aim to respond within two business days. Critical
              security reports are prioritized.
            </p>
          </section>
        </div>

        <footer className="qa-ref-legal-doc__foot">
          <p className="qa-ref-ws-meta">
            <Link href="/legal/privacy" className="qa-ref-link">
              Privacy Policy
            </Link>
            {" · "}
            <Link href="/legal/terms" className="qa-ref-link">
              Terms of Service
            </Link>
            {" · "}
            <Link href="/legal/disclaimer" className="qa-ref-link">
              AI disclaimer
            </Link>
          </p>
          <Link href="/" className="qa-ref-btn qa-ref-btn--ghost mt-6 inline-flex">
            Return to command layer
          </Link>
        </footer>
      </article>
    </LegalPageShell>
  );
}
