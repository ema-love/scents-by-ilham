"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useCart } from "./cart";
import { cn } from "@/lib/utils";

/** The round "+" on product cards: adds one to the order without leaving the shop. */
export function QuickAdd({ productId, name, className }: { productId: string; name: string; className?: string }) {
  const cart = useCart();
  const [added, setAdded] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        cart.add(productId, 1);
        setAdded(true);
        setTimeout(() => setAdded(false), 1600);
      }}
      aria-label={added ? `${name} added to your order` : `Add ${name} to your order`}
      className={cn(
        "relative z-10 grid size-11 shrink-0 place-items-center rounded-full text-primary-foreground transition-colors duration-300",
        added ? "bg-success" : "bg-plum-soft hover:bg-plum",
        className,
      )}
    >
      {added ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
    </button>
  );
}
