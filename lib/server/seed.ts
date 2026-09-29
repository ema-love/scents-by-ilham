import "server-only";
import type { Product, ProductImage } from "@/lib/domain/products";
import { slugify } from "@/lib/utils";

/**
 * The official launch catalogue, written to the database the first time the store runs.
 * After that the database is the only source: prices, stock and descriptions are managed
 * from the dashboard, and this file is never read again.
 *
 * Descriptions are intentionally left for the owner to write — nothing here claims more than
 * the product's name, collection and price.
 *
 * Each launch product ships with a photo in /public/images/products/<version>/<slug>.webp.
 */
const HUMRAH = "Humrah & Homura";
const MORE = "More scents";

const launch: [name: string, price: number, category: string][] = [
  ["Black Humrah", 2500, HUMRAH],
  ["White Humrah", 2000, HUMRAH],
  ["Pink Humrah", 2500, HUMRAH],
  ["Upgraded Black Homura", 3000, HUMRAH],
  ["Upgraded White Homura", 3000, HUMRAH],
  ["Turaren Wuta", 2000, MORE],
  ["Kulacham", 1000, MORE],
];

/** The photo shipped with the site for a launch product, if there is one. */
export function bundledPhoto(slug: string, name: string): ProductImage | undefined {
  const size = bundledSizes[slug];
  return size ? { key: `bundled/${slug}.webp`, width: size[0], height: size[1], alt: name } : undefined;
}

const bundledSizes: Record<string, [number, number]> = {
  "black-humrah": [345, 431],
  "white-humrah": [345, 431],
  "pink-humrah": [345, 431],
  "upgraded-black-homura": [345, 431],
  "upgraded-white-homura": [331, 413],
  "turaren-wuta": [331, 413],
  kulacham: [331, 413],
};

export function seedProducts(now = new Date().toISOString()): Product[] {
  return launch.map(([name, price, category], i) => {
    const slug = slugify(name);
    return {
      id: `prd_${slug.replace(/-/g, "_")}`,
      slug,
      name,
      price,
      category,
      shortDescription: "",
      description: "",
      images: [bundledPhoto(slug, name)].filter((i): i is ProductImage => !!i),
      availability: "available",
      visibility: "visible",
      featured: i < 3,
      displayOrder: (i + 1) * 10,
      createdAt: now,
      updatedAt: now,
    };
  });
}
