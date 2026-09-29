import Image from "next/image";
import { mediaUrl, type Product } from "@/lib/domain/products";
import { cn } from "@/lib/utils";

type Tone = { bg: string; glass: string; cap: string; liquid: string };

/** Illustration colours hinted by the product's own name — used only until a real photo is uploaded. */
function toneFor(name: string): Tone {
  const n = name.toLowerCase();
  if (n.includes("black")) return { bg: "#ece5f3", glass: "#2b2130", cap: "#1a141d", liquid: "#3a2843" };
  if (n.includes("white")) return { bg: "#efe9f7", glass: "#fffdf8", cap: "#d9cfc3", liquid: "#f4efe6" };
  if (n.includes("pink")) return { bg: "#f6ecef", glass: "#f0cfd8", cap: "#b98895", liquid: "#e9bccb" };
  if (n.includes("wuta")) return { bg: "#f2ece4", glass: "#d8c3a5", cap: "#8a6d4c", liquid: "#c9ad86" };
  return { bg: "#f1ecf7", glass: "#c9b8e6", cap: "#5a4686", liquid: "#b7a3db" };
}

function Illustration({ product }: { product: Pick<Product, "name"> }) {
  const t = toneFor(product.name);
  const incense = product.name.toLowerCase().includes("wuta");
  return (
    <svg viewBox="0 0 400 500" role="img" aria-label={`Illustration of ${product.name}`} className="size-full" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="500" fill={t.bg} />
      <ellipse cx="200" cy="420" rx="150" ry="18" fill="#3a2843" opacity=".07" />
      {incense ? (
        <g>
          <path d="M200 150c-18 28 22 44 0 74s18 44 0 70" fill="none" stroke="#3a2843" strokeOpacity=".22" strokeWidth="4" strokeLinecap="round" />
          <path d="M120 330h160l-14 80a12 12 0 0 1-12 10H146a12 12 0 0 1-12-10z" fill={t.glass} />
          <rect x="112" y="318" width="176" height="18" rx="9" fill={t.cap} />
          <ellipse cx="200" cy="318" rx="70" ry="6" fill={t.liquid} opacity=".8" />
        </g>
      ) : (
        <g>
          <rect x="176" y="118" width="48" height="70" rx="10" fill={t.cap} />
          <rect x="186" y="182" width="28" height="24" rx="4" fill={t.cap} opacity=".75" />
          <path d="M130 250c0-28 22-46 50-46h40c28 0 50 18 50 46v130c0 22-18 40-40 40h-60c-22 0-40-18-40-40z" fill={t.glass} stroke="#3a2843" strokeOpacity=".12" strokeWidth="2" />
          <path d="M142 300h116v78c0 16-13 28-28 28h-60c-15 0-28-12-28-28z" fill={t.liquid} opacity=".55" />
          <path d="M152 236c6-10 16-16 28-16" stroke="#fff" strokeOpacity=".55" strokeWidth="6" strokeLinecap="round" fill="none" />
        </g>
      )}
    </svg>
  );
}

/** The product's primary photo, or a calm illustration until a photo is uploaded. Fixed ratio: no layout shift. */
export function ProductVisual({
  product,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
  priority,
  className,
}: {
  product: Pick<Product, "name" | "images">;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const image = product.images[0];
  return (
    <div className={cn("relative aspect-[4/5] overflow-hidden rounded-2xl bg-lavender-wash", className)}>
      {image ? (
        <Image
          src={mediaUrl(image.key)}
          alt={image.alt || product.name}
          fill
          sizes={sizes}
          priority={priority}
          quality={70}
          className="object-cover animate-fade"
        />
      ) : (
        <Illustration product={product} />
      )}
    </div>
  );
}
