import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <div className="page grid min-h-[60dvh] place-items-center text-center">
      <div className="max-w-md">
        <h1 className="display text-4xl">This scent isn&rsquo;t in the shop.</h1>
        <p className="lede mt-3">It may no longer be part of our collection. Have a look at what&rsquo;s available now.</p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/shop">Browse scents</Link>
        </Button>
      </div>
    </div>
  );
}
