/**
 * GET /api/agents — return all 5 agents with their current settings.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agents = await db.agent.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(agents);
}
