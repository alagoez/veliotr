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
  Beaker,
} from "lucide-react";
import { brand } from "@/config/brand";
import { useStore } from "@/lib/store";

const NAV = [
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
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-edge-soft bg-surface/60 max-md:hidden">
      <Link href="/home" className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/20 text-brand-soft">
          <Beaker size={18} />
        </span>
        <span className="font-display text-lg font-semibold tracking-tight">
          {brand.name}
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors ${
                active
                  ? "bg-brand/15 text-brand-soft"
                  : "text-muted hover:bg-hover hover:text-ink"
              }`}
            >
              <Icon size={16} />
              {label}
              {href === "/notifications" && unread > 0 && (
                <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-edge-soft p-4">
        <p className="text-[11px] leading-relaxed text-faint">
          {brand.name} · demo modu
          <br />
          Gerçek veri için README&apos;deki kurulumu yap.
        </p>
      </div>
    </aside>
  );
}
