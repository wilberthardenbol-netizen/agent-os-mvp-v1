"use client";

/**
 * EditAgentPromptModal — dialog for editing an agent's system prompt.
 * Opens when the user clicks "Edit Prompt" on an AgentCard.
 */

import { useState } from "react";

type Agent = {
  id: string;
  name: string;
  systemPrompt: string;
};

type Props = {
  agent: Agent | null;
  onClose: () => void;
  onSaved: () => void;
};

export function EditAgentPromptModal({ agent, onClose, onSaved }: Props) {
  const [prompt, setPrompt] = useState(agent?.systemPrompt ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!agent) return null;

  async function handleSave() {
    if (!agent) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: prompt }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Save failed.");
        return;
      }
      onSaved(); // Tell the parent to refresh the agent list
      onClose();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      {/* Dialog panel — stop click propagation so clicking inside doesn't close */}
      <div
        className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Edit System Prompt — {agent.name}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          This prompt is sent to Claude every time {agent.name} runs. Changes
          take effect on the next pipeline run.
        </p>

        <textarea
          className="w-full rounded-md border border-gray-300 p-3 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
          rows={16}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
