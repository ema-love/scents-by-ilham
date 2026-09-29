import type { Product } from "@/lib/domain/products";
import { cn } from "@/lib/utils";

/** Availability in words and colour (never colour alone). */
export function Availability({ product, className }: { product: Pick<Product, "availability">; className?: string }) {
  const available = product.availability === "available";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium", available ? "text-success" : "text-muted-foreground", className)}>
      <span aria-hidden className={cn("size-2 rounded-full", available ? "bg-success" : "bg-danger/70")} />
      {available ? "Available" : "Currently unavailable"}
    </span>
  );
}
