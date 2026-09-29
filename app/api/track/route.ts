import { z } from "zod";
import { normaliseOrderNumber } from "@/lib/domain/orders";
import { findOrderForCustomer } from "@/lib/server/repo/orders";
import { grantOrderAccess, sameOrigin } from "@/lib/server/session";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { fail, handleError, json } from "@/lib/server/http";

const schema = z.object({ number: z.string().max(20), phone: z.string().max(30) });

/**
 * Order number + phone number → access to that order's tracking page.
 * Both must match, and attempts are rate-limited, so orders can't be found by guessing.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("This request isn't allowed.", 403);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  const number = parsed.success ? normaliseOrderNumber(parsed.data.number) : null;
  if (!parsed.success || !number) return fail("Enter your order number, e.g. SC-1024.");

  if (!rateLimit(`track:ip:${clientIp(request)}`, 15, 15 * 60_000) || !rateLimit(`track:no:${number}`, 20, 60 * 60_000)) {
    return fail("Too many attempts. Please wait 15 minutes, or call us for help.", 429);
  }

  try {
    const order = await findOrderForCustomer(number, parsed.data.phone);
    // Same answer whether the number doesn't exist or the phone doesn't match.
    if (!order) return fail("We couldn't find an order with that number and phone number. Check both and try again.", 404);
    await grantOrderAccess(order.id);
    return json({ number: order.number });
  } catch (e) {
    return handleError("track", e);
  }
}
