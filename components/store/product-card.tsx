import Link from "next/link";
import { isOrderable, type Product } from "@/lib/domain/products";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ProductVisual } from "./product-visual";
import { Availability } from "./availability";

/** Product, price, availability, action — readable at a glance on a small phone. */
export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const orderable = isOrderable(product);
  return (
    <article className="group relative flex h-full flex-col">
      <ProductVisual product={product} priority={priority} className={cn("lift ring-1 ring-border", !orderable && "opacity-75 saturate-[.7]")} />
      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="text-[15px] leading-snug font-medium text-balance sm:text-base">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 font-display text-xl tracking-[-0.01em] sm:text-[22px]">{formatNaira(product.price)}</p>
        <Availability product={product} className="mt-1 mb-3" />
        <span
          aria-hidden
          className={cn(
            "mt-auto inline-flex h-10 items-center justify-center rounded-full text-[14px] font-medium ring-1 transition-colors",
            orderable ? "bg-card ring-border-strong group-hover:bg-lavender-soft" : "text-muted-foreground ring-border",
          )}
        >
          View product
        </span>
      </div>
      <span aria-hidden className="pointer-events-none absolute -inset-1.5 rounded-3xl ring-2 ring-transparent transition group-has-[:focus-visible]:ring-ring" />
    </article>
  );
}

/** Two columns from the smallest phones up; more as the screen grows. */
export function ProductGrid({ products, className, priorityCount = 2 }: { products: Product[]; className?: string; priorityCount?: number }) {
  return (
    <ul className={cn("grid grid-cols-1 gap-x-3 min-[340px]:grid-cols-2 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6", className)}>
      {products.map((p, i) => (
        <li key={p.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
