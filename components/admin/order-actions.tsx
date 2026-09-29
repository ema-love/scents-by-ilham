"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { checkTransition, orderStatusLabel, statusOptions, type Order, type OrderStatus } from "@/lib/domain/orders";
import { formatNaira } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

type Action =
  | { action: "confirm_payment" }
  | { action: "reject_payment"; reason: string }
  | { action: "set_status"; status: OrderStatus; confirmed: boolean }
  | { action: "customer_update"; message: string };

function useOrderAction(orderId: string) {
  const router = useRouter();
  return useMutation({
    mutationFn: async (body: Action) => {
      const res = await fetch(`/api/admin/orders/${orderId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) window.location.assign("/admin/login");
      if (!res.ok) throw new Error(data.error ?? "Couldn't save. Check your connection and try again.");
    },
    onSuccess: () => router.refresh(),
  });
}

type OrderView = Pick<Order, "id" | "number" | "status" | "payment" | "fulfilment" | "total" | "customer"> & { customerUpdate?: string };

// ------------------------------------------------------------------
// Payment
// ------------------------------------------------------------------

export function PaymentActions({ order, businessPhone }: { order: OrderView; businessPhone: string }) {
  const act = useOrderAction(order.id);
  const [dialog, setDialog] = useState<"confirm" | "reject" | null>(null);
  const [reason, setReason] = useState(`We could not confirm this transfer. Please contact us using ${formatPhone(businessPhone)}.`);
  const { payment } = order;

  if (order.status === "cancelled" || payment.status === "confirmed") return null;
  const hasReceipt = !!payment.receipt;

  return (
    <>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button size="lg" variant="success" className="flex-1" onClick={() => setDialog("confirm")}>
          <CheckCircle2 /> Confirm Payment
        </Button>
        {hasReceipt && payment.status !== "rejected" && (
          <Button size="lg" variant="danger-soft" className="flex-1" onClick={() => setDialog("reject")}>
            <XCircle /> Reject Payment
          </Button>
        )}
      </div>
      {act.isError && (
        <Notice kind="error" role="alert" className="mt-3">
          {act.error.message}
        </Notice>
      )}

      <Dialog open={dialog === "confirm"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogTitle>Confirm {formatNaira(order.total)} received?</DialogTitle>
          <DialogDescription>
            Only confirm after checking your {payment.payTo.bankName} account and seeing the money from {order.customer.name}. The customer will see
            &ldquo;Payment confirmed&rdquo;.
          </DialogDescription>
          {!hasReceipt && (
            <Notice kind="warning" className="mt-4">
              The customer hasn&rsquo;t uploaded a receipt. Confirm only if you&rsquo;ve seen the transfer yourself.
            </Notice>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Not yet
            </Button>
            <Button variant="success" disabled={act.isPending} onClick={() => act.mutate({ action: "confirm_payment" }, { onSuccess: () => setDialog(null) })}>
              {act.isPending ? <LoaderCircle className="animate-spin" aria-label="Saving" /> : "Yes, the money arrived"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "reject"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogTitle>Reject this payment?</DialogTitle>
          <DialogDescription>The customer will see this message on their tracking page and can upload a new receipt. Keep it kind and neutral.</DialogDescription>
          <label htmlFor="reject-reason" className="mt-4 block text-[14px] font-medium">
            Message to the customer
          </label>
          <Textarea id="reject-reason" className="mt-2" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={400} />
          {act.isError && (
            <Notice kind="error" role="alert" className="mt-3">
              {act.error.message}
            </Notice>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={act.isPending || reason.trim().length < 5}
              onClick={() => act.mutate({ action: "reject_payment", reason }, { onSuccess: () => setDialog(null) })}
            >
              {act.isPending ? <LoaderCircle className="animate-spin" aria-label="Saving" /> : "Reject payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ------------------------------------------------------------------
// Order status
// ------------------------------------------------------------------

const nextLabel: Partial<Record<OrderStatus, string>> = {
  processing: "Start preparing",
  ready_for_pickup: "Mark ready for pickup",
  out_for_delivery: "Mark out for delivery",
  delivered: "Mark delivered",
  completed: "Mark completed",
};

export function StatusActions({ order }: { order: OrderView }) {
  const act = useOrderAction(order.id);
  const { next, allowed } = statusOptions(order);
  const [pending, setPending] = useState<{ status: OrderStatus; warning?: string } | null>(null);
  const [other, setOther] = useState<OrderStatus | "">("");

  const request = (status: OrderStatus) => {
    const check = checkTransition(order, status);
    if (!check.ok) return;
    if (check.needsConfirmation) setPending({ status, warning: check.warning });
    else act.mutate({ action: "set_status", status, confirmed: false });
  };

  if (order.status === "completed" || order.status === "cancelled") {
    return <p className="text-[15px] text-muted-foreground">This order is closed.</p>;
  }
  if (order.payment.status !== "confirmed") {
    return (
      <div className="space-y-3">
        <p className="text-[15px] text-muted-foreground">Confirm the payment first — then you can start preparing the order.</p>
        <Button variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => request("cancelled")}>
          Cancel order
        </Button>
        <ConfirmStatus pending={pending} setPending={setPending} act={act} />
      </div>
    );
  }

  const others = allowed.filter((s) => s !== next);

  return (
    <div className="space-y-4">
      {next && (
        <Button size="lg" className="w-full sm:w-auto" disabled={act.isPending} onClick={() => request(next)}>
          {act.isPending ? <LoaderCircle className="animate-spin" aria-label="Saving" /> : (nextLabel[next] ?? orderStatusLabel[next])}
        </Button>
      )}
      {others.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="other-status" className="text-[14px] text-muted-foreground sm:shrink-0">
            Or change to
          </label>
          <select
            id="other-status"
            value={other}
            onChange={(e) => setOther(e.target.value as OrderStatus)}
            className="h-12 w-full rounded-xl bg-card px-4 ring-1 ring-border-strong outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-xs"
          >
            <option value="">Choose a status…</option>
            {others.map((s) => (
              <option key={s} value={s}>
                {orderStatusLabel[s]}
              </option>
            ))}
          </select>
          <Button variant="secondary" disabled={!other || act.isPending} onClick={() => other && request(other)}>
            Update Order Status
          </Button>
        </div>
      )}
      {act.isError && (
        <Notice kind="error" role="alert">
          {act.error.message}
        </Notice>
      )}
      <ConfirmStatus pending={pending} setPending={setPending} act={act} />
    </div>
  );
}

function ConfirmStatus({
  pending,
  setPending,
  act,
}: {
  pending: { status: OrderStatus; warning?: string } | null;
  setPending: (p: null) => void;
  act: ReturnType<typeof useOrderAction>;
}) {
  const cancelling = pending?.status === "cancelled";
  return (
    <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
      <DialogContent>
        <DialogTitle>{cancelling ? "Cancel this order?" : `Change to “${pending ? orderStatusLabel[pending.status] : ""}”?`}</DialogTitle>
        <DialogDescription>{pending?.warning ?? (cancelling ? "The customer will see that the order was cancelled. This can't be undone." : "")}</DialogDescription>
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setPending(null)}>
            Go back
          </Button>
          <Button
            variant={cancelling ? "danger" : "primary"}
            disabled={act.isPending}
            onClick={() => pending && act.mutate({ action: "set_status", status: pending.status, confirmed: true }, { onSuccess: () => setPending(null) })}
          >
            {act.isPending ? <LoaderCircle className="animate-spin" aria-label="Saving" /> : cancelling ? "Cancel order" : "Yes, change it"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// Customer update
// ------------------------------------------------------------------

const templates = ["Your order is being prepared.", "Your order is ready for pickup.", "Your order has been handed to the delivery rider."];

export function CustomerUpdate({ order }: { order: OrderView }) {
  const act = useOrderAction(order.id);
  const [message, setMessage] = useState(order.customerUpdate ?? "");
  const [saved, setSaved] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        act.mutate({ action: "customer_update", message }, { onSuccess: () => setSaved(true) });
      }}
      className="space-y-3"
    >
      <label htmlFor="customer-update" className="sr-only">
        Message shown on the customer&rsquo;s tracking page
      </label>
      <Textarea
        id="customer-update"
        rows={3}
        maxLength={400}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          setSaved(false);
        }}
        placeholder="e.g. Your order is being prepared."
      />
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {templates.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setMessage(t);
              setSaved(false);
            }}
            className="h-9 shrink-0 rounded-full bg-lavender-wash px-3 text-[13px] ring-1 ring-lavender/40 hover:bg-lavender-soft"
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" disabled={act.isPending || message.trim() === (order.customerUpdate ?? "")}>
          {act.isPending ? <LoaderCircle className="animate-spin" aria-label="Saving" /> : "Show to customer"}
        </Button>
        <span aria-live="polite" className="text-[14px] text-success">
          {saved && "Saved — the customer sees it now."}
        </span>
      </div>
      {act.isError && (
        <Notice kind="error" role="alert">
          {act.error.message}
        </Notice>
      )}
    </form>
  );
}
