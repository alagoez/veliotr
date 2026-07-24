import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Başlangıç" };

export default function GettingStartedPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-20">
      <p className="text-sm text-glow">Kurulum tamam</p>
      <h1 className="mt-3 font-display text-4xl font-bold">İlk araştırmanı başlat.</h1>
      <p className="mt-4 text-muted">Nişini seç, outlier videoları filtrele ve işe yarayan kalıpları klasörüne kaydet.</p>
      <Link href="/home" className="mt-8 inline-flex rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white">Keşfet&apos;e git</Link>
    </main>
  );
}
