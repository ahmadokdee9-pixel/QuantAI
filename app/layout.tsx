import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

const quantaiSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-quantai",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "QuantAI — AI shopping intelligence",
  description:
    "Live product search with quantitative scoring, store trust signals, and an AI assistant for confident buying decisions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={quantaiSans.variable}>
        <body className="min-h-dvh bg-[#020617] font-sans text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-50">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
