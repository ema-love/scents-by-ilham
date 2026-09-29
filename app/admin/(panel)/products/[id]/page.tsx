import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { ProductForm } from "@/components/admin/product-form";
import { Notice } from "@/components/ui/notice";
import { categoriesOf } from "@/lib/domain/products";
import { allProducts } from "@/lib/server/repo/products";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  const { id } = await props.params;
  const { created } = await props.searchParams;
  const products = await allProducts();
  const product = products.find((p) => p.id === id);
  if (!product) notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/admin/products" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-[15px] text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden /> Products
      </Link>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
        <h1 className="display text-[clamp(2rem,7vw,2.5rem)]">Edit product</h1>
        {product.visibility === "visible" && (
          <Link href={`/products/${product.slug}`} target="_blank" className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-lavender-ink">
            View in shop <ExternalLink className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      {created === "1" && (
        <Notice kind="success" role="status" className="mt-4">
          {product.name} was added{product.visibility === "visible" ? " and is now in the shop" : ""}.
        </Notice>
      )}
      <div className="mt-6">
        <ProductForm product={product} categories={categoriesOf(products)} nextOrder={product.displayOrder} />
      </div>
    </div>
  );
}
