/**
 * Next.js instrumentation — validate env on server boot (development + production).
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { assertQuantaiEnvOnBoot } = await import("@/lib/env/quantaiEnv");
  assertQuantaiEnvOnBoot();
}
