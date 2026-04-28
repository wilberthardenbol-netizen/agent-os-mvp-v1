/**
 * GET /api/decisions
 * Returns all decisions, optionally filtered by taskId or agentId.
 * Query params: ?taskId=xxx  or  ?agentId=xxx
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId") ?? undefined;
  const agentId = searchParams.get("agentId") ?? undefined;

  const decisions = await db.decision.findMany({
    where: {
      ...(taskId ? { taskId } : {}),
      ...(agentId ? { agentId } : {}),
    },
    include: {
      agent: { select: { name: true, role: true } },
      task: { select: { title: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(decisions);
}
