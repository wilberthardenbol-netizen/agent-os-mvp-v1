"use client";

/**
 * Task detail page — the most important page in the app.
 *
 * - Polls GET /api/tasks/[id] every 2 seconds while the pipeline is running
 * - Stops polling when status reaches a terminal state (DONE, REJECTED, DRAFT, AWAITING_HUMAN)
 * - Shows the agent timeline, decisions, and approve/reject buttons at the human gate
 * - Renders Forge's final prompt in a code block with a Copy button
 * - Shows a Retry button if any agent run failed
 */

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { Sidebar } from "@/components/Sidebar";
import { StatusBadge } from "@/components/StatusBadge";
import { TaskTimeline } from "@/components/TaskTimeline";
import { Copy, Check, RefreshCw, ThumbsUp, ThumbsDown } from "lucide-react";

// Statuses where we should keep polling (pipeline is actively running)
const POLLING_STATUSES = new Set([
  "ROUTING",
  "RESEARCHING",
  "RED_TEAMING",
  "RISK_REVIEW",
  "BUILDING_PROMPT",
]);

type AgentRun = {
  id: string;
  status: string;
  errorMessage?: string | null;
  startedAt: string;
  finishedAt?: string | null;
  outputJson: string;
  agent: { name: string; role: string };
};

type Decision = {
  id: string;
  decisionType: string;
  verdict: string;
  reasoningSummary: string;
  confidence: number;
  requiresHumanApproval: boolean;
  humanApprovedAt?: string | null;
  humanRejectedAt?: string | null;
  createdAt: string;
  agent: { name: string };
};

type Task = {
  id: string;
  title: string;
  description: string;
  status: string;
  finalPrompt?: string | null;
  createdAt: string;
  updatedAt: string;
  agentRuns: AgentRun[];
  decisions: Decision[];
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchTask = useCallback(async () => {
    const res = await fetch(`/api/tasks/${id}`);
    if (res.ok) {
      const data = await res.json();
      setTask(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  // Polling loop — only runs while the pipeline is active
  useEffect(() => {
    if (!task) return;
    if (!POLLING_STATUSES.has(task.status)) return; // Stop polling if not in progress

    const interval = setInterval(fetchTask, 2000);
    return () => clearInterval(interval); // Cleanup when status changes
  }, [task, fetchTask]);

  async function handleApprove() {
    setActionLoading(true);
    setActionError("");
    const res = await fetch(`/api/tasks/${id}/approve`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setActionError(data.error ?? "Approval failed.");
    } else {
      await fetchTask();
    }
    setActionLoading(false);
  }

  async function handleReject() {
    setActionLoading(true);
    setActionError("");
    const res = await fetch(`/api/tasks/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectionReason }),
    });
    if (!res.ok) {
      const data = await res.json();
      setActionError(data.error ?? "Rejection failed.");
    } else {
      await fetchTask();
    }
    setActionLoading(false);
  }

  async function handleRetry() {
    setActionLoading(true);
    setActionError("");
    const res = await fetch(`/api/tasks/${id}/retry`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setActionError(data.error ?? "Retry failed.");
    } else {
      await fetchTask();
    }
    setActionLoading(false);
  }

  async function copyPrompt() {
    if (!task?.finalPrompt) return;
    await navigator.clipboard.writeText(task.finalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center text-sm text-gray-500">
          Loading task...
        </main>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center text-sm text-gray-500">
          Task not found.
        </main>
      </div>
    );
  }

  // Is there any failed agent run?
  const hasFailedRun = task.agentRuns.some((r) => r.status === "failed");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {task.title}
              </h1>
              <StatusBadge status={task.status} />
            </div>
            <p className="text-sm text-gray-500">
              Created{" "}
              {format(new Date(task.createdAt), "MMM d, yyyy 'at' HH:mm")}
            </p>
          </div>

          {/* Retry button — shown when any run failed */}
          {hasFailedRun && (
            <button
              onClick={handleRetry}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          )}
        </div>

        {/* Description */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Original Idea
          </h2>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">
            {task.description}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: Agent timeline */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Agent Timeline
            </h2>
            <TaskTimeline runs={task.agentRuns} />

            {/* Show a spinner if pipeline is running */}
            {POLLING_STATUSES.has(task.status) && (
              <p className="mt-4 text-xs text-blue-500 animate-pulse">
                Pipeline running... refreshing automatically.
              </p>
            )}
          </div>

          {/* Right column: Decisions + Actions */}
          <div className="space-y-6">
            {/* Human approval gate */}
            {task.status === "AWAITING_HUMAN" && (
              <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-5">
                <h2 className="text-sm font-semibold text-amber-800 mb-1">
                  Your Review Required
                </h2>
                <p className="text-sm text-amber-700 mb-4">
                  Atlas has completed its risk review. Please review the
                  decisions below and approve or reject this task.
                </p>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Rejection reason (optional)"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full rounded-md border border-amber-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      Approve — Run Forge
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      <ThumbsDown className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>

                {actionError && (
                  <p className="mt-2 text-sm text-red-600">{actionError}</p>
                )}
              </div>
            )}

            {/* Decisions list */}
            {task.decisions.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  Agent Decisions
                </h2>
                <div className="space-y-4">
                  {task.decisions.map((d) => (
                    <div key={d.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          {d.agent.name} — {d.decisionType}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(d.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-semibold text-sm text-gray-900">
                          {d.verdict}
                        </span>
                        {d.confidence > 0 && (
                          <span className="text-xs text-gray-400">
                            {d.confidence}% confidence
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-3">
                        {d.reasoningSummary}
                      </p>
                      {d.humanApprovedAt && (
                        <p className="mt-1 text-xs text-green-600">
                          ✓ Human approved{" "}
                          {formatDistanceToNow(new Date(d.humanApprovedAt), {
                            addSuffix: true,
                          })}
                        </p>
                      )}
                      {d.humanRejectedAt && (
                        <p className="mt-1 text-xs text-red-600">
                          ✗ Human rejected{" "}
                          {formatDistanceToNow(new Date(d.humanRejectedAt), {
                            addSuffix: true,
                          })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Forge output */}
            {task.status === "DONE" && task.finalPrompt && (
              <div className="rounded-lg border border-green-200 bg-white p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Forge Output — Claude Code Prompt
                  </h2>
                  <button
                    onClick={copyPrompt}
                    className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy prompt
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-gray-950 text-green-400 rounded-md p-4 text-xs overflow-x-auto whitespace-pre-wrap break-words">
                  {task.finalPrompt}
                </pre>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
