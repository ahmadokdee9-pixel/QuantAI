import { auth } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { updateMissionDecisionForUser } from "@/lib/missions/server";
import type { MissionDecisionStatus, MissionPriority } from "@/lib/missions/types";

type Ctx = { params: Promise<{ decisionId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { userId } = await auth();
  if (!userId) return jsonErr(401, "Unauthorized");
  const { decisionId } = await ctx.params;

  let body: Partial<{
    status: MissionDecisionStatus;
    priority: MissionPriority;
    notes: string | null;
    productLink: string | null;
    decisionId: string | null;
    memoryIdentity: string | null;
    searchQuery: string | null;
  }>;
  try {
    body = await req.json();
  } catch {
    return jsonErr(400, "Invalid JSON");
  }

  const updated = await updateMissionDecisionForUser(userId, decisionId, body);
  if (!updated.decision) {
    return jsonErr(
      updated.error === "Not found" ? 404 : 400,
      updated.error || "Update failed"
    );
  }
  return jsonOk({ decision: updated.decision });
}
