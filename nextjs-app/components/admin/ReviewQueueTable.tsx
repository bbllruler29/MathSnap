"use client";

import type { FlaggedSolveWithDetail } from "@/types/solve";

export function ReviewQueueTable({
  items,
  selectedId,
  onSelect,
}: {
  items: FlaggedSolveWithDetail[];
  selectedId: string | null;
  onSelect: (item: FlaggedSolveWithDetail) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="font-body text-sm text-ink/50 py-8 text-center">Nothing in this queue.</p>
    );
  }

  return (
    <div className="divide-y divide-grid-line">
      {items.map((item) => {
        const isAuto = item.reason?.startsWith("auto:");
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={`w-full text-left px-4 py-3 transition-colors ${
              selectedId === item.id ? "bg-study-teal/10" : "hover:bg-grid-line/30"
            }`}
          >
            <div className="flex items-center justify-between mb-1 gap-2">
              <span className="font-body text-sm font-medium">
                {item.solve.topic?.replace(/_/g, " ") ?? "Untitled"}
              </span>
              {isAuto && <span className="badge-neutral shrink-0">Auto-detected</span>}
            </div>
            <p className="font-body text-xs text-ink/60 truncate">
              {item.reason || "No reason given"}
            </p>
            <p className="font-mono text-[11px] text-ink/40 mt-1">
              {new Date(item.created_at).toLocaleString()}
            </p>
          </button>
        );
      })}
    </div>
  );
}
