import type { Metadata } from "next";
import Link from "next/link";
import { ContactActions } from "@/components/site/support";
import { socialLinks } from "@/lib/domain/settings";
import { formatPhone } from "@/lib/phone";
import { getSettings } from "@/lib/server/repo/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact",
  description: "Call or WhatsApp Scents by Ilham for help choosing a scent or with your order.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSettings();
  const socials = socialLinks(settings);
  return (
    <div className="page max-w-2xl pt-8 sm:pt-12">
      <p className="eyebrow">Contact</p>
      <h1 className="display mt-2 text-[clamp(2.3rem,8vw,3.25rem)]">We&rsquo;d love to hear from you.</h1>
      <p className="lede mt-3">Questions about a scent, or help with an order — call or send us a message.</p>

      <section aria-labelledby="phone-title" className="mt-8 rounded-3xl bg-card p-6 shadow-soft ring-1 ring-border sm:p-8">
        <h2 id="phone-title" className="text-[14px] text-muted-foreground">
          Phone{settings.whatsappEnabled ? " & WhatsApp" : ""}
        </h2>
        <p className="mt-1 font-display text-[clamp(2rem,9vw,2.75rem)] leading-tight tracking-[-0.01em]">{formatPhone(settings.phone)}</p>
        <ContactActions settings={settings} message="Hello Scents by Ilham! " className="mt-5" />
      </section>

      {socials.length > 0 && (
        <section aria-labelledby="social-title" className="mt-6 rounded-3xl bg-card p-6 ring-1 ring-border sm:p-8">
          <h2 id="social-title" className="headline text-2xl">
            Follow us
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2.5">
            {socials.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center rounded-full bg-lavender-wash px-5 font-medium ring-1 ring-lavender/40 hover:bg-lavender-soft">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-[15px] text-muted-foreground">
        Already ordered?{" "}
        <Link href="/track" className="font-medium text-lavender-ink underline underline-offset-4">
          Track your order
        </Link>{" "}
        with your order number and phone number.
      </p>
    </div>
  );
}
