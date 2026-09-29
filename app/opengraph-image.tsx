import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const alt = `${brand.name} — ${brand.promise}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 88, background: "#faf6f0", color: "#231d26" }}>
        <div style={{ display: "flex", width: 72, height: 8, borderRadius: 8, background: "#b7a3db" }} />
        <div style={{ display: "flex", marginTop: 40, fontSize: 92, letterSpacing: -3, lineHeight: 1 }}>{brand.promise}</div>
        <div style={{ display: "flex", marginTop: 32, fontSize: 36, color: "#5a4686" }}>{brand.name}</div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 28, color: "#62596a" }}>{brand.shortDescription}</div>
      </div>
    ),
    size,
  );
}
