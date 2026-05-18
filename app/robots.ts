import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/stripe/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing", "/commerce-intelligence"],
      disallow: ["/api/", "/dashboard", "/billing", "/saved", "/alerts"],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
