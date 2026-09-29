import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/logo";

export default function NotFound() {
  return (
    <main id="main" className="paper grid min-h-dvh place-items-center px-5 text-center">
      <div className="max-w-md">
        <Link href="/" aria-label="Scents by Ilham — home">
          <Logo />
        </Link>
        <h1 className="display mt-10 text-4xl">We couldn&rsquo;t find that page.</h1>
        <p className="lede mt-3">It may have moved, or the product is no longer in our collection.</p>
        <div className="mt-8 flex flex-col justify-center gap-2.5 min-[400px]:flex-row">
          <Button asChild size="lg">
            <Link href="/shop">Browse scents</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
