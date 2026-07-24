import type { Metadata } from "next";
import Link from "next/link";
import { COLLECTIONS } from "@/lib/collections";

export const metadata: Metadata = { title: "Hazır Listeler" };

export default function DatabasesPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-7">
      <h1 className="font-display text-2xl font-bold tracking-tight">Hazır Listeler</h1>
      <p className="mt-1 text-sm text-muted">
        İndeks üzerinde küratörlü sorgular — tek tıkla en verimli av sahalarına in.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COLLECTIONS.map((c) => (
          <Link key={c.slug} href={`/databases/${c.slug}`} className="glass-panel group p-5">
            <span className="text-3xl">{c.emoji}</span>
            <h2 className="mt-3 font-display text-base font-bold tracking-tight group-hover:text-brand-soft">
              {c.title}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
