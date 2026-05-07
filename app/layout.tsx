import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Space_Grotesk } from "next/font/google";
const space = Space_Grotesk({
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "QuantAI",
  description: "AI buying decision engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={space.className}>{children}</body>
      </html>
    </ClerkProvider>
  );
}