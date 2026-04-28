/**
 * Pipeline orchestrator — runs the 5 agents in sequence for a given task.
 *
 * The pipeline has two entry points:
 *   runPipeline(taskId)                    — runs agents 1-4, stops for human review
 *   continuePipelineAfterApproval(taskId)  — runs Forge after human approves
 *
 * Every step writes to AgentRun, Decision, and AuditLog so the entire
 * history is captured in the database.
 */

import { db } from "./db";
import { logAudit } from "./audit";
import * as Maestro from "./agents/maestro";
import * as Quinn from "./agents/quinn";
import * as Raven from "./agents/raven";
import * as Atlas from "./agents/atlas";
import * as Forge from "./agents/forge";

// ── Helper: run one agent and record everything ───────────────────────────────

/**
 * Wraps an agent's run() call with full logging:
 * - Creates an AgentRun row at start
 * - Updates it on success or failure
 * - Writes audit log entries
 *
 * Returns the parsed output on success, throws on failure.
 */
async function executeAgent<T>(
  taskId: string,
  agentName: string,
  inputText: string,
  runFn: (input: string) => Promise<T>
): Promise<T> {
  // Look up the agent's DB id by name
  const agent = await db.agent.findUniqueOrThrow({ where: { name: agentName } });

  // Mark agent as running
  await db.agent.update({ where: { id: agent.id }, data: { status: "running" } });

  // Create the AgentRun record before the call (so we can reference it if we crash)
  const agentRun = await db.agentRun.create({
    data: {
      taskId,
      agentId: agent.id,
      inputText,
      status: "pending",
    },
  });

  await logAudit({
    actorType: "AGENT",
    actorName: agentName,
    action: "AGENT_RUN_STARTED",
    taskId,
    details: `${agentName} started processing task.`,
  });

  try {
    // Actually call the agent
    const output = await runFn(inputText);

    // Record the successful result
    await db.agentRun.update({
      where: { id: agentRun.id },
      data: {
        outputJson: JSON.stringify(output),
        status: "completed",
        finishedAt: new Date(),
      },
    });

    await db.agent.update({ where: { id: agent.id }, data: { status: "idle" } });

    await logAudit({
      actorType: "AGENT",
      actorName: agentName,
      action: "AGENT_RUN_COMPLETED",
      taskId,
      details: `${agentName} completed successfully.`,
    });

    return output;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Record the failure
    await db.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: "failed",
        errorMessage,
        finishedAt: new Date(),
      },
    });

    await db.agent.update({ where: { id: agent.id }, data: { status: "error" } });

    await logAudit({
      actorType: "AGENT",
      actorName: agentName,
      action: "AGENT_RUN_FAILED",
      taskId,
      details: `${agentName} failed: ${errorMessage}`,
    });

    // Re-throw so the pipeline can handle it
    throw err;
  }
}

/**
 * Record a Decision row and write an audit log entry.
 */
async function recordDecision({
  taskId,
  agentName,
  decisionType,
  verdict,
  reasoningSummary,
  confidence,
  requiresHumanApproval = false,
}: {
  taskId: string;
  agentName: string;
  decisionType: string;
  verdict: string;
  reasoningSummary: string;
  confidence: number;
  requiresHumanApproval?: boolean;
}) {
  const agent = await db.agent.findUniqueOrThrow({ where: { name: agentName } });

  const decision = await db.decision.create({
    data: {
      taskId,
      agentId: agent.id,
      decisionType,
      verdict,
      reasoningSummary,
      confidence,
      requiresHumanApproval,
    },
  });

  await logAudit({
    actorType: "AGENT",
    actorName: agentName,
    action: "DECISION_RECORDED",
    taskId,
    details: `${agentName} decision: ${verdict} (confidence ${confidence}%)`,
  });

  return decision;
}

// ── Main pipeline entry point ─────────────────────────────────────────────────

/**
 * Run the full pipeline up to the human approval gate.
 * Sequence: Maestro → Quinn → Raven → Atlas → STOP (awaiting human)
 *
 * If any agent fails, the task stays at its current status so the user
 * can click Retry from the UI.
 */
export async function runPipeline(taskId: string): Promise<void> {
  const task = await db.task.findUniqueOrThrow({ where: { id: taskId } });
  const ideaSummary = `Title: ${task.title}\n\nDescription: ${task.description}`;

  // ── Step 1: Maestro — Routing ────────────────────────────────────────────
  await db.task.update({ where: { id: taskId }, data: { status: "ROUTING" } });

  const maestroOutput = await executeAgent(
    taskId,
    "Maestro",
    ideaSummary,
    Maestro.run
  );

  await recordDecision({
    taskId,
    agentName: "Maestro",
    decisionType: "ROUTING",
    verdict: maestroOutput.routeTo,
    reasoningSummary: maestroOutput.summary,
    confidence: maestroOutput.clarityScore,
  });

  // If Maestro says the idea needs clarification, send it back to DRAFT
  if (maestroOutput.routeTo === "CLARIFY") {
    const missing = maestroOutput.missingInfo.join("; ");
    await db.task.update({
      where: { id: taskId },
      data: {
        status: "DRAFT",
        description:
          task.description +
          `\n\n[Maestro feedback: needs clarification. Missing: ${missing}]`,
      },
    });
    await logAudit({
      actorType: "SYSTEM",
      actorName: "Pipeline",
      action: "PIPELINE_HALTED",
      taskId,
      details: `Maestro routed back to DRAFT. Missing info: ${missing}`,
    });
    return; // Stop the pipeline
  }

  // ── Step 2: Quinn — Research ─────────────────────────────────────────────
  await db.task.update({ where: { id: taskId }, data: { status: "RESEARCHING" } });

  const quinnInput =
    ideaSummary +
    `\n\nMaestro summary: ${maestroOutput.summary}`;

  const quinnOutput = await executeAgent(taskId, "Quinn", quinnInput, Quinn.run);

  await recordDecision({
    taskId,
    agentName: "Quinn",
    decisionType: "RESEARCH",
    verdict: `Confidence ${quinnOutput.confidence}%`,
    reasoningSummary: quinnOutput.hypothesis,
    confidence: quinnOutput.confidence,
  });

  // ── Step 3: Raven — Red Team ─────────────────────────────────────────────
  await db.task.update({ where: { id: taskId }, data: { status: "RED_TEAMING" } });

  const ravenInput =
    ideaSummary +
    `\n\nResearch hypothesis: ${quinnOutput.hypothesis}` +
    `\nEdge: ${quinnOutput.edge}` +
    `\nCounterargument: ${quinnOutput.counterargument}` +
    `\nExpected failure modes: ${quinnOutput.expectedFailureModes.join(", ")}`;

  const ravenOutput = await executeAgent(taskId, "Raven", ravenInput, Raven.run);

  await recordDecision({
    taskId,
    agentName: "Raven",
    decisionType: "RED_TEAM",
    verdict: ravenOutput.verdict,
    reasoningSummary: ravenOutput.failureHypotheses.join(" | "),
    confidence: 100, // Raven doesn't output confidence; it's a categorical verdict
  });

  // ── Step 4: Atlas — Risk Review ──────────────────────────────────────────
  await db.task.update({ where: { id: taskId }, data: { status: "RISK_REVIEW" } });

  const atlasInput =
    ideaSummary +
    `\n\n=== QUINN RESEARCH ===` +
    `\nHypothesis: ${quinnOutput.hypothesis}` +
    `\nEdge: ${quinnOutput.edge}` +
    `\nConfidence: ${quinnOutput.confidence}%` +
    `\nCounterargument: ${quinnOutput.counterargument}` +
    `\nData needed: ${quinnOutput.dataNeeded.join(", ")}` +
    `\n\n=== RAVEN RED TEAM ===` +
    `\nVerdict: ${ravenOutput.verdict}` +
    `\nFailure hypotheses: ${ravenOutput.failureHypotheses.join(" | ")}` +
    `\nHidden assumptions: ${ravenOutput.hiddenAssumptions.join(", ")}` +
    `\nRegime sensitivities: ${ravenOutput.regimeSensitivities.join(", ")}` +
    (ravenOutput.conditions.length > 0
      ? `\nConditions: ${ravenOutput.conditions.join(", ")}`
      : "");

  const atlasOutput = await executeAgent(taskId, "Atlas", atlasInput, Atlas.run);

  // Atlas's decision requires human approval if it's APPROVE or LIMIT
  const needsHuman = atlasOutput.verdict !== "REJECT";

  await recordDecision({
    taskId,
    agentName: "Atlas",
    decisionType: "RISK_REVIEW",
    verdict: atlasOutput.verdict,
    reasoningSummary: atlasOutput.riskNotes,
    confidence: atlasOutput.confidence,
    requiresHumanApproval: needsHuman,
  });

  // If Atlas rejects, stop the pipeline
  if (atlasOutput.verdict === "REJECT") {
    await db.task.update({ where: { id: taskId }, data: { status: "REJECTED" } });
    await logAudit({
      actorType: "AGENT",
      actorName: "Atlas",
      action: "PIPELINE_REJECTED",
      taskId,
      details: `Atlas rejected: ${atlasOutput.riskNotes}`,
    });
    return;
  }

  // Otherwise, wait for human approval
  await db.task.update({
    where: { id: taskId },
    data: { status: "AWAITING_HUMAN" },
  });

  await logAudit({
    actorType: "SYSTEM",
    actorName: "Pipeline",
    action: "AWAITING_HUMAN_APPROVAL",
    taskId,
    details: `Atlas verdict: ${atlasOutput.verdict}. Waiting for human to approve or reject.`,
  });
}

// ── Post-approval pipeline ────────────────────────────────────────────────────

/**
 * Run Forge after the human has clicked Approve.
 * Sequence: Forge → DONE
 */
export async function continuePipelineAfterApproval(taskId: string): Promise<void> {
  const task = await db.task.findUniqueOrThrow({ where: { id: taskId } });

  // Gather all prior agent outputs to give Forge full context
  const runs = await db.agentRun.findMany({
    where: { taskId, status: "completed" },
    include: { agent: true },
    orderBy: { startedAt: "asc" },
  });

  // Build a summary of everything that happened before Forge
  let forgeInput = `Title: ${task.title}\nDescription: ${task.description}\n\n`;
  for (const run of runs) {
    forgeInput += `=== ${run.agent.name.toUpperCase()} OUTPUT ===\n`;
    forgeInput += run.outputJson + "\n\n";
  }
  forgeInput += "Human has reviewed and approved the above analysis. Please build the implementation prompt.";

  await db.task.update({
    where: { id: taskId },
    data: { status: "BUILDING_PROMPT" },
  });

  const forgeOutput = await executeAgent(taskId, "Forge", forgeInput, Forge.run);

  await recordDecision({
    taskId,
    agentName: "Forge",
    decisionType: "BUILD",
    verdict: "BUILT",
    reasoningSummary: forgeOutput.buildSpecSummary,
    confidence: 100,
  });

  // Save Forge's prompt to the Task record and mark as DONE
  await db.task.update({
    where: { id: taskId },
    data: {
      status: "DONE",
      finalPrompt: forgeOutput.claudeCodePrompt,
    },
  });

  await logAudit({
    actorType: "SYSTEM",
    actorName: "Pipeline",
    action: "PIPELINE_COMPLETE",
    taskId,
    details: `Forge produced the final Claude Code prompt. Task is DONE.`,
  });
}

// ── Retry the last failed step ────────────────────────────────────────────────

/**
 * Find the most recently failed AgentRun for a task and re-run that agent.
 * This lets the user click "Retry" from the UI without restarting from scratch.
 */
export async function retryLastFailedStep(taskId: string): Promise<void> {
  const failedRun = await db.agentRun.findFirst({
    where: { taskId, status: "failed" },
    include: { agent: true },
    orderBy: { startedAt: "desc" },
  });

  if (!failedRun) {
    throw new Error("No failed step found for this task.");
  }

  const agentName = failedRun.agent.name;

  await logAudit({
    actorType: "HUMAN",
    actorName: "User",
    action: "RETRY_REQUESTED",
    taskId,
    details: `Retrying ${agentName} step.`,
  });

  // Re-run the appropriate portion of the pipeline based on which agent failed
  if (agentName === "Forge") {
    await continuePipelineAfterApproval(taskId);
  } else {
    // For any step before the human gate, re-run the full pipeline from the top.
    // We reset the status to DRAFT first so runPipeline picks it up cleanly.
    const task = await db.task.findUniqueOrThrow({ where: { id: taskId } });
    // Remove the Maestro feedback note if present from a previous clarify
    await db.task.update({
      where: { id: taskId },
      data: { status: "DRAFT" },
    });
    // Small re-entrancy guard: re-fetch the task after update
    await runPipeline(taskId);
  }
}
