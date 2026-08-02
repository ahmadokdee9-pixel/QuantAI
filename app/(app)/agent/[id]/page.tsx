"use client";

import { use } from "react";
import MissionDetailView from "@/components/missions/MissionDetailView";

export default function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <MissionDetailView missionId={id} />;
}
