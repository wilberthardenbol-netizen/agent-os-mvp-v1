"use client";

/**
 * Decisions page — a searchable list of every decision every agent has made.
 * Shows the agent name, decision type, verdict, confidence, and reasoning.
 */

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Sidebar } from "@/components/Sidebar";

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
  agent: { name: string; role: string };
  task: { title: string; status: string };
};

const VERDICT_STYLE: Record<string, string> = {
  PROCEED: "text-green-700 bg-green-50",
  CLARIFY: "text-amber-700 bg-amber-50",
  APPROVE: "text-green-700 bg-green-50",
  LIMIT: "text-amber-700 bg-amber-50",
  REJECT: "text-red-700 bg-red-50",
  PASS: "text-green-700 bg-green-50",
  FAIL: "text-red-700 bg-red-50",
  CONDITIONAL: "text-amber-700 bg-amber-50",
  BUILT: "text-blue-700 bg-blue-50",
};

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/decisions")
      .then((r) => r.json())
      .then((data) => {
        setDecisions(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Decisions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Every verdict every agent has made, in reverse chronological order.
          </p>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading decisions...</div>
        ) : decisions.length === 0 ? (
          <div className="text-sm text-gray-500">
            No decisions yet. Run the pipeline on a task to see decisions here.
          </div>
        ) : (
          <div className="space-y-3">
            {decisions.map((d) => {
              const verdictStyle =
                VERDICT_STYLE[d.verdict] ?? "text-gray-700 bg-gray-50";
              return (
                <div
                  key={d.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Agent + task context */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">
                          {d.agent.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {d.decisionType}
                        </span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-500 truncate">
                          {d.task.title}
                        </span>
                      </div>

                      {/* Reasoning */}
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {d.reasoningSummary}
                      </p>

                      {/* Human approval status */}
                      {d.humanApprovedAt && (
                        <p className="mt-1 text-xs text-green-600">
                          ✓ Human approved
                        </p>
                      )}
                      {d.humanRejectedAt && (
                        <p className="mt-1 text-xs text-red-600">
                          ✗ Human rejected
                        </p>
                      )}
                    </div>

                    {/* Right side: verdict + confidence + time */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${verdictStyle}`}
                      >
                        {d.verdict}
                      </span>
                      {d.confidence > 0 && (
                        <span className="text-xs text-gray-400">
                          {d.confidence}%
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(d.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
