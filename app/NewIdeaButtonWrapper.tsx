"use client";

/**
 * Thin client wrapper so the server-rendered Dashboard page
 * can include the "New Idea" button (which needs client-side state for the dialog).
 */

import { useState } from "react";
import { NewIdeaDialog } from "@/components/NewIdeaDialog";
import { Plus } from "lucide-react";

export function NewIdeaButtonWrapper() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
      >
        <Plus className="h-4 w-4" />
        New Idea
      </button>
      {open && <NewIdeaDialog onClose={() => setOpen(false)} />}
    </>
  );
}
