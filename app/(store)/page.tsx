import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
  { title: "Choose", text: "Add the scents you love to your order. No account needed." },
  { title: "Transfer", text: "We show you exactly how much to send, and where." },
  { title: "Upload", text: "Send a screenshot of your transfer receipt." },
  { title: "Track", text: "Follow every step with your order number and phone." },
];

const instagramHandle = (url: string) => url.match(/instagram\.com\/([^/?#]+)/i)?.[1];

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
  const handle = settings.instagram ? instagramHandle(settings.instagram) : undefined;

  return (
    <>
      {/* Hero: plum, lavender light, the products themselves. Short enough that the shop starts on the first screen. */}
      <section aria-labelledby="hero-title" className="relative -mt-px overflow-hidden bg-plum text-primary-foreground">
        <div aria-hidden className="pointer-events-none absolute -top-32 right-[-10%] size-[560px] rounded-full bg-[radial-gradient(closest-side,rgb(184_158_224/0.38),transparent)]" />
        <div aria-hidden className="pointer-events-none absolute bottom-[-40%] left-[-20%] size-[520px] rounded-full bg-[radial-gradient(closest-side,rgb(106_75_152/0.45),transparent)]" />
        <div className="page relative grid items-center gap-9 pt-8 pb-12 sm:pt-12 md:grid-cols-[1.05fr_1fr] md:gap-12 md:pb-20 lg:pt-16">
          <div className="animate-rise">
            <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-lavender uppercase">
              <Sprig className="h-5 w-4" /> Scents by Ilham
            </p>
            <h1 id="hero-title" className="display mt-5 text-[clamp(3rem,13vw,5.5rem)]">
              Scents that feel like <span className="text-lavender italic">you.</span>
            </h1>
            <p className="mt-5 max-w-sm text-[16.5px] leading-relaxed text-primary-foreground/80">
              Beautiful fragrance, thoughtfully presented — at prices that make sense.
              {from !== null && (
                <>
                  {" "}
                  Everything from <span className="figure whitespace-nowrap text-primary-foreground">{formatNaira(from)}</span>.
                </>
              )}
            </p>
            <div className="mt-8 flex flex-col gap-2.5 min-[400px]:flex-row">
              <Button asChild size="lg" className="bg-primary-foreground text-plum hover:bg-lavender-soft">
                <Link href="/shop">
                  Shop Scents <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#collection">Explore the Collection</Link>
              </Button>
            </div>
          </div>

          {heroProducts.length > 0 && (
            <div className="grid grid-cols-3 items-end gap-2.5 animate-rise [animation-delay:120ms] sm:gap-3" aria-hidden>
              {heroProducts.map((p, i) => (
                <Link key={p.id} href={`/products/${p.slug}`} tabIndex={-1} className={i === 1 ? "-translate-y-6" : ""}>
                  <ProductVisual product={p} priority sizes="(min-width: 768px) 16vw, 30vw" className="shadow-[0_24px_40px_-20px_rgb(0_0_0/0.6)] ring-1 ring-white/10" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Collections, price first */}
      {categories.length > 1 && (
        <section aria-label="Collections" className="page pt-8">
          <ul className="no-scrollbar -mx-[var(--page-gutter)] flex snap-x gap-3 overflow-x-auto px-[var(--page-gutter)] pb-1">
            {categories.map((c) => (
              <li key={c.name} className="snap-start">
                <Link
                  href={`/shop?category=${encodeURIComponent(c.name)}`}
                  className="flex min-h-16 min-w-[220px] flex-col justify-center rounded-md bg-card px-5 py-3 ring-1 ring-border transition-colors hover:bg-lavender-wash"
                >
                  <span className="font-display text-xl font-medium">{c.name}</span>
                  <span className="text-[13.5px] text-muted-foreground">
                    {c.count} {c.count === 1 ? "scent" : "scents"} · from <span className="figure">{formatNaira(c.from)}</span>
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
            <h2 id="collection-title" className="display mt-2 text-[clamp(2.1rem,7vw,3rem)]">
              Our scents
            </h2>
          </div>
          <Link href="/shop" className="nav-link inline-flex min-h-11 shrink-0 items-center gap-1.5 text-lavender-ink hover:text-plum">
            See all <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        {products.length ? (
          <ProductGrid products={products} className="mt-7" />
        ) : (
          <p className="mt-8 rounded-md bg-card p-6 text-center text-muted-foreground ring-1 ring-border">New scents are on the way. Check back soon.</p>
        )}
        {products.length > 0 && !products.some(isOrderable) && (
          <p className="mt-6 text-center text-[15px] text-muted-foreground">Everything is sold out right now — restocks are on the way.</p>
        )}
      </section>

      {/* Brand banner */}
      <section aria-label="Our promise" className="page pt-16">
        <div className="relative overflow-hidden rounded-lg bg-[linear-gradient(120deg,var(--plum-soft),#7b5fa8)] px-6 py-10 text-primary-foreground sm:px-10 sm:py-14">
          <Sprig className="absolute -right-2 -bottom-3 h-40 w-28 opacity-40" />
          <Sprig className="absolute right-16 -bottom-8 hidden h-32 w-24 rotate-12 opacity-25 sm:block" />
          <p className="headline max-w-md text-[clamp(1.9rem,6vw,2.6rem)]">Carefully curated. Beautifully presented. Honestly priced.</p>
          <Link href="/about" className="nav-link mt-6 inline-flex min-h-11 items-center gap-1.5 text-lavender-soft hover:text-white">
            About us <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>

      {/* How ordering works */}
      <section aria-labelledby="how-title" className="page pt-16">
        <p className="eyebrow">Ordering is simple</p>
        <h2 id="how-title" className="display mt-2 text-[clamp(2.1rem,7vw,3rem)]">
          How to order
        </h2>
        <p className="mt-2 max-w-md text-muted-foreground">From your phone, in four steps. Every transfer is checked by hand before your order is confirmed.</p>
        <ol className="mt-7 grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex min-h-44 flex-col justify-end rounded-md bg-plum p-4 text-primary-foreground sm:p-5">
              <span className="font-display text-[2.6rem] leading-none font-medium text-lavender" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="mt-3 text-[12.5px] font-semibold tracking-[0.16em] uppercase">
                <span className="sr-only">Step {i + 1}: </span>
                {s.title}
              </p>
              <p className="mt-1 text-[14px] leading-snug text-primary-foreground/75">{s.text}</p>
            </li>
          ))}
        </ol>
        <Link href="/help" className="nav-link mt-5 inline-flex min-h-11 items-center gap-1.5 text-lavender-ink hover:text-plum">
          Ordering, pickup &amp; delivery <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>

      {/* Social: shown only when real accounts are linked in settings. */}
      {socials.length > 0 && (
        <section aria-labelledby="social-title" className="page pt-16">
          <div className="rounded-lg bg-card p-6 ring-1 ring-border sm:p-10">
            <p className="eyebrow">Follow along</p>
            <h2 id="social-title" className="headline mt-2 max-w-lg text-[clamp(1.8rem,5.5vw,2.4rem)]">
              New scents, fragrance moments and behind the scenes.
            </h2>
            <ul className="mt-6 flex flex-wrap gap-2.5">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-12 items-center rounded-[4px] bg-plum px-5 text-[12.5px] font-medium tracking-[0.1em] text-primary-foreground uppercase transition-colors hover:bg-plum-soft"
                  >
                    {s.label === "Instagram" && handle ? `@${handle} on Instagram` : s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="page pt-16">
        <SupportCard settings={settings} title="Questions before you order?" />
      </div>
    </>
  );
}
