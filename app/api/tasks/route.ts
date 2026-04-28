/**
 * GET  /api/tasks — list all tasks (newest first)
 * POST /api/tasks — create a new task and immediately start the pipeline
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { runPipeline } from "@/lib/pipeline";
import { logAudit } from "@/lib/audit";

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await db.task.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { agentRuns: true, decisions: true } },
    },
  });

  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { title, description } = body as {
    title?: string;
    description?: string;
  };

  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json(
      { error: "Title and description are required." },
      { status: 400 }
    );
  }

  // Create the task in DRAFT status first
  const task = await db.task.create({
    data: { title: title.trim(), description: description.trim(), status: "DRAFT" },
  });

  await logAudit({
    actorType: "HUMAN",
    actorName: "User",
    action: "TASK_CREATED",
    taskId: task.id,
    details: `Task created: "${task.title}"`,
  });

  // Start the pipeline asynchronously — we return the task id immediately
  // so the UI can start polling. The pipeline runs in the background.
  // Note: in Next.js App Router, we must await or the process may be killed
  // before it finishes. We use a non-blocking pattern here.
  runPipeline(task.id).catch(async (err) => {
    // If the pipeline throws, log it — the UI's Retry button handles recovery
    await logAudit({
      actorType: "SYSTEM",
      actorName: "Pipeline",
      action: "PIPELINE_ERROR",
      taskId: task.id,
      details: `Unhandled pipeline error: ${err instanceof Error ? err.message : String(err)}`,
    }).catch(() => {}); // Don't let logging errors swallow the original error
  });

  return NextResponse.json({ id: task.id }, { status: 201 });
}
