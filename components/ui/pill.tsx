import type { Tone } from "@/lib/domain/orders";
import { cn } from "@/lib/utils";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground ring-border-strong",
  attention: "bg-attention-soft text-attention ring-attention/20",
  progress: "bg-lavender-soft text-lavender-ink ring-lavender/40",
  success: "bg-success-soft text-success ring-success/20",
  danger: "bg-danger-soft text-danger ring-danger/20",
};

const dots: Record<Tone, string> = {
  neutral: "bg-muted-foreground/60",
  attention: "bg-attention",
  progress: "bg-lavender-ink",
  success: "bg-success",
  danger: "bg-danger",
};

/** A status label. Colour is never the only signal: the text always says the status. */
export function Pill({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] leading-none font-medium whitespace-nowrap ring-1", tones[tone], className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", dots[tone])} />
      {children}
    </span>
  );
}
