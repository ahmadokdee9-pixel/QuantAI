import Link from "next/link";
import type { LegalPolicy } from "@/lib/legal/types";

type Props = {
  policy: LegalPolicy;
};

export default function LegalDocumentView({ policy }: Props) {
  return (
    <article className="qa-ref-legal-doc">
      <header className="qa-ref-legal-doc__head">
        <p className="qa-ref-ws-kicker">Operating governance</p>
        <h1 className="qa-ref-ws-display">{policy.title}</h1>
        <p className="qa-ref-ws-lead max-w-2xl">{policy.summary}</p>
        <p className="qa-ref-ws-meta mt-3">Effective {policy.effectiveDate}</p>
      </header>

      <div className="qa-ref-legal-doc__body">
        {policy.sections.map((section) => (
          <section key={section.heading} className="qa-ref-legal-doc__section">
            <h2 className="qa-ref-legal-doc__heading">{section.heading}</h2>
            {section.paragraphs?.map((p) => (
              <p key={p.slice(0, 48)} className="qa-ref-legal-doc__p">
                {p}
              </p>
            ))}
            {section.bullets?.length ? (
              <ul className="qa-ref-legal-doc__list">
                {section.bullets.map((item) => (
                  <li key={item.slice(0, 48)}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <footer className="qa-ref-legal-doc__foot">
        <p className="qa-ref-ws-meta">
          Related:{" "}
          <Link href="/legal/privacy" className="qa-ref-link">
            Privacy
          </Link>
          {" · "}
          <Link href="/legal/terms" className="qa-ref-link">
            Terms
          </Link>
          {" · "}
          <Link href="/legal/disclaimer" className="qa-ref-link">
            AI disclaimer
          </Link>
          {" · "}
          <Link href="/contact" className="qa-ref-link">
            Contact
          </Link>
        </p>
        <Link href="/" className="qa-ref-btn qa-ref-btn--ghost mt-6 inline-flex">
          Return to command layer
        </Link>
      </footer>
    </article>
  );
}
