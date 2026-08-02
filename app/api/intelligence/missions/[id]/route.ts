import { auth } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import {
  getMissionForUser,
  updateMissionForUser,
} from "@/lib/missions/server";
import type { MissionPriority, MissionStatus } from "@/lib/missions/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { userId } = await auth();
  if (!userId) return jsonErr(401, "Unauthorized");
  const { id } = await ctx.params;

  const result = await getMissionForUser(userId, id);
  if (!result.mission) {
    if (result.error) return jsonErr(500, result.error);
    return jsonErr(404, "Mission not found");
  }
  return jsonOk({ mission: result.mission, configured: result.configured });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { userId } = await auth();
  if (!userId) return jsonErr(401, "Unauthorized");
  const { id } = await ctx.params;

  let body: Partial<{
    title: string;
    goal: string | null;
    budget: number | null;
    deadline: string | null;
    priority: MissionPriority;
    status: MissionStatus;
  }>;
  try {
    body = await req.json();
  } catch {
    return jsonErr(400, "Invalid JSON");
  }

  const updated = await updateMissionForUser(userId, id, body);
  if (!updated.mission) {
    return jsonErr(updated.error === "Not found" ? 404 : 400, updated.error || "Update failed");
  }
  return jsonOk({ mission: updated.mission });
}
