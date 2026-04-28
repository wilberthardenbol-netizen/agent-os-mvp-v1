/**
 * test-pipeline.ts — end-to-end test script.
 *
 * Run with: npm run test:pipeline
 *
 * What it does:
 * 1. Creates a fresh test task in the DB
 * 2. Runs the full pipeline (Maestro → Quinn → Raven → Atlas)
 * 3. Simulates human approval (the same fields the API route would write)
 * 4. Runs Forge
 * 5. Prints Forge's final Claude Code prompt
 * 6. Verifies at least 10 audit log rows were created for this task
 *
 * NOTE: This calls the real Anthropic API and will use API credits.
 */

// .env is loaded via the --env-file flag in the npm script (Node 20+ built-in)
import { PrismaClient } from "@prisma/client";
import { runPipeline, continuePipelineAfterApproval } from "../lib/pipeline";

const prisma = new PrismaClient();

async function main() {
  console.log("\n🧪 Agent OS — Pipeline Test\n");
  console.log(
    "This script calls the real Anthropic API. It will take 1-3 minutes."
  );
  console.log("─".repeat(60));

  // ── 1. Create a fresh test task ──────────────────────────────────────────
  const task = await prisma.task.create({
    data: {
      title: "Test: Momentum strategy on BTC/USD",
      description:
        "A simple momentum strategy for Bitcoin using a 20-period EMA crossover on the 1-hour chart. " +
        "Entry signal: 9 EMA crosses above 21 EMA. Exit: opposite crossover or 3% stop loss. " +
        "Position size: 2% of portfolio per trade. Backtest on 2023 data. Research only — no live trading.",
      status: "DRAFT",
    },
  });

  console.log(`\n✅ Created task: ${task.id}`);
  console.log(`   Title: ${task.title}\n`);

  // ── 2. Run the pipeline up to the human gate ─────────────────────────────
  console.log("▶  Running pipeline (Maestro → Quinn → Raven → Atlas)...\n");
  await runPipeline(task.id);

  const afterPipeline = await prisma.task.findUniqueOrThrow({
    where: { id: task.id },
  });

  console.log(`\n✅ Pipeline completed. Task status: ${afterPipeline.status}`);

  if (afterPipeline.status === "REJECTED") {
    console.log(
      "⚠️  Atlas rejected this task. The test will continue to simulate approval anyway."
    );
    // Force the status back to AWAITING_HUMAN for test purposes
    await prisma.task.update({
      where: { id: task.id },
      data: { status: "AWAITING_HUMAN" },
    });
  }

  if (afterPipeline.status === "DRAFT") {
    console.log(
      "⚠️  Maestro sent this back to DRAFT (needs clarification). Forcing to AWAITING_HUMAN for test."
    );
    await prisma.task.update({
      where: { id: task.id },
      data: { status: "AWAITING_HUMAN" },
    });
  }

  // ── 3. Simulate human approval ───────────────────────────────────────────
  console.log("\n👤 Simulating human approval...");

  await prisma.decision.updateMany({
    where: {
      taskId: task.id,
      requiresHumanApproval: true,
      humanApprovedAt: null,
    },
    data: {
      humanApprovedAt: new Date(),
      humanApprovedBy: "TestScript",
    },
  });

  // Ensure task is in AWAITING_HUMAN so continuePipelineAfterApproval can run
  await prisma.task.update({
    where: { id: task.id },
    data: { status: "AWAITING_HUMAN" },
  });

  console.log("✅ Human approval simulated.\n");

  // ── 4. Run Forge ─────────────────────────────────────────────────────────
  console.log("▶  Running Forge...\n");
  await continuePipelineAfterApproval(task.id);

  // ── 5. Print Forge's output ──────────────────────────────────────────────
  const finalTask = await prisma.task.findUniqueOrThrow({
    where: { id: task.id },
  });

  console.log("\n" + "═".repeat(60));
  console.log("🔨 FORGE OUTPUT — CLAUDE CODE PROMPT");
  console.log("═".repeat(60));
  console.log(finalTask.finalPrompt ?? "(no prompt — something went wrong)");
  console.log("═".repeat(60));

  // ── 6. Verify audit log ──────────────────────────────────────────────────
  const auditCount = await prisma.auditLog.count({
    where: { taskId: task.id },
  });

  console.log(`\n📋 Audit log rows for this task: ${auditCount}`);

  if (auditCount >= 10) {
    console.log("✅ PASS — at least 10 audit log rows recorded.");
  } else {
    console.log(
      `❌ FAIL — expected ≥ 10 audit log rows, got ${auditCount}.`
    );
    process.exit(1);
  }

  console.log("\n🎉 Test complete! Task ID:", task.id);
  console.log(
    "   Open http://localhost:3000/tasks/" + task.id + " to see it in the UI."
  );
}

main()
  .catch((e) => {
    console.error("\n❌ Test failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
