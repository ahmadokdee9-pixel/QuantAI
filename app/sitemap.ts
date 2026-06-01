import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/stripe/config";

const legalRoutes = [
  "/legal/privacy",
  "/legal/terms",
  "/legal/disclaimer",
  "/legal/billing",
  "/legal/refund",
  "/legal/cookies",
  "/legal/security",
  "/legal/trust",
  "/legal/status",
  "/contact",
];

const evergreenRoutes = [
  "",
  "/how-it-works",
  "/pricing",
  ...legalRoutes,
  "/commerce-intelligence",
  "/commerce-intelligence/nl/electronics",
  "/commerce-intelligence/nl/furniture",
  "/commerce-intelligence/eu/beauty",
  "/commerce-intelligence/uk/gaming",
  "/commerce-intelligence/us/luxury",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  const now = new Date();
  return evergreenRoutes.map((route) => ({
    url: `${base}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/commerce-intelligence" ? 0.8 : 0.64,
  }));
}
