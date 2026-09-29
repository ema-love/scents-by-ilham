import type { Metadata } from "next";
import { CheckoutForm, type CheckoutProduct } from "@/components/order/checkout-form";
import { isOrderable } from "@/lib/domain/products";
import { publicProducts } from "@/lib/server/repo/products";
import { getSettings } from "@/lib/server/repo/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your order", robots: { index: false } };

export default async function CheckoutPage() {
  const [products, settings] = await Promise.all([publicProducts(), getSettings()]);
  // Live names, prices and stock for whatever is in the customer's saved order.
  const catalog: CheckoutProduct[] = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    orderable: isOrderable(p),
    image: p.images[0] ?? null,
  }));

  return (
    <div className="page max-w-2xl pt-8 sm:pt-12">
      <CheckoutForm
        catalog={catalog}
        fulfilment={{
          pickupEnabled: settings.pickupEnabled,
          deliveryEnabled: settings.deliveryEnabled,
          deliveryFee: settings.deliveryFee,
          pickupInfo: settings.pickupInfo,
          deliveryInfo: settings.deliveryInfo,
        }}
        bankName={settings.bankName}
      />
    </div>
  );
}
