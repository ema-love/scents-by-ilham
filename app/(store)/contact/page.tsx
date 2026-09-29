import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import { InstagramIcon } from "@/components/site/icons";
import { Sprig } from "@/components/site/logo";
import { whatsappNumberOf } from "@/lib/domain/settings";
import { formatPhone, telHref, whatsappHref } from "@/lib/phone";
import { getSettings } from "@/lib/server/repo/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact",
  description: "Call, WhatsApp or follow Scents by Ilham on Instagram — for help choosing a scent or with your order.",
  alternates: { canonical: "/contact" },
};

const handleOf = (url: string) => url.match(/instagram\.com\/([^/?#]+)/i)?.[1];

export default async function ContactPage() {
  const s = await getSettings();
  const wa = whatsappNumberOf(s);
  const waHref = wa ? whatsappHref(wa, "Hello Scents by Ilham! ") : null;
  const ig = s.instagram ? handleOf(s.instagram) : undefined;

  const rows = [
    { icon: Phone, label: "Call", value: formatPhone(s.phone), href: telHref(s.phone), external: false },
    ...(waHref && wa ? [{ icon: MessageCircle, label: "WhatsApp", value: formatPhone(wa), href: waHref, external: true }] : []),
    ...(s.instagram ? [{ icon: InstagramIcon, label: "Instagram", value: ig ? `@${ig}` : "Instagram", href: s.instagram, external: true }] : []),
    ...(s.tiktok ? [{ icon: ArrowRight, label: "TikTok", value: "TikTok", href: s.tiktok, external: true }] : []),
    ...(s.facebook ? [{ icon: ArrowRight, label: "Facebook", value: "Facebook", href: s.facebook, external: true }] : []),
  ];

  return (
    <div className="page grid max-w-5xl gap-10 pt-8 sm:pt-12 md:grid-cols-[1.1fr_1fr] md:items-start">
      <div>
        <p className="eyebrow">Contact</p>
        <h1 className="display mt-2 text-[clamp(2.6rem,10vw,3.75rem)]">Let&rsquo;s connect</h1>
        <p className="lede mt-3">Questions about a scent, or help with an order — we&rsquo;d love to hear from you.</p>

        <ul className="mt-8 divide-y rounded-lg bg-card ring-1 ring-border">
          {rows.map((r) => (
            <li key={r.label}>
              <a
                href={r.href}
                {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex min-h-18 items-center gap-4 px-5 py-3 transition-colors hover:bg-lavender-wash"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lavender-soft text-lavender-ink">
                  <r.icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">{r.label}</span>
                  <span className="figure block truncate text-[17px]">{r.value}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-[15px] text-muted-foreground">
          Already ordered?{" "}
          <Link href="/track" className="font-medium text-lavender-ink underline underline-offset-4">
            Track your order
          </Link>{" "}
          with your order number and phone number.
        </p>
      </div>

      <div aria-hidden className="relative hidden aspect-[4/5] overflow-hidden rounded-lg bg-[linear-gradient(160deg,#ebe2f6,#b89ee0_70%,#6a4b98)] md:block">
        <Sprig className="absolute right-6 bottom-0 h-72 w-48 opacity-80" />
        <Sprig className="absolute right-32 -bottom-6 h-56 w-36 -rotate-12 opacity-50" />
        <Sprig className="absolute right-0 bottom-10 h-48 w-32 rotate-12 opacity-40" />
      </div>
    </div>
  );
}
