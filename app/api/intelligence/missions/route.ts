import { auth } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { MISSION_TEMPLATES } from "@/lib/missions/templates";
import {
  createMissionForUser,
  listMissionsForUser,
} from "@/lib/missions/server";
import type { MissionCreateInput, MissionPriority } from "@/lib/missions/types";
import { supabaseAdminConfigured } from "@/lib/supabaseAdmin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return jsonErr(401, "Unauthorized");

  const result = await listMissionsForUser(userId);
  return jsonOk({
    ...result.dashboard,
    templates: MISSION_TEMPLATES.map((t) => ({
      id: t.id,
      title: t.title,
      goal: t.goal,
      suggestedBudget: t.suggestedBudget,
      decisionCount: t.decisions.length,
    })),
    configured: result.configured && supabaseAdminConfigured,
    error: result.error,
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return jsonErr(401, "Unauthorized");

  let body: MissionCreateInput;
  try {
    body = (await req.json()) as MissionCreateInput;
  } catch {
    return jsonErr(400, "Invalid JSON");
  }

  const priority = body.priority as MissionPriority | undefined;
  const created = await createMissionForUser(userId, {
    title: body.title,
    goal: body.goal,
    budget: body.budget,
    deadline: body.deadline,
    priority,
    templateId: body.templateId,
    currency: body.currency,
  });

  if (!created.mission) {
    if (created.error === "SCHEMA_MISSING") {
      return jsonErr(503, "Mission schema not applied yet", { code: "SCHEMA_MISSING" });
    }
    if (created.error === "STORAGE_UNAVAILABLE") {
      return jsonErr(503, "Storage unavailable", { code: "STORAGE_UNAVAILABLE" });
    }
    return jsonErr(400, created.error || "Create failed");
  }

  return jsonOk({ mission: created.mission });
}
