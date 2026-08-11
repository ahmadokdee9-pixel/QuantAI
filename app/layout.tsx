import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import QuantShell from "@/components/shell/QuantShell";
import { appUrl } from "@/lib/stripe/config";

const fontLatin = GeistSans;

const defaultSite = appUrl();

const description =
  "Premium AI commerce intelligence for product search, market comparison, price timing, seller trust, and smarter buying decisions.";

export const metadata: Metadata = {
  metadataBase: new URL(defaultSite),
  title: {
    default: "QuantAI — Premium AI shopping intelligence",
    template: "%s · QuantAI",
  },
  description,
  applicationName: "QuantAI",
  keywords: ["AI shopping", "product intelligence", "price comparison", "commerce intelligence", "shopping decisions", "QuantAI"],
  authors: [{ name: "QuantAI" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "QuantAI",
    title: "QuantAI — Premium AI shopping intelligence",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "QuantAI — Premium AI shopping intelligence",
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f8ff",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={`qa-ui-v1 qa-ref-os--intel-v1 ${fontLatin.variable} scroll-smooth`}>
        <body className="qa-ui-v1 qa-dna-os qa-iconic-os min-h-dvh min-h-[100dvh] overflow-x-hidden pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] font-sans antialiased">
          <QuantShell>
            <div id="qa-main">{children}</div>
          </QuantShell>
        </body>
      </html>
    </ClerkProvider>
  );
}
