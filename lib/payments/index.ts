/**
 * Payment methods.
 *
 * Phase 1 is bank transfer with manual verification: the customer transfers, uploads a
 * receipt, and the owner confirms after checking her account. Nothing is ever marked paid
 * automatically.
 *
 * A future provider (e.g. Paystack) is added as another entry here with `verification:
 * "provider"`: its checkout creates the same Order, and its verified webhook calls the same
 * confirmPayment() the owner's button does — the order system doesn't change.
 */

export type PaymentMethodId = "bank_transfer";

export type PaymentMethod = {
  id: PaymentMethodId;
  label: string;
  /** "manual": the owner confirms. "provider": a verified provider callback confirms. */
  verification: "manual" | "provider";
  /** Whether the customer uploads proof (a receipt). */
  collectsReceipt: boolean;
  enabled: boolean;
};

export const paymentMethods: Record<PaymentMethodId, PaymentMethod> = {
  bank_transfer: {
    id: "bank_transfer",
    label: "Bank transfer",
    verification: "manual",
    collectsReceipt: true,
    enabled: true,
  },
};

export const defaultPaymentMethod: PaymentMethodId = "bank_transfer";

export const getPaymentMethod = (id: PaymentMethodId) => paymentMethods[id];
