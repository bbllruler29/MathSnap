"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiClient } from "@/lib/api/client";
import { StepRenderer } from "@/components/solve/StepRenderer";
import type { FlaggedSolveWithDetail } from "@/types/solve";

export function ReviewDetailPanel({
  item,
  onResolved,
}: {
  item: FlaggedSolveWithDetail;
  onResolved: (updated: FlaggedSolveWithDetail) => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState(item.reviewer_notes ?? "");
  const [submitting, setSubmitting] = useState<"resolved" | "escalated" | null>(null);

  useEffect(() => {
    setNotes(item.reviewer_notes ?? "");
    setImageUrl(null);
    const supabase = createClient();
    supabase.storage
      .from("problem-images")
      .createSignedUrl(item.solve.image_path, 300)
      .then(({ data }) => setImageUrl(data?.signedUrl ?? null));
  }, [item]);

  async function handleAction(status: "resolved" | "escalated") {
    setSubmitting(status);
    try {
      const updated = await apiClient.patch<FlaggedSolveWithDetail>(
        `/api/admin/flagged-solves/${item.id}`,
        { status, reviewer_notes: notes.trim() || undefined }
      );
      onResolved({ ...updated, solve: item.solve });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="card p-6">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt="Submitted photo"
          className="rounded-lg mb-5 max-h-72 object-contain"
        />
      )}

      <p className="eyebrow mb-2">Parsed problem</p>
      <p className="font-body text-sm text-ink/80 mb-5">{item.solve.parsed_problem}</p>

      <p className="eyebrow mb-2">Solution</p>
      <StepRenderer
        steps={item.solve.steps_json ?? []}
        finalAnswer={item.solve.final_answer}
        verificationStatus={item.solve.verification_status}
      />

      <p className="eyebrow mb-2 mt-6">Flag reason</p>
      <p className="font-body text-sm text-ink/80 mb-5">{item.reason || "No reason given"}</p>

      <label className="eyebrow mb-2 block">Reviewer notes</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        className="input-field mb-4"
        placeholder="Internal notes…"
      />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => handleAction("resolved")}
          disabled={submitting !== null}
          className="btn-secondary flex-1"
        >
          {submitting === "resolved" ? "Saving…" : "Mark resolved"}
        </button>
        <button
          type="button"
          onClick={() => handleAction("escalated")}
          disabled={submitting !== null}
          className="btn-ghost flex-1"
        >
          {submitting === "escalated" ? "Saving…" : "Escalate"}
        </button>
      </div>
    </div>
  );
}
