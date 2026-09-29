import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/product-form";
import { categoriesOf } from "@/lib/domain/products";
import { allProducts } from "@/lib/server/repo/products";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  const products = await allProducts();
  const nextOrder = (Math.max(0, ...products.map((p) => p.displayOrder)) || 0) + 10;
  return (
    <div className="max-w-2xl">
      <Link href="/admin/products" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-[15px] text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden /> Products
      </Link>
      <h1 className="display mt-1 text-[clamp(2rem,7vw,2.5rem)]">Add product</h1>
      <div className="mt-6">
        <ProductForm categories={categoriesOf(products)} nextOrder={nextOrder} />
      </div>
    </div>
  );
}
