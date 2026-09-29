import { normaliseOrderNumber } from "@/lib/domain/orders";
import { parseNaira } from "@/lib/money";
import { getOrderByNumber, submitReceipt } from "@/lib/server/repo/orders";
import { orderAccessIds, sameOrigin } from "@/lib/server/session";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { fail, handleError, json } from "@/lib/server/http";
import { MAX_UPLOAD_BYTES } from "@/lib/uploads";

/** The customer uploads their transfer receipt. Only a browser with access to the order can do this. */
export async function POST(request: Request, ctx: RouteContext<"/api/orders/[number]/receipt">) {
  if (!sameOrigin(request)) return fail("This request isn't allowed.", 403);
  if (!rateLimit(`receipt:${clientIp(request)}`, 12, 15 * 60_000)) return fail("Too many uploads. Please wait a few minutes and try again.", 429);

  const number = normaliseOrderNumber((await ctx.params).number);
  const order = number ? await getOrderByNumber(number) : undefined;
  if (!order || !(await orderAccessIds()).includes(order.id)) {
    return fail("We couldn't open this order. Track it again with your order number and phone number.", 404);
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) return fail("That file is too large (over 4.5 MB). A screenshot of the receipt works well.", 413);

  const form = await request.formData().catch(() => null);
  const file = form?.get("receipt");
  if (!form || !(file instanceof File)) return fail("Choose your receipt to upload.");

  const amountRaw = String(form.get("amount") ?? "").trim();
  const amount = amountRaw ? parseNaira(amountRaw) : undefined;
  if (amount !== undefined && (!Number.isFinite(amount) || amount < 0 || amount > 100_000_000)) return fail("Enter the amount you sent in naira, e.g. 2500.");
  const reference = String(form.get("reference") ?? "").trim().slice(0, 80);

  try {
    const updated = await submitReceipt(order.id, { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) }, { amount, reference });
    return json({ paymentStatus: updated.payment.status });
  } catch (e) {
    return handleError("orders:receipt", e);
  }
}
