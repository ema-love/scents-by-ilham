"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Archive, ArchiveRestore, ImagePlus, LoaderCircle, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Choice } from "@/components/ui/choice";
import { Notice } from "@/components/ui/notice";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { mediaUrl, productInputSchema, type Availability, type Product, type ProductImage, type ProductInput } from "@/lib/domain/products";
import { parseNaira } from "@/lib/money";
import { resizeImage } from "@/lib/client/image";
import { IMAGE_ACCEPT } from "@/lib/uploads";

type FormValues = {
  name: string;
  price: string;
  category: string;
  shortDescription: string;
  description: string;
  availability: Availability;
  visible: boolean;
  featured: boolean;
  displayOrder: string;
};

async function send(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) window.location.assign("/admin/login");
  if (!res.ok) throw new Error(data.error ?? "Couldn't save. Check your connection and try again.");
  return data;
}

export function ProductForm({ product, categories, nextOrder }: { product?: Product; categories: string[]; nextOrder: number }) {
  const router = useRouter();
  const isNew = !product;
  const archived = product?.visibility === "archived";
  const [images, setImages] = useState<ProductImage[]>(product?.images ?? []);
  const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit, watch, setValue, setError, formState } = useForm<FormValues>({
    defaultValues: {
      name: product?.name ?? "",
      price: product ? String(product.price) : "",
      category: product?.category ?? categories[0] ?? "",
      shortDescription: product?.shortDescription ?? "",
      description: product?.description ?? "",
      availability: product?.availability ?? "available",
      visible: product ? product.visibility === "visible" : true,
      featured: product?.featured ?? false,
      displayOrder: String(product?.displayOrder ?? nextOrder),
    },
  });

  const toInput = (v: FormValues, visibility?: ProductInput["visibility"]) => ({
    name: v.name,
    price: parseNaira(v.price),
    category: v.category,
    shortDescription: v.shortDescription,
    description: v.description,
    images: images.map((img) => ({ ...img, alt: img.alt || v.name })),
    availability: v.availability,
    visibility: visibility ?? (archived ? "archived" : v.visible ? "visible" : "hidden"),
    featured: v.featured,
    displayOrder: Number(v.displayOrder) || 0,
  });

  const save = useMutation({
    mutationFn: (input: ProductInput) => (isNew ? send("/api/admin/products", "POST", input) : send(`/api/admin/products/${product.id}`, "PATCH", input)),
    onSuccess: (data: { product: Product }) => {
      setSaved(true);
      if (isNew) router.replace(`/admin/products/${data.product.id}?created=1`);
      router.refresh();
    },
  });

  const lifecycle = useMutation({
    mutationFn: async (action: "archive" | "restore" | "delete") => {
      if (!product) return;
      if (action === "delete") return send(`/api/admin/products/${product.id}`, "DELETE", { confirm: "DELETE" });
      return send(`/api/admin/products/${product.id}`, "PATCH", { quick: { visibility: action === "archive" ? "archived" : "hidden" } });
    },
    onSuccess: (_d, action) => {
      setConfirm(null);
      if (action === "delete") router.replace("/admin/products?show=archived");
      router.refresh();
    },
  });

  const onSubmit = handleSubmit((values) => {
    setSaved(false);
    const parsed = productInputSchema.safeParse(toInput(values));
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]) as keyof FormValues;
        setError(field in values ? field : "name", { message: issue.message });
      }
      return;
    }
    save.mutate(parsed.data);
  });

  const availability = watch("availability");
  const visible = watch("visible");
  const name = watch("name");

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="space-y-8">
        <section aria-labelledby="photos-title" className="rounded-2xl bg-card p-5 ring-1 ring-border">
          <h2 id="photos-title" className="font-medium">
            Photos
          </h2>
          <p className="mt-1 text-[14px] text-muted-foreground">The first photo is the main one customers see. Natural light and a plain background look best.</p>
          <PhotoManager images={images} onChange={setImages} productName={name} />
        </section>

        <section className="space-y-5 rounded-2xl bg-card p-5 ring-1 ring-border">
          <Field id="name" label="Product name" error={formState.errors.name?.message}>
            <Input {...register("name")} autoComplete="off" />
          </Field>
          <Field id="price" label="Price (₦)" hint="Whole naira, e.g. 2500" error={formState.errors.price?.message}>
            <Input {...register("price")} inputMode="numeric" autoComplete="off" placeholder="2500" />
          </Field>
          <Field id="category" label="Category" hint="Choose one you've used before, or type a new one." error={formState.errors.category?.message}>
            <Input {...register("category")} list="category-options" autoComplete="off" />
          </Field>
          <datalist id="category-options">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Field id="shortDescription" label="Short description" optional hint="One line shown under the price. Up to 160 characters." error={formState.errors.shortDescription?.message}>
            <Input {...register("shortDescription")} maxLength={160} />
          </Field>
          <Field id="description" label="Description" optional hint="What it smells like, how to use it, size — whatever customers ask about." error={formState.errors.description?.message}>
            <Textarea {...register("description")} rows={5} />
          </Field>
        </section>

        <section className="space-y-5 rounded-2xl bg-card p-5 ring-1 ring-border">
          <div>
            <h2 className="mb-3 font-medium">Availability</h2>
            <Choice
              name="availability"
              legend="Availability"
              value={availability}
              onChange={(v) => setValue("availability", v, { shouldDirty: true })}
              options={[
                { value: "available", label: "🟢 Available", description: "Customers can order it" },
                { value: "out_of_stock", label: "🔴 Out of stock", description: "Shown, but can't be ordered" },
              ]}
            />
          </div>
          {!archived && (
            <div>
              <h2 className="mb-3 font-medium">Visibility</h2>
              <Choice
                name="visibility"
                legend="Visibility"
                value={visible ? "visible" : "hidden"}
                onChange={(v) => setValue("visible", v === "visible", { shouldDirty: true })}
                options={[
                  { value: "visible", label: "Visible", description: "Shown in the shop" },
                  { value: "hidden", label: "Hidden", description: "Not shown to customers" },
                ]}
              />
            </div>
          )}
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-1">
            <input type="checkbox" {...register("featured")} className="size-5 accent-[var(--lavender-ink)]" />
            <span>
              <span className="block font-medium">Feature on the homepage</span>
              <span className="block text-[13px] text-muted-foreground">Featured products appear at the top of the homepage.</span>
            </span>
          </label>
          <Field id="displayOrder" label="Position in the shop" hint="Lower numbers appear first." error={formState.errors.displayOrder?.message}>
            <Input {...register("displayOrder")} inputMode="numeric" className="max-w-32" />
          </Field>
        </section>

        {save.isError && (
          <Notice kind="error" role="alert">
            {save.error.message}
          </Notice>
        )}
        {saved && !save.isPending && (
          <Notice kind="success" role="status">
            Saved. The shop shows your changes now.
          </Notice>
        )}

        <div className="sticky bottom-[calc(3.75rem+max(0.75rem,env(safe-area-inset-bottom)))] z-20 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <Button type="submit" size="lg" className="w-full sm:w-auto sm:min-w-48" disabled={save.isPending}>
            {save.isPending ? <LoaderCircle className="animate-spin" aria-label="Saving" /> : isNew ? "Add product" : "Save changes"}
          </Button>
        </div>
      </form>

      {product && (
        <section aria-labelledby="archive-title" className="mt-12 border-t pt-8">
          <h2 id="archive-title" className="headline text-xl">
            {archived ? "This product is archived" : "Remove from the shop"}
          </h2>
          <p className="mt-1 text-[14.5px] text-muted-foreground">
            {archived
              ? "It isn't shown to customers. Past orders keep their details. Restore it to bring it back, or delete it for good."
              : "Archiving takes it out of the shop but keeps it here, so you can bring it back later. Past orders are never affected."}
          </p>
          {lifecycle.isError && (
            <Notice kind="error" role="alert" className="mt-4">
              {lifecycle.error.message}
            </Notice>
          )}
          <div className="mt-4 flex flex-wrap gap-2.5">
            {archived ? (
              <>
                <Button variant="secondary" onClick={() => lifecycle.mutate("restore")} disabled={lifecycle.isPending}>
                  <ArchiveRestore /> Restore (as hidden)
                </Button>
                <Button variant="danger-soft" onClick={() => setConfirm("delete")}>
                  <Trash2 /> Delete permanently
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={() => setConfirm("archive")}>
                <Archive /> Archive product
              </Button>
            )}
          </div>
        </section>
      )}

      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          {confirm === "archive" ? (
            <>
              <DialogTitle>Archive {product?.name}?</DialogTitle>
              <DialogDescription>It will disappear from the shop. You can restore it any time.</DialogDescription>
              <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={() => setConfirm(null)}>
                  Cancel
                </Button>
                <Button onClick={() => lifecycle.mutate("archive")} disabled={lifecycle.isPending}>
                  {lifecycle.isPending ? <LoaderCircle className="animate-spin" /> : "Archive"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogTitle>Delete {product?.name} permanently?</DialogTitle>
              <DialogDescription>This can&rsquo;t be undone. Past orders keep their own copy of the name and price. Type DELETE to confirm.</DialogDescription>
              <Input className="mt-4" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} aria-label="Type DELETE to confirm" autoCapitalize="characters" />
              <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={() => setConfirm(null)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => lifecycle.mutate("delete")} disabled={deleteText.trim() !== "DELETE" || lifecycle.isPending}>
                  {lifecycle.isPending ? <LoaderCircle className="animate-spin" /> : "Delete permanently"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PhotoManager({ images, onChange, productName }: { images: ProductImage[]; onChange: (images: ProductImage[]) => void; productName: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);

  async function add(files: FileList | null) {
    setError(null);
    const picked = [...(files ?? [])].slice(0, 6 - images.length);
    let next = images;
    for (const file of picked) {
      setUploading((n) => n + 1);
      try {
        // Resize on the phone: sharp enough for any screen, small enough for mobile data.
        const resized = await resizeImage(file, { maxDimension: 1600, type: "image/webp", quality: 0.82 }).catch(() =>
          resizeImage(file, { maxDimension: 1600, type: "image/jpeg", quality: 0.85 }),
        );
        const body = new FormData();
        body.set("image", resized.file);
        body.set("width", String(resized.width));
        body.set("height", String(resized.height));
        body.set("name", productName);
        const res = await fetch("/api/admin/images", { method: "POST", body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "The photo didn't upload. Please try again.");
        next = [...next, { ...data.image, alt: productName }];
        onChange(next);
      } catch (e) {
        setError(e instanceof Error && e.message !== "Encoding unavailable" ? e.message : "That photo couldn't be read. Try a JPG or PNG.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  return (
    <div className="mt-4">
      <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {images.map((img, i) => (
          <li key={img.key} className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted ring-1 ring-border">
              <Image src={mediaUrl(img.key)} alt={img.alt || productName} fill sizes="160px" className="object-cover" />
              {i === 0 && <span className="absolute top-1.5 left-1.5 rounded-full bg-primary/85 px-2 py-0.5 text-[11px] font-medium text-primary-foreground">Main</span>}
            </div>
            <div className="mt-1.5 flex justify-between">
              {i > 0 ? (
                <button
                  type="button"
                  onClick={() => onChange([img, ...images.filter((x) => x.key !== img.key)])}
                  className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                  aria-label="Make this the main photo"
                >
                  <Star className="size-4" />
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => onChange(images.filter((x) => x.key !== img.key))}
                className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-danger-soft hover:text-danger"
                aria-label="Remove this photo"
              >
                <X className="size-4" />
              </button>
            </div>
          </li>
        ))}
        {images.length < 6 && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading > 0}
              className="grid aspect-[4/5] w-full place-items-center rounded-xl border-2 border-dashed border-lavender/70 bg-lavender-wash text-lavender-ink transition-colors hover:bg-lavender-soft"
            >
              <span className="flex flex-col items-center gap-1 text-[13px] font-medium">
                {uploading > 0 ? <LoaderCircle className="size-6 animate-spin" aria-label="Uploading" /> : <ImagePlus className="size-6" aria-hidden />}
                {uploading > 0 ? "Uploading…" : "Add photo"}
              </span>
            </button>
          </li>
        )}
      </ul>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void add(e.target.files);
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="mt-2 text-[14px] font-medium text-danger">
          {error}
        </p>
      )}
      {images.length > 0 && <p className="mt-2 text-[13px] text-muted-foreground">Remember to save changes after adding or removing photos.</p>}
    </div>
  );
}
