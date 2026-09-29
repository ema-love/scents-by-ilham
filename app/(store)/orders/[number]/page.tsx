import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Timeline } from "@/components/order/timeline";
import { ReceiptUpload } from "@/components/order/receipt-upload";
import { SupportCard } from "@/components/site/support";
import { CopyButton } from "@/components/ui/copy-button";
import { Notice } from "@/components/ui/notice";
import { Pill } from "@/components/ui/pill";
import {
  canSubmitReceipt,
  customerPaymentLabel,
  customerTimeline,
  needsPaymentReview,
  normaliseOrderNumber,
  orderStatusLabel,
  orderTone,
  paymentTone,
  type Order,
} from "@/lib/domain/orders";
import type { StoreSettings } from "@/lib/domain/settings";
import { formatNaira } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { formatDate } from "@/lib/utils";
import { getOrderByNumber } from "@/lib/server/repo/orders";
import { getSettings } from "@/lib/server/repo/settings";
import { orderAccessIds } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/orders/[number]">): Promise<Metadata> {
  const { number } = await props.params;
  return { title: `Order ${normaliseOrderNumber(number) ?? ""}`.trim(), robots: { index: false, follow: false } };
}

/** The status moment at the top of the page: what's happening, in one glance. */
function Headline({ order, settings, placed }: { order: Order; settings: StoreSettings; placed: boolean }) {
  const { status, payment } = order;
  if (status === "cancelled") {
    return (
      <Hero title="This order was cancelled" tone="danger">
        If you have questions about it, call or message us on {formatPhone(settings.phone)}.
      </Hero>
    );
  }
  if (status === "ready_for_pickup") {
    return (
      <Hero title="Your order is ready for pickup 🎉" tone="attention">
        {settings.pickupInfo ? (
          <span className="whitespace-pre-line text-foreground">{settings.pickupInfo}</span>
        ) : (
          <>Call or message us on {formatPhone(settings.phone)} to arrange your pickup.</>
        )}
      </Hero>
    );
  }
  if (status === "out_for_delivery") {
    return (
      <Hero title="Your order is on the way 🚚" tone="attention">
        {settings.deliveryContact ? <span className="text-foreground">{settings.deliveryContact}</span> : <>We&rsquo;ll be in touch if the rider needs directions.</>}
      </Hero>
    );
  }
  if (status === "delivered") return <Hero title="Your order has been delivered">We hope you love your scents. Thank you for shopping with us.</Hero>;
  if (status === "completed") return <Hero title="Order completed 🌸">Thank you for shopping with {settings.businessName}.</Hero>;
  if (status === "processing") return <Hero title="Your order is being prepared">Payment confirmed — we&rsquo;re getting your scents ready.</Hero>;
  if (status === "payment_confirmed") return <Hero title="Payment confirmed">Thank you! We&rsquo;ll start preparing your order shortly.</Hero>;
  if (needsPaymentReview(payment.status)) {
    return (
      <Hero title="Order received 🌸">
        We&rsquo;re checking your transfer and will update your order once it has been confirmed. Keep your order number — you&rsquo;ll need it to track your order.
      </Hero>
    );
  }
  if (payment.status === "rejected") {
    return (
      <Hero title="We couldn't confirm your payment" tone="danger">
        {payment.rejectionReason || `Please contact us on ${formatPhone(settings.phone)}.`}
      </Hero>
    );
  }
  return (
    <Hero title={placed ? "Order placed — now complete your payment" : "Complete your payment"}>
      Transfer the amount below, then upload your receipt. Your order is confirmed once we&rsquo;ve checked the transfer.
    </Hero>
  );
}

function Hero({ title, tone, children }: { title: string; tone?: "danger" | "attention"; children: React.ReactNode }) {
  return (
    <div className={tone === "danger" ? "rounded-2xl bg-danger-soft p-5 ring-1 ring-danger/20" : tone === "attention" ? "rounded-2xl bg-attention-soft p-5 ring-1 ring-attention/20" : ""}>
      <h2 className="headline text-[clamp(2rem,7.5vw,2.75rem)]">{title}</h2>
      <p className="mt-2 text-[16px] leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function PaymentInstructions({ order, settings }: { order: Order; settings: StoreSettings }) {
  // Always show the business's current account (settings), so a changed account never sends money to an old one.
  const { bankName, accountName, accountNumber } = settings;
  return (
    <section aria-labelledby="pay-title" className="rounded-3xl bg-card p-5 shadow-soft ring-1 ring-border sm:p-7">
      <h2 id="pay-title" className="eyebrow">
        Pay by bank transfer
      </h2>
      <p className="mt-3 text-[15px] text-muted-foreground">Please transfer</p>
      <p className="figure text-[clamp(2.75rem,12vw,3.5rem)] leading-none tracking-[-0.02em] tabular-nums">{formatNaira(order.total)}</p>
      {order.deliveryFee === null && order.fulfilment.method === "delivery" && (
        <p className="mt-2 text-[14px] text-muted-foreground">Delivery fee not included — we&rsquo;ll confirm it with you.</p>
      )}
      <dl className="mt-5 divide-y rounded-2xl bg-lavender-wash ring-1 ring-lavender/40">
        <div className="flex items-center justify-between gap-3 p-4">
          <dt className="text-[14.5px] text-muted-foreground">Bank</dt>
          <dd className="text-[17px] font-medium">{bankName}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <dt className="text-[14.5px] text-muted-foreground">Account number</dt>
            <dd className="figure text-[26px] leading-tight tracking-[0.02em] tabular-nums">{accountNumber}</dd>
          </div>
          <CopyButton value={accountNumber} label="Copy account number" />
        </div>
        {accountName && (
          <div className="flex items-center justify-between gap-3 p-4">
            <dt className="text-[14.5px] text-muted-foreground">Account name</dt>
            <dd className="text-right text-[16px] font-medium">{accountName}</dd>
          </div>
        )}
      </dl>
      {settings.paymentInstructions && <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{settings.paymentInstructions}</p>}
      <div className="mt-7 border-t pt-7">
        <ReceiptUpload orderNumber={order.number} expectedAmount={order.total} />
      </div>
    </section>
  );
}

export default async function OrderPage(props: PageProps<"/orders/[number]">) {
  const { number: raw } = await props.params;
  const { placed } = await props.searchParams;
  const number = normaliseOrderNumber(raw);
  const [order, settings, access] = await Promise.all([number ? getOrderByNumber(number) : undefined, getSettings(), orderAccessIds()]);

  // Without access (or if it doesn't exist) the page reveals nothing — not even whether the number is real.
  if (!order || !access.includes(order.id)) redirect(`/track${number ? `?number=${number}` : ""}`);

  const payable = canSubmitReceipt(order);

  return (
    <div className="page max-w-2xl pt-8 sm:pt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[14px] text-muted-foreground">Your order number</p>
          <h1 className="figure text-[clamp(2.4rem,10vw,3.25rem)] leading-none tracking-[-0.01em]">{order.number}</h1>
        </div>
        <CopyButton value={order.number} label="Copy order number" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Pill tone={paymentTone[order.payment.status]}>{customerPaymentLabel[order.payment.status]}</Pill>
        <Pill tone={orderTone[order.status]}>{orderStatusLabel[order.status]}</Pill>
      </div>

      <div className="mt-8 space-y-6">
        <Headline order={order} settings={settings} placed={placed === "1"} />

        {order.customerUpdate && (
          <Notice title="Update from us" role="status">
            <span className="text-foreground">{order.customerUpdate.message}</span>
            <span className="mt-1 block text-[13px] text-muted-foreground">{formatDate(order.customerUpdate.at)}</span>
          </Notice>
        )}

        {payable && <PaymentInstructions order={order} settings={settings} />}

        {!payable && order.payment.receipt && order.payment.status !== "confirmed" && (
          <Notice title="Receipt received">
            Payment status: <span className="font-medium text-foreground">{customerPaymentLabel[order.payment.status]}</span>. Sent {formatDate(order.payment.receipt.uploadedAt)}.
          </Notice>
        )}

        <section aria-labelledby="progress-title" className="rounded-3xl bg-card p-5 ring-1 ring-border sm:p-7">
          <h2 id="progress-title" className="headline mb-5 text-2xl">
            Order progress
          </h2>
          <Timeline steps={customerTimeline(order)} />
        </section>

        <section aria-labelledby="summary-title" className="rounded-3xl bg-card p-5 ring-1 ring-border sm:p-7">
          <h2 id="summary-title" className="headline text-2xl">
            Order summary
          </h2>
          <ul className="mt-4 space-y-2">
            {order.items.map((i) => (
              <li key={i.productId} className="flex justify-between gap-4 text-[15.5px]">
                <span>
                  {i.name} <span className="text-muted-foreground">× {i.quantity}</span>
                </span>
                <span className="tabular-nums">{formatNaira(i.lineTotal)}</span>
              </li>
            ))}
            {order.fulfilment.method === "delivery" && (
              <li className="flex justify-between gap-4 text-[15.5px]">
                <span>Delivery</span>
                <span>{order.deliveryFee !== null ? formatNaira(order.deliveryFee) : "To be confirmed"}</span>
              </li>
            )}
          </ul>
          <p className="mt-3 flex items-baseline justify-between border-t pt-3">
            <span className="font-medium">Total</span>
            <span className="figure text-2xl tabular-nums">{formatNaira(order.total)}</span>
          </p>
          <dl className="mt-5 grid gap-3 text-[15px] sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd>{order.customer.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{order.fulfilment.method === "delivery" ? "Delivery to" : "Fulfilment"}</dt>
              <dd>{order.fulfilment.method === "delivery" ? `${order.fulfilment.address}, ${order.fulfilment.area}` : "Pickup"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Placed</dt>
              <dd>{formatDate(order.createdAt)}</dd>
            </div>
          </dl>
        </section>

        <SupportCard settings={settings} message={`Hello! I'm contacting you about order ${order.number}.`} />

        <p className="text-center text-[14px] text-muted-foreground">
          Keep your order number <span className="font-medium text-foreground">{order.number}</span> — track it any time on the{" "}
          <Link href="/track" className="font-medium text-lavender-ink underline underline-offset-4">
            Track Order
          </Link>{" "}
          page.
        </p>
      </div>
    </div>
  );
}
