import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList, Package, PackageCheck, Plus, ReceiptText, Settings } from "lucide-react";
import { OrderList } from "@/components/admin/order-list";
import { isOpen, needsPaymentReview } from "@/lib/domain/orders";
import { formatNaira } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { brand } from "@/lib/brand";
import { allProducts } from "@/lib/server/repo/products";
import { listOrderSummaries } from "@/lib/server/repo/orders";
import { recentAudit } from "@/lib/server/repo/audit";
import { getAdmin } from "@/lib/server/session";
import { getSettings } from "@/lib/server/repo/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Home" };

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-NG", { hour: "numeric", hourCycle: "h23", timeZone: brand.timeZone }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function DashboardHome() {
  const [admin, products, orders, activity, settings] = await Promise.all([getAdmin(), allProducts(), listOrderSummaries(), recentAudit(6), getSettings()]);
  const active = products.filter((p) => p.visibility !== "archived");
  const available = active.filter((p) => p.availability === "available").length;
  const outOfStock = active.filter((p) => p.availability === "out_of_stock").length;
  const toReview = orders.filter((o) => o.status !== "cancelled" && needsPaymentReview(o.paymentStatus));
  const toPrepare = orders.filter((o) => o.paymentStatus === "confirmed" && isOpen(o.status));
  const confirmedRevenue = orders.filter((o) => o.paymentStatus === "confirmed" && o.status !== "cancelled").reduce((s, o) => s + o.total, 0);

  const stats = [
    { label: "Products", value: active.length, href: "/admin/products" },
    { label: "Available", value: available, href: "/admin/products" },
    { label: "Out of stock", value: outOfStock, href: "/admin/products?show=out_of_stock" },
    { label: "Orders", value: orders.length, href: "/admin/orders?view=all" },
  ];

  const actions = [
    { label: "Add Product", href: "/admin/products/new", icon: Plus },
    { label: "Update Stock", href: "/admin/products", icon: Package },
    { label: "View Orders", href: "/admin/orders", icon: ClipboardList },
    { label: "Review Payments", href: "/admin/orders?view=review", icon: ReceiptText },
    { label: "Edit Store", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[14px] text-muted-foreground">{brand.name}</p>
        <h1 className="display mt-1 text-[clamp(2rem,7vw,2.75rem)]">
          {greeting()}, {admin?.name} 🌸
        </h1>
      </header>

      {toReview.length > 0 && (
        <Link
          href="/admin/orders?view=review"
          className="flex items-center gap-4 rounded-2xl bg-attention-soft p-4 ring-1 ring-attention/25 transition-colors hover:bg-attention-soft/70"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-attention text-white">
            <ReceiptText className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">
              {toReview.length} payment{toReview.length === 1 ? "" : "s"} to check
            </span>
            <span className="block text-[14px] text-muted-foreground">Check your {settings.bankName} account, then confirm or reject.</span>
          </span>
          <ArrowRight className="size-5 shrink-0" aria-hidden />
        </Link>
      )}
      {toPrepare.length > 0 && (
        <Link href="/admin/orders?view=active" className="flex items-center gap-4 rounded-2xl bg-lavender-wash p-4 ring-1 ring-lavender/40 hover:bg-lavender-soft">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lavender-ink text-white">
            <PackageCheck className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">
              {toPrepare.length} paid order{toPrepare.length === 1 ? "" : "s"} in progress
            </span>
            <span className="block text-[14px] text-muted-foreground">Prepare, then mark ready or out for delivery.</span>
          </span>
          <ArrowRight className="size-5 shrink-0" aria-hidden />
        </Link>
      )}

      <section aria-labelledby="overview-title">
        <h2 id="overview-title" className="headline text-2xl">
          Store overview
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <li key={s.label}>
              <Link href={s.href} className="block rounded-2xl bg-card p-4 ring-1 ring-border transition-colors hover:bg-lavender-wash">
                <p className="font-display text-[2.25rem] leading-none tabular-nums">{s.value}</p>
                <p className="mt-2 text-[14px] text-muted-foreground">{s.label}</p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[14px] text-muted-foreground">
          Confirmed payments so far: <span className="font-medium text-foreground">{formatNaira(confirmedRevenue)}</span>
        </p>
      </section>

      <section aria-labelledby="quick-title">
        <h2 id="quick-title" className="headline text-2xl">
          Quick actions
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {actions.map((a) => (
            <li key={a.label}>
              <Link href={a.href} className="flex min-h-14 items-center gap-3 rounded-2xl bg-card px-4 py-3 text-[15px] font-medium ring-1 ring-border transition-colors hover:bg-lavender-wash">
                <a.icon className="size-5 shrink-0 text-lavender-ink" aria-hidden />
                {a.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="recent-title">
        <div className="flex items-end justify-between">
          <h2 id="recent-title" className="headline text-2xl">
            Latest orders
          </h2>
          <Link href="/admin/orders?view=all" className="inline-flex min-h-11 items-center text-[15px] font-medium text-lavender-ink">
            See all
          </Link>
        </div>
        <div className="mt-4">
          <OrderList orders={orders.slice(0, 5)} empty="No orders yet. They'll appear here as soon as a customer orders." />
        </div>
      </section>

      {activity.length > 0 && (
        <section aria-labelledby="activity-title">
          <div className="flex items-end justify-between">
            <h2 id="activity-title" className="headline text-2xl">
              Recent activity
            </h2>
            <Link href="/admin/activity" className="inline-flex min-h-11 items-center text-[15px] font-medium text-lavender-ink">
              See all
            </Link>
          </div>
          <ul className="mt-4 divide-y rounded-2xl bg-card ring-1 ring-border">
            {activity.map((a, i) => (
              <li key={i} className="px-4 py-3 text-[14.5px]">
                <p>
                  {a.action}
                  {a.subject && <span className="font-medium"> — {a.subject}</span>}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {a.by} · {formatDate(a.at)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
