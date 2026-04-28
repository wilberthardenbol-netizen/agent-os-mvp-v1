"use client";

/**
 * Tasks list page — shows all tasks with status badges and links to detail pages.
 * Includes a "New Idea" button at the top.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Sidebar } from "@/components/Sidebar";
import { StatusBadge } from "@/components/StatusBadge";
import { NewIdeaDialog } from "@/components/NewIdeaDialog";
import { Plus } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  async function loadTasks() {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data);
    setLoading(false);
  }

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            <p className="text-sm text-gray-500 mt-1">All submitted ideas</p>
          </div>
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Idea
          </button>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500">
              Loading tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500">
              No tasks yet. Click &quot;New Idea&quot; to submit your first idea.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="font-medium text-sm text-gray-900 hover:underline"
                      >
                        {task.title}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                        {task.description}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {formatDistanceToNow(new Date(task.updatedAt), {
                        addSuffix: true,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showDialog && (
          <NewIdeaDialog onClose={() => setShowDialog(false)} />
        )}
      </main>
    </div>
  );
}
