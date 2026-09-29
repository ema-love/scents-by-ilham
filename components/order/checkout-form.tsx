"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowLeft, LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Choice } from "@/components/ui/choice";
import { Notice } from "@/components/ui/notice";
import { Quantity } from "@/components/store/quantity";
import { useCart } from "@/components/store/cart";
import { isValidPhone, formatPhone } from "@/lib/phone";
import { formatNaira } from "@/lib/money";
import { mediaUrl, type ProductImage } from "@/lib/domain/products";
import type { OrderInput } from "@/lib/domain/orders";
import { cn } from "@/lib/utils";

export type CheckoutProduct = { id: string; slug: string; name: string; price: number; orderable: boolean; image: ProductImage | null };
type FulfilmentSettings = { pickupEnabled: boolean; deliveryEnabled: boolean; deliveryFee: number | null; pickupInfo: string; deliveryInfo: string };

const detailsSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(80),
    phone: z.string().trim().refine(isValidPhone, "Enter a valid phone number, e.g. 0803 123 4567"),
    method: z.enum(["pickup", "delivery"]),
    address: z.string().trim().max(300),
    area: z.string().trim().max(120),
    note: z.string().trim().max(300),
  })
  .superRefine((v, ctx) => {
    if (v.method !== "delivery") return;
    if (v.address.length < 5) ctx.addIssue({ code: "custom", path: ["address"], message: "Enter the delivery address" });
    if (v.area.length < 2) ctx.addIssue({ code: "custom", path: ["area"], message: "Enter the area or city" });
  });
type Details = z.infer<typeof detailsSchema>;

const REMEMBER_KEY = "sbi-customer";

export function CheckoutForm({ catalog, fulfilment, bankName }: { catalog: CheckoutProduct[]; fulfilment: FulfilmentSettings; bankName: string }) {
  const cart = useCart();
  const router = useRouter();
  const [step, setStep] = useState<"details" | "review">("details");
  const headingRef = useRef<HTMLHeadingElement>(null);

  const defaultMethod = fulfilment.pickupEnabled ? "pickup" : "delivery";
  const form = useForm<Details>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: "", phone: "", method: defaultMethod, address: "", area: "", note: "" },
  });
  const { register, handleSubmit, watch, setValue, getValues, formState } = form;
  const method = watch("method");

  // Returning customers: fill in the name and phone they used last time (kept only on this phone).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(REMEMBER_KEY) ?? "null") as { name?: string; phone?: string } | null;
      if (saved?.name && !getValues("name")) setValue("name", saved.name);
      if (saved?.phone && !getValues("phone")) setValue("phone", saved.phone);
    } catch {
      // ignore
    }
  }, [getValues, setValue]);

  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  const lines = useMemo(
    () =>
      cart.lines.map((l) => {
        const product = catalog.find((p) => p.id === l.productId);
        return { ...l, product };
      }),
    [cart.lines, catalog],
  );
  const problems = lines.filter((l) => !l.product || !l.product.orderable);
  const subtotal = lines.reduce((sum, l) => sum + (l.product?.orderable ? l.product.price * l.quantity : 0), 0);
  const deliveryFee = method === "delivery" ? fulfilment.deliveryFee : null;
  const total = subtotal + (deliveryFee ?? 0);

  const place = useMutation({
    mutationFn: async (details: Details) => {
      const payload: OrderInput = {
        customer: { name: details.name, phone: details.phone },
        items: lines.filter((l) => l.product?.orderable).map((l) => ({ productId: l.productId, quantity: l.quantity })),
        fulfilment:
          details.method === "delivery"
            ? { method: "delivery", address: details.address, area: details.area, note: details.note || undefined }
            : { method: "pickup", note: details.note || undefined },
      };
      const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(data.error ?? "We couldn't place your order. Please try again."), { code: data.code as string | undefined });
      return data as { number: string };
    },
    onSuccess: ({ number }, details) => {
      try {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ name: details.name, phone: details.phone }));
      } catch {
        // ignore
      }
      router.push(`/orders/${number}?placed=1`);
      cart.clear();
    },
    onError: (e: Error & { code?: string }) => {
      if (e.code === "unavailable") {
        // Stock changed since the page loaded: fetch the latest and let the customer adjust.
        router.refresh();
        setStep("details");
      }
    },
  });

  if (!cart.ready) {
    return (
      <div className="grid min-h-[40dvh] place-items-center" aria-busy="true">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-label="Loading your order" />
      </div>
    );
  }

  if (cart.lines.length === 0 && !place.isSuccess && !place.isPending) {
    return (
      <div className="py-10 text-center">
        <h1 className="display text-4xl">Your order is empty.</h1>
        <p className="lede mx-auto mt-3 max-w-sm">Find a scent you love and add it here.</p>
        <Button asChild size="lg" className="mt-7">
          <Link href="/shop">Shop scents</Link>
        </Button>
      </div>
    );
  }

  const values = getValues();

  return (
    <>
      {/* Progress */}
      <ol className="flex items-center gap-2 text-[13px] font-medium" aria-label="Checkout steps">
        {(["Details", "Review", "Pay"] as const).map((label, i) => {
          const current = (step === "details" && i === 0) || (step === "review" && i === 1);
          const done = step === "review" && i === 0;
          return (
            <li key={label} className="flex items-center gap-2" aria-current={current ? "step" : undefined}>
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full text-[12px]",
                  current ? "bg-primary text-primary-foreground" : done ? "bg-lavender-soft text-lavender-ink" : "bg-muted text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              <span className={current ? "text-foreground" : "text-muted-foreground"}>{label}</span>
              {i < 2 && <span aria-hidden className="h-px w-5 bg-border-strong" />}
            </li>
          );
        })}
      </ol>

      {step === "details" ? (
        <form
          noValidate
          onSubmit={handleSubmit(() => {
            if (!problems.length) setStep("review");
          })}
          className="mt-6"
        >
          <h1 ref={headingRef} tabIndex={-1} className="display text-[clamp(2rem,7vw,2.75rem)] outline-none">
            Your order
          </h1>

          {place.isError && (
            <Notice kind="error" role="alert" className="mt-5">
              {place.error.message}
            </Notice>
          )}

          <section aria-labelledby="items-title" className="mt-6">
            <h2 id="items-title" className="sr-only">
              Items
            </h2>
            <ul className="divide-y rounded-2xl bg-card ring-1 ring-border">
              {lines.map((l) => (
                <li key={l.productId} className="flex gap-3 p-3.5 sm:gap-4 sm:p-4">
                  <div className="relative size-18 shrink-0 overflow-hidden rounded-xl bg-lavender-wash">
                    {l.product?.image && <Image src={mediaUrl(l.product.image.key)} alt="" fill sizes="72px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    {l.product ? (
                      <>
                        <Link href={`/products/${l.product.slug}`} className="font-medium hover:underline">
                          {l.product.name}
                        </Link>
                        <p className="text-[14.5px] text-muted-foreground">{formatNaira(l.product.price)} each</p>
                        {!l.product.orderable && (
                          <p className="mt-1 text-[14px] font-medium text-danger">This product is currently unavailable. Please remove it.</p>
                        )}
                      </>
                    ) : (
                      <p className="text-[14px] font-medium text-danger">A product in your order is no longer available. Please remove it.</p>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {l.product?.orderable ? (
                        <Quantity value={l.quantity} onChange={(n) => cart.setQuantity(l.productId, n)} label={`Quantity of ${l.product.name}`} />
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={() => cart.remove(l.productId)}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[14px] text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={`Remove ${l.product?.name ?? "item"}`}
                      >
                        <Trash2 className="size-4" aria-hidden /> Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex justify-between px-1 text-[15px]">
              <span className="text-muted-foreground">Items</span>
              <span className="font-medium">{formatNaira(subtotal)}</span>
            </p>
            <Link href="/shop" className="mt-1 inline-flex min-h-11 items-center px-1 text-[15px] font-medium text-lavender-ink underline-offset-4 hover:underline">
              + Add more scents
            </Link>
          </section>

          <section aria-labelledby="you-title" className="mt-8 space-y-5">
            <h2 id="you-title" className="headline text-2xl">
              Your details
            </h2>
            <Field id="name" label="Full name" error={formState.errors.name?.message}>
              <Input autoComplete="name" {...register("name")} />
            </Field>
            <Field id="phone" label="Phone number" hint="We use it to reach you about this order, and you'll use it to track it." error={formState.errors.phone?.message}>
              <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" {...register("phone")} />
            </Field>
          </section>

          <section aria-labelledby="fulfil-title" className="mt-8 space-y-5">
            <h2 id="fulfil-title" className="headline text-2xl">
              Pickup or delivery
            </h2>
            <Choice
              name="method"
              legend="Pickup or delivery"
              value={method}
              onChange={(v) => setValue("method", v, { shouldValidate: formState.isSubmitted })}
              options={[
                { value: "pickup", label: "Pickup", description: "Collect it yourself", disabled: !fulfilment.pickupEnabled },
                {
                  value: "delivery",
                  label: "Delivery",
                  description: fulfilment.deliveryFee !== null ? `+ ${formatNaira(fulfilment.deliveryFee)}` : "Fee confirmed with you",
                  disabled: !fulfilment.deliveryEnabled,
                },
              ]}
            />
            {method === "pickup" && fulfilment.pickupInfo && <Notice>{fulfilment.pickupInfo}</Notice>}
            {method === "pickup" && !fulfilment.pickupInfo && <Notice>We&rsquo;ll share pickup details with you when your order is ready.</Notice>}
            {method === "delivery" && (
              <div className="space-y-5 animate-rise">
                {fulfilment.deliveryInfo && <Notice>{fulfilment.deliveryInfo}</Notice>}
                {fulfilment.deliveryFee === null && (
                  <Notice kind="warning">The delivery fee isn&rsquo;t included in your total. We&rsquo;ll confirm it with you by phone before sending your order.</Notice>
                )}
                <Field id="address" label="Delivery address" error={formState.errors.address?.message}>
                  <Textarea rows={2} autoComplete="street-address" className="min-h-20" {...register("address")} />
                </Field>
                <Field id="area" label="Area / city" error={formState.errors.area?.message}>
                  <Input autoComplete="address-level2" {...register("area")} />
                </Field>
              </div>
            )}
            <Field id="note" label="Note for us" optional error={formState.errors.note?.message}>
              <Textarea rows={2} className="min-h-20" placeholder={method === "delivery" ? "Landmark, best time to reach you…" : "Anything we should know"} {...register("note")} />
            </Field>
          </section>

          {problems.length > 0 && (
            <Notice kind="error" role="alert" className="mt-6">
              Remove the unavailable product{problems.length > 1 ? "s" : ""} to continue.
            </Notice>
          )}

          <div className="sticky bottom-0 z-10 -mx-[var(--page-gutter)] mt-8 border-t bg-background/95 px-[var(--page-gutter)] pt-3 pb-safe backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
            <Button type="submit" size="lg" className="w-full" disabled={problems.length > 0 || subtotal === 0}>
              Review order · {formatNaira(total)}
            </Button>
          </div>
        </form>
      ) : (
        <section aria-labelledby="review-title" className="mt-6">
          <button
            type="button"
            onClick={() => setStep("details")}
            className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-[15px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden /> Edit order
          </button>
          <h1 id="review-title" ref={headingRef} tabIndex={-1} className="display mt-2 text-[clamp(2rem,7vw,2.75rem)] outline-none">
            Review your order
          </h1>

          {place.isError && (
            <Notice kind="error" role="alert" className="mt-5">
              {place.error.message}
            </Notice>
          )}

          <div className="mt-6 divide-y rounded-2xl bg-card ring-1 ring-border">
            <ul className="p-4">
              {lines.map((l) =>
                l.product ? (
                  <li key={l.productId} className="flex justify-between gap-4 py-1.5 text-[15.5px]">
                    <span>
                      {l.product.name} <span className="text-muted-foreground">× {l.quantity}</span>
                    </span>
                    <span className="font-medium tabular-nums">{formatNaira(l.product.price * l.quantity)}</span>
                  </li>
                ) : null,
              )}
              {method === "delivery" && (
                <li className="flex justify-between gap-4 py-1.5 text-[15.5px]">
                  <span>Delivery</span>
                  <span className="font-medium">{deliveryFee !== null ? formatNaira(deliveryFee) : "To be confirmed"}</span>
                </li>
              )}
            </ul>
            <p className="flex items-baseline justify-between p-4">
              <span className="font-medium">Total to pay</span>
              <span className="font-display text-3xl tabular-nums">{formatNaira(total)}</span>
            </p>
            <dl className="grid gap-3 p-4 text-[15px]">
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{values.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium">{formatPhone(values.phone)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{values.method === "delivery" ? "Delivery to" : "Fulfilment"}</dt>
                <dd className="font-medium">{values.method === "delivery" ? `${values.address}, ${values.area}` : "Pickup"}</dd>
              </div>
              {values.note && (
                <div>
                  <dt className="text-muted-foreground">Note</dt>
                  <dd>{values.note}</dd>
                </div>
              )}
            </dl>
          </div>

          <Notice className="mt-5" title="Next: pay by bank transfer">
            After you place your order, we&rsquo;ll show you the exact amount and our {bankName} account. Transfer, then upload your receipt.
          </Notice>

          <div className="sticky bottom-0 z-10 -mx-[var(--page-gutter)] mt-6 border-t bg-background/95 px-[var(--page-gutter)] pt-3 pb-safe backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
            <Button size="lg" className="w-full" disabled={place.isPending || place.isSuccess} onClick={() => place.mutate(getValues())}>
              {place.isPending || place.isSuccess ? <LoaderCircle className="animate-spin" aria-label="Placing your order" /> : <>Place order · {formatNaira(total)}</>}
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
