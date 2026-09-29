import { getOrder, markReceiptViewed } from "@/lib/server/repo/orders";
import { files } from "@/lib/server/files";
import { getAdmin } from "@/lib/server/session";

/**
 * Streams a customer's receipt to the signed-in owner only. Receipts are private: never cached,
 * never indexed, never served from a public URL. Opening it moves the payment to "under review".
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/orders/[id]/receipt">) {
  const admin = await getAdmin();
  if (!admin) return new Response("Please sign in.", { status: 401, headers: { "Cache-Control": "no-store" } });

  const { id } = await ctx.params;
  const order = await getOrder(id);
  const receipt = order?.payment.receipt;
  if (!order || !receipt) return new Response("No receipt.", { status: 404, headers: { "Cache-Control": "no-store" } });

  const file = await files().get("receipts", receipt.key);
  if (!file) return new Response("Receipt file missing.", { status: 404, headers: { "Cache-Control": "no-store" } });

  await markReceiptViewed(order.id, admin.name).catch((e) => console.error("[receipt:viewed]", e));

  return new Response(file.data as BodyInit, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.size),
      "Content-Disposition": `inline; filename="${order.number}-receipt.${receipt.key.split(".").pop()}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      // Only JPG, PNG, WebP or PDF (checked by content on upload), never sniffed as anything else.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
