import { z } from "zod";
import { ORDER_STATUSES } from "@/lib/domain/orders";
import { changeOrderStatus, confirmPayment, postCustomerUpdate, rejectPayment } from "@/lib/server/repo/orders";
import { fail, handleError, json, requireAdmin, zodMessage } from "@/lib/server/http";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm_payment") }),
  z.object({ action: z.literal("reject_payment"), reason: z.string().trim().min(5, "Add a short reason for the customer").max(400) }),
  z.object({ action: z.literal("set_status"), status: z.enum(ORDER_STATUSES), confirmed: z.boolean().default(false) }),
  z.object({ action: z.literal("customer_update"), message: z.string().trim().max(400, "Keep the update under 400 characters") }),
]);

/** The owner's order actions. Each one is validated, applied atomically and recorded on the order. */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/orders/[id]">) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const by = auth.admin.name;
  const a = parsed.data;

  try {
    const order =
      a.action === "confirm_payment"
        ? await confirmPayment(id, by)
        : a.action === "reject_payment"
          ? await rejectPayment(id, a.reason, by)
          : a.action === "set_status"
            ? await changeOrderStatus(id, a.status, by, a.confirmed)
            : await postCustomerUpdate(id, a.message, by);
    return json({ status: order.status, paymentStatus: order.payment.status });
  } catch (e) {
    return handleError("admin:orders", e);
  }
}
