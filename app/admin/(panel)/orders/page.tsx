import type { Metadata } from "next";
import Link from "next/link";
import { OrderList } from "@/components/admin/order-list";
import { isOpen, needsPaymentReview, type OrderSummary } from "@/lib/domain/orders";
import { listOrderSummaries } from "@/lib/server/repo/orders";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Orders" };

const views = [
  { id: "review", label: "To check", empty: "No payments waiting to be checked.", match: (o: OrderSummary) => o.status !== "cancelled" && needsPaymentReview(o.paymentStatus) },
  { id: "unpaid", label: "Awaiting payment", empty: "No orders waiting for payment.", match: (o: OrderSummary) => o.status !== "cancelled" && (o.paymentStatus === "awaiting_payment" || o.paymentStatus === "rejected") },
  { id: "active", label: "To prepare", empty: "No paid orders in progress.", match: (o: OrderSummary) => o.paymentStatus === "confirmed" && isOpen(o.status) },
  { id: "done", label: "Completed", empty: "No completed orders yet.", match: (o: OrderSummary) => o.status === "completed" || o.status === "delivered" },
  { id: "cancelled", label: "Cancelled", empty: "No cancelled orders.", match: (o: OrderSummary) => o.status === "cancelled" },
  { id: "all", label: "All", empty: "No orders yet.", match: () => true },
] as const;

export default async function OrdersPage(props: PageProps<"/admin/orders">) {
  const { view: requested, q } = await props.searchParams;
  const all = await listOrderSummaries();
  // Open on what needs attention first.
  const fallback = all.some(views[0].match) ? "review" : all.some(views[2].match) ? "active" : "all";
  const view = views.find((v) => v.id === requested) ?? views.find((v) => v.id === fallback)!;
  const query = typeof q === "string" ? q.trim().toLowerCase() : "";
  const orders = all.filter(view.match).filter((o) => !query || o.number.toLowerCase().includes(query) || o.customerName.toLowerCase().includes(query));

  return (
    <div>
      <h1 className="display text-[clamp(2rem,7vw,2.5rem)]">Orders</h1>

      <form className="mt-4" role="search">
        <input type="hidden" name="view" value={view.id} />
        <label htmlFor="order-search" className="sr-only">
          Search by order number or name
        </label>
        <input
          id="order-search"
          name="q"
          defaultValue={query}
          placeholder="Search SC-1024 or a name"
          className="h-12 w-full rounded-xl bg-card px-4 ring-1 ring-border-strong outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-sm"
        />
      </form>

      <nav aria-label="Filter orders" className="no-scrollbar -mx-4 mt-4 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {views.map((v) => {
            const count = all.filter(v.match).length;
            return (
              <li key={v.id}>
                <Link
                  href={`/admin/orders?view=${v.id}`}
                  aria-current={view.id === v.id ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] whitespace-nowrap ring-1",
                    view.id === v.id ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-border-strong hover:bg-muted",
                  )}
                >
                  {v.label}
                  <span className={cn("tabular-nums", view.id !== v.id && v.id === "review" && count > 0 && "font-semibold text-attention")}>({count})</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-5">
        <OrderList orders={orders} empty={query ? "No orders match your search." : view.empty} />
      </div>
    </div>
  );
}
