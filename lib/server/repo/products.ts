import "server-only";
import { cache } from "react";
import {
  availabilityLabel,
  byDisplayOrder,
  isPublic,
  visibilityLabel,
  type Product,
  type ProductInput,
} from "@/lib/domain/products";
import { slugify } from "@/lib/utils";
import { db, mutate } from "../db";
import { newId } from "../ids";
import { seedProducts } from "../seed";
import { recordAudit } from "./audit";

/**
 * The catalogue is one document ({ products: [...] }): a small shop's whole range is read in a
 * single request, and every change is a compare-and-swap on that document.
 */
type Catalog = { products: Product[] };
const KEY = "catalog";

async function load(): Promise<Product[]> {
  const found = await db().get<Catalog>(KEY);
  if (found) return found.data.products;
  // First run: write the launch catalogue. onlyIfNew makes this safe if two requests race.
  await db().set<Catalog>(KEY, { products: seedProducts() }, { onlyIfNew: true });
  return (await db().get<Catalog>(KEY))!.data.products;
}

/** Every product, including hidden and archived (dashboard). Cached per request. */
export const allProducts = cache(async () => (await load()).sort(byDisplayOrder));

/** What customers see. */
export const publicProducts = cache(async () => (await allProducts()).filter(isPublic));

export const getProduct = async (id: string) => (await allProducts()).find((p) => p.id === id);

export const getPublicProductBySlug = async (slug: string) => (await publicProducts()).find((p) => p.slug === slug);

export class ProductError extends Error {}

function uniqueSlug(name: string, products: Product[], selfId?: string) {
  const base = slugify(name) || "product";
  let slug = base;
  for (let i = 2; products.some((p) => p.slug === slug && p.id !== selfId); i++) slug = `${base}-${i}`;
  return slug;
}

export async function createProduct(input: ProductInput, by: string) {
  const now = new Date().toISOString();
  const id = newId("prd", 9);
  let created!: Product;
  await mutate<Catalog>(db(), KEY, (cur) => {
    const products = cur?.products ?? seedProducts(now);
    created = { ...input, id, slug: uniqueSlug(input.name, products), createdAt: now, updatedAt: now };
    return { products: [...products, created] };
  });
  await recordAudit(by, "Added product", created.name);
  return created;
}

/** Applies a patch and records exactly what changed, in plain words. */
export async function updateProduct(id: string, patch: Partial<ProductInput>, by: string) {
  let before: Product | undefined;
  let after!: Product;
  await mutate<Catalog>(db(), KEY, (cur) => {
    const products = cur?.products ?? [];
    before = products.find((p) => p.id === id);
    if (!before) throw new ProductError("This product no longer exists.");
    // The URL stays stable when a product is renamed, so shared links keep working.
    after = { ...before, ...patch, id: before.id, slug: before.slug, createdAt: before.createdAt, updatedAt: new Date().toISOString() };
    return { products: products.map((p) => (p.id === id ? after : p)) };
  });

  const changes: string[] = [];
  if (before!.availability !== after.availability) changes.push(`marked ${availabilityLabel[after.availability].toLowerCase()}`);
  if (before!.visibility !== after.visibility) changes.push(`set to ${visibilityLabel[after.visibility].toLowerCase()}`);
  if (before!.price !== after.price) changes.push(`price ₦${before!.price.toLocaleString("en-NG")} → ₦${after.price.toLocaleString("en-NG")}`);
  if (before!.name !== after.name) changes.push(`renamed from “${before!.name}”`);
  if (JSON.stringify(before!.images) !== JSON.stringify(after.images)) changes.push("photos updated");
  const other = (["category", "shortDescription", "description", "featured", "displayOrder"] as const).some((k) => before![k] !== after[k]);
  if (other) changes.push("details edited");
  if (changes.length) await recordAudit(by, `Product ${changes.join(", ")}`, after.name);
  return after;
}

/** Permanent removal. Only archived products can be deleted; past orders keep their own copy of name and price. */
export async function deleteProduct(id: string, by: string) {
  let removed: Product | undefined;
  await mutate<Catalog>(db(), KEY, (cur) => {
    const products = cur?.products ?? [];
    removed = products.find((p) => p.id === id);
    if (!removed) throw new ProductError("This product no longer exists.");
    if (removed.visibility !== "archived") throw new ProductError("Archive the product before deleting it.");
    return { products: products.filter((p) => p.id !== id) };
  });
  await recordAudit(by, "Deleted product permanently", removed!.name);
  return removed!;
}
