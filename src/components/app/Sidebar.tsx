"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Bookmark,
  Radar,
  Bell,
  Sparkles,
  CreditCard,
  LogIn,
  Zap,
} from "lucide-react";
import { brand } from "@/config/brand";
import { useStore } from "@/lib/store";
import { BrandLogo } from "@/components/BrandLogo";

export const NAV = [
  { href: "/home", label: "Keşfet", icon: Compass },
  { href: "/saved-videos", label: "Kaydedilenler", icon: Bookmark },
  { href: "/saved-channels", label: "Kanallarım", icon: Radar },
  { href: "/notifications", label: "Bildirimler", icon: Bell },
  { href: "/idea-validator", label: "Fikir Doğrulayıcı", icon: Sparkles },
  { href: "/billing", label: "Abonelik", icon: CreditCard },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const store = useStore();
  const unread = store.notifications.filter((n) => !n.readAt).length;

  return (
    <aside className="app-sidebar sticky top-0 flex h-screen w-60 shrink-0 flex-col max-md:hidden">
      <Link href="/home" className="app-logo flex items-center gap-2 px-5 pb-4 pt-5">
        <BrandLogo />
      </Link>

      <p className="px-6 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-faint">
        Stüdyo
      </p>

      <nav className="flex flex-1 flex-col gap-1 px-3.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-semibold ${
                active ? "text-ink" : "text-muted hover:text-ink"
              }`}
            >
              <Icon size={16} className={active ? "text-brand-soft" : ""} />
              {label}
              {href === "/notifications" && unread > 0 && (
                <span className="badge-pulse num ml-auto rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Pro kartı — dönen ışık kenarlıklı */}
      <div className="px-3.5 pb-3">
        <div className="side-upgrade">
          <div className="p-3.5">
            <p className="flex items-center gap-1.5 font-display text-[13px] font-bold text-ink">
              <Zap size={13} className="text-brand-soft" />
              Pro&apos;ya geç
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              Sınırsız arama, uyarılar ve Fikir AI.
            </p>
            <Link
              href="/billing"
              className="mt-2.5 block rounded-lg bg-gradient-to-r from-brand to-glow px-3 py-1.5 text-center text-[11.5px] font-bold text-black transition-transform hover:scale-[1.02] active:scale-95"
            >
              Planları gör
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-edge-soft px-5 py-3.5">
        <Link
          href="/signin"
          className="flex items-center gap-2 text-xs font-semibold text-muted transition-colors hover:text-ink"
        >
          <LogIn size={14} /> Hesapla giriş yap
        </Link>
        <p className="mt-2 text-[10.5px] leading-relaxed text-faint">
          {brand.name} Stüdyo
        </p>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const store = useStore();
  const unread = store.notifications.filter((n) => !n.readAt).length;
  const items = NAV.slice(0, 5);

  return (
    <nav
      aria-label="Mobil uygulama menüsü"
      className="mobile-app-nav fixed inset-x-3 bottom-3 z-40 hidden rounded-2xl border border-edge-soft bg-surface/95 p-1.5 shadow-2xl backdrop-blur-xl max-md:flex"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors ${
              active ? "bg-brand/15 text-brand-soft" : "text-muted"
            }`}
          >
            <Icon size={17} aria-hidden="true" />
            <span className="truncate">
              {label === "Fikir Doğrulayıcı" ? "Fikir AI" : label}
            </span>
            {href === "/notifications" && unread > 0 && (
              <span
                className="absolute right-2 top-1 h-1.5 w-1.5 rounded-full bg-brand"
                aria-label={`${unread} okunmamış bildirim`}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
