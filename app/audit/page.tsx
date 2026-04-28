"use client";

/**
 * Audit log page — shows every system event with optional text search.
 * This is the "flight recorder" — every action is logged here automatically.
 */

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Sidebar } from "@/components/Sidebar";
import { Search } from "lucide-react";

type AuditLog = {
  id: string;
  timestamp: string;
  actorType: string;
  actorName: string;
  action: string;
  taskId?: string | null;
  details: string;
};

const ACTOR_STYLE: Record<string, string> = {
  AGENT: "bg-blue-100 text-blue-700",
  HUMAN: "bg-green-100 text-green-700",
  SYSTEM: "bg-gray-100 text-gray-600",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const url = search
        ? `/api/audit?search=${encodeURIComponent(search)}`
        : "/api/audit";
      const res = await fetch(url);
      const data = await res.json();
      setLogs(data);
      setLoading(false);
    }, 300); // Debounce so we don't fire on every keystroke

    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            Every action recorded by the system, agents, and humans.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search actions, details, actor names..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading audit log...</div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-gray-500">
            {search ? "No results found." : "No audit events yet."}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-40">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-20">
                    Actor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-32">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-48">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">
                      {format(new Date(log.timestamp), "MM-dd HH:mm:ss")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                          ACTOR_STYLE[log.actorType] ??
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {log.actorType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 font-medium">
                      {log.actorName}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-mono">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
