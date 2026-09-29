import type { Metadata } from "next";
import Link from "next/link";
import { ProductGrid } from "@/components/store/product-card";
import { categoriesOf } from "@/lib/domain/products";
import { publicProducts } from "@/lib/server/repo/products";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop affordable fragrances",
  description: "Shop Humrah, Homura, Turaren Wuta and Kulacham from Scents by Ilham. Clear prices, simple ordering by bank transfer.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage(props: PageProps<"/shop">) {
  const { category } = await props.searchParams;
  const all = await publicProducts();
  const categories = categoriesOf(all);
  const active = typeof category === "string" && categories.includes(category) ? category : null;
  const products = active ? all.filter((p) => p.category === active) : all;

  const chip = "inline-flex h-10 shrink-0 items-center rounded-full px-4 text-[14.5px] ring-1 transition-colors";

  return (
    <div className="page pt-8 sm:pt-12">
      <p className="eyebrow">Shop</p>
      <h1 className="display mt-2 text-[clamp(2.2rem,8vw,3.5rem)]">All scents</h1>
      <p className="lede mt-3 max-w-lg">Every price is shown up front. Tap a scent to see more and add it to your order.</p>

      {categories.length > 1 && (
        <nav aria-label="Filter by collection" className="mt-7">
          <ul className="no-scrollbar -mx-[var(--page-gutter)] flex gap-2 overflow-x-auto px-[var(--page-gutter)] pb-1">
            <li>
              <Link
                href="/shop"
                aria-current={!active ? "page" : undefined}
                className={cn(chip, !active ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-border-strong hover:bg-muted")}
              >
                All ({all.length})
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c}>
                <Link
                  href={`/shop?category=${encodeURIComponent(c)}`}
                  aria-current={active === c ? "page" : undefined}
                  className={cn(chip, active === c ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-border-strong hover:bg-muted")}
                >
                  {c} ({all.filter((p) => p.category === c).length})
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {products.length ? (
        <ProductGrid products={products} className="mt-8" priorityCount={4} />
      ) : (
        <div className="mt-10 rounded-2xl bg-card p-8 text-center ring-1 ring-border">
          <p className="headline text-2xl">New scents are on the way.</p>
          <p className="mt-2 text-muted-foreground">There&rsquo;s nothing in the shop right now. Please check back soon.</p>
        </div>
      )}
    </div>
  );
}
