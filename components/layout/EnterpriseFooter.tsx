import Link from "next/link";



const FOOTER_COLUMNS = [

  {

    title: "Platform",

    links: [

      { label: "Search", href: "/" },

      { label: "Dashboard", href: "/dashboard" },

      { label: "Saved", href: "/saved" },

      { label: "How it works", href: "/how-it-works" },

      { label: "Pricing", href: "/pricing" },

    ],

  },

  {

    title: "Governance",

    links: [

      { label: "Terms", href: "/legal/terms" },

      { label: "Privacy", href: "/legal/privacy" },

      { label: "Billing", href: "/legal/billing" },

      { label: "Cookies", href: "/legal/cookies" },

    ],

  },

  {

    title: "Trust",

    links: [

      { label: "Security", href: "/legal/security" },

      { label: "Trust", href: "/legal/trust" },

      { label: "Status", href: "/legal/status" },

      { label: "Contact", href: "mailto:trust@quantai.app" },

    ],

  },

  {

    title: "Resources",

    links: [

      { label: "Commerce intel", href: "/commerce-intelligence" },

      { label: "Alerts", href: "/alerts" },

      { label: "Analytics", href: "/analytics" },

      { label: "Billing", href: "/billing" },

    ],

  },

] as const;



export default function EnterpriseFooter() {

  const year = new Date().getFullYear();



  return (

    <footer className="qa-ref-footer qa-ref-footer--enterprise qa-ref-footer--compact qa-ref-footer--os">
      <div className="qa-ref-footer__inner">
        <div className="qa-ref-footer__compact-row">
          <div className="qa-ref-footer__brand">
            <p className="qa-ref-footer__system-kicker">Commerce operating system</p>
            <p className="qa-ref-footer__logo">QuantAI</p>
            <p className="qa-ref-footer__mission">
              Commerce intelligence for price, trust, timing, and product quality.
            </p>
          </div>
          <div className="qa-ref-footer__grid qa-ref-footer__grid--compact">

            {FOOTER_COLUMNS.map((col) => (

              <div key={col.title}>

                <p className="qa-ref-footer__col-title">{col.title}</p>

                <ul className="qa-ref-footer__links">

                  {col.links.map((link) => (

                    <li key={link.label}>

                      <Link href={link.href}>{link.label}</Link>

                    </li>

                  ))}

                </ul>

              </div>

            ))}

          </div>

        </div>

        <div className="qa-ref-footer__status-row">
          <span className="qa-ref-footer__status-item">
            <span className="qa-ref-footer__status-dot" aria-hidden />
            Status · All systems operational
          </span>
          <span className="qa-ref-footer__status-item">Coverage · EU + US</span>
          <span className="qa-ref-footer__status-item">© {year} QuantAI</span>
        </div>
      </div>

    </footer>

  );

}


