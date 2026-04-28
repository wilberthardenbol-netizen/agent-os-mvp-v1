/**
 * AgentCard — displays one agent's info on the Agents page.
 * Shows name, role, permission level, and an Edit Prompt button.
 */

import { Bot, Zap } from "lucide-react";
import { getPermissionInfo } from "@/lib/permissions";

type Agent = {
  id: string;
  name: string;
  role: string;
  permissionLevel: string;
  mayDo: string;
  mayNotDo: string;
  decisionAuthority: string;
  status: string;
  systemPrompt: string;
};

type Props = {
  agent: Agent;
  onEdit: (agent: Agent) => void;
};

const PERMISSION_BADGE: Record<string, string> = {
  GENERATE: "bg-blue-100 text-blue-700",
  RECOMMEND: "bg-purple-100 text-purple-700",
  BLOCK: "bg-red-100 text-red-700",
};

const STATUS_DOT: Record<string, string> = {
  idle: "bg-gray-400",
  running: "bg-green-400 animate-pulse",
  error: "bg-red-400",
};

export function AgentCard({ agent, onEdit }: Props) {
  const permInfo = getPermissionInfo(agent.permissionLevel);
  const badgeStyle =
    PERMISSION_BADGE[agent.permissionLevel] ?? "bg-gray-100 text-gray-700";
  const dotStyle = STATUS_DOT[agent.status] ?? "bg-gray-400";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <span
            className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${dotStyle}`}
            title={`Status: ${agent.status}`}
          />
          <div>
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-gray-500" />
              <h3 className="font-semibold text-gray-900">{agent.name}</h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{agent.role}</p>
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${badgeStyle}`}
        >
          {permInfo.label}
        </span>
      </div>

      {/* May do / may not do */}
      <div className="space-y-1.5 text-xs text-gray-600">
        <div>
          <span className="font-medium text-gray-700">May do: </span>
          {agent.mayDo}
        </div>
        <div>
          <span className="font-medium text-gray-700">May not do: </span>
          {agent.mayNotDo}
        </div>
        <div>
          <span className="font-medium text-gray-700">Authority: </span>
          {agent.decisionAuthority}
        </div>
      </div>

      {/* Edit button */}
      <button
        onClick={() => onEdit(agent)}
        className="mt-auto flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Zap className="h-3.5 w-3.5" />
        Edit Prompt
      </button>
    </div>
  );
}
