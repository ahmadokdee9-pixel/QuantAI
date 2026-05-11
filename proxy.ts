import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/saved(.*)",
  "/billing(.*)",
  "/alerts(.*)",
  "/analytics(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

/**
 * Clerk must run on API routes so `auth()` / `currentUser()` work in Route Handlers.
 * `auth.protect()` only applies to the protected page prefixes above — `/`, `/pricing`, and `/api/search` stay public.
 */
export const config = {
  matcher: ["/(api|trpc)(.*)", "/((?!_next|.*\\..*).*)"],
};
