import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ProductVisual } from "@/components/store/product-visual";
import { ProductGrid } from "@/components/store/product-card";
import { Availability } from "@/components/store/availability";
import { AddToOrder, MobileOrderBar } from "@/components/store/add-to-order";
import { SupportCard } from "@/components/site/support";
import { isOrderable, mediaUrl, relatedProducts, type Product } from "@/lib/domain/products";
import { formatNaira } from "@/lib/money";
import { absoluteUrl, brand } from "@/lib/brand";
import { getPublicProductBySlug, publicProducts } from "@/lib/server/repo/products";
import { getSettings } from "@/lib/server/repo/settings";

export const dynamic = "force-dynamic";

const describe = (p: Product) => p.shortDescription || `${p.name} from Scents by Ilham — ${formatNaira(p.price)}. Order by bank transfer and track your order online.`;

export async function generateMetadata(props: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await getPublicProductBySlug(slug);
  if (!p) return { title: "Product not found" };
  const image = p.images[0] ? absoluteUrl(mediaUrl(p.images[0].key)) : undefined;
  return {
    title: `${p.name} — ${formatNaira(p.price)}`,
    description: describe(p),
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title: `${p.name} · ${brand.name}`, description: describe(p), url: `/products/${p.slug}`, ...(image ? { images: [image] } : {}) },
  };
}

/** Structured data states only what's true: name, price, availability. */
function jsonLd(p: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: describe(p),
    category: p.category,
    brand: { "@type": "Brand", name: brand.name },
    url: absoluteUrl(`/products/${p.slug}`),
    ...(p.images[0] ? { image: absoluteUrl(mediaUrl(p.images[0].key)) } : {}),
    offers: {
      "@type": "Offer",
      price: String(p.price),
      priceCurrency: "NGN",
      availability: isOrderable(p) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: absoluteUrl(`/products/${p.slug}`),
    },
  };
}

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const [p, all, settings] = await Promise.all([getPublicProductBySlug(slug), publicProducts(), getSettings()]);
  if (!p) notFound();

  const orderable = isOrderable(p);
  const related = relatedProducts(p, all);
  const extraImages = p.images.slice(1);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(p)).replace(/</g, "\\u003c") }} />

      <div className="page pt-3 sm:pt-6">
        <nav aria-label="Breadcrumb">
          <Link href="/shop" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-[15px] text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" aria-hidden /> All scents
          </Link>
        </nav>

        <div className="mt-2 grid gap-6 lg:mt-4 lg:grid-cols-2 lg:gap-14">
          {/* 1. Image */}
          <div className="animate-fade">
            <ProductVisual product={p} priority sizes="(min-width: 1024px) 45vw, 100vw" className="ring-1 ring-border" />
            {extraImages.length > 0 && (
              <ul className="no-scrollbar mt-3 flex snap-x gap-3 overflow-x-auto" aria-label="More photos">
                {extraImages.map((img) => (
                  <li key={img.key} className="relative aspect-[4/5] w-[42%] shrink-0 snap-start overflow-hidden rounded-2xl ring-1 ring-border sm:w-[30%]">
                    <Image src={mediaUrl(img.key)} alt={img.alt || p.name} fill sizes="(min-width: 1024px) 15vw, 42vw" quality={70} className="object-cover" />
                  </li>
                ))}
              </ul>
            )}
            {p.images.length === 0 && <p className="mt-2 text-center text-[13px] text-muted-foreground">Photo coming soon</p>}
          </div>

          <div className="animate-rise lg:pt-4">
            {/* 2–4. Name, price, availability */}
            <p className="eyebrow">{p.category}</p>
            <h1 className="display mt-2 text-[clamp(2.1rem,7vw,3.25rem)]">{p.name}</h1>
            <p className="mt-3 font-display text-[2rem] leading-none tracking-[-0.01em]">{formatNaira(p.price)}</p>
            <Availability product={p} className="mt-3 text-[14.5px]" />

            {/* 5. Short description */}
            {p.shortDescription && <p className="lede mt-5">{p.shortDescription}</p>}

            {/* 6. Order action */}
            <div className="mt-6">
              <AddToOrder productId={p.id} name={p.name} price={p.price} orderable={orderable} />
            </div>

            {/* 7. More information */}
            {p.description && (
              <section aria-labelledby="about-product" className="mt-10 border-t pt-6">
                <h2 id="about-product" className="headline text-2xl">
                  About this scent
                </h2>
                <div className="mt-3 space-y-3 text-[16px] leading-relaxed whitespace-pre-line text-muted-foreground">{p.description}</div>
              </section>
            )}

            <section aria-labelledby="how-to-pay" className="mt-8 rounded-2xl bg-card p-5 ring-1 ring-border">
              <h2 id="how-to-pay" className="font-medium">
                How payment works
              </h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
                Pay by bank transfer to {settings.bankName}, then upload your receipt. We check every transfer ourselves and update your order — track it any time with your order number and phone.{" "}
                <Link href="/help" className="font-medium text-lavender-ink underline underline-offset-4">
                  Learn more
                </Link>
              </p>
            </section>
          </div>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="related-title" className="mt-16 border-t pt-10">
            <h2 id="related-title" className="headline text-[clamp(1.6rem,5vw,2.25rem)]">
              You may also like
            </h2>
            <ProductGrid products={related} className="mt-6" priorityCount={0} />
          </section>
        )}

        <SupportCard settings={settings} title="Questions about this scent?" message={`Hello! I have a question about ${p.name}.`} className="mt-16" />
      </div>

      <MobileOrderBar productId={p.id} name={p.name} price={p.price} orderable={orderable} />
      <div className="h-24 lg:hidden" aria-hidden />
    </>
  );
}
