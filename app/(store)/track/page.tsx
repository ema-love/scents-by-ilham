import type { Metadata } from "next";
import { TrackForm } from "@/components/order/track-form";
import { SupportCard } from "@/components/site/support";
import { normaliseOrderNumber } from "@/lib/domain/orders";
import { getSettings } from "@/lib/server/repo/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Track your Scents by Ilham order with your order number and phone number.",
  alternates: { canonical: "/track" },
};

export default async function TrackPage(props: PageProps<"/track">) {
  const { number } = await props.searchParams;
  const settings = await getSettings();
  const initial = typeof number === "string" ? (normaliseOrderNumber(number) ?? "") : "";

  return (
    <div className="page max-w-lg pt-8 sm:pt-12">
      <p className="eyebrow">Track Order</p>
      <h1 className="display mt-2 text-[clamp(2.2rem,8vw,3rem)]">Track your order</h1>
      <p className="lede mt-3">Enter your order number and the phone number you ordered with.</p>
      <div className="mt-8 rounded-3xl bg-card p-5 shadow-soft ring-1 ring-border sm:p-7">
        <TrackForm initialNumber={initial} />
      </div>
      <SupportCard settings={settings} title="Can't find your order number?" className="mt-8" />
    </div>
  );
}
