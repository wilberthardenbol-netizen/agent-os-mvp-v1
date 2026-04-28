/**
 * GET /api/tasks/[id]
 * Returns the full task with all agent runs, decisions, and audit logs.
 * The UI polls this every 2 seconds while the pipeline is running.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const task = await db.task.findUnique({
    where: { id: params.id },
    include: {
      agentRuns: {
        include: { agent: true },
        orderBy: { startedAt: "asc" },
      },
      decisions: {
        include: { agent: true },
        orderBy: { createdAt: "asc" },
      },
      auditLogs: {
        orderBy: { timestamp: "asc" },
      },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  return NextResponse.json(task);
}
