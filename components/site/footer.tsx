import Link from "next/link";
import { navLinks } from "@/lib/nav";
import { socialLinks, type StoreSettings } from "@/lib/domain/settings";
import { formatPhone, telHref } from "@/lib/phone";
import { brand } from "@/lib/brand";
import { Logo } from "./logo";

export function Footer({ settings }: { settings: StoreSettings }) {
  const socials = socialLinks(settings);
  return (
    <footer className="mt-20 bg-plum text-primary-foreground">
      <div className="page grid gap-10 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-primary-foreground/70">{brand.shortDescription}</p>
          <a href={telHref(settings.phone)} className="figure mt-4 inline-flex min-h-11 items-center text-[16px] underline-offset-4 hover:underline">
            {formatPhone(settings.phone)}
          </a>
        </div>
        <nav aria-label="Footer">
          <h2 className="eyebrow !text-lavender">Shop</h2>
          <ul className="mt-3">
            {[...navLinks, { label: "How to order", href: "/help" }].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-10 items-center text-[15px] text-primary-foreground/70 hover:text-primary-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {socials.length > 0 && (
          <div>
            <h2 className="eyebrow !text-lavender">Follow</h2>
            <ul className="mt-3">
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center text-[15px] text-primary-foreground/70 hover:text-primary-foreground">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="page border-t border-white/10 py-5 pb-safe text-[13px] text-primary-foreground/55">
        © {new Date().getFullYear()} {settings.businessName}. Payment by bank transfer, checked by hand.
      </div>
    </footer>
  );
}
