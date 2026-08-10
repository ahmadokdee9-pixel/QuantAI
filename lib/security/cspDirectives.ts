/**
 * QuantAI CSP directive extensions merged into Clerk middleware CSP (H-05).
 *
 * Justifications:
 * - style-src 'unsafe-inline': required by Clerk component CSS injection (Clerk docs).
 * - script-src keeps Clerk defaults; with `strict: true` Clerk adds nonce + strict-dynamic
 *   and drops broad http:/https: scheme sources. 'unsafe-eval' is NOT used in production.
 * - img-src https: / data: / blob:: shopping trays load retailer CDN images from many hosts.
 * - object-src / base-uri / frame-ancestors: clickjacking & plugin hardening.
 */

export const QUANTAI_CSP_CUSTOM_DIRECTIVES: Partial<Record<string, string[]>> = {
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "frame-ancestors": ["'none'"],
  "font-src": ["'self'", "data:"],
  "media-src": ["'self'"],
  "img-src": ["'self'", "data:", "blob:", "https:", "https://img.clerk.com"],
  "connect-src": [
    "'self'",
    "https://*.protect.clerk.com",
    "https://api.stripe.com",
    "https://clerk-telemetry.com",
    "https://*.clerk-telemetry.com",
  ],
  "script-src": ["https://*.protect.clerk.com", "https://challenges.cloudflare.com"],
  "frame-src": [
    "'self'",
    "https://challenges.cloudflare.com",
    "https://*.protect.clerk.com",
    "https://js.stripe.com",
    "https://*.js.stripe.com",
    "https://hooks.stripe.com",
  ],
};

/** Required substrings that must appear in the live CSP header. */
export const QUANTAI_CSP_REQUIRED_TOKENS = [
  "default-src",
  "script-src",
  "style-src",
  "img-src",
  "font-src",
  "connect-src",
  "frame-src",
  "object-src",
  "base-uri",
  "frame-ancestors",
  "'none'",
] as const;
