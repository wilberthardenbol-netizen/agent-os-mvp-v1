"use client";

/**
 * Agents page — shows all 5 agents with their current settings.
 * The user can click "Edit Prompt" on any card to edit its system prompt.
 */

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AgentCard } from "@/components/AgentCard";
import { EditAgentPromptModal } from "@/components/EditAgentPromptModal";

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

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  async function loadAgents() {
    const res = await fetch("/api/agents");
    const data = await res.json();
    setAgents(data);
    setLoading(false);
  }

  useEffect(() => {
    loadAgents();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <p className="text-sm text-gray-500 mt-1">
            The 5 AI agents that process every idea. Edit their system prompts
            to change their behavior.
          </p>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading agents...</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onEdit={setEditingAgent}
              />
            ))}
          </div>
        )}

        {/* The edit prompt modal — only rendered when an agent is selected */}
        <EditAgentPromptModal
          agent={editingAgent}
          onClose={() => setEditingAgent(null)}
          onSaved={loadAgents}
        />
      </main>
    </div>
  );
}
