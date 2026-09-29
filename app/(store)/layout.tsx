import { CartProvider } from "@/components/store/cart";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { getSettings } from "@/lib/server/repo/settings";

/** Storefront pages always render from the live database, so stock and price changes show immediately. */
export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <CartProvider>
      <Header phone={settings.phone} />
      <main id="main" className="paper min-h-[70dvh]">
        {children}
      </main>
      <Footer settings={settings} />
    </CartProvider>
  );
}
