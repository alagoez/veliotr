import Link from "next/link";
import { Beaker } from "lucide-react";
import { brand } from "@/config/brand";

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-edge-soft bg-base/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/20 text-brand-soft">
              <Beaker size={17} />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              {brand.name}
            </span>
          </Link>
          <Link
            href="/home"
            className="rounded-lg border border-edge bg-surface px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Giriş Yap
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
