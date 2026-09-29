"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { FileText, ImageUp, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { isImage, resizeImage } from "@/lib/client/image";
import { MAX_UPLOAD_BYTES, RECEIPT_ACCEPT } from "@/lib/uploads";
import { formatNaira } from "@/lib/money";

/** Tap → choose receipt → preview → (replace) → submit. */
export function ReceiptUpload({ orderNumber, expectedAmount }: { orderNumber: string; expectedAmount: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [amount, setAmount] = useState(String(expectedAmount));
  const [reference, setReference] = useState("");

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function choose(picked: File | undefined) {
    setFileError(null);
    if (!picked) return;
    if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(picked.type) && !/\.(jpe?g|png|webp|pdf)$/i.test(picked.name)) {
      setFileError("Choose a JPG, PNG or PDF of your receipt.");
      return;
    }
    setPreparing(true);
    let ready = picked;
    // Large photos are shrunk on the phone first: faster on mobile data, still perfectly readable.
    if (isImage(picked) && picked.size > 1.2 * 1024 * 1024) {
      ready = await resizeImage(picked, { maxDimension: 2000, type: "image/jpeg", quality: 0.85 })
        .then((r) => r.file)
        .catch(() => picked);
    }
    setPreparing(false);
    if (ready.size > MAX_UPLOAD_BYTES) {
      setFileError("That file is too large (over 4.5 MB). A screenshot of the receipt works well.");
      return;
    }
    setFile(ready);
    setPreview(isImage(ready) ? URL.createObjectURL(ready) : null);
  }

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose your receipt first.");
      const body = new FormData();
      body.set("receipt", file);
      body.set("amount", amount);
      body.set("reference", reference);
      const res = await fetch(`/api/orders/${orderNumber}/receipt`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "The upload didn't go through. Check your connection and try again.");
    },
    onSuccess: () => router.refresh(),
  });

  const differs = amount.trim() !== "" && Number(amount.replace(/[₦,\s]/g, "")) !== expectedAmount;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        upload.mutate();
      }}
      className="space-y-5"
      aria-labelledby="upload-title"
    >
      <h3 id="upload-title" className="headline text-2xl">
        Upload your payment receipt
      </h3>

      <input
        ref={inputRef}
        id="receipt"
        type="file"
        accept={RECEIPT_ACCEPT}
        className="sr-only"
        onChange={(e) => {
          void choose(e.target.files?.[0]);
          e.target.value = "";
        }}
        aria-describedby="receipt-help"
      />

      {!file ? (
        <label
          htmlFor="receipt"
          className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-lavender/70 bg-lavender-wash px-6 py-8 text-center transition-colors hover:bg-lavender-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
        >
          {preparing ? (
            <LoaderCircle className="size-8 animate-spin text-lavender-ink" aria-label="Preparing your receipt" />
          ) : (
            <ImageUp className="size-8 text-lavender-ink" aria-hidden />
          )}
          <span className="text-[16px] font-medium">Tap to choose your receipt</span>
          <span id="receipt-help" className="text-[14px] text-muted-foreground">
            Screenshot or photo (JPG, PNG) or PDF · up to 4.5 MB
          </span>
        </label>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          {preview ? (
            <img src={preview} alt="Preview of your receipt" className="max-h-[420px] w-full bg-muted object-contain" />
          ) : (
            <div className="flex items-center gap-3 p-5">
              <FileText className="size-8 shrink-0 text-lavender-ink" aria-hidden />
              <span className="min-w-0 truncate font-medium">{file.name}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 border-t p-3 pl-4">
            <span className="min-w-0 truncate text-[14px] text-muted-foreground">{file.name}</span>
            <Button type="button" variant="secondary" size="sm" className="h-10" onClick={() => inputRef.current?.click()}>
              <RefreshCw /> Replace
            </Button>
          </div>
        </div>
      )}
      {fileError && (
        <p role="alert" className="text-[14px] font-medium text-danger">
          {fileError}
        </p>
      )}

      <Field id="amount" label="Amount you sent (₦)" hint={differs ? `Your order total is ${formatNaira(expectedAmount)}.` : undefined}>
        <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      {differs && <Notice kind="warning">The amount is different from your order total. That&rsquo;s okay — we&rsquo;ll check and contact you if anything is missing.</Notice>}
      <Field id="reference" label="Transfer reference / session ID" optional hint="You'll find it on the receipt. It helps us find your transfer quickly.">
        <Input value={reference} onChange={(e) => setReference(e.target.value)} autoComplete="off" />
      </Field>

      {upload.isError && (
        <Notice kind="error" role="alert">
          {upload.error.message}
        </Notice>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={!file || upload.isPending || upload.isSuccess || preparing}>
        {upload.isPending || upload.isSuccess ? <LoaderCircle className="animate-spin" aria-label="Uploading" /> : "Submit receipt"}
      </Button>
    </form>
  );
}
