"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, Phone, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/store/cart";
import { navLinks } from "@/lib/nav";
import { formatPhone, telHref } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

function CartLink({ className }: { className?: string }) {
  const { count, ready } = useCart();
  return (
    <Link
      href="/checkout"
      className={cn("relative grid size-11 place-items-center rounded-full text-foreground transition-colors hover:bg-muted", className)}
      aria-label={ready && count > 0 ? `Your order: ${count} item${count === 1 ? "" : "s"}` : "Your order"}
    >
      <ShoppingBag className="size-[22px]" strokeWidth={1.7} />
      {ready && count > 0 && (
        <span aria-hidden className="absolute top-1 right-0.5 grid min-w-5 place-items-center rounded-full bg-lavender-ink px-1 text-[11px] leading-5 font-semibold text-white animate-fade">
          {count}
        </span>
      )}
    </Link>
  );
}

export function Header({ phone }: { phone: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the menu after navigating.
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className={cn("sticky top-0 z-40 transition-[background-color,box-shadow] duration-300", scrolled ? "bg-background/92 shadow-[0_1px_0_var(--border)] backdrop-blur-md" : "bg-background")}>
      <nav aria-label="Main" className="page flex h-16 items-center justify-between gap-2">
        <Link href="/" aria-label="Scents by Ilham — home" className="-ml-1 rounded-lg px-1 py-1">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[14.5px] transition-colors hover:text-foreground",
                  isActive(l.href) ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1">
          <Button asChild size="sm" className="hidden h-10 px-4 sm:inline-flex">
            <Link href="/shop">Shop Now</Link>
          </Button>
          <CartLink />
          <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <DialogPrimitive.Trigger asChild>
              <button className="grid size-11 place-items-center rounded-full hover:bg-muted lg:hidden" aria-label="Open menu">
                <Menu className="size-[22px]" strokeWidth={1.7} />
              </button>
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-plum/25 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
              <DialogPrimitive.Content className="paper fixed inset-y-0 right-0 z-50 flex w-[min(88vw,380px)] flex-col bg-background shadow-lift outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right">
                <div className="flex h-16 items-center justify-between px-5">
                  <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
                  <Logo />
                  <DialogPrimitive.Close className="-mr-2 grid size-11 place-items-center rounded-full hover:bg-muted" aria-label="Close menu">
                    <X className="size-[22px]" strokeWidth={1.7} />
                  </DialogPrimitive.Close>
                </div>
                <ul className="flex-1 overflow-y-auto px-3 pt-4">
                  {navLinks.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={() => setOpen(false)}
                        aria-current={isActive(l.href) ? "page" : undefined}
                        className={cn(
                          "flex min-h-14 items-center rounded-xl px-3 font-display text-[26px] tracking-[-0.01em] transition-colors hover:bg-lavender-wash",
                          isActive(l.href) && "text-lavender-ink",
                        )}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="space-y-3 border-t p-5 pb-safe">
                  <Button asChild size="lg" className="w-full">
                    <Link href="/shop" onClick={() => setOpen(false)}>
                      Shop Now
                    </Link>
                  </Button>
                  <a href={telHref(phone)} className="flex h-12 items-center justify-center gap-2 rounded-full text-[15px] text-muted-foreground hover:bg-muted">
                    <Phone className="size-4" aria-hidden /> Call {formatPhone(phone)}
                  </a>
                </div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </div>
      </nav>
    </header>
  );
}
