"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-5 text-center">
      <div className="max-w-md">
        <h1 className="display text-4xl">Something didn&rsquo;t load.</h1>
        <p className="lede mt-3">This is usually a weak connection. Check your network and try again.</p>
        <div className="mt-8 flex flex-col justify-center gap-2.5 min-[400px]:flex-row">
          <Button size="lg" onClick={() => reset()}>
            Try again
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/">Home</Link>
          </Button>
        </div>
        {error.digest && <p className="mt-8 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>}
      </div>
    </main>
  );
}
