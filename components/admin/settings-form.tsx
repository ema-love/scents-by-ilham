"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { settingsSchema, type SettingsInput } from "@/lib/domain/settings";
import { parseNaira } from "@/lib/money";

type FormValues = Omit<SettingsInput, "deliveryFee"> & { deliveryFee: string };

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 rounded-2xl bg-card p-5 ring-1 ring-border">
      <div>
        <h2 className="headline text-xl">{title}</h2>
        {description && <p className="mt-1 text-[14px] text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({ label, description, ...props }: { label: string; description?: string } & React.ComponentProps<"input">) {
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-3">
      <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--lavender-ink)]" {...props} />
      <span>
        <span className="block font-medium">{label}</span>
        {description && <span className="block text-[13px] text-muted-foreground">{description}</span>}
      </span>
    </label>
  );
}

export function SettingsForm({ settings }: { settings: SettingsInput }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, setError, watch, formState } = useForm<FormValues>({
    defaultValues: { ...settings, deliveryFee: settings.deliveryFee === null ? "" : String(settings.deliveryFee) },
  });
  const e = formState.errors;

  const save = useMutation({
    mutationFn: async (input: SettingsInput) => {
      const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) window.location.assign("/admin/login");
      if (!res.ok) throw new Error(data.error ?? "Couldn't save. Check your connection and try again.");
    },
    onSuccess: () => {
      setSaved(true);
      router.refresh();
    },
  });

  const onSubmit = handleSubmit((values) => {
    setSaved(false);
    const fee = values.deliveryFee.trim() === "" ? null : parseNaira(values.deliveryFee);
    const parsed = settingsSchema.safeParse({ ...values, deliveryFee: fee });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) setError(String(issue.path[0]) as keyof FormValues, { message: issue.message });
      if (fee !== null && Number.isNaN(fee)) setError("deliveryFee", { message: "Enter the fee in naira, e.g. 1500" });
      return;
    }
    save.mutate(parsed.data);
  });

  const deliveryEnabled = watch("deliveryEnabled");
  const pickupEnabled = watch("pickupEnabled");
  const whatsappEnabled = watch("whatsappEnabled");

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Section title="Business">
        <Field id="businessName" label="Business name" error={e.businessName?.message}>
          <Input {...register("businessName")} />
        </Field>
        <Field id="phone" label="Phone number" hint="Shown on every page. Customers can tap it to call." error={e.phone?.message}>
          <Input type="tel" inputMode="tel" {...register("phone")} />
        </Field>
        <Toggle label="Show WhatsApp buttons" description="Lets customers message you on WhatsApp." {...register("whatsappEnabled")} />
        {whatsappEnabled && (
          <Field id="whatsappNumber" label="WhatsApp number" optional hint="Leave empty to use the phone number above." error={e.whatsappNumber?.message}>
            <Input type="tel" inputMode="tel" {...register("whatsappNumber")} />
          </Field>
        )}
      </Section>

      <Section title="Payment" description="Customers see these details when they pay. Double-check the account number.">
        <Field id="bankName" label="Bank name" error={e.bankName?.message}>
          <Input {...register("bankName")} />
        </Field>
        <Field id="accountNumber" label="Account number" error={e.accountNumber?.message}>
          <Input inputMode="numeric" {...register("accountNumber")} />
        </Field>
        <Field id="accountName" label="Account name" optional hint="The name customers will see in their banking app when they transfer." error={e.accountName?.message}>
          <Input {...register("accountName")} />
        </Field>
        <Field id="paymentInstructions" label="Payment instructions" optional error={e.paymentInstructions?.message}>
          <Textarea rows={3} {...register("paymentInstructions")} />
        </Field>
      </Section>

      <Section title="Pickup & delivery">
        <Toggle label="Offer pickup" {...register("pickupEnabled")} />
        {pickupEnabled && (
          <Field id="pickupInfo" label="Pickup information" optional hint="Shown when an order is ready for pickup — where and when to collect." error={e.pickupInfo?.message}>
            <Textarea rows={3} {...register("pickupInfo")} />
          </Field>
        )}
        <Toggle label="Offer delivery" {...register("deliveryEnabled")} />
        {deliveryEnabled && (
          <>
            <Field id="deliveryFee" label="Delivery fee (₦)" optional hint="Leave empty if it varies — customers are told you'll confirm it with them." error={e.deliveryFee?.message}>
              <Input inputMode="numeric" {...register("deliveryFee")} className="max-w-40" />
            </Field>
            <Field id="deliveryInfo" label="Delivery information" optional hint="Areas you deliver to, how long it usually takes." error={e.deliveryInfo?.message}>
              <Textarea rows={3} {...register("deliveryInfo")} />
            </Field>
            <Field id="deliveryContact" label="Delivery contact" optional hint="Shown when an order is out for delivery, e.g. a rider's number." error={e.deliveryContact?.message}>
              <Input {...register("deliveryContact")} />
            </Field>
          </>
        )}
      </Section>

      <Section title="About" description="Shown on the About page.">
        <Field id="about" label="About Scents by Ilham" error={e.about?.message}>
          <Textarea rows={5} {...register("about")} />
        </Field>
      </Section>

      <Section title="Social media" description="Paste full links. Only filled-in accounts are shown on the site.">
        {(["instagram", "tiktok", "facebook", "x"] as const).map((k) => (
          <Field key={k} id={k} label={{ instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", x: "X (Twitter)" }[k]} optional error={e[k]?.message}>
            <Input type="url" inputMode="url" placeholder="https://" {...register(k)} />
          </Field>
        ))}
      </Section>

      {save.isError && (
        <Notice kind="error" role="alert">
          {save.error.message}
        </Notice>
      )}
      {Object.keys(e).length > 0 && (
        <Notice kind="error" role="alert">
          Some details need fixing — see the highlighted fields.
        </Notice>
      )}
      {saved && !save.isPending && (
        <Notice kind="success" role="status">
          Saved. Your site shows the new details now.
        </Notice>
      )}

      <div className="sticky bottom-[calc(3.75rem+max(0.75rem,env(safe-area-inset-bottom)))] z-20 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="submit" size="lg" className="w-full sm:w-auto sm:min-w-48" disabled={save.isPending}>
          {save.isPending ? <LoaderCircle className="animate-spin" aria-label="Saving" /> : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
