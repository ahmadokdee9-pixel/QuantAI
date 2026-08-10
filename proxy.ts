import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { QUANTAI_CSP_CUSTOM_DIRECTIVES } from "@/lib/security/cspDirectives";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/saved(.*)",
  "/billing(.*)",
  "/alerts(.*)",
  "/analytics(.*)",
  "/decisions(.*)",
  "/watchlist(.*)",
  "/feed(.*)",
  "/agent(.*)",
]);

export default clerkMiddleware(
  async (auth, req) => {
    if (isProtectedRoute(req)) {
      // H-04: with signInUrl set, protect() redirects to /sign-in?redirect_url=…
      // instead of protect-rewrite → dead 404 for signed-out guests.
      await auth.protect();
    }
  },
  {
    // H-04: code-level sign-in/up URLs so production redirects work even if
    // NEXT_PUBLIC_CLERK_SIGN_IN_URL is unset in the deployment env.
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up",
    // H-05: enforce CSP on all matched HTML/API responses.
    // strict:true → nonce + strict-dynamic; drops broad http:/https: script schemes.
    // style-src 'unsafe-inline' remains via Clerk defaults (Clerk CSS-in-JS requirement).
    contentSecurityPolicy: {
      strict: true,
      directives: { ...QUANTAI_CSP_CUSTOM_DIRECTIVES },
    },
  }
);

/**
 * Clerk must run on API routes so `auth()` / `currentUser()` work in Route Handlers.
 * `auth.protect()` only applies to the protected page prefixes above — `/`, `/pricing`, and `/api/search` stay public.
 */
export const config = {
  matcher: ["/(api|trpc)(.*)", "/((?!_next|.*\\..*).*)"],
};
