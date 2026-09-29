import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductToggles } from "@/components/admin/product-toggles";
import { mediaUrl, type Product } from "@/lib/domain/products";
import { formatNaira } from "@/lib/money";
import { allProducts } from "@/lib/server/repo/products";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Products" };

const views = [
  { id: "active", label: "In the shop" },
  { id: "out_of_stock", label: "Out of stock" },
  { id: "hidden", label: "Hidden" },
  { id: "archived", label: "Archived" },
] as const;
type View = (typeof views)[number]["id"];

const filter = (view: View) => (p: Product) =>
  view === "active" ? p.visibility === "visible" : view === "out_of_stock" ? p.visibility !== "archived" && p.availability === "out_of_stock" : p.visibility === view;

function Thumb({ product }: { product: Product }) {
  const img = product.images[0];
  return (
    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-lavender-wash ring-1 ring-border">
      {img ? <Image src={mediaUrl(img.key)} alt="" fill sizes="64px" className="object-cover" /> : <span className="grid size-full place-items-center font-display text-xl text-lavender-ink">{product.name[0]}</span>}
    </div>
  );
}

export default async function ProductsPage(props: PageProps<"/admin/products">) {
  const { show } = await props.searchParams;
  const view: View = views.some((v) => v.id === show) ? (show as View) : "active";
  const all = await allProducts();
  const products = all.filter(filter(view));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display text-[clamp(2rem,7vw,2.5rem)]">Products</h1>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus /> Add Product
          </Link>
        </Button>
      </div>
      <p className="mt-2 text-muted-foreground">Tap a switch to mark a product out of stock or hide it. Changes show in the shop straight away.</p>

      <nav aria-label="Filter products" className="no-scrollbar -mx-4 mt-5 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {views.map((v) => {
            const count = all.filter(filter(v.id)).length;
            return (
              <li key={v.id}>
                <Link
                  href={v.id === "active" ? "/admin/products" : `/admin/products?show=${v.id}`}
                  aria-current={view === v.id ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center rounded-full px-4 text-[14px] whitespace-nowrap ring-1",
                    view === v.id ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-border-strong hover:bg-muted",
                  )}
                >
                  {v.label} ({count})
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {products.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-card p-6 text-center text-muted-foreground ring-1 ring-border">Nothing here.</p>
      ) : (
        <>
          {/* Phones: cards */}
          <ul className="mt-5 space-y-3 md:hidden">
            {products.map((p) => (
              <li key={p.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
                <div className="flex gap-3">
                  <Thumb product={p} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="font-display text-xl">{formatNaira(p.price)}</p>
                  </div>
                  <Button asChild variant="secondary" size="icon" aria-label={`Edit ${p.name}`}>
                    <Link href={`/admin/products/${p.id}`}>
                      <Pencil />
                    </Link>
                  </Button>
                </div>
                <div className="mt-3">
                  <ProductToggles id={p.id} name={p.name} availability={p.availability} visibility={p.visibility} />
                </div>
              </li>
            ))}
          </ul>

          {/* Larger screens: table */}
          <div className="mt-5 hidden overflow-hidden rounded-2xl bg-card ring-1 ring-border md:block">
            <table className="w-full text-left text-[14.5px]">
              <thead className="border-b bg-muted/50 text-[13px] text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Product</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Price</th>
                  <th scope="col" className="px-4 py-3 font-medium">Availability · Visibility</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Thumb product={p} />
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-[13px] text-muted-foreground">{p.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-display text-lg tabular-nums">{formatNaira(p.price)}</td>
                    <td className="px-4 py-3">
                      <ProductToggles id={p.id} name={p.name} availability={p.availability} visibility={p.visibility} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="secondary" size="sm" className="h-10">
                        <Link href={`/admin/products/${p.id}`}>
                          <Pencil /> Edit
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
