"use client";

import { useState } from "react";
import { apiClient, ClientApiError } from "@/lib/api/client";
import { useToastStore } from "@/store/toastStore";
import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/shared/Button";

export function FlagButton({ solveId }: { solveId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [flagged, setFlagged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showToast = useToastStore((state) => state.show);

  async function submitFlag() {
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/api/solves/${solveId}/flag`, {
        reason: reason.trim() || undefined,
      });
      setFlagged(true);
      setOpen(false);
      showToast("Thanks — we'll review this.");
    } catch (err) {
      if (err instanceof ClientApiError && err.code === "already_flagged") {
        setFlagged(true);
        setOpen(false);
        return;
      }
      setError("We couldn't submit that. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (flagged) {
    return <p className="badge-neutral w-fit mt-4">Under review</p>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-body text-sm text-ink/50 hover:text-red-pen transition-colors mt-4 underline"
      >
        This answer was wrong
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="What went wrong?">
        <p className="font-body text-sm text-ink/60 mb-3">Optional — helps us fix it faster.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={3}
          className="input-field mb-3"
          placeholder="Tell us what looks off…"
        />
        {error && <p className="font-body text-sm text-red-pen mb-2">{error}</p>}
        <div className="flex gap-2">
          <Button variant="secondary" loading={submitting} onClick={submitFlag} className="flex-1">
            Submit
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}
