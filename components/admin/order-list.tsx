import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { orderStatusLabel, orderTone, paymentStatusLabel, paymentTone, type OrderSummary } from "@/lib/domain/orders";
import { formatNaira } from "@/lib/money";
import { formatDate } from "@/lib/utils";

/** Cards on phones, a table on larger screens — never a sideways-scrolling table on a phone. */
export function OrderList({ orders, empty = "No orders yet." }: { orders: OrderSummary[]; empty?: string }) {
  if (!orders.length) return <p className="rounded-2xl bg-card p-6 text-center text-muted-foreground ring-1 ring-border">{empty}</p>;
  return (
    <>
      <ul className="space-y-3 md:hidden">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/admin/orders/${o.id}`} className="block rounded-2xl bg-card p-4 ring-1 ring-border transition-colors hover:bg-lavender-wash">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-xl leading-tight">{o.number}</p>
                  <p className="truncate text-[15px]">{o.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium tabular-nums">{formatNaira(o.total)}</p>
                  <p className="text-[13px] text-muted-foreground">{formatDate(o.createdAt, { day: "numeric", month: "short" })}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Pill tone={paymentTone[o.paymentStatus]}>{paymentStatusLabel[o.paymentStatus]}</Pill>
                <Pill tone={orderTone[o.status]}>{orderStatusLabel[o.status]}</Pill>
                <ChevronRight className="ml-auto size-5 text-muted-foreground" aria-hidden />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-2xl bg-card ring-1 ring-border md:block">
        <table className="w-full text-left text-[14.5px]">
          <thead className="border-b bg-muted/50 text-[13px] text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Order</th>
              <th scope="col" className="px-4 py-3 font-medium">Customer</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Amount</th>
              <th scope="col" className="px-4 py-3 font-medium">Payment</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((o) => (
              <tr key={o.id} className="relative transition-colors hover:bg-lavender-wash">
                <td className="px-4 py-3.5 font-medium">
                  <Link href={`/admin/orders/${o.id}`} className="after:absolute after:inset-0">
                    {o.number}
                  </Link>
                </td>
                <td className="px-4 py-3.5">{o.customerName}</td>
                <td className="px-4 py-3.5 text-right tabular-nums">{formatNaira(o.total)}</td>
                <td className="px-4 py-3.5">
                  <Pill tone={paymentTone[o.paymentStatus]}>{paymentStatusLabel[o.paymentStatus]}</Pill>
                </td>
                <td className="px-4 py-3.5">
                  <Pill tone={orderTone[o.status]}>{orderStatusLabel[o.status]}</Pill>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">{formatDate(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
