import { describe, expect, it } from "vitest";
import { checkTransition, customerTimeline, statusOptions, type Order } from "@/lib/domain/orders";

type O = Pick<Order, "status" | "payment" | "fulfilment">;
const order = (status: Order["status"], paymentStatus: Order["payment"]["status"], method: "pickup" | "delivery" = "pickup"): O => ({
  status,
  payment: { method: "bank_transfer", status: paymentStatus, expectedAmount: 2500, payTo: { bankName: "OPay", accountName: "", accountNumber: "8089497031" } },
  fulfilment: { method },
});

describe("order status rules", () => {
  it("never moves an unpaid order forward", () => {
    for (const next of ["processing", "ready_for_pickup", "completed"] as const) {
      const r = checkTransition(order("received", "receipt_submitted"), next);
      expect(r.ok).toBe(false);
    }
    expect(checkTransition(order("received", "under_review", "delivery"), "delivered").ok).toBe(false);
  });

  it("confirms payment only through the payment action", () => {
    expect(checkTransition(order("received", "under_review"), "payment_confirmed").ok).toBe(false);
  });

  it("allows the next step without confirmation", () => {
    expect(checkTransition(order("payment_confirmed", "confirmed"), "processing")).toEqual({ ok: true, needsConfirmation: false });
    expect(checkTransition(order("processing", "confirmed"), "ready_for_pickup")).toEqual({ ok: true, needsConfirmation: false });
    expect(checkTransition(order("processing", "confirmed", "delivery"), "out_for_delivery")).toEqual({ ok: true, needsConfirmation: false });
  });

  it("asks for confirmation when skipping, going back, or cancelling", () => {
    expect(checkTransition(order("payment_confirmed", "confirmed"), "completed")).toMatchObject({ ok: true, needsConfirmation: true });
    expect(checkTransition(order("ready_for_pickup", "confirmed"), "processing")).toMatchObject({ ok: true, needsConfirmation: true });
    expect(checkTransition(order("received", "awaiting_payment"), "cancelled")).toMatchObject({ ok: true, needsConfirmation: true });
  });

  it("keeps pickup and delivery paths apart", () => {
    expect(checkTransition(order("processing", "confirmed", "pickup"), "out_for_delivery").ok).toBe(false);
    expect(checkTransition(order("processing", "confirmed", "delivery"), "ready_for_pickup").ok).toBe(false);
  });

  it("closes completed and cancelled orders", () => {
    expect(checkTransition(order("completed", "confirmed"), "processing").ok).toBe(false);
    expect(checkTransition(order("cancelled", "rejected"), "processing").ok).toBe(false);
  });

  it("suggests the next step", () => {
    expect(statusOptions(order("payment_confirmed", "confirmed")).next).toBe("processing");
    expect(statusOptions(order("processing", "confirmed", "delivery")).next).toBe("out_for_delivery");
    expect(statusOptions(order("received", "under_review")).next).toBeUndefined();
  });
});

describe("customer timeline", () => {
  it("shows review in progress after a receipt", () => {
    const steps = customerTimeline(order("received", "receipt_submitted"));
    expect(steps.find((s) => s.key === "payment")).toMatchObject({ state: "current", detail: expect.stringContaining("checking") });
  });
  it("shows ready for pickup as the current step", () => {
    const steps = customerTimeline(order("ready_for_pickup", "confirmed"));
    expect(steps.find((s) => s.key === "payment")?.state).toBe("done");
    expect(steps.find((s) => s.key === "processing")?.state).toBe("done");
    expect(steps.find((s) => s.key === "fulfilment")).toMatchObject({ state: "current", detail: "Ready for pickup" });
    expect(steps.find((s) => s.key === "completed")?.state).toBe("upcoming");
  });
  it("flags a rejected payment", () => {
    expect(customerTimeline(order("received", "rejected")).find((s) => s.key === "payment")?.state).toBe("problem");
  });
});
