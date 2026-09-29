import { z } from "zod";

/**
 * Product data model. One canonical catalogue in the database drives the homepage,
 * the shop, product pages, the dashboard and order creation.
 *
 * Availability and visibility are separate on purpose:
 *   available + visible     normal product
 *   out_of_stock + visible  shown, but can't be ordered
 *   available + hidden      exists, not shown publicly
 *   archived                no longer part of the active catalogue (kept for history)
 */

export const AVAILABILITY = ["available", "out_of_stock"] as const;
export type Availability = (typeof AVAILABILITY)[number];

export const VISIBILITY = ["visible", "hidden", "archived"] as const;
export type Visibility = (typeof VISIBILITY)[number];

export type ProductImage = {
  /** Key in the media store; served publicly at /media/<key>. */
  key: string;
  width: number;
  height: number;
  alt: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  /** Whole naira. */
  price: number;
  category: string;
  shortDescription: string;
  description: string;
  /** The first image is the primary image. */
  images: ProductImage[];
  availability: Availability;
  visibility: Visibility;
  featured: boolean;
  /** Lower comes first. */
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export const availabilityLabel: Record<Availability, string> = {
  available: "Available",
  out_of_stock: "Out of stock",
};

export const visibilityLabel: Record<Visibility, string> = {
  visible: "Visible",
  hidden: "Hidden",
  archived: "Archived",
};

export const isPublic = (p: Pick<Product, "visibility">) => p.visibility === "visible";
export const isOrderable = (p: Pick<Product, "visibility" | "availability">) => p.visibility === "visible" && p.availability === "available";

export const byDisplayOrder = (a: Product, b: Product) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name);

export const mediaUrl = (key: string) => `/media/${key}`;

/** Related products: same category first, then the rest; never the product itself, never unavailable first. */
export function relatedProducts(product: Product, all: Product[], limit = 4) {
  return all
    .filter((p) => p.id !== product.id && isPublic(p))
    .sort((a, b) => {
      const cat = Number(b.category === product.category) - Number(a.category === product.category);
      const avail = Number(isOrderable(b)) - Number(isOrderable(a));
      return cat || avail || byDisplayOrder(a, b);
    })
    .slice(0, limit);
}

/** Categories in the order their first product appears. */
export function categoriesOf(products: Product[]) {
  const seen = new Set<string>();
  for (const p of [...products].sort(byDisplayOrder)) if (p.category) seen.add(p.category);
  return [...seen];
}

// ------------------------------------------------------------------
// Validation (shared by the dashboard form and the server)
// ------------------------------------------------------------------

const imageSchema = z.object({
  key: z.string().regex(/^products\/[a-z0-9-]+\.(webp|jpg|png)$/, "Invalid image"),
  width: z.number().int().positive().max(10000),
  height: z.number().int().positive().max(10000),
  alt: z.string().trim().max(200),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(2, "Enter the product name").max(80, "Keep the name under 80 characters"),
  price: z
    .number({ error: "Enter the price in naira" })
    .int("Use whole naira (no kobo)")
    .min(0, "The price can't be negative")
    .max(10_000_000, "That price looks too high"),
  category: z.string().trim().min(1, "Choose or type a category").max(60),
  shortDescription: z.string().trim().max(160, "Keep this under 160 characters"),
  description: z.string().trim().max(3000, "Keep this under 3,000 characters"),
  images: z.array(imageSchema).max(6, "Up to 6 photos"),
  availability: z.enum(AVAILABILITY),
  visibility: z.enum(VISIBILITY),
  featured: z.boolean(),
  displayOrder: z.number().int().min(0).max(9999),
});

export type ProductInput = z.infer<typeof productInputSchema>;

/** Quick changes from the product list (stock and visibility toggles). */
export const productQuickPatchSchema = z
  .object({ availability: z.enum(AVAILABILITY), visibility: z.enum(VISIBILITY) })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to change");
