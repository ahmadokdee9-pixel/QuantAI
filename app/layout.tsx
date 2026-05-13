import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import QuantShell from "@/components/shell/QuantShell";
import { appUrl } from "@/lib/stripe/config";

const quantaiSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-quantai",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const defaultSite = appUrl();

const description =
  "Live product search with quantitative scoring, store trust signals, and an AI assistant for confident buying decisions.";

export const metadata: Metadata = {
  metadataBase: new URL(defaultSite),
  title: {
    default: "QuantAI — AI shopping intelligence",
    template: "%s · QuantAI",
  },
  description,
  applicationName: "QuantAI",
  keywords: ["AI shopping", "product intelligence", "price comparison", "commerce", "QuantAI"],
  authors: [{ name: "QuantAI" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "QuantAI",
    title: "QuantAI — AI shopping intelligence",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "QuantAI — AI shopping intelligence",
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${quantaiSans.variable} scroll-smooth`}>
        <body className="min-h-dvh min-h-[100dvh] overflow-x-hidden bg-[#020617] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] font-sans text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-50">
          <QuantShell>
            <div id="qa-main">{children}</div>
          </QuantShell>
        </body>
      </html>
    </ClerkProvider>
  );
}
