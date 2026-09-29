import { files, isSafeKey } from "@/lib/server/files";

/**
 * Public product photos. Keys include a random suffix and are never overwritten,
 * so they can be cached forever by browsers and the CDN.
 */
export async function GET(_request: Request, ctx: RouteContext<"/media/[...key]">) {
  const key = (await ctx.params).key.join("/");
  if (!key.startsWith("products/") || !isSafeKey(key)) return new Response("Not found", { status: 404 });
  const file = await files().get("media", key);
  if (!file || !file.contentType.startsWith("image/")) return new Response("Not found", { status: 404 });
  return new Response(file.data as BodyInit, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
