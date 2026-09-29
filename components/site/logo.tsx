import { cn } from "@/lib/utils";

/** A single lavender sprig: the brand mark. */
export function Sprig({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 32" aria-hidden className={cn("h-7 w-5", className)}>
      <path d="M12 31V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity=".55" />
      {[
        [12, 5, 0],
        [9.2, 9.5, -28],
        [14.8, 9.5, 28],
        [9, 14.5, -30],
        [15, 14.5, 30],
        [9.4, 19.5, -32],
        [14.6, 19.5, 32],
      ].map(([cx, cy, r], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx="2.4" ry="3.6" transform={`rotate(${r} ${cx} ${cy})`} fill="var(--lavender)" />
      ))}
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-foreground", className)}>
      <Sprig className="text-lavender-ink" />
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className="font-display text-[22px] tracking-[-0.02em]">Scents</span>
        <span className="font-display text-[15px] text-muted-foreground italic">by Ilham</span>
      </span>
    </span>
  );
}
