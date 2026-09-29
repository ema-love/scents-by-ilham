import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Camera stays allowed for this site so customers can photograph a receipt from the upload field.
  { key: "Permissions-Policy", value: "microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // On Netlify, fall back to the site's own URL so canonical links and share images are absolute.
  env: { NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "http://localhost:3000" },
  poweredByHeader: false,
  images: {
    // Product photos are served by /media/… (uploaded from the dashboard). Nothing else is optimised.
    localPatterns: [{ pathname: "/media/**", search: "" }],
    qualities: [70, 80],
    formats: ["image/avif", "image/webp"],
    // Phones first: small widths get their own renditions so a 360px screen never downloads a desktop image.
    deviceSizes: [360, 420, 640, 768, 1024, 1280, 1600],
    imageSizes: [96, 160, 240, 320],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
