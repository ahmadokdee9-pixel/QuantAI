import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { runRefreshWorker } from "@/lib/truth/refreshWorker";

export const maxDuration = 60;

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization")?.trim();
  return header === `Bearer ${secret}`;
}

/** Scheduled listing refresh worker (Vercel Cron or external ping). */
export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return jsonErr(401, "Unauthorized");
  }

  try {
    const report = await runRefreshWorker();
    return jsonOk(report);
  } catch (e) {
    return jsonErr(500, e instanceof Error ? e.message : "Refresh worker failed.");
  }
}
