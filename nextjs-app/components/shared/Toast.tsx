"use client";

import { useToastStore } from "@/store/toastStore";

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 inset-x-0 flex flex-col items-center gap-2 z-50 px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto animate-fade-in rounded-xl border px-4 py-3 font-body text-sm shadow-sm max-w-sm text-center cursor-pointer ${
            toast.variant === "error"
              ? "bg-red-pen/10 border-red-pen/30 text-red-pen"
              : "bg-ink text-paper border-ink"
          }`}
          onClick={() => dismiss(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
