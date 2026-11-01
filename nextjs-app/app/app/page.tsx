"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PhotoCapture } from "@/components/camera/PhotoCapture";
import { ImageUploader } from "@/components/camera/ImageUploader";
import { ConfidenceWarning } from "@/components/solve/ConfidenceWarning";
import { resizeImageIfNeeded } from "@/lib/image";
import { apiClient, ClientApiError } from "@/lib/api/client";

type Status = "idle" | "working" | "low_confidence" | "daily_limit" | "error";

export default function CapturePage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lowConfidenceMessage, setLowConfidenceMessage] = useState<string | null>(null);
  const pendingFileRef = useRef<File | null>(null);

  async function handleFileSelected(file: File) {
    setErrorMessage(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    pendingFileRef.current = file;
    await submit(file);
  }

  async function submit(file: File) {
    setStatus("working");
    try {
      const resized = await resizeImageIfNeeded(file);

      const formData = new FormData();
      formData.append("image", resized);

      const solve = await apiClient.post<{ id: string }>("/api/solves", formData);
      router.push(`/app/solve/${solve.id}`);
    } catch (err) {
      if (err instanceof ClientApiError) {
        if (err.code === "low_confidence_parse") {
          setLowConfidenceMessage(err.message);
          setStatus("low_confidence");
          return;
        }
        if (err.code === "daily_limit_reached") {
          setStatus("daily_limit");
          return;
        }
        setErrorMessage(err.message);
        setStatus("error");
        return;
      }
      setErrorMessage("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  function retry() {
    const file = pendingFileRef.current;
    if (file) submit(file);
  }

  function reset() {
    setStatus("idle");
    setPreviewUrl(null);
    pendingFileRef.current = null;
  }

  return (
    <div className="max-w-reading mx-auto px-6 py-10">
      {status === "idle" && (
        <div>
          <h1 className="font-display font-bold text-2xl mb-1">Snap a problem</h1>
          <p className="font-body text-sm text-ink/60 mb-8">
            Take a photo or choose one from your library.
          </p>
          <div className="space-y-3">
            <PhotoCapture onFileSelected={handleFileSelected} />
            <ImageUploader onFileSelected={handleFileSelected} />
          </div>
        </div>
      )}

      {status === "working" && (
        <div className="card p-8 text-center">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Your photo"
              className="rounded-lg mx-auto mb-5 max-h-64 object-contain"
            />
          )}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <span className="h-2 w-2 rounded-full bg-study-teal typing-dot" />
            <span
              className="h-2 w-2 rounded-full bg-study-teal typing-dot"
              style={{ animationDelay: "0.2s" }}
            />
            <span
              className="h-2 w-2 rounded-full bg-study-teal typing-dot"
              style={{ animationDelay: "0.4s" }}
            />
          </div>
          <p className="font-body text-sm text-ink/60">Solving your problem…</p>
        </div>
      )}

      {status === "low_confidence" && previewUrl && (
        <ConfidenceWarning
          imagePreviewUrl={previewUrl}
          message={
            lowConfidenceMessage ??
            "We had trouble reading this photo clearly. Try moving to better light or cropping tighter."
          }
          onRetake={reset}
        />
      )}

      {status === "daily_limit" && (
        <div className="card p-8 text-center">
          <p className="badge-warning mb-3 w-fit mx-auto">Free limit reached</p>
          <p className="font-body text-sm text-ink/70 mb-6 leading-relaxed">
            You&apos;ve used today&apos;s free solves. Upgrade for unlimited
            solving, or come back tomorrow.
          </p>
          <a href="/app/billing" className="btn-primary w-full">
            See plans
          </a>
        </div>
      )}

      {status === "error" && (
        <div className="card p-8 text-center">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Your photo"
              className="rounded-lg mx-auto mb-5 max-h-64 object-contain"
            />
          )}
          <p className="badge-warning mb-3 w-fit mx-auto">Something went wrong</p>
          <p className="font-body text-sm text-ink/70 mb-6">{errorMessage}</p>
          <button type="button" onClick={retry} className="btn-primary w-full">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
