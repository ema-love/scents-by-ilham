"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";

export function TrackForm({ initialNumber = "" }: { initialNumber?: string }) {
  const router = useRouter();
  const [number, setNumber] = useState(initialNumber);
  const [phone, setPhone] = useState("");

  const track = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number, phone }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      return data as { number: string };
    },
    onSuccess: ({ number }) => router.push(`/orders/${number}`),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        track.mutate();
      }}
      className="space-y-5"
    >
      <Field id="track-number" label="Order number" hint="It starts with SC-, e.g. SC-1024.">
        <Input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="SC-1024"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          required
        />
      </Field>
      <Field id="track-phone" label="Phone number" hint="The number you used when you placed the order.">
        <Input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080XXXXXXXX" required />
      </Field>
      {track.isError && (
        <Notice kind="error" role="alert">
          {track.error.message}
        </Notice>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={track.isPending || track.isSuccess || !number || !phone}>
        {track.isPending || track.isSuccess ? <LoaderCircle className="animate-spin" aria-label="Finding your order" /> : "Track Order"}
      </Button>
    </form>
  );
}
