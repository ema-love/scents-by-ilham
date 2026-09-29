import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, FileText, MessageCircle, Phone } from "lucide-react";
import { CustomerUpdate, PaymentActions, StatusActions } from "@/components/admin/order-actions";
import { Notice } from "@/components/ui/notice";
import { Pill } from "@/components/ui/pill";
import { orderStatusLabel, orderTone, paymentStatusLabel, paymentTone } from "@/lib/domain/orders";
import { getPaymentMethod } from "@/lib/payments";
import { formatNaira } from "@/lib/money";
import { formatPhone, telHref, whatsappHref } from "@/lib/phone";
import { formatDate } from "@/lib/utils";
import { getOrder, markReceiptViewed } from "@/lib/server/repo/orders";
import { getSettings } from "@/lib/server/repo/settings";
import { getAdmin } from "@/lib/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order" };

function Card({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl bg-card p-5 ring-1 ring-border">
      <h2 id={id} className="eyebrow">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function AdminOrderPage(props: PageProps<"/admin/orders/[id]">) {
  const { id } = await props.params;
  const [admin, settings] = await Promise.all([getAdmin(), getSettings()]);
  let order = await getOrder(id);
  if (!order) notFound();
  // Opening the order shows the receipt, so the payment is now being reviewed.
  if (order.payment.status === "receipt_submitted" && admin) order = (await markReceiptViewed(order.id, admin.name)) ?? order;

  const { payment, customer, fulfilment } = order;
  const receiptUrl = `/api/admin/orders/${order.id}/receipt`;
  const isPdf = payment.receipt?.contentType === "application/pdf";
  const amountDiffers = payment.submittedAmount !== undefined && payment.submittedAmount !== order.total;
  const wa = whatsappHref(customer.phone, `Hello ${customer.name.split(" ")[0]}, this is ${settings.businessName} about your order ${order.number}.`);
  const view = {
    id: order.id,
    number: order.number,
    status: order.status,
    payment,
    fulfilment,
    total: order.total,
    customer,
    customerUpdate: order.customerUpdate?.message,
  };

  return (
    <div className="max-w-3xl">
      <Link href="/admin/orders" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-[15px] text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden /> Orders
      </Link>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
        <h1 className="figure text-[clamp(2.25rem,9vw,3rem)] leading-none">{order.number}</h1>
        <p className="text-[14px] text-muted-foreground">Placed {formatDate(order.createdAt)}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Pill tone={paymentTone[payment.status]}>{paymentStatusLabel[payment.status]}</Pill>
        <Pill tone={orderTone[order.status]}>{orderStatusLabel[order.status]}</Pill>
      </div>

      <div className="mt-6 grid gap-4">
        {/* Payment first: it's what needs a decision. */}
        <Card title="Payment" id="payment-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[15px] text-muted-foreground">Amount</p>
            <p className="figure text-3xl tabular-nums">{formatNaira(order.total)}</p>
          </div>
          <dl className="mt-3 grid gap-2 text-[14.5px]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Method</dt>
              <dd>
                {getPaymentMethod(payment.method).label} · {payment.payTo.bankName} {payment.payTo.accountNumber}
              </dd>
            </div>
            {payment.submittedAmount !== undefined && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Customer says they sent</dt>
                <dd className={amountDiffers ? "font-medium text-attention" : ""}>{formatNaira(payment.submittedAmount)}</dd>
              </div>
            )}
            {payment.reference && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Reference</dt>
                <dd className="font-mono text-[13.5px] break-all">{payment.reference}</dd>
              </div>
            )}
            {payment.verifiedAt && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Confirmed</dt>
                <dd>
                  {formatDate(payment.verifiedAt)} by {payment.verifiedBy}
                </dd>
              </div>
            )}
          </dl>
          {amountDiffers && (
            <Notice kind="warning" className="mt-3">
              The amount the customer entered is different from the order total. Check your account carefully.
            </Notice>
          )}
          {payment.status === "rejected" && payment.rejectionReason && (
            <Notice kind="error" className="mt-3" title={`Rejected ${payment.rejectedAt ? formatDate(payment.rejectedAt) : ""}`}>
              {payment.rejectionReason}
            </Notice>
          )}

          <div className="mt-4">
            {payment.receipt ? (
              <div className="overflow-hidden rounded-xl ring-1 ring-border">
                {isPdf ? (
                  <div className="flex items-center gap-3 bg-muted p-4">
                    <FileText className="size-7 shrink-0 text-lavender-ink" aria-hidden />
                    <span className="text-[14.5px]">PDF receipt</span>
                  </div>
                ) : (
                  <img src={receiptUrl} alt={`Payment receipt for ${order.number}`} className="max-h-[520px] w-full bg-muted object-contain" />
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3 text-[13.5px] text-muted-foreground">
                  <span>Uploaded {formatDate(payment.receipt.uploadedAt)}</span>
                  <a href={receiptUrl} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 font-medium text-lavender-ink hover:bg-lavender-wash">
                    View Receipt <ExternalLink className="size-4" aria-hidden />
                  </a>
                </div>
              </div>
            ) : (
              <p className="rounded-xl bg-muted p-4 text-[14.5px] text-muted-foreground">No receipt uploaded yet.</p>
            )}
          </div>

          <div className="mt-5">
            <PaymentActions order={view} businessPhone={settings.phone} />
          </div>
        </Card>

        <Card title="Order status" id="status-title">
          <p className="mb-4 text-[15px]">
            Now: <span className="font-medium">{orderStatusLabel[order.status]}</span>
          </p>
          <StatusActions order={view} />
        </Card>

        <Card title="Customer" id="customer-title">
          <p className="text-lg font-medium">{customer.name}</p>
          <p className="text-[15px] text-muted-foreground">{formatPhone(customer.phone)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={telHref(customer.phone)} className="inline-flex h-11 items-center gap-2 rounded-full bg-card px-4 text-[14.5px] font-medium ring-1 ring-border-strong hover:bg-muted">
              <Phone className="size-4" aria-hidden /> Call
            </a>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-card px-4 text-[14.5px] font-medium ring-1 ring-border-strong hover:bg-muted">
                <MessageCircle className="size-4" aria-hidden /> WhatsApp
              </a>
            )}
          </div>
        </Card>

        <Card title="Items" id="items-title">
          <ul className="space-y-2">
            {order.items.map((i) => (
              <li key={i.productId} className="flex justify-between gap-4 text-[15.5px]">
                <span>
                  {i.name} × {i.quantity}
                  <span className="block text-[13px] text-muted-foreground">{formatNaira(i.unitPrice)} each</span>
                </span>
                <span className="tabular-nums">{formatNaira(i.lineTotal)}</span>
              </li>
            ))}
            {fulfilment.method === "delivery" && (
              <li className="flex justify-between gap-4 text-[15.5px]">
                <span>Delivery</span>
                <span>{order.deliveryFee !== null ? formatNaira(order.deliveryFee) : "Fee to confirm with customer"}</span>
              </li>
            )}
          </ul>
          <p className="mt-3 flex justify-between border-t pt-3 font-medium">
            <span>Total</span>
            <span className="tabular-nums">{formatNaira(order.total)}</span>
          </p>
        </Card>

        <Card title="Fulfilment" id="fulfilment-title">
          <p className="text-[15.5px] font-medium">{fulfilment.method === "delivery" ? "Delivery" : "Pickup"}</p>
          {fulfilment.method === "delivery" && (
            <p className="mt-1 text-[15px] whitespace-pre-line">
              {fulfilment.address}
              {"\n"}
              {fulfilment.area}
            </p>
          )}
          {fulfilment.note && <p className="mt-2 text-[14.5px] text-muted-foreground">Note: {fulfilment.note}</p>}
        </Card>

        <Card title="Customer update" id="update-title">
          <p className="mb-3 text-[14.5px] text-muted-foreground">A short message shown on the customer&rsquo;s tracking page.</p>
          <CustomerUpdate order={view} />
        </Card>

        <Card title="History" id="history-title">
          <ol className="space-y-3">
            {[...order.events].reverse().map((e, i) => (
              <li key={i} className="text-[14.5px]">
                <p>{e.message}</p>
                <p className="text-[13px] text-muted-foreground">
                  {e.by === "customer" ? customer.name : e.by} · {formatDate(e.at)}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
