"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MonitorPlay, Sparkles, ArrowRight, Loader2, Flame } from "lucide-react";
import { useStore } from "@/lib/store";
import { NICHE_CATALOG as NICHES } from "@/config/niches";

type ConnectResult = {
  channelId: string;
  channelTitle: string;
  subscribers: number;
  videoCount: number;
  niche: { slug: string; name: string; confidence: number } | null;
  profileVector: number[] | null;
  topOutliers: { title: string; views: string; multiplier: string }[];
  error?: string;
  message?: string;
};

export function GettingStarted() {
  const store = useStore();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ConnectResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/connect-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl: url.trim() }),
      });
      const data = (await res.json()) as ConnectResult;
      if (!res.ok) {
        setError(data.message ?? "Kanal bağlanamadı. Linki kontrol et.");
        return;
      }
      setResult(data);
      if (data.profileVector && data.profileVector.length) {
        store.setProfile({
          channelId: data.channelId,
          channelTitle: data.channelTitle,
          nicheSlug: data.niche?.slug ?? null,
          nicheName: data.niche?.name ?? null,
          vector: data.profileVector,
        });
      } else if (data.niche) {
        store.setNiche(data.niche.slug);
      }
    } catch {
      setError("Bağlantı hatası — tekrar dene.");
    } finally {
      setBusy(false);
    }
  };

  // Niş elle seçme (kanal yapıştırmak istemeyene alternatif)
  const pickNiche = (slug: string) => {
    store.setNiche(slug);
    store.setPersonalize(true);
    router.push("/home");
  };

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 py-16">
      {!result ? (
        <>
          <span className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface px-3 py-1 text-xs text-glow">
            <Sparkles size={13} /> Kurulumun son adımı
          </span>
          <h1 className="mt-5 font-display text-3xl font-bold leading-tight sm:text-4xl">
            Kanalını bağla, sana özel outlier&apos;ları görelim
          </h1>
          <p className="mt-3 text-muted">
            YouTube kanalının linkini yapıştır — videolarından nişini otomatik
            çıkarıp Keşfet&apos;i senin sektörüne göre kişiselleştireceğiz.
          </p>

          <div className="mt-8">
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-muted">
              <MonitorPlay size={16} className="text-brand-soft" /> Kanal linki veya @kullanıcı adı
            </label>
            <div className="flex gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && connect()}
                placeholder="youtube.com/@kanalin  ·  @kanalin"
                className="search-command w-full rounded-xl border border-edge bg-surface px-4 py-3 text-sm outline-none placeholder:text-faint focus:border-brand/60"
              />
              <button
                onClick={connect}
                disabled={busy || !url.trim()}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-glow px-5 py-3 text-sm font-bold text-black transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {busy ? "Analiz ediliyor..." : "Bağla"}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-warn">{error}</p>}
            {busy && (
              <p className="mt-3 text-xs text-faint">
                Kanalının videolarını çekip anlamsal profilini çıkarıyoruz — birkaç saniye sürebilir.
              </p>
            )}
          </div>

          <div className="mt-10 border-t border-edge-soft pt-6">
            <p className="text-sm text-muted">Kanalın yok mu? Sektörünü seç:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {NICHES.map((n) => (
                <button key={n.slug} onClick={() => pickNiche(n.slug)} className="chip">
                  {n.name}
                </button>
              ))}
            </div>
            <Link href="/home" className="mt-6 inline-block text-sm text-faint hover:text-ink">
              Şimdilik atla →
            </Link>
          </div>
        </>
      ) : (
        <>
          <span className="inline-flex items-center gap-2 rounded-full border border-pos/40 bg-pos/10 px-3 py-1 text-xs text-pos">
            <Sparkles size={13} /> Kanalın bağlandı
          </span>
          <h1 className="mt-5 font-display text-3xl font-bold">{result.channelTitle}</h1>
          <p className="mt-2 text-sm text-muted">
            {result.videoCount} video analiz edildi
            {result.niche && (
              <>
                {" · "}Tespit edilen niş:{" "}
                <span className="font-semibold text-brand-soft">{result.niche.name}</span>
                <span className="text-faint"> (%{Math.round(result.niche.confidence * 100)})</span>
              </>
            )}
          </p>

          {result.topOutliers.length > 0 && (
            <div className="glass-panel mt-6 p-5">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-faint">
                <Flame size={13} className="text-brand-soft" /> Kanalının en çok patlayanları
              </p>
              <div className="mt-3 flex flex-col gap-2.5">
                {result.topOutliers.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="mult-badge mult-warm shrink-0">{v.multiplier}</span>
                    <span className="min-w-0 flex-1 truncate">{v.title}</span>
                    <span className="num shrink-0 text-faint">{v.views}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mt-6 text-sm leading-relaxed text-muted">
            Artık Keşfet&apos;e girdiğinde{" "}
            <span className="text-ink">senin nişindeki outlier videolar</span> varsayılan
            olarak gelecek. İstersen &quot;Tümü&quot;ne genişletebilirsin.
          </p>

          <button
            onClick={() => router.push("/home")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-glow px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-[1.02]"
          >
            Kişisel Keşfet&apos;ime git <ArrowRight size={16} />
          </button>
        </>
      )}
    </main>
  );
}
