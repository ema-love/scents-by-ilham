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
      <ProductVisual product={product} priority={priority} className={cn("lift", !orderable && "opacity-75 saturate-[.7]")} />
      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="text-[13px] leading-snug font-semibold tracking-[0.08em] text-balance uppercase">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        <p className="figure mt-1 text-[17px]">{formatNaira(product.price)}</p>
        <Availability product={product} className="mt-1 mb-3" />
        <span
          aria-hidden
          className={cn(
            "mt-auto inline-flex h-10 items-center justify-center rounded-[4px] text-[11.5px] font-medium tracking-[0.12em] uppercase ring-1 transition-colors duration-300",
            orderable ? "text-plum ring-plum/40 group-hover:bg-plum group-hover:text-primary-foreground" : "text-muted-foreground ring-border-strong",
          )}
        >
          View product
        </span>
      </div>
      <span aria-hidden className="pointer-events-none absolute -inset-1.5 rounded-xl ring-2 ring-transparent transition group-has-[a:focus-visible]:ring-ring" />
    </article>
  );
}

/** Two columns from the smallest phones up; more as the screen grows. */
export function ProductGrid({ products, className, priorityCount = 2 }: { products: Product[]; className?: string; priorityCount?: number }) {
  return (
    <ul className={cn("grid grid-cols-1 gap-x-3 gap-y-9 min-[340px]:grid-cols-2 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6", className)}>
      {products.map((p, i) => (
        <li key={p.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
