"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Zap } from "lucide-react";
import { brand } from "@/config/brand";

const FEATURES = [
  "Sınırsız arama",
  "Gelişmiş filtreler",
  "Sınırsız video kaydetme",
  "Sınırsız rakip takibi",
  "Viral uyarıları",
  "Fikir Doğrulayıcı (AI)",
  "Öncelikli veri güncellemeleri",
];

export function Billing() {
  const params = useSearchParams();
  const status = params.get("status");
  const [busy, setBusy] = useState<"monthly" | "annual" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const checkout = async (plan: "monthly" | "annual") => {
    setBusy(plan);
    setNotice(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string; message?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setNotice(
        data.message ??
          "Ödeme başlatılamadı. Stripe anahtarları eklenince bu buton gerçek Checkout'a gider.",
      );
    } catch {
      setNotice("Bağlantı hatası — tekrar dene.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-[880px] px-6 py-7">
      <h1 className="font-display text-2xl font-bold tracking-tight">Abonelik</h1>
      <p className="mt-1 text-sm text-muted">
        Sıradaki videon patlamaya hazır mı? İzlenmeyen video çekme kısır döngüsünü kır.
      </p>

      {status === "success" && (
        <div className="glass-panel mt-4 border-pos/40 p-4 text-sm text-pos">
          Ödeme tamamlandı. Aboneliğin webhook ile doğrulanıyor; birkaç saniye içinde
          Pro durumun güncellenecek.
        </div>
      )}
      {status === "cancelled" && (
        <div className="glass-panel mt-4 border-warn/30 p-4 text-sm text-warn">
          Ödeme iptal edildi. Fikrini değiştirirsen buradayız.
        </div>
      )}
      {notice && (
        <div className="glass-panel mt-4 border-glow/30 p-4 text-sm text-glow">
          {notice}
        </div>
      )}

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        {/* Yıllık — dönen ışık kenarlığı */}
        <div className="price-hero">
          <div className="p-7">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted">Pro Yıllık</p>
              <span className="rounded-full bg-gradient-to-r from-brand to-glow px-3 py-1 text-[11px] font-extrabold text-black">
                {brand.pricing.discountBadge}
              </span>
            </div>
            <p className="mt-3">
              <span className="num font-display text-4xl font-bold">
                {brand.pricing.currency}
                {brand.pricing.annualMonthly}
              </span>
              <span className="text-sm text-muted">/ay</span>
            </p>
            <p className="num mt-0.5 text-xs text-faint">
              yıllık {brand.pricing.currency}
              {brand.pricing.annualTotal.toLocaleString("tr-TR")} ·{" "}
              <s>
                {brand.pricing.currency}
                {brand.pricing.monthly}/ay
              </s>
            </p>
            <ul className="mt-5 flex flex-col gap-2.5">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-ink/90">
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-pos/15">
                    <Check size={11} className="text-pos" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => checkout("annual")}
              disabled={busy !== null}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-glow py-3.5 text-sm font-extrabold text-black transition-transform hover:scale-[1.015] active:scale-95 disabled:opacity-50"
            >
              <Zap size={15} />
              {busy === "annual" ? "Yönlendiriliyor..." : "HEMEN BAŞLA"}
            </button>
            <p className="mt-2 text-center text-[11px] text-faint">
              *İstediğin zaman iptal et
            </p>
          </div>
        </div>

        {/* Aylık */}
        <div className="glass-panel p-7">
          <p className="text-sm font-semibold text-muted">Pro Aylık</p>
          <p className="mt-3">
            <span className="num font-display text-4xl font-bold">
              {brand.pricing.currency}
              {brand.pricing.monthly}
            </span>
            <span className="text-sm text-muted">/ay</span>
          </p>
          <p className="mt-0.5 text-xs text-faint">taahhüt yok</p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-ink/90">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-pos/15">
                  <Check size={11} className="text-pos" />
                </span>
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => checkout("monthly")}
            disabled={busy !== null}
            className="icon-btn mt-6 w-full py-3.5 text-sm font-bold"
          >
            {busy === "monthly" ? "Yönlendiriliyor..." : "HEMEN BAŞLA"}
          </button>
          <p className="mt-2 text-center text-[11px] text-faint">
            *İstediğin zaman iptal et
          </p>
        </div>
      </div>

      <p className="mt-7 text-center text-xs text-faint">
        İlk ayını riske girmeden dene — bir döner parasına.
      </p>
    </div>
  );
}
