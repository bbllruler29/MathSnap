import { ApiError } from "@/lib/api/errors";
import { MAX_IMAGE_BYTES } from "@/lib/security/tokenLimiter";

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];
const BLOCKED_EXTENSIONS = [
  ".exe",
  ".js",
  ".mjs",
  ".cjs",
  ".php",
  ".zip",
  ".sh",
  ".bat",
  ".cmd",
  ".py",
  ".rb",
  ".ps1",
  ".svg",
  ".html",
  ".htm",
];
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function matchesMagicBytes(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, i) => bytes[i] === byte);
}

/**
 * Validates an uploaded image in order: extension, declared MIME type, size,
 * then actual file content (magic bytes).
 *
 * The magic-byte check matters because `file.type` is just the declared
 * Content-Type on the multipart part — fully attacker-controlled by anyone
 * crafting a raw request outside the browser. Without it, someone could
 * upload an HTML/SVG payload labeled `image/jpeg` and have it land in
 * Supabase Storage; if that object were ever served or previewed without a
 * strictly-enforced Content-Type, it could execute as stored XSS.
 */
export async function validateImageUpload(file: File): Promise<Uint8Array> {
  const name = file.name.toLowerCase();

  if (BLOCKED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    throw new ApiError(400, "invalid_file", "This file type isn't supported.");
  }

  if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    throw new ApiError(400, "invalid_file", "Please use a JPEG or PNG photo.");
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new ApiError(400, "invalid_file", "Please use a JPEG or PNG photo.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new ApiError(
      400,
      "invalid_file",
      "Image is too large (max 10MB). Try retaking with lower resolution."
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const isRealJpeg = matchesMagicBytes(bytes, JPEG_MAGIC);
  const isRealPng = matchesMagicBytes(bytes, PNG_MAGIC);

  if (!isRealJpeg && !isRealPng) {
    throw new ApiError(400, "invalid_file", "This doesn't look like a valid JPEG or PNG file.");
  }

  return bytes;
}
