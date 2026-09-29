import Link from "next/link";
import { navLinks } from "@/lib/nav";
import { socialLinks, type StoreSettings } from "@/lib/domain/settings";
import { formatPhone, telHref } from "@/lib/phone";
import { brand } from "@/lib/brand";
import { Logo } from "./logo";

export function Footer({ settings }: { settings: StoreSettings }) {
  const socials = socialLinks(settings);
  return (
    <footer className="mt-20 border-t bg-card/60">
      <div className="page grid gap-10 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-muted-foreground">{brand.shortDescription}</p>
          <a href={telHref(settings.phone)} className="mt-4 inline-flex min-h-11 items-center text-[15px] font-medium underline-offset-4 hover:underline">
            {formatPhone(settings.phone)}
          </a>
        </div>
        <nav aria-label="Footer">
          <h2 className="eyebrow">Shop</h2>
          <ul className="mt-3">
            {[...navLinks, { label: "How to order", href: "/help" }].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-10 items-center text-[15px] text-muted-foreground hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {socials.length > 0 && (
          <div>
            <h2 className="eyebrow">Follow</h2>
            <ul className="mt-3">
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center text-[15px] text-muted-foreground hover:text-foreground">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="page border-t py-5 pb-safe text-[13px] text-muted-foreground">
        © {new Date().getFullYear()} {settings.businessName}. Payment by bank transfer, checked by hand.
      </div>
    </footer>
  );
}
