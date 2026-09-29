"use client";

import { Minus, Plus } from "lucide-react";
import { MAX_ITEM_QUANTITY } from "@/lib/domain/orders";
import { cn } from "@/lib/utils";

/** A thumb-sized − 1 + stepper. */
export function Quantity({
  value,
  onChange,
  label,
  min = 1,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  min?: number;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex h-11 items-center rounded-full bg-card ring-1 ring-border-strong", className)}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className="grid size-11 place-items-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-35"
      >
        <Minus className="size-4" />
      </button>
      <output aria-live="polite" className="w-8 text-center text-[15px] font-medium tabular-nums">
        {value}
      </output>
      <button
        type="button"
        onClick={() => onChange(Math.min(MAX_ITEM_QUANTITY, value + 1))}
        disabled={value >= MAX_ITEM_QUANTITY}
        aria-label="Increase quantity"
        className="grid size-11 place-items-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-35"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
