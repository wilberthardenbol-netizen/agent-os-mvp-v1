/**
 * POST /api/tasks/[id]/retry
 * Re-runs the last failed agent step for a task.
 * Exposed as the "Retry" button in the task detail UI.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { retryLastFailedStep } from "@/lib/pipeline";

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

  // Run the retry in the background
  retryLastFailedStep(params.id).catch(async () => {
    // Errors are already logged inside retryLastFailedStep
  });

  return NextResponse.json({ ok: true });
}
