const MAX_EDGE = 4096;

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Downscales an image client-side if its longest edge exceeds 4096px, to
 * bound AI/storage costs per docs/specs/photo-capture-and-ai-solving.md §1.
 * Returns the original file unchanged if it's already within bounds.
 */
export async function resizeImageIfNeeded(file: File): Promise<File> {
  let width: number;
  let height: number;
  try {
    ({ width, height } = await getImageDimensions(file));
  } catch {
    // Browser couldn't decode this file at all (most commonly a HEIC photo
    // straight off an iPhone camera — <img>/canvas can't render those in
    // most browsers). Skip client-side resizing and send it through as-is;
    // the server's validateImageUpload() will reject it with a clear,
    // actionable message if it's genuinely unsupported, instead of this
    // failing silently with no feedback at all.
    return file;
  }

  if (width <= MAX_EDGE && height <= MAX_EDGE) {
    return file;
  }

  const scale = MAX_EDGE / Math.max(width, height);
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, file.type, 0.92)
  );
  if (!blob) return file;

  return new File([blob], file.name, { type: file.type });
}
