/**
 * Upload rules shared by the browser (early, friendly errors) and the server (the real check).
 *
 * Netlify Functions accept request bodies up to 6 MB, so files are capped below that.
 * Photos are resized in the browser before upload, which keeps them far smaller on slow networks.
 */
export const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;

export type DetectedType = { mime: "image/jpeg" | "image/png" | "image/webp" | "application/pdf"; ext: "jpg" | "png" | "webp" | "pdf" };

/** Identifies a file by its first bytes — never by its name or the browser's claim. */
export function detectFileType(bytes: Uint8Array): DetectedType | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a)
    return { mime: "image/png", ext: "png" };
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
    return { mime: "image/webp", ext: "webp" };
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return { mime: "application/pdf", ext: "pdf" };
  return null;
}

export const RECEIPT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf";
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

export type UploadCheck = { ok: true; type: DetectedType } | { ok: false; error: string };

export function checkReceiptFile(bytes: Uint8Array): UploadCheck {
  if (!bytes.byteLength) return { ok: false, error: "That file is empty. Choose your receipt again." };
  if (bytes.byteLength > MAX_UPLOAD_BYTES) return { ok: false, error: "That file is too large (over 4.5 MB). A screenshot of the receipt works well." };
  const type = detectFileType(bytes);
  if (!type) return { ok: false, error: "Upload a JPG, PNG or PDF of your receipt." };
  return { ok: true, type };
}

export function checkProductImage(bytes: Uint8Array): UploadCheck {
  if (!bytes.byteLength) return { ok: false, error: "That file is empty." };
  if (bytes.byteLength > MAX_UPLOAD_BYTES) return { ok: false, error: "That photo is too large (over 4.5 MB)." };
  const type = detectFileType(bytes);
  if (!type || type.ext === "pdf") return { ok: false, error: "Choose a JPG, PNG or WebP photo." };
  return { ok: true, type };
}
