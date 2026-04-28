/**
 * POST /api/tasks/[id]/reject
 * Body: { reason: string }
 * Human rejects the task at the approval gate — sets status to REJECTED.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { reason } = body as { reason?: string };

  const task = await db.task.findUnique({ where: { id: params.id } });
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  if (task.status !== "AWAITING_HUMAN") {
    return NextResponse.json(
      { error: `Task is not awaiting human approval (current status: ${task.status}).` },
      { status: 400 }
    );
  }

  // Record the human rejection on the Atlas decision
  await db.decision.updateMany({
    where: { taskId: params.id, requiresHumanApproval: true, humanRejectedAt: null },
    data: {
      humanRejectedAt: new Date(),
      humanRejectionReason: reason ?? "No reason given.",
    },
  });

  await db.task.update({
    where: { id: params.id },
    data: { status: "REJECTED" },
  });

  await logAudit({
    actorType: "HUMAN",
    actorName: "User",
    action: "HUMAN_REJECTED",
    taskId: params.id,
    details: `Human rejected task. Reason: ${reason ?? "none given"}`,
  });

  return NextResponse.json({ ok: true });
}
