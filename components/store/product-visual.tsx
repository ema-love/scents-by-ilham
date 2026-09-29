import Image from "next/image";
import { mediaUrl, type Product } from "@/lib/domain/products";
import { cn } from "@/lib/utils";

type Tone = { bg: string; glass: string; cap: string; liquid: string };

/** Illustration colours hinted by the product's own name — used only until a real photo is uploaded. */
function toneFor(name: string): Tone {
  const n = name.toLowerCase();
  if (n.includes("black")) return { bg: "#d9cbeb", glass: "#241a2c", cap: "#b08d57", liquid: "#3a2843" };
  if (n.includes("white")) return { bg: "#e6dcf2", glass: "#fbf7ef", cap: "#b08d57", liquid: "#efe6d6" };
  if (n.includes("pink")) return { bg: "#eadbef", glass: "#f1cdd8", cap: "#b08d57", liquid: "#e7b5c6" };
  if (n.includes("wuta")) return { bg: "#dccfe8", glass: "#d9c7a8", cap: "#6e5438", liquid: "#8a6443" };
  return { bg: "#e3d6f1", glass: "#cbb6ea", cap: "#b08d57", liquid: "#a585d6" };
}

function Illustration({ product }: { product: Pick<Product, "name"> }) {
  const t = toneFor(product.name);
  const incense = product.name.toLowerCase().includes("wuta");
  const glowId = `glow-${product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <svg viewBox="0 0 400 500" role="img" aria-label={`Illustration of ${product.name}`} className="size-full" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="500" fill={t.bg} />
      <defs>
        <radialGradient id={glowId} cx="50%" cy="35%" r="70%">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="500" fill={`url(#${glowId})`} />
      <path d="M40 440c20-22 90-30 160-30s142 8 160 30v60H40z" fill="#5a4570" opacity=".22" />
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
    <div className={cn("relative aspect-[4/5] overflow-hidden rounded-lg bg-lavender-soft", className)}>
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
