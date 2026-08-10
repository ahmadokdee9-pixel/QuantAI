import { SignIn } from "@clerk/nextjs";

/**
 * H-04: Dedicated Clerk sign-in route so auth.protect() can redirect guests
 * instead of protect-rewrite → 404.
 */
export default function SignInPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        // Honor redirect_url from auth.protect(); fallback only when absent.
        fallbackRedirectUrl="/dashboard"
      />
    </main>
  );
}
