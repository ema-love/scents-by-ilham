import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Thumb-sized by default: the smallest tappable size is 44px. */
const buttonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[4px] font-medium tracking-[0.1em] uppercase select-none transition-[transform,background-color,box-shadow,color,opacity] duration-300 ease-calm active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-[1.1em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-[0_8px_20px_-12px_rgb(var(--shadow-color)/0.6)] hover:bg-plum-soft",
        lavender: "bg-lavender-soft text-lavender-ink ring-1 ring-lavender/40 hover:bg-lavender/35",
        secondary: "bg-card text-foreground ring-1 ring-border-strong hover:bg-muted",
        ghost: "tracking-[0.04em] normal-case text-muted-foreground hover:bg-muted hover:text-foreground",
        outline: "text-current ring-1 ring-current/60 hover:bg-white/10",
        danger: "bg-danger text-white hover:bg-danger/90",
        "danger-soft": "bg-danger-soft text-danger ring-1 ring-danger/20 hover:bg-danger/15",
        success: "bg-success text-white hover:bg-success/90",
        link: "rounded-md px-0 normal-case tracking-normal text-lavender-ink underline underline-offset-4 hover:text-plum",
      },
      size: {
        sm: "h-9 px-3.5 text-[11.5px]",
        md: "h-11 px-5 text-[12.5px]",
        lg: "h-13 px-6 text-[13px]",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
