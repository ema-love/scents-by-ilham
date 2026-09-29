import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  info: { box: "bg-lavender-wash ring-lavender/40 text-foreground", icon: Info, iconClass: "text-lavender-ink" },
  success: { box: "bg-success-soft ring-success/20 text-foreground", icon: CheckCircle2, iconClass: "text-success" },
  warning: { box: "bg-attention-soft ring-attention/20 text-foreground", icon: AlertCircle, iconClass: "text-attention" },
  error: { box: "bg-danger-soft ring-danger/20 text-foreground", icon: AlertCircle, iconClass: "text-danger" },
};

export function Notice({
  kind = "info",
  title,
  children,
  className,
  role,
}: {
  kind?: keyof typeof styles;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  const s = styles[kind];
  const Icon = s.icon;
  return (
    <div role={role} className={cn("flex gap-3 rounded-2xl p-4 text-[15px] leading-relaxed ring-1", s.box, className)}>
      <Icon className={cn("mt-0.5 size-5 shrink-0", s.iconClass)} aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && "mt-0.5 text-muted-foreground")}>{children}</div>}
      </div>
    </div>
  );
}
