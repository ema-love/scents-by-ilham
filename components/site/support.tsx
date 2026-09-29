import { MessageCircle, Phone } from "lucide-react";
import { formatPhone, telHref, whatsappHref } from "@/lib/phone";
import { whatsappNumberOf, type StoreSettings } from "@/lib/domain/settings";
import { cn } from "@/lib/utils";

/** Call and WhatsApp actions. Big targets, real links: tapping calls or opens WhatsApp. */
export function ContactActions({ settings, message, className }: { settings: StoreSettings; message?: string; className?: string }) {
  const wa = whatsappNumberOf(settings);
  const waHref = wa ? whatsappHref(wa, message) : null;
  return (
    <div className={cn("flex flex-col gap-2.5 min-[400px]:flex-row", className)}>
      <a
        href={telHref(settings.phone)}
        className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-plum"
      >
        <Phone className="size-4" aria-hidden />
        Call {formatPhone(settings.phone)}
      </a>
      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-card px-5 text-[15px] font-medium ring-1 ring-border-strong transition-colors hover:bg-muted"
        >
          <MessageCircle className="size-4" aria-hidden />
          WhatsApp us
        </a>
      )}
    </div>
  );
}

export function SupportCard({ settings, title = "Need help with your order?", message, className }: { settings: StoreSettings; title?: string; message?: string; className?: string }) {
  return (
    <section aria-label="Customer support" className={cn("rounded-2xl bg-lavender-wash p-5 ring-1 ring-lavender/35 sm:p-6", className)}>
      <h2 className="headline text-xl">{title}</h2>
      <p className="mt-1.5 text-[15px] text-muted-foreground">
        Call or message us on <span className="font-medium whitespace-nowrap text-foreground">{formatPhone(settings.phone)}</span>.
      </p>
      <ContactActions settings={settings} message={message} className="mt-4" />
    </section>
  );
}
