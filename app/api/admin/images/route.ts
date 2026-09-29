import { files } from "@/lib/server/files";
import { randomHex } from "@/lib/server/ids";
import { fail, handleError, json, requireAdmin } from "@/lib/server/http";
import { checkProductImage, MAX_UPLOAD_BYTES } from "@/lib/uploads";
import { slugify } from "@/lib/utils";

/** Uploads a product photo to public media storage. The photo is attached when the product is saved. */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) return fail("That photo is too large (over 4.5 MB).", 413);

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!form || !(file instanceof File)) return fail("Choose a photo to upload.");
  const width = Number(form.get("width"));
  const height = Number(form.get("height"));
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 10000 || height > 10000) {
    return fail("That photo couldn't be read. Please try another.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkProductImage(bytes);
  if (!check.ok) return fail(check.error);

  try {
    const base = slugify(String(form.get("name") ?? "")).slice(0, 40) || "product";
    const key = `products/${base}-${randomHex(5)}.${check.type.ext}`;
    await files().put("media", key, bytes, check.type.mime);
    return json({ image: { key, width, height } }, 201);
  } catch (e) {
    return handleError("admin:images", e);
  }
}
