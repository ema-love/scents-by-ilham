import { AlertCircle, Check } from "lucide-react";
import type { TimelineStep } from "@/lib/domain/orders";
import { cn } from "@/lib/utils";

/** ✓ done · ● current · ○ upcoming — with words, not just symbols. */
export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0" aria-current={s.state === "current" ? "step" : undefined}>
            {!last && (
              <span aria-hidden className={cn("absolute top-8 bottom-0 left-[15px] w-0.5 rounded-full", s.state === "done" ? "bg-success/50" : "bg-border-strong")} />
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-card",
                s.state === "done" && "bg-success text-white",
                s.state === "current" && "bg-lavender-ink text-white",
                s.state === "upcoming" && "bg-card ring-card outline-2 -outline-offset-2 outline-border-strong",
                s.state === "problem" && "bg-danger text-white",
              )}
            >
              {s.state === "done" && <Check className="size-4" strokeWidth={2.5} />}
              {s.state === "current" && <span className="size-2.5 rounded-full bg-white" />}
              {s.state === "problem" && <AlertCircle className="size-4" />}
            </span>
            <div className="min-w-0 pt-1">
              <p className={cn("text-[15.5px] font-medium", s.state === "upcoming" && "text-muted-foreground")}>
                {s.title}
                <span className="sr-only">
                  {" "}
                  — {s.state === "done" ? "done" : s.state === "current" ? "in progress" : s.state === "problem" ? "needs attention" : "not yet"}
                </span>
              </p>
              <p className={cn("text-[14.5px]", s.state === "problem" ? "text-danger" : "text-muted-foreground")}>{s.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
