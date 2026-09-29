import { describe, expect, it } from "vitest";
import { useMemoryStores, PNG, PDF } from "./helpers";
import { allProducts, publicProducts, updateProduct, createProduct, deleteProduct } from "@/lib/server/repo/products";
import {
  changeOrderStatus,
  confirmPayment,
  createOrder,
  findOrderForCustomer,
  getOrder,
  listOrderSummaries,
  markReceiptViewed,
  rejectPayment,
  submitReceipt,
} from "@/lib/server/repo/orders";
import { saveSettings, getSettings } from "@/lib/server/repo/settings";
import { recentAudit } from "@/lib/server/repo/audit";
import { defaultSettings } from "@/lib/domain/settings";
import { mutate } from "@/lib/server/db";
import type { OrderInput } from "@/lib/domain/orders";

const stores = useMemoryStores();

const blackHumrah = async () => (await allProducts()).find((p) => p.name === "Black Humrah")!;
const input = (productId: string, quantity = 1, method: "pickup" | "delivery" = "pickup"): OrderInput => ({
  customer: { name: "Amina Yusuf", phone: "0803 123 4567" },
  items: [{ productId, quantity }],
  fulfilment: method === "pickup" ? { method } : { method, address: "12 Example Street", area: "Kano" },
});

describe("catalogue", () => {
  it("seeds exactly the seven launch products with their prices", async () => {
    const products = await allProducts();
    expect(products.map((p) => [p.name, p.price])).toEqual([
      ["Black Humrah", 2500],
      ["White Humrah", 2000],
      ["Pink Humrah", 2500],
      ["Upgraded Black Homura", 3000],
      ["Upgraded White Homura", 3000],
      ["Turaren Wuta", 2000],
      ["Kulacham", 1000],
    ]);
    expect(products.every((p) => p.availability === "available" && p.visibility === "visible")).toBe(true);
  });

  it("hides hidden and archived products from customers", async () => {
    const p = await blackHumrah();
    await updateProduct(p.id, { visibility: "hidden" }, "Ilham");
    expect((await publicProducts()).some((x) => x.id === p.id)).toBe(false);
    await updateProduct(p.id, { visibility: "archived" }, "Ilham");
    expect((await publicProducts()).some((x) => x.id === p.id)).toBe(false);
    expect((await allProducts()).some((x) => x.id === p.id)).toBe(true);
  });

  it("records who changed availability", async () => {
    const p = await blackHumrah();
    await updateProduct(p.id, { availability: "out_of_stock" }, "Ilham");
    expect((await recentAudit())[0]).toMatchObject({ by: "Ilham", subject: "Black Humrah", action: expect.stringContaining("out of stock") });
  });

  it("adds products with unique slugs and deletes only archived ones", async () => {
    const base = { price: 1500, category: "More scents", shortDescription: "", description: "", images: [], availability: "available" as const, visibility: "visible" as const, featured: false, displayOrder: 100 };
    const a = await createProduct({ ...base, name: "Black Humrah" }, "Ilham");
    expect(a.slug).toBe("black-humrah-2");
    await expect(deleteProduct(a.id, "Ilham")).rejects.toThrow("Archive");
    await updateProduct(a.id, { visibility: "archived" }, "Ilham");
    await deleteProduct(a.id, "Ilham");
    expect((await allProducts()).some((p) => p.id === a.id)).toBe(false);
  });
});

describe("orders", () => {
  it("snapshots prices so later price changes never alter an order", async () => {
    const p = await blackHumrah();
    const order = await createOrder(input(p.id, 2));
    expect(order.items[0]).toMatchObject({ name: "Black Humrah", unitPrice: 2500, quantity: 2, lineTotal: 5000 });
    expect(order.total).toBe(5000);
    await updateProduct(p.id, { price: 3000 }, "Ilham");
    expect((await getOrder(order.id))!.items[0].unitPrice).toBe(2500);
    expect((await getOrder(order.id))!.total).toBe(5000);
  });

  it("refuses products that went out of stock after the customer saw them", async () => {
    const p = await blackHumrah();
    await updateProduct(p.id, { availability: "out_of_stock" }, "Ilham");
    await expect(createOrder(input(p.id))).rejects.toThrow("Black Humrah is currently unavailable. Please choose another product.");
  });

  it("refuses hidden, archived and unknown products", async () => {
    const p = await blackHumrah();
    await updateProduct(p.id, { visibility: "hidden" }, "Ilham");
    await expect(createOrder(input(p.id))).rejects.toThrow("no longer available");
    await expect(createOrder(input("prd_nope"))).rejects.toThrow("no longer available");
  });

  it("gives every order a unique, readable number — even under concurrency", async () => {
    const p = await blackHumrah();
    const orders = await Promise.all(Array.from({ length: 12 }, () => createOrder(input(p.id))));
    const numbers = orders.map((o) => o.number);
    expect(new Set(numbers).size).toBe(12);
    expect(numbers.every((n) => /^SC-\d{4}$/.test(n))).toBe(true);
    expect((await listOrderSummaries()).length).toBe(12);
  });

  it("stores the payment account and starts awaiting payment", async () => {
    const order = await createOrder(input((await blackHumrah()).id));
    expect(order.status).toBe("received");
    expect(order.payment).toMatchObject({ method: "bank_transfer", status: "awaiting_payment", expectedAmount: 2500, payTo: { bankName: "OPay", accountNumber: "8089497031" } });
  });

  it("adds the delivery fee only when one is set", async () => {
    const p = await blackHumrah();
    const unset = await createOrder(input(p.id, 1, "delivery"));
    expect(unset).toMatchObject({ deliveryFee: null, total: 2500 });
    const { updatedAt: _u, ...rest } = { ...defaultSettings, ...(await getSettings()) };
    await saveSettings({ ...rest, deliveryFee: 1500 }, "Ilham");
    const withFee = await createOrder(input(p.id, 1, "delivery"));
    expect(withFee).toMatchObject({ deliveryFee: 1500, total: 4000 });
  });

  it("finds an order only with the matching phone number", async () => {
    const order = await createOrder(input((await blackHumrah()).id));
    expect((await findOrderForCustomer(order.number, "+234 803 123 4567"))?.id).toBe(order.id);
    expect(await findOrderForCustomer(order.number, "08099999999")).toBeUndefined();
    expect(await findOrderForCustomer("SC-9999", "08031234567")).toBeUndefined();
  });
});

describe("manual payment verification", () => {
  it("a receipt never confirms payment by itself", async () => {
    const order = await createOrder(input((await blackHumrah()).id));
    const after = await submitReceipt(order.id, { name: "receipt.png", bytes: PNG }, { amount: 2500, reference: "REF123" });
    expect(after.payment.status).toBe("receipt_submitted");
    expect(after.status).toBe("received");
    expect(after.payment.receipt?.contentType).toBe("image/png");
    expect(stores.files.files.size).toBe(1);
    // Uploading again while it's being checked is refused.
    await expect(submitReceipt(order.id, { name: "r.pdf", bytes: PDF }, {})).rejects.toThrow("already have your receipt");
  });

  it("rejects files that aren't receipts", async () => {
    const order = await createOrder(input((await blackHumrah()).id));
    await expect(submitReceipt(order.id, { name: "x.png", bytes: new TextEncoder().encode("<svg>") }, {})).rejects.toThrow("JPG, PNG or PDF");
  });

  it("runs the full owner loop: review → confirm → processing → ready → completed", async () => {
    const order = await createOrder(input((await blackHumrah()).id));
    await submitReceipt(order.id, { name: "receipt.png", bytes: PNG }, {});
    expect((await markReceiptViewed(order.id, "Ilham"))?.payment.status).toBe("under_review");

    await expect(changeOrderStatus(order.id, "processing", "Ilham", false)).rejects.toThrow("Confirm the payment first");

    const confirmed = await confirmPayment(order.id, "Ilham");
    expect(confirmed.payment).toMatchObject({ status: "confirmed", verifiedBy: "Ilham" });
    expect(confirmed.payment.verifiedAt).toBeTruthy();
    expect(confirmed.status).toBe("payment_confirmed");

    await changeOrderStatus(order.id, "processing", "Ilham", false);
    const ready = await changeOrderStatus(order.id, "ready_for_pickup", "Ilham", false);
    expect(ready.status).toBe("ready_for_pickup");
    await expect(changeOrderStatus(order.id, "processing", "Ilham", false)).rejects.toThrow();
    const done = await changeOrderStatus(order.id, "completed", "Ilham", false);
    expect(done.events.map((e) => e.type)).toEqual([
      "created",
      "receipt_submitted",
      "receipt_viewed",
      "payment_confirmed",
      "status_changed",
      "status_changed",
      "status_changed",
    ]);
    expect((await listOrderSummaries())[0]).toMatchObject({ status: "completed", paymentStatus: "confirmed" });
  });

  it("lets the customer upload again after a rejection", async () => {
    const order = await createOrder(input((await blackHumrah()).id));
    await expect(rejectPayment(order.id, "No receipt", "Ilham")).rejects.toThrow("no receipt");
    await submitReceipt(order.id, { name: "receipt.png", bytes: PNG }, {});
    const rejected = await rejectPayment(order.id, "We could not confirm this transfer. Please contact us using 08089497031.", "Ilham");
    expect(rejected.payment).toMatchObject({ status: "rejected", rejectedBy: "Ilham" });
    const again = await submitReceipt(order.id, { name: "receipt2.pdf", bytes: PDF }, {});
    expect(again.payment.status).toBe("receipt_submitted");
    expect(again.payment.rejectionReason).toBeUndefined();
  });
});

describe("database", () => {
  it("never loses concurrent updates", async () => {
    await Promise.all(Array.from({ length: 25 }, () => mutate<{ n: number }>(stores.db, "counter/test", (c) => ({ n: (c?.n ?? 0) + 1 }), 50)));
    expect((await stores.db.get<{ n: number }>("counter/test"))?.data.n).toBe(25);
  });
});
