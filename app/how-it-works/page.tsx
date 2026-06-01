import type { Metadata } from "next";
import HowItWorksContent from "@/components/landing/HowItWorksContent";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Learn how QuantAI synthesizes price, trust, timing, and product quality into clear buying recommendations.",
};

export default function HowItWorksPage() {
  return <HowItWorksContent />;
}
