/**
 * Resizes a photo in the browser before upload: a 4 MB phone photo becomes ~200 KB,
 * which matters on ordinary mobile data. Falls back to the original file if the browser can't.
 */
export async function resizeImage(
  file: File,
  { maxDimension, type, quality }: { maxDimension: number; type: "image/webp" | "image/jpeg"; quality: number },
): Promise<{ file: File; width: number; height: number }> {
  const source = await loadImage(file);
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const width = Math.round(source.width * scale);
  const height = Math.round(source.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(source.image, 0, 0, width, height);
  if ("close" in source.image) source.image.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  // Some browsers silently fall back to PNG for unsupported types; accept only what was asked for.
  if (!blob || blob.type !== type) throw new Error("Encoding unavailable");
  const ext = type === "image/webp" ? "webp" : "jpg";
  const name = file.name.replace(/\.[^.]+$/, "") || "photo";
  return { file: new File([blob], `${name}.${ext}`, { type }), width, height };
}

async function loadImage(file: File): Promise<{ image: ImageBitmap | HTMLImageElement; width: number; height: number }> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { image: bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      // fall through
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { image: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const isImage = (file: File) => /^image\/(jpeg|png|webp)$/.test(file.type);
