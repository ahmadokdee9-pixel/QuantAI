import { auth } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { addMissionDecisionForUser } from "@/lib/missions/server";
import type { MissionDecisionWrite, MissionDomain, MissionPriority } from "@/lib/missions/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { userId } = await auth();
  if (!userId) return jsonErr(401, "Unauthorized");
  const { id: missionId } = await ctx.params;

  let body: MissionDecisionWrite;
  try {
    body = await req.json();
  } catch {
    return jsonErr(400, "Invalid JSON");
  }

  const title = (body.title || "").trim();
  if (!title) return jsonErr(400, "Title required");
  if (!body.groupKey || !body.groupLabel) {
    return jsonErr(400, "groupKey and groupLabel required");
  }

  const created = await addMissionDecisionForUser(userId, missionId, {
    groupKey: body.groupKey,
    groupLabel: body.groupLabel,
    title,
    domain: (body.domain || "product") as MissionDomain,
    priority: body.priority as MissionPriority | undefined,
    searchQuery: body.searchQuery,
    sortOrder: body.sortOrder,
  });

  if (!created.decision) {
    return jsonErr(400, created.error || "Create failed");
  }
  return jsonOk({ decision: created.decision });
}
