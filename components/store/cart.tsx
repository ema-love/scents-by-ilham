"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MAX_ITEM_QUANTITY } from "@/lib/domain/orders";

/**
 * The customer's order-in-progress, kept on their phone (localStorage) — no account needed.
 * Only product ids and quantities are stored: names, prices and availability always come
 * fresh from the server, which re-checks everything when the order is placed.
 */
export type CartLine = { productId: string; quantity: number };

type Cart = {
  lines: CartLine[];
  count: number;
  ready: boolean;
  add: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const KEY = "sbi-order";
const CartContext = createContext<Cart | null>(null);

function read(): CartLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((l) => typeof l?.productId === "string" && Number.isInteger(l?.quantity) && l.quantity > 0).slice(0, 30)
      : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(read());
    setReady(true);
    // Keep several open tabs in step.
    const onStorage = (e: StorageEvent) => e.key === KEY && setLines(read());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((fn: (prev: CartLine[]) => CartLine[]) => {
    setLines((prev) => {
      const next = fn(prev);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Private mode or storage full: the order still works for this visit.
      }
      return next;
    });
  }, []);

  const value = useMemo<Cart>(
    () => ({
      lines,
      ready,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      add: (productId, quantity = 1) =>
        update((prev) => {
          const existing = prev.find((l) => l.productId === productId);
          if (!existing) return [...prev, { productId, quantity: Math.min(quantity, MAX_ITEM_QUANTITY) }];
          return prev.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(l.quantity + quantity, MAX_ITEM_QUANTITY) } : l));
        }),
      setQuantity: (productId, quantity) =>
        update((prev) =>
          quantity <= 0
            ? prev.filter((l) => l.productId !== productId)
            : prev.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(quantity, MAX_ITEM_QUANTITY) } : l)),
        ),
      remove: (productId) => update((prev) => prev.filter((l) => l.productId !== productId)),
      clear: () => update(() => []),
    }),
    [lines, ready, update],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
