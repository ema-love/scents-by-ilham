import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sprig } from "@/components/site/logo";
import { getSettings } from "@/lib/server/repo/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About",
  description: "Scents by Ilham: beautiful fragrance, thoughtful presentation, accessible pricing.",
  alternates: { canonical: "/about" },
};

const values = [
  { title: "Carefully curated", text: "A small collection, chosen with care — so every scent earns its place." },
  { title: "Honestly priced", text: "Beautiful doesn't have to mean expensive. Every price is shown up front." },
  { title: "Easy to trust", text: "Every transfer is checked by hand, and you can follow your order at every step." },
];

export default async function AboutPage() {
  const settings = await getSettings();
  return (
    <div className="page max-w-3xl pt-8 sm:pt-12">
      <p className="eyebrow flex items-center gap-2">
        <Sprig className="h-5 w-4" /> About
      </p>
      <h1 className="display mt-3 text-[clamp(2.3rem,8vw,3.5rem)]">Beautiful fragrance, within reach.</h1>
      <div className="lede mt-6 space-y-4 whitespace-pre-line">{settings.about}</div>

      <ul className="mt-12 grid gap-4 sm:grid-cols-3">
        {values.map((v) => (
          <li key={v.title} className="rounded-2xl bg-card p-5 ring-1 ring-border">
            <h2 className="headline text-xl">{v.title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{v.text}</p>
          </li>
        ))}
      </ul>

      <div className="mt-12 flex flex-col gap-2.5 min-[400px]:flex-row">
        <Button asChild size="lg">
          <Link href="/shop">Shop Scents</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/contact">Contact us</Link>
        </Button>
      </div>
    </div>
  );
}
