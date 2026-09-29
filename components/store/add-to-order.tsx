"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/money";
import { useCart } from "./cart";
import { Quantity } from "./quantity";

type Props = { productId: string; name: string; price: number; orderable: boolean };

/** Quantity + "Order now" (add and go to checkout) + "Add to order" (keep shopping). */
export function AddToOrder({ productId, name, price, orderable }: Props) {
  const cart = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (!orderable) {
    return (
      <div className="rounded-2xl bg-muted p-4 text-[15px] ring-1 ring-border">
        <p className="font-medium">This product is currently unavailable.</p>
        <p className="mt-1 text-muted-foreground">Please choose another scent — or check back soon.</p>
        <Button asChild variant="secondary" className="mt-3">
          <Link href="/shop">See available scents</Link>
        </Button>
      </div>
    );
  }

  return (
    <div id="order" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Quantity value={quantity} onChange={setQuantity} label={`Quantity of ${name}`} />
        <p className="text-[15px] text-muted-foreground" aria-live="polite">
          Total <span className="font-medium text-foreground">{formatNaira(price * quantity)}</span>
        </p>
      </div>
      <Button
        size="lg"
        className="w-full"
        onClick={() => {
          cart.add(productId, quantity);
          router.push("/checkout");
        }}
      >
        Order now
      </Button>
      <Button
        size="lg"
        variant="secondary"
        className="w-full"
        onClick={() => {
          cart.add(productId, quantity);
          setAdded(true);
        }}
      >
        <ShoppingBag /> Add to order &amp; keep shopping
      </Button>
      <div aria-live="polite">
        {added && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-success-soft px-4 py-3 text-[15px] ring-1 ring-success/20 animate-rise">
            <span className="flex items-center gap-2">
              <Check className="size-4 text-success" aria-hidden /> Added to your order.
            </span>
            <Link href="/checkout" className="inline-flex min-h-10 items-center font-medium text-success underline underline-offset-4">
              View order ({cart.count})
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/** Keeps the price and action within thumb reach on phones. */
export function MobileOrderBar({ productId, name, price, orderable }: Props) {
  const cart = useCart();
  const router = useRouter();
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-safe backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13.5px] text-muted-foreground">{name}</p>
          <p className="font-display text-xl leading-tight">{formatNaira(price)}</p>
        </div>
        {orderable ? (
          <Button
            className="h-12 px-6"
            onClick={() => {
              cart.add(productId, 1);
              router.push("/checkout");
            }}
          >
            Order now
          </Button>
        ) : (
          <span className="rounded-full bg-muted px-4 py-3 text-[14px] text-muted-foreground">Currently unavailable</span>
        )}
      </div>
    </div>
  );
}
