"use client";

import { useRef } from "react";
import { Camera } from "lucide-react";

export function PhotoCapture({
  onFileSelected,
  disabled,
}: {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="btn-primary w-full py-4 text-base"
      >
        <Camera className="h-5 w-5" strokeWidth={2.25} />
        Take a photo
      </button>
    </>
  );
}
