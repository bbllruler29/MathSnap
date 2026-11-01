"use client";

import { useRef } from "react";
import { ImagePlus } from "lucide-react";

export function ImageUploader({
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
        accept="image/jpeg,image/png"
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
        className="btn-ghost w-full py-4 text-base"
      >
        <ImagePlus className="h-5 w-5" strokeWidth={2} />
        Choose from library
      </button>
    </>
  );
}
