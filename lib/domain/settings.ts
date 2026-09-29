import { z } from "zod";

/**
 * Store settings: everything likely to change lives here, editable from the dashboard,
 * never hard-coded in components. Empty strings mean "not provided" and are hidden on the site.
 */
export type StoreSettings = {
  businessName: string;
  /** Primary contact number. Clickable on phones. */
  phone: string;
  whatsappEnabled: boolean;
  /** Defaults to the business phone when empty. */
  whatsappNumber: string;

  bankName: string;
  accountName: string;
  accountNumber: string;
  paymentInstructions: string;

  pickupEnabled: boolean;
  /** Shown to a customer when their order is ready for pickup. */
  pickupInfo: string;
  deliveryEnabled: boolean;
  /** Whole naira added to delivery orders. null = not set: the customer is told it will be confirmed. */
  deliveryFee: number | null;
  deliveryInfo: string;
  /** Rider or delivery contact shown when an order is out for delivery. */
  deliveryContact: string;

  about: string;
  instagram: string;
  tiktok: string;
  facebook: string;
  x: string;

  updatedAt?: string;
};

export const defaultSettings: StoreSettings = {
  businessName: "Scents by Ilham",
  phone: "08089497031",
  whatsappEnabled: true,
  whatsappNumber: "",

  bankName: "OPay",
  accountName: "",
  accountNumber: "8089497031",
  paymentInstructions:
    "Transfer the exact amount shown, then upload a screenshot or photo of your transfer receipt. We check every transfer ourselves before confirming your order.",

  pickupEnabled: true,
  pickupInfo: "",
  deliveryEnabled: true,
  deliveryFee: null,
  deliveryInfo: "",
  deliveryContact: "",

  about:
    "Scents by Ilham is a small fragrance shop with a simple idea: beautiful scents, carefully chosen and thoughtfully presented, at prices that make sense for everyday life.",
  instagram: "",
  tiktok: "",
  facebook: "",
  x: "",
};

const text = (max: number) => z.string().trim().max(max);
const url = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), "Paste the full link, starting with https://");

export const settingsSchema = z.object({
  businessName: text(80).min(2, "Enter the business name"),
  phone: text(30).min(7, "Enter the business phone number"),
  whatsappEnabled: z.boolean(),
  whatsappNumber: text(30),

  bankName: text(60).min(2, "Enter the bank name"),
  accountName: text(100),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{6,20}$/, "Account numbers are digits only"),
  paymentInstructions: text(600),

  pickupEnabled: z.boolean(),
  pickupInfo: text(600),
  deliveryEnabled: z.boolean(),
  deliveryFee: z.number().int().min(0).max(1_000_000).nullable(),
  deliveryInfo: text(600),
  deliveryContact: text(200),

  about: text(2000),
  instagram: url,
  tiktok: url,
  facebook: url,
  x: url,
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export const whatsappNumberOf = (s: StoreSettings) => (s.whatsappEnabled ? s.whatsappNumber || s.phone : null);

export const socialLinks = (s: StoreSettings) =>
  (
    [
      { label: "Instagram", href: s.instagram },
      { label: "TikTok", href: s.tiktok },
      { label: "Facebook", href: s.facebook },
      { label: "X", href: s.x },
    ] as const
  ).filter((l) => l.href);
