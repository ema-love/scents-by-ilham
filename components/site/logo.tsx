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

/** The Scents by Ilham wordmark: script "Scents" in the brand purple over a bold "BY ILHAM". */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex flex-col items-center leading-none", className)}>
      <span className="font-script text-[32px] leading-[0.8] text-lavender-ink">Scents</span>
      <span className="mt-0.5 text-[10.5px] font-bold tracking-[0.2em] text-foreground">BY ILHAM</span>
    </span>
  );
}
