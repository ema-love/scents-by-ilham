import { z } from "zod";
import { isValidPhone } from "@/lib/phone";
import type { PaymentMethodId } from "@/lib/payments";

/**
 * Order data model.
 *
 * Payment status and order status are separate. An uploaded receipt is never proof of
 * payment: only the owner confirms a payment, after checking her account.
 */

export const PAYMENT_STATUSES = ["awaiting_payment", "receipt_submitted", "under_review", "confirmed", "rejected"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ORDER_STATUSES = [
  "received",
  "payment_confirmed",
  "processing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type FulfilmentMethod = "pickup" | "delivery";

export type OrderItem = {
  productId: string;
  /** Name and price as they were when the order was placed. Later catalogue edits never change them. */
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  imageKey?: string;
};

export type Receipt = {
  key: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
};

export type Payment = {
  method: PaymentMethodId;
  status: PaymentStatus;
  /** What the customer was asked to pay (the order total). */
  expectedAmount: number;
  /** What the customer says they sent, if they entered it. */
  submittedAmount?: number;
  /** Transfer reference / session ID, if the customer entered one. */
  reference?: string;
  receipt?: Receipt;
  submittedAt?: string;
  /** Account the customer was told to pay, as it was at order time. */
  payTo: { bankName: string; accountName: string; accountNumber: string };
  verifiedAt?: string;
  verifiedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
};

export type OrderEvent = {
  at: string;
  /** "customer", "system", or the admin's name. */
  by: string;
  type:
    | "created"
    | "receipt_submitted"
    | "receipt_viewed"
    | "payment_confirmed"
    | "payment_rejected"
    | "status_changed"
    | "customer_update";
  message: string;
};

export type Order = {
  id: string;
  /** Customer-facing number, e.g. SC-1024. Never the internal id. */
  number: string;
  customer: { name: string; phone: string; phoneKey: string };
  items: OrderItem[];
  subtotal: number;
  /** null when delivery was chosen but no fee is set: it's confirmed with the customer. */
  deliveryFee: number | null;
  total: number;
  fulfilment: { method: FulfilmentMethod; address?: string; area?: string; note?: string };
  status: OrderStatus;
  payment: Payment;
  /** Latest message from the shop, shown on the tracking page. */
  customerUpdate?: { message: string; at: string; by: string };
  events: OrderEvent[];
  createdAt: string;
  updatedAt: string;
};

/** A row in the dashboard's order list. */
export type OrderSummary = Pick<Order, "id" | "number" | "total" | "status" | "createdAt" | "updatedAt"> & {
  customerName: string;
  paymentStatus: PaymentStatus;
  fulfilment: FulfilmentMethod;
  itemCount: number;
};

export const summarise = (o: Order): OrderSummary => ({
  id: o.id,
  number: o.number,
  total: o.total,
  status: o.status,
  createdAt: o.createdAt,
  updatedAt: o.updatedAt,
  customerName: o.customer.name,
  paymentStatus: o.payment.status,
  fulfilment: o.fulfilment.method,
  itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
});

// ------------------------------------------------------------------
// Labels
// ------------------------------------------------------------------

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  awaiting_payment: "Awaiting payment",
  receipt_submitted: "Receipt submitted",
  under_review: "Payment under review",
  confirmed: "Payment confirmed",
  rejected: "Payment rejected",
};

/** Customers see one calm label while the owner checks. */
export const customerPaymentLabel: Record<PaymentStatus, string> = {
  awaiting_payment: "Awaiting payment",
  receipt_submitted: "Payment under review",
  under_review: "Payment under review",
  confirmed: "Payment confirmed",
  rejected: "Payment not confirmed",
};

export const orderStatusLabel: Record<OrderStatus, string> = {
  received: "Order received",
  payment_confirmed: "Payment confirmed",
  processing: "Processing",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

export type Tone = "neutral" | "attention" | "progress" | "success" | "danger";

export const paymentTone: Record<PaymentStatus, Tone> = {
  awaiting_payment: "neutral",
  receipt_submitted: "attention",
  under_review: "attention",
  confirmed: "success",
  rejected: "danger",
};

export const orderTone: Record<OrderStatus, Tone> = {
  received: "neutral",
  payment_confirmed: "progress",
  processing: "progress",
  ready_for_pickup: "attention",
  out_for_delivery: "attention",
  delivered: "success",
  completed: "success",
  cancelled: "danger",
};

export const needsPaymentReview = (s: PaymentStatus) => s === "receipt_submitted" || s === "under_review";
/** The customer can (re)submit a receipt: nothing submitted yet, or the last one wasn't confirmed. */
export const canSubmitReceipt = (o: Pick<Order, "status" | "payment">) =>
  o.status !== "cancelled" && (o.payment.status === "awaiting_payment" || o.payment.status === "rejected");
export const isOpen = (s: OrderStatus) => s !== "completed" && s !== "cancelled";

// ------------------------------------------------------------------
// Status rules
// ------------------------------------------------------------------

/** The fulfilment path, in order, for each method. */
export const fulfilmentPath = (method: FulfilmentMethod): OrderStatus[] =>
  method === "pickup"
    ? ["payment_confirmed", "processing", "ready_for_pickup", "completed"]
    : ["payment_confirmed", "processing", "out_for_delivery", "delivered", "completed"];

export type TransitionCheck = { ok: true; needsConfirmation: boolean; warning?: string } | { ok: false; reason: string };

/**
 * Whether the owner may move an order to `next` with the status control.
 * Payment is confirmed only through the payment actions, never by picking a status.
 *
 * - Nothing moves past "Order received" until payment is confirmed.
 * - Pickup orders can't be "Out for delivery"; delivery orders can't be "Ready for pickup".
 * - The next step (or a later one) is allowed; going backwards or cancelling asks for confirmation.
 * - Completed and cancelled orders are closed.
 */
export function checkTransition(order: Pick<Order, "status" | "payment" | "fulfilment">, next: OrderStatus): TransitionCheck {
  const current = order.status;
  if (next === current) return { ok: false, reason: "The order is already at this status." };
  if (current === "cancelled") return { ok: false, reason: "This order was cancelled and can't be changed." };
  if (current === "completed") return { ok: false, reason: "This order is completed and can't be changed." };

  if (next === "cancelled") {
    const warning =
      order.payment.status === "confirmed"
        ? "Payment for this order was confirmed. If you cancel, arrange any refund with the customer yourself."
        : undefined;
    return { ok: true, needsConfirmation: true, warning };
  }
  if (next === "received") return { ok: false, reason: "An order can't go back to “Order received”." };
  if (next === "payment_confirmed") return { ok: false, reason: "Use “Confirm payment” to confirm a payment." };
  if (order.payment.status !== "confirmed") {
    return { ok: false, reason: "Confirm the payment first. Orders move forward only after you've checked the money arrived." };
  }

  const path = fulfilmentPath(order.fulfilment.method);
  const to = path.indexOf(next);
  if (to === -1) {
    return {
      ok: false,
      reason: order.fulfilment.method === "pickup" ? "This is a pickup order — it can't go out for delivery." : "This is a delivery order — use “Out for delivery”.",
    };
  }
  const from = path.indexOf(current);
  if (to < from) return { ok: true, needsConfirmation: true, warning: "This moves the order back a step. The customer will see the change." };
  if (to > from + 1) return { ok: true, needsConfirmation: true, warning: "This skips a step." };
  return { ok: true, needsConfirmation: false };
}

/** Statuses offered in the dashboard's status control, with the suggested next step first. */
export function statusOptions(order: Pick<Order, "status" | "payment" | "fulfilment">) {
  const path = fulfilmentPath(order.fulfilment.method);
  const next = path[path.indexOf(order.status) + 1];
  const allowed = [...path, "cancelled" as const].filter((s) => checkTransition(order, s).ok);
  return { next: next && allowed.includes(next) ? next : undefined, allowed };
}

// ------------------------------------------------------------------
// Customer timeline
// ------------------------------------------------------------------

export type TimelineStep = { key: string; title: string; detail: string; state: "done" | "current" | "upcoming" | "problem" };

export function customerTimeline(order: Pick<Order, "status" | "payment" | "fulfilment">): TimelineStep[] {
  const { status, payment, fulfilment } = order;
  const path = fulfilmentPath(fulfilment.method);
  const reached = (s: OrderStatus) => {
    const at = path.indexOf(status);
    const target = path.indexOf(s);
    return target !== -1 && at !== -1 && at >= target;
  };
  const paid = payment.status === "confirmed";

  const paymentStep: TimelineStep = {
    key: "payment",
    title: "Payment",
    detail: paid
      ? "Payment confirmed"
      : payment.status === "rejected"
        ? "We couldn't confirm your transfer"
        : needsPaymentReview(payment.status)
          ? "Receipt received — we're checking your transfer"
          : "Waiting for your transfer and receipt",
    state: paid ? "done" : payment.status === "rejected" ? "problem" : "current",
  };

  const steps: TimelineStep[] = [
    { key: "received", title: "Order", detail: "Order received", state: "done" },
    paymentStep,
    {
      key: "processing",
      title: "Processing",
      detail: reached("processing") ? "Being prepared" : "We'll prepare your order once payment is confirmed",
      state: reached(fulfilment.method === "pickup" ? "ready_for_pickup" : "out_for_delivery") ? "done" : reached("processing") ? "current" : "upcoming",
    },
  ];

  if (fulfilment.method === "pickup") {
    steps.push({
      key: "fulfilment",
      title: "Pickup",
      detail: reached("ready_for_pickup") ? "Ready for pickup" : "Not ready yet",
      state: reached("completed") ? "done" : reached("ready_for_pickup") ? "current" : "upcoming",
    });
  } else {
    steps.push({
      key: "fulfilment",
      title: "Delivery",
      detail: reached("delivered") ? "Delivered" : reached("out_for_delivery") ? "Out for delivery" : "Not sent yet",
      state: reached("delivered") ? "done" : reached("out_for_delivery") ? "current" : "upcoming",
    });
  }

  steps.push({
    key: "completed",
    title: "Completed",
    detail: reached("completed") ? "Completed — thank you" : "Not yet completed",
    state: reached("completed") ? "done" : "upcoming",
  });

  if (status === "cancelled") return steps.map((s) => (s.state === "done" ? s : { ...s, state: "upcoming" as const }));
  return steps;
}

// ------------------------------------------------------------------
// Validation
// ------------------------------------------------------------------

export const MAX_ITEM_QUANTITY = 20;

export const orderInputSchema = z
  .object({
    customer: z.object({
      name: z.string().trim().min(2, "Enter your full name").max(80, "Keep your name under 80 characters"),
      phone: z.string().trim().refine(isValidPhone, "Enter a valid phone number, e.g. 0803 123 4567"),
    }),
    items: z
      .array(
        z.object({
          productId: z.string().min(1).max(64),
          quantity: z.number().int().min(1).max(MAX_ITEM_QUANTITY, `Up to ${MAX_ITEM_QUANTITY} of each item`),
        }),
      )
      .min(1, "Your order is empty")
      .max(30),
    fulfilment: z.object({
      method: z.enum(["pickup", "delivery"]),
      address: z.string().trim().max(300).optional(),
      area: z.string().trim().max(120).optional(),
      note: z.string().trim().max(300).optional(),
    }),
  })
  .superRefine((v, ctx) => {
    if (v.fulfilment.method === "delivery") {
      if (!v.fulfilment.address || v.fulfilment.address.length < 5) {
        ctx.addIssue({ code: "custom", path: ["fulfilment", "address"], message: "Enter the delivery address" });
      }
      if (!v.fulfilment.area || v.fulfilment.area.length < 2) {
        ctx.addIssue({ code: "custom", path: ["fulfilment", "area"], message: "Enter the area or city" });
      }
    }
  });

export type OrderInput = z.infer<typeof orderInputSchema>;

export const ORDER_NUMBER_PREFIX = "SC-";
/** Accepts "sc-1024", "SC 1024", "1024" → "SC-1024". */
export function normaliseOrderNumber(input: string) {
  const digits = input.trim().toUpperCase().replace(/^SC[\s-]*/, "").replace(/\s/g, "");
  return /^\d{3,8}$/.test(digits) ? `${ORDER_NUMBER_PREFIX}${digits}` : null;
}
