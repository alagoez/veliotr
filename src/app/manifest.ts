import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name} — Viral video araştırma stüdyosu`,
    short_name: brand.name,
    description: brand.subTagline,
    start_url: "/home",
    display: "standalone",
    background_color: "#08090a",
    theme_color: "#08090a",
    orientation: "portrait-primary",
    lang: "tr",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
