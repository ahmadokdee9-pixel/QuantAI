import { SignUp } from "@clerk/nextjs";

/**
 * H-04: Dedicated Clerk sign-up route paired with /sign-in for auth funnel.
 */
export default function SignUpPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/dashboard"
      />
    </main>
  );
}
