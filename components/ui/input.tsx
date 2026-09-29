import * as React from "react";
import { cn } from "@/lib/utils";

export const fieldClass =
  "w-full rounded-xl bg-card px-4 text-base text-foreground ring-1 ring-border-strong transition-shadow duration-200 outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring aria-invalid:ring-2 aria-invalid:ring-danger/70 disabled:opacity-50";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input" className={cn(fieldClass, "h-12", className)} {...props} />;
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(fieldClass, "min-h-24 py-3 leading-relaxed", className)} {...props} />;
}

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        fieldClass,
        "h-12 appearance-none bg-[url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1.5 6 6.5l5-5' fill='none' stroke='%2362596a' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>\")] bg-[length:12px_8px] bg-[position:right_1rem_center] bg-no-repeat pr-10",
        className,
      )}
      {...props}
    />
  );
}

export { Input, Textarea, Select };
