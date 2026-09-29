"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
        } catch {
          // Clipboard blocked: the number is still visible and selectable.
        }
      }}
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-card px-4 text-[14px] font-medium ring-1 ring-border-strong transition-colors hover:bg-muted",
        copied && "bg-success-soft text-success ring-success/30",
        className,
      )}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
