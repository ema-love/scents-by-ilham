import { orderInputSchema } from "@/lib/domain/orders";
import { createOrder } from "@/lib/server/repo/orders";
import { grantOrderAccess, sameOrigin } from "@/lib/server/session";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { fail, handleError, json, zodMessage } from "@/lib/server/http";

/** Places an order. Everything the customer sent is re-validated and re-priced on the server. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("This request isn't allowed.", 403);
  if (!rateLimit(`order:${clientIp(request)}`, 12, 60 * 60_000)) return fail("Too many orders from this connection. Please wait a little and try again.", 429);

  const body = await request.json().catch(() => null);
  const parsed = orderInputSchema.safeParse(body);
  if (!parsed.success) return fail(zodMessage(parsed.error));

  try {
    const order = await createOrder(parsed.data);
    await grantOrderAccess(order.id);
    return json({ number: order.number, total: order.total }, 201);
  } catch (e) {
    return handleError("orders:create", e);
  }
}
