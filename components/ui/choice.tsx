"use client";

import { cn } from "@/lib/utils";

/**
 * Large, tappable radio cards (e.g. Pickup / Delivery, Available / Out of stock).
 * A real radio group underneath, so keyboards and screen readers work as expected.
 */
export function Choice<T extends string>({
  name,
  value,
  onChange,
  options,
  legend,
  className,
  columns = 2,
}: {
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode; description?: React.ReactNode; disabled?: boolean }[];
  legend: string;
  className?: string;
  columns?: 2 | 3;
}) {
  return (
    <fieldset className={className}>
      <legend className="sr-only">{legend}</legend>
      <div className={cn("grid gap-2.5", columns === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "relative flex min-h-12 cursor-pointer flex-col justify-center rounded-xl bg-card px-4 py-3 ring-1 ring-border-strong transition-all duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
              value === o.value && "bg-lavender-wash ring-2 ring-lavender-ink",
              o.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              disabled={o.disabled}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span className="text-[15px] font-medium">{o.label}</span>
            {o.description && <span className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{o.description}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
