import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/brand";
import { publicProducts } from "@/lib/server/repo/products";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["/", "/shop", "/about", "/contact", "/help", "/track"].map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : path === "/shop" ? 0.9 : 0.5,
  }));
  const products = await publicProducts().catch(() => []);
  return [
    ...pages,
    ...products.map((p) => ({ url: absoluteUrl(`/products/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
