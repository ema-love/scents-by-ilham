import Link from "next/link";
import { ArrowRight, Camera, ClipboardCheck, Landmark, PackageCheck, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/store/product-card";
import { ProductVisual } from "@/components/store/product-visual";
import { SupportCard } from "@/components/site/support";
import { Sprig } from "@/components/site/logo";
import { categoriesOf, isOrderable } from "@/lib/domain/products";
import { socialLinks } from "@/lib/domain/settings";
import { formatNaira } from "@/lib/money";
import { publicProducts } from "@/lib/server/repo/products";
import { getSettings } from "@/lib/server/repo/settings";

export const dynamic = "force-dynamic";

const steps = [
  { icon: ShoppingBag, title: "Choose your scents", text: "Add what you love to your order. No account needed." },
  { icon: Landmark, title: "Transfer the amount", text: "We show you exactly how much to send, and where." },
  { icon: Camera, title: "Upload your receipt", text: "A screenshot from your banking app is perfect." },
  { icon: PackageCheck, title: "Track your order", text: "Use your order number and phone to follow each step." },
];

export default async function HomePage() {
  const [products, settings] = await Promise.all([publicProducts(), getSettings()]);
  const featured = products.filter((p) => p.featured).slice(0, 3);
  const heroProducts = (featured.length ? featured : products).slice(0, 3);
  const prices = products.map((p) => p.price);
  const from = prices.length ? Math.min(...prices) : null;
  const categories = categoriesOf(products).map((name) => {
    const inCat = products.filter((p) => p.category === name);
    return { name, count: inCat.length, from: Math.min(...inCat.map((p) => p.price)) };
  });
  const socials = socialLinks(settings);

  return (
    <>
      {/* Hero: short enough that the products start on the first screen. */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-32 size-[520px] rounded-full bg-[radial-gradient(closest-side,var(--lavender-soft),transparent)] opacity-90"
        />
        <div className="page relative grid items-center gap-8 pt-8 pb-10 sm:pt-12 md:grid-cols-[1.1fr_1fr] md:gap-12 md:pb-16 lg:pt-16">
          <div className="animate-rise">
            <p className="eyebrow flex items-center gap-2">
              <Sprig className="h-5 w-4" /> Scents by Ilham
            </p>
            <h1 id="hero-title" className="display mt-4 text-[clamp(2.6rem,10vw,4.75rem)]">
              Scents that feel like <em className="text-lavender-ink">you.</em>
            </h1>
            <p className="lede mt-4 max-w-md">
              Beautiful fragrance, thoughtfully presented — at prices that make sense.
              {from !== null && (
                <>
                  {" "}
                  Everything from <span className="font-medium whitespace-nowrap text-foreground">{formatNaira(from)}</span>.
                </>
              )}
            </p>
            <div className="mt-7 flex flex-col gap-2.5 min-[400px]:flex-row">
              <Button asChild size="lg">
                <Link href="/shop">
                  Shop Scents <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="#collection">Explore the Collection</Link>
              </Button>
            </div>
          </div>

          {heroProducts.length > 0 && (
            <div className="grid grid-cols-3 items-end gap-2.5 animate-rise [animation-delay:120ms] sm:gap-3" aria-hidden>
              {heroProducts.map((p, i) => (
                <Link key={p.id} href={`/products/${p.slug}`} tabIndex={-1} className={i === 1 ? "-translate-y-5" : ""}>
                  <ProductVisual product={p} priority sizes="(min-width: 768px) 16vw, 30vw" className="shadow-soft ring-1 ring-border" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Collections, price first */}
      {categories.length > 1 && (
        <section aria-label="Collections" className="page">
          <ul className="no-scrollbar -mx-[var(--page-gutter)] flex snap-x gap-3 overflow-x-auto px-[var(--page-gutter)] pb-1">
            {categories.map((c) => (
              <li key={c.name} className="snap-start">
                <Link
                  href={`/shop?category=${encodeURIComponent(c.name)}`}
                  className="flex min-h-16 min-w-[210px] flex-col justify-center rounded-2xl bg-card px-5 py-3 ring-1 ring-border transition-colors hover:bg-lavender-wash"
                >
                  <span className="font-display text-lg">{c.name}</span>
                  <span className="text-[13.5px] text-muted-foreground">
                    {c.count} {c.count === 1 ? "scent" : "scents"} · from {formatNaira(c.from)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The collection */}
      <section id="collection" aria-labelledby="collection-title" className="page pt-12 md:pt-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">The collection</p>
            <h2 id="collection-title" className="headline mt-2 text-[clamp(1.9rem,6vw,2.75rem)]">
              Chosen with care.
            </h2>
          </div>
          <Link href="/shop" className="inline-flex min-h-11 shrink-0 items-center gap-1 text-[15px] font-medium text-lavender-ink hover:text-plum">
            See all <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        {products.length ? (
          <ProductGrid products={products} className="mt-7" />
        ) : (
          <p className="mt-8 rounded-2xl bg-card p-6 text-center text-muted-foreground ring-1 ring-border">New scents are on the way. Check back soon.</p>
        )}
        {products.length > 0 && !products.some(isOrderable) && (
          <p className="mt-6 text-center text-[15px] text-muted-foreground">Everything is sold out right now — restocks are on the way.</p>
        )}
      </section>

      {/* How ordering works */}
      <section aria-labelledby="how-title" className="page pt-20">
        <div className="rounded-3xl bg-card p-6 ring-1 ring-border sm:p-10">
          <p className="eyebrow">Ordering is simple</p>
          <h2 id="how-title" className="headline mt-2 text-[clamp(1.75rem,5vw,2.5rem)]">
            From your phone, in four steps.
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4 lg:flex-col">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lavender-soft text-lavender-ink">
                  <s.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-medium">
                    <span className="sr-only">Step {i + 1}: </span>
                    {s.title}
                  </p>
                  <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8 flex items-start gap-2 text-[14.5px] text-muted-foreground">
            <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-lavender-ink" aria-hidden />
            Every transfer is checked by hand before your order is confirmed.{" "}
            <Link href="/help" className="font-medium text-lavender-ink underline underline-offset-4">
              How ordering works
            </Link>
          </p>
        </div>
      </section>

      {/* Social: shown only when real accounts are linked in settings. */}
      {socials.length > 0 && (
        <section aria-labelledby="social-title" className="page pt-20">
          <div className="grid gap-6 rounded-3xl bg-plum p-6 text-primary-foreground sm:p-10 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-lavender uppercase">Follow along</p>
              <h2 id="social-title" className="headline mt-2 text-[clamp(1.75rem,5vw,2.5rem)]">
                New scents, fragrance tips and behind the scenes.
              </h2>
            </div>
            <ul className="flex flex-wrap gap-2.5">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-12 items-center rounded-full bg-white/10 px-5 text-[15px] font-medium ring-1 ring-white/20 transition-colors hover:bg-white/20"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="page pt-20">
        <SupportCard settings={settings} title="Questions before you order?" />
      </div>
    </>
  );
}
