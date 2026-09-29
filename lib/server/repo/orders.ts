import "server-only";
import {
  checkTransition,
  canSubmitReceipt,
  ORDER_NUMBER_PREFIX,
  orderStatusLabel,
  summarise,
  type Order,
  type OrderEvent,
  type OrderInput,
  type OrderItem,
  type OrderStatus,
  type OrderSummary,
} from "@/lib/domain/orders";
import { isOrderable } from "@/lib/domain/products";
import { defaultPaymentMethod } from "@/lib/payments";
import { formatNaira } from "@/lib/money";
import { formatPhone, phoneKey } from "@/lib/phone";
import { checkReceiptFile } from "@/lib/uploads";
import { db, mutate } from "../db";
import { files } from "../files";
import { newId, randomHex } from "../ids";
import { allProducts } from "./products";
import { getSettings } from "./settings";

/**
 * Orders are stored one document each (order/<id>), plus:
 *   order-number/<SC-1024>  → { id }   claimed with onlyIfNew, so numbers are unique
 *   counter/orders          → { next }  the next number to hand out
 *   orders-index            → { rows }  summaries for the dashboard list (newest first)
 */
const orderKey = (id: string) => `order/${id}`;
const numberKey = (n: string) => `order-number/${n}`;
const INDEX = "orders-index";
const COUNTER = "counter/orders";
const FIRST_NUMBER = 1001;

/** A customer-facing problem: the message is safe to show as-is. */
export class OrderError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code?: string,
  ) {
    super(message);
  }
}

const event = (by: string, type: OrderEvent["type"], message: string): OrderEvent => ({ at: new Date().toISOString(), by, type, message });

async function writeIndexRow(order: Order) {
  const row = summarise(order);
  await mutate<{ rows: OrderSummary[] }>(db(), INDEX, (cur) => {
    const rows = (cur?.rows ?? []).filter((r) => r.id !== row.id);
    rows.push(row);
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { rows };
  });
}

/** Hands out the next order number and claims it, so no two orders ever share one. */
async function claimOrderNumber(orderId: string) {
  for (let i = 0; i < 20; i++) {
    let n = FIRST_NUMBER;
    await mutate<{ next: number }>(db(), COUNTER, (cur) => {
      n = cur?.next ?? FIRST_NUMBER;
      return { next: n + 1 };
    });
    const number = `${ORDER_NUMBER_PREFIX}${n}`;
    if (await db().set(numberKey(number), { id: orderId }, { onlyIfNew: true })) return number;
  }
  throw new Error("Could not allocate an order number");
}

// ------------------------------------------------------------------
// Customer actions
// ------------------------------------------------------------------

/**
 * Creates an order from what the customer chose. Everything is re-checked here against the
 * database as it is now — never against what the customer's page showed earlier:
 * each product must exist, be visible and be available; prices come from the catalogue and are
 * copied onto the order so later price changes never alter it.
 */
export async function createOrder(input: OrderInput): Promise<Order> {
  const [products, settings] = await Promise.all([allProducts(), getSettings()]);

  const merged = new Map<string, number>();
  for (const item of input.items) merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);

  const items: OrderItem[] = [];
  for (const [productId, quantity] of merged) {
    const product = products.find((p) => p.id === productId);
    if (!product || product.visibility !== "visible") {
      throw new OrderError("One of the products in your order is no longer available. Please remove it and try again.", 409, "unavailable");
    }
    if (!isOrderable(product)) {
      throw new OrderError(`${product.name} is currently unavailable. Please choose another product.`, 409, "unavailable");
    }
    if (quantity > 20) throw new OrderError(`You can order up to 20 of ${product.name} at a time.`);
    items.push({
      productId,
      name: product.name,
      unitPrice: product.price,
      quantity,
      lineTotal: product.price * quantity,
      ...(product.images[0] ? { imageKey: product.images[0].key } : {}),
    });
  }

  const method = input.fulfilment.method;
  if (method === "delivery" && !settings.deliveryEnabled) throw new OrderError("Delivery isn't available right now. Please choose pickup.");
  if (method === "pickup" && !settings.pickupEnabled) throw new OrderError("Pickup isn't available right now. Please choose delivery.");

  const key = phoneKey(input.customer.phone);
  if (!key) throw new OrderError("Enter a valid phone number.");

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const deliveryFee = method === "delivery" ? settings.deliveryFee : null;
  const total = subtotal + (deliveryFee ?? 0);
  const now = new Date().toISOString();
  const id = newId("ord");
  const number = await claimOrderNumber(id);

  const order: Order = {
    id,
    number,
    customer: { name: input.customer.name, phone: formatPhone(input.customer.phone), phoneKey: key },
    items,
    subtotal,
    deliveryFee,
    total,
    fulfilment:
      method === "delivery"
        ? { method, address: input.fulfilment.address, area: input.fulfilment.area, ...(input.fulfilment.note ? { note: input.fulfilment.note } : {}) }
        : { method, ...(input.fulfilment.note ? { note: input.fulfilment.note } : {}) },
    status: "received",
    payment: {
      method: defaultPaymentMethod,
      status: "awaiting_payment",
      expectedAmount: total,
      payTo: { bankName: settings.bankName, accountName: settings.accountName, accountNumber: settings.accountNumber },
    },
    events: [event("customer", "created", `Order placed — ${formatNaira(total)}`)],
    createdAt: now,
    updatedAt: now,
  };

  if (!(await db().set(orderKey(id), order, { onlyIfNew: true }))) throw new Error("Duplicate order id");
  await writeIndexRow(order);
  return order;
}

export async function getOrder(id: string) {
  return (await db().get<Order>(orderKey(id)))?.data;
}

export async function getOrderByNumber(number: string) {
  const ref = await db().get<{ id: string }>(numberKey(number));
  return ref ? getOrder(ref.data.id) : undefined;
}

/** Order number + phone must both match. A guessed number alone reveals nothing. */
export async function findOrderForCustomer(number: string, phone: string) {
  const key = phoneKey(phone);
  if (!key) return undefined;
  const order = await getOrderByNumber(number);
  return order && order.customer.phoneKey === key ? order : undefined;
}

async function updateOrder(id: string, fn: (o: Order) => Order) {
  let updated!: Order;
  await mutate<Order>(db(), orderKey(id), (cur) => {
    if (!cur) throw new OrderError("Order not found.", 404);
    updated = { ...fn(cur), updatedAt: new Date().toISOString() };
    return updated;
  });
  await writeIndexRow(updated);
  return updated;
}

/**
 * Stores the customer's receipt and marks the payment "Receipt submitted".
 * This never confirms payment: the owner does that after checking her account.
 */
export async function submitReceipt(
  orderId: string,
  file: { name: string; bytes: Uint8Array },
  details: { amount?: number; reference?: string },
) {
  const check = checkReceiptFile(file.bytes);
  if (!check.ok) throw new OrderError(check.error, 400, "invalid_receipt");

  const current = await getOrder(orderId);
  if (!current) throw new OrderError("We couldn't find this order.", 404);
  if (!canSubmitReceipt(current)) {
    throw new OrderError(
      current.status === "cancelled" ? "This order was cancelled." : "We already have your receipt and are checking it. No need to upload again.",
      409,
    );
  }

  const key = `${current.number.toLowerCase()}/${Date.now()}-${randomHex(4)}.${check.type.ext}`;
  await files().put("receipts", key, file.bytes, check.type.mime);

  const safeName = file.name.replace(/[^\w.\- ]+/g, "").slice(0, 80) || `receipt.${check.type.ext}`;
  return updateOrder(orderId, (o) => {
    if (!canSubmitReceipt(o)) throw new OrderError("We already have your receipt and are checking it.", 409);
    const amountNote =
      details.amount !== undefined && details.amount !== o.total ? ` (customer says they sent ${formatNaira(details.amount)}; expected ${formatNaira(o.total)})` : "";
    return {
      ...o,
      payment: {
        ...o.payment,
        status: "receipt_submitted",
        receipt: { key, fileName: safeName, contentType: check.type.mime, size: file.bytes.byteLength, uploadedAt: new Date().toISOString() },
        submittedAt: new Date().toISOString(),
        submittedAmount: details.amount,
        reference: details.reference || undefined,
        rejectionReason: undefined,
      },
      events: [...o.events, event("customer", "receipt_submitted", `Receipt uploaded${amountNote}`)],
    };
  });
}

// ------------------------------------------------------------------
// Admin actions
// ------------------------------------------------------------------

export async function listOrderSummaries() {
  return (await db().get<{ rows: OrderSummary[] }>(INDEX))?.data.rows ?? [];
}

/** The owner opened the receipt: the payment is now "under review". */
export async function markReceiptViewed(orderId: string, by: string) {
  const o = await getOrder(orderId);
  if (!o || o.payment.status !== "receipt_submitted") return o;
  return updateOrder(orderId, (cur) =>
    cur.payment.status !== "receipt_submitted"
      ? cur
      : {
          ...cur,
          payment: { ...cur.payment, status: "under_review" },
          events: [...cur.events, event(by, "receipt_viewed", "Receipt opened — payment under review")],
        },
  );
}

/**
 * The owner has checked her account and the money arrived. This is the only way an order's
 * payment becomes confirmed (a future payment provider's verified webhook would call this too).
 */
export async function confirmPayment(orderId: string, by: string) {
  return updateOrder(orderId, (o) => {
    if (o.status === "cancelled") throw new OrderError("This order was cancelled.", 409);
    if (o.payment.status === "confirmed") throw new OrderError("This payment is already confirmed.", 409);
    return {
      ...o,
      status: o.status === "received" ? "payment_confirmed" : o.status,
      payment: {
        ...o.payment,
        status: "confirmed",
        verifiedAt: new Date().toISOString(),
        verifiedBy: by,
        rejectedAt: undefined,
        rejectedBy: undefined,
        rejectionReason: undefined,
      },
      events: [...o.events, event(by, "payment_confirmed", `Payment of ${formatNaira(o.total)} confirmed`)],
    };
  });
}

export async function rejectPayment(orderId: string, reason: string, by: string) {
  return updateOrder(orderId, (o) => {
    if (o.status === "cancelled") throw new OrderError("This order was cancelled.", 409);
    if (o.payment.status === "confirmed") throw new OrderError("This payment was already confirmed and can't be rejected.", 409);
    if (o.payment.status === "awaiting_payment") throw new OrderError("There's no receipt to reject yet.", 409);
    return {
      ...o,
      payment: { ...o.payment, status: "rejected", rejectedAt: new Date().toISOString(), rejectedBy: by, rejectionReason: reason },
      events: [...o.events, event(by, "payment_rejected", `Payment not confirmed: ${reason}`)],
    };
  });
}

export async function changeOrderStatus(orderId: string, next: OrderStatus, by: string, confirmed: boolean) {
  return updateOrder(orderId, (o) => {
    const check = checkTransition(o, next);
    if (!check.ok) throw new OrderError(check.reason, 409);
    if (check.needsConfirmation && !confirmed) throw new OrderError(check.warning ?? "Please confirm this change.", 409, "needs_confirmation");
    return { ...o, status: next, events: [...o.events, event(by, "status_changed", `Status changed to “${orderStatusLabel[next]}”`)] };
  });
}

export async function postCustomerUpdate(orderId: string, message: string, by: string) {
  return updateOrder(orderId, (o) => ({
    ...o,
    customerUpdate: message ? { message, at: new Date().toISOString(), by } : undefined,
    events: [...o.events, event(by, "customer_update", message ? `Update for customer: “${message}”` : "Customer update cleared")],
  }));
}
