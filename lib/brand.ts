/**
 * Brand constants that never change at runtime. Anything the owner may want to
 * change (phone, bank details, pickup notes, socials) lives in store settings instead.
 */
export const brand = {
  name: "Scents by Ilham",
  promise: "Scents that feel like you.",
  description:
    "Affordable fragrances from Scents by Ilham — Humrah, Homura, Turaren Wuta and Kulacham, beautifully presented and easy to order in Nigeria.",
  shortDescription: "Beautiful fragrance. Thoughtful presentation. Accessible pricing.",
  /** Public site URL, used for canonical links, sitemaps and share images. */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  locale: "en-NG",
  currency: "NGN" as const,
  timeZone: "Africa/Lagos",
} as const;

export const absoluteUrl = (path = "/") => `${brand.url}${path.startsWith("/") ? path : `/${path}`}`;
