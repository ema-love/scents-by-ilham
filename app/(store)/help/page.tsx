import type { Metadata } from "next";
import Link from "next/link";
import { SupportCard } from "@/components/site/support";
import { formatNaira } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { getSettings } from "@/lib/server/repo/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How ordering works",
  description: "How to order from Scents by Ilham: choose, transfer, upload your receipt and track your order. Pickup and delivery information.",
  alternates: { canonical: "/help" },
};

export default async function HelpPage() {
  const s = await getSettings();
  const faqs: { q: string; a: React.ReactNode }[] = [
    { q: "Do I need an account?", a: "No. You only need your name and phone number. You'll get an order number to track your order." },
    {
      q: "How do I pay?",
      a: (
        <>
          By bank transfer to our {s.bankName} account ({s.accountNumber}). After you place your order we show you the exact amount. Transfer it, then upload your receipt on the same page.
        </>
      ),
    },
    {
      q: "When is my payment confirmed?",
      a: "Once we've checked that your transfer has arrived in our account. Uploading a receipt doesn't confirm payment on its own — we check every transfer ourselves, then update your order.",
    },
    {
      q: "What if my payment can't be confirmed?",
      a: (
        <>
          Your tracking page will say so and explain why. You can upload a new receipt, or call us on {formatPhone(s.phone)} and we&rsquo;ll sort it out together.
        </>
      ),
    },
    {
      q: "How do I track my order?",
      a: (
        <>
          Go to{" "}
          <Link href="/track" className="font-medium text-lavender-ink underline underline-offset-4">
            Track Order
          </Link>{" "}
          and enter your order number (e.g. SC-1024) and the phone number you ordered with.
        </>
      ),
    },
    { q: "Can I change or cancel my order?", a: <>Call or message us on {formatPhone(s.phone)} as soon as possible and we&rsquo;ll help.</> },
  ];

  return (
    <div className="page max-w-3xl pt-8 sm:pt-12">
      <p className="eyebrow">Help</p>
      <h1 className="display mt-2 text-[clamp(2.2rem,8vw,3.25rem)]">How ordering works</h1>

      <ol className="mt-8 space-y-3">
        {[
          "Choose your scents and add them to your order.",
          "Enter your name and phone number, and choose pickup or delivery.",
          "Review your order, then place it. You'll get your order number.",
          `Transfer the exact amount to our ${s.bankName} account and upload your receipt.`,
          "We check the transfer and confirm your payment.",
          "We prepare your order and let you know when it's ready or on the way.",
        ].map((step, i) => (
          <li key={step} className="flex gap-4 rounded-2xl bg-card p-4 ring-1 ring-border">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lavender-soft font-display text-lavender-ink">{i + 1}</span>
            <span className="pt-1 text-[15.5px] leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <section aria-labelledby="pickup-title" className="rounded-2xl bg-card p-5 ring-1 ring-border">
          <h2 id="pickup-title" className="headline text-xl">
            Pickup
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line text-muted-foreground">
            {!s.pickupEnabled
              ? "Pickup isn't available at the moment."
              : s.pickupInfo || "We'll share pickup details with you when your order is ready."}
          </p>
        </section>
        <section aria-labelledby="delivery-title" className="rounded-2xl bg-card p-5 ring-1 ring-border">
          <h2 id="delivery-title" className="headline text-xl">
            Delivery
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line text-muted-foreground">
            {!s.deliveryEnabled
              ? "Delivery isn't available at the moment."
              : [s.deliveryInfo, s.deliveryFee !== null ? `Delivery fee: ${formatNaira(s.deliveryFee)}.` : "The delivery fee is confirmed with you by phone."]
                  .filter(Boolean)
                  .join("\n")}
          </p>
        </section>
      </div>

      <section aria-labelledby="faq-title" className="mt-12">
        <h2 id="faq-title" className="headline text-3xl">
          Questions
        </h2>
        <div className="mt-5 divide-y rounded-2xl bg-card ring-1 ring-border">
          {faqs.map((f) => (
            <details key={f.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {f.q}
                <span aria-hidden className="text-xl text-lavender-ink transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <SupportCard settings={s} className="mt-12" />
    </div>
  );
}
