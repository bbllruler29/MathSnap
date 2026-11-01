"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { ReviewQueueTable } from "@/components/admin/ReviewQueueTable";
import { ReviewDetailPanel } from "@/components/admin/ReviewDetailPanel";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import type { FlagStatus, FlaggedSolveWithDetail } from "@/types/solve";

const TABS: FlagStatus[] = ["open", "resolved", "escalated"];

export default function AdminReviewPage() {
  const [status, setStatus] = useState<FlagStatus>("open");
  const [items, setItems] = useState<FlaggedSolveWithDetail[]>([]);
  const [selected, setSelected] = useState<FlaggedSolveWithDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setSelected(null);
    apiClient
      .get<{ items: FlaggedSolveWithDetail[] }>(`/api/admin/flagged-solves?status=${status}`)
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false));
  }, [status]);

  function handleResolved(updated: FlaggedSolveWithDetail) {
    setItems((prev) => prev.filter((i) => i.id !== updated.id));
    setSelected(null);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="font-display font-bold text-2xl mb-6">Review queue</h1>

      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatus(tab)}
            className={`badge capitalize ${
              status === tab ? "bg-study-teal text-paper" : "bg-grid-line/60 text-ink/60"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-[320px_1fr] gap-6">
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <ReviewQueueTable items={items} selectedId={selected?.id ?? null} onSelect={setSelected} />
          )}
        </div>

        <div>
          {selected ? (
            <ReviewDetailPanel item={selected} onResolved={handleResolved} />
          ) : (
            <div className="card p-8 text-center text-ink/50 font-body text-sm">
              Select an item to review.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
