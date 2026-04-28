/**
 * TaskTimeline — vertical list of agent runs for a task.
 * Shows which agent ran, whether it succeeded or failed, and a summary.
 */

import { formatDistanceToNow } from "date-fns";
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

type AgentRun = {
  id: string;
  status: string;
  errorMessage?: string | null;
  startedAt: string;
  finishedAt?: string | null;
  agent: { name: string; role: string };
  outputJson: string;
};

type Props = { runs: AgentRun[] };

function RunIcon({ status }: { status: string }) {
  if (status === "completed")
    return <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />;
  if (status === "failed")
    return <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />;
  if (status === "pending")
    return <Loader2 className="h-5 w-5 text-blue-500 animate-spin flex-shrink-0" />;
  return <Clock className="h-5 w-5 text-gray-400 flex-shrink-0" />;
}

export function TaskTimeline({ runs }: Props) {
  if (runs.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No agent runs yet. Start the pipeline to see activity here.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {runs.map((run) => {
        // Try to extract a brief summary from the output JSON
        let summary = "";
        try {
          const parsed = JSON.parse(run.outputJson);
          summary =
            parsed.summary ||
            parsed.hypothesis ||
            parsed.verdict ||
            parsed.buildSpecSummary ||
            parsed.riskNotes ||
            "";
          if (summary.length > 200) summary = summary.slice(0, 200) + "...";
        } catch {
          // outputJson wasn't parseable — that's OK
        }

        return (
          <li key={run.id} className="flex gap-3">
            <div className="mt-0.5">
              <RunIcon status={run.status} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-sm text-gray-900">
                  {run.agent.name}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {formatDistanceToNow(new Date(run.startedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{run.agent.role}</p>
              {summary && (
                <p className="mt-1 text-sm text-gray-700">{summary}</p>
              )}
              {run.errorMessage && (
                <p className="mt-1 text-sm text-red-600 bg-red-50 rounded p-2">
                  Error: {run.errorMessage}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
