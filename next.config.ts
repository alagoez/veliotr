import type { NextConfig } from "next";
import { join } from "node:path";

/**
 * İçerik Güvenliği Politikası.
 * - script-src'de 'unsafe-inline' Next.js'in hidrasyon bootstrap'i için gerekli;
 *   nonce tabanlı sıkı CSP'ye geçiş proxy'de nonce üretimi ister (sonraki adım).
 * - frame-src: /player sayfası YouTube gömüsü kullanır.
 * - connect-src: Supabase (auth + veri) ve Stripe.
 */
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const isDev = process.env.NODE_ENV !== "production";
// React geliştirme modu eval() kullanır (callstack yeniden kurma); production'da asla.
const devEval = isDev ? " 'unsafe-eval'" : "";
const devConnect = isDev ? " ws: http://localhost:*" : "";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${devEval} https://js.stripe.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://i.ytimg.com https://yt3.ggpht.com https://*.googleusercontent.com",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} https://api.stripe.com${devConnect}`.trim(),
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://js.stripe.com https://hooks.stripe.com",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: join(__dirname),
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // API yanıtları asla önbelleğe alınmasın (ara sunucular dahil)
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
    ];
  },
};

export default nextConfig;
