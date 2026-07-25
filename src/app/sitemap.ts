import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/blog";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://viralab.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["", "/ozellikler", "/iletisim", "/ortaklik", "/blog", "/gizlilik", "/kosullar"].map(
    (p) => ({
      url: `${BASE}${p}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
    }),
  );
  const posts = getPosts().map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly" as const,
  }));
  return [...staticPages, ...posts];
}
