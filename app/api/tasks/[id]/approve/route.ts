/**
 * POST /api/tasks/[id]/approve
 * Human approves the Atlas decision → triggers Forge to run.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { continuePipelineAfterApproval } from "@/lib/pipeline";
import { logAudit } from "@/lib/audit";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Mark the Atlas decision as human-approved
  await db.decision.updateMany({
    where: { taskId: params.id, requiresHumanApproval: true, humanApprovedAt: null },
    data: {
      humanApprovedAt: new Date(),
      humanApprovedBy: "User",
    },
  });

  await logAudit({
    actorType: "HUMAN",
    actorName: "User",
    action: "HUMAN_APPROVED",
    taskId: params.id,
    details: "Human approved the Atlas risk review. Forge will now run.",
  });

  // Run Forge in the background (same non-blocking pattern as POST /api/tasks)
  continuePipelineAfterApproval(params.id).catch(async (err) => {
    await logAudit({
      actorType: "SYSTEM",
      actorName: "Pipeline",
      action: "PIPELINE_ERROR",
      taskId: params.id,
      details: `Forge failed: ${err instanceof Error ? err.message : String(err)}`,
    }).catch(() => {});
  });

  return NextResponse.json({ ok: true });
}
