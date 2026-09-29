"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import type { Availability, Visibility } from "@/lib/domain/products";
import { cn } from "@/lib/utils";

type Patch = { availability?: Availability; visibility?: Visibility };

function useQuickPatch(productId: string) {
  const router = useRouter();
  return useMutation({
    mutationFn: async (quick: Patch) => {
      const res = await fetch(`/api/admin/products/${productId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quick }) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) window.location.assign("/admin/login");
      if (!res.ok) throw new Error(data.error ?? "Couldn't save. Check your connection and try again.");
    },
    onSuccess: () => router.refresh(),
  });
}

/** A labelled on/off switch. The words change with the state, so colour is never the only signal. */
function Switch({ on, onLabel, offLabel, label, onToggle, pending, tone }: { on: boolean; onLabel: string; offLabel: string; label: string; onToggle: () => void; pending: boolean; tone: "stock" | "visibility" }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      disabled={pending}
      className={cn(
        "inline-flex h-11 min-w-[9.5rem] items-center gap-2.5 rounded-full pr-4 pl-1.5 text-[14px] font-medium ring-1 transition-colors disabled:opacity-60",
        on
          ? tone === "stock"
            ? "bg-success-soft text-success ring-success/25"
            : "bg-lavender-soft text-lavender-ink ring-lavender/40"
          : tone === "stock"
            ? "bg-danger-soft text-danger ring-danger/20"
            : "bg-muted text-muted-foreground ring-border-strong",
      )}
    >
      <span className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", on ? (tone === "stock" ? "bg-success" : "bg-lavender-ink") : "bg-border-strong")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left] duration-200", on ? "left-[18px]" : "left-0.5")} />
      </span>
      {on ? onLabel : offLabel}
    </button>
  );
}

export function ProductToggles({ id, name, availability, visibility }: { id: string; name: string; availability: Availability; visibility: Visibility }) {
  const patch = useQuickPatch(id);
  // Show the new state straight away; the server confirms it (or we roll back on error).
  const [optimistic, setOptimistic] = useState<Patch>({});
  const a = optimistic.availability ?? availability;
  const v = optimistic.visibility ?? visibility;

  const send = (p: Patch) => {
    setOptimistic((o) => ({ ...o, ...p }));
    patch.mutate(p, { onError: () => setOptimistic({}), onSuccess: () => setOptimistic({}) });
  };

  if (visibility === "archived") return <p className="text-[14px] text-muted-foreground">Archived — not in the shop.</p>;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Switch
          tone="stock"
          on={a === "available"}
          onLabel="Available"
          offLabel="Out of stock"
          label={`${name}: available to order`}
          pending={patch.isPending}
          onToggle={() => send({ availability: a === "available" ? "out_of_stock" : "available" })}
        />
        <Switch
          tone="visibility"
          on={v === "visible"}
          onLabel="Visible"
          offLabel="Hidden"
          label={`${name}: visible in the shop`}
          pending={patch.isPending}
          onToggle={() => send({ visibility: v === "visible" ? "hidden" : "visible" })}
        />
      </div>
      {patch.isError && (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {patch.error.message}
        </p>
      )}
    </div>
  );
}
