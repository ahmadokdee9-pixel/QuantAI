import Link from "next/link";

const FOOTER_COLUMNS = [
  {
    title: "Governance",
    links: [
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "Billing Policy", href: "/legal/billing" },
      { label: "Refund Policy", href: "/legal/refund" },
    ],
  },
  {
    title: "Intelligence",
    links: [
      { label: "AI Transparency", href: "/#quantai-trust" },
      { label: "Signal Methodology", href: "/#how-it-works" },
      { label: "Intelligence Architecture", href: "/commerce-intelligence" },
      { label: "System Status", href: "/legal/status" },
    ],
  },
  {
    title: "Trust",
    links: [
      { label: "Data & Security", href: "/legal/security" },
      { label: "Trust & Safety", href: "/legal/trust" },
      { label: "Cookies", href: "/legal/cookies" },
      { label: "Contact", href: "mailto:trust@quantai.app" },
    ],
  },
] as const;

export default function EnterpriseFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="qi-enterprise-footer border-t border-white/[0.06]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <p className="qi-enterprise-footer-brand">QuantAI</p>
            <p className="qi-enterprise-footer-tagline mt-3 max-w-xs">
              QuantAI provides structured commerce intelligence and comparative market synthesis.
            </p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="qi-enterprise-footer-col-title">{col.title}</p>
              <ul className="qi-enterprise-footer-links mt-4">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="qi-enterprise-footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="qi-enterprise-footer-base mt-12 border-t border-white/[0.05] pt-8">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px]">
            <Link href="/pricing" className="qi-enterprise-footer-link">
              Access layers
            </Link>
            <Link href="/dashboard" className="qi-enterprise-footer-link">
              Workspace
            </Link>
            <Link href="/billing" className="qi-enterprise-footer-link">
              Billing
            </Link>
          </div>
          <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-500/90">
            © {year} QuantAI · Global commerce intelligence systems
          </p>
        </div>
      </div>
    </footer>
  );
}
