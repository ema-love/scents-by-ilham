"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, ExternalLink, Home, LogOut, Package, Settings } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Home", icon: Home },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/settings", label: "Store", icon: Settings },
] as const;

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/admin" ? pathname === "/admin" || pathname === "/admin/activity" : pathname.startsWith(href));
}

function SignOut({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
        router.replace("/admin/login");
        router.refresh();
      }}
      className={cn("inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-[14px] text-muted-foreground hover:bg-muted hover:text-foreground", className)}
    >
      <LogOut className="size-4" aria-hidden /> Sign out
    </button>
  );
}

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="grid min-w-5 place-items-center rounded-full bg-attention px-1.5 text-[11px] leading-5 font-semibold text-white">
      {count}
      <span className="sr-only"> need review</span>
    </span>
  );
}

/** Phones: a top bar and a bottom tab bar within thumb reach. Desktop: a quiet sidebar. */
export function AdminNav({ reviewCount }: { reviewCount: number }) {
  const active = useActive();
  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-md lg:hidden">
        <Link href="/admin" aria-label="Dashboard home">
          <Logo />
        </Link>
        <div className="flex items-center">
          <Link href="/" target="_blank" className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-muted" aria-label="View shop (opens in a new tab)">
            <ExternalLink className="size-[18px]" />
          </Link>
          <SignOut className="px-2.5" />
        </div>
      </header>

      <nav aria-label="Dashboard" className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/97 pb-safe backdrop-blur-md lg:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active(item.href) ? "page" : undefined}
                className={cn(
                  "relative flex min-h-15 flex-col items-center justify-center gap-0.5 pt-2 text-[12px] font-medium",
                  active(item.href) ? "text-lavender-ink" : "text-muted-foreground",
                )}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active(item.href) && "bg-lavender-soft")}>
                  <item.icon className="size-5" aria-hidden />
                </span>
                {item.label}
                {item.href === "/admin/orders" && reviewCount > 0 && (
                  <span className="absolute top-1 left-[calc(50%+6px)]">
                    <Badge count={reviewCount} />
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-card/60 px-4 py-6 lg:flex">
        <Link href="/admin" className="px-2" aria-label="Dashboard home">
          <Logo />
        </Link>
        <nav aria-label="Dashboard" className="mt-8 flex-1">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active(item.href) ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors",
                    active(item.href) ? "bg-lavender-soft font-medium text-lavender-ink" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="size-[18px]" aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {item.href === "/admin/orders" && <Badge count={reviewCount} />}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-1 border-t pt-4">
          <Link href="/" target="_blank" className="flex min-h-11 items-center gap-2 rounded-full px-3 text-[14px] text-muted-foreground hover:bg-muted hover:text-foreground">
            <ExternalLink className="size-4" aria-hidden /> View shop
          </Link>
          <SignOut />
        </div>
      </aside>
    </>
  );
}
